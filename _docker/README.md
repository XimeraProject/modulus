# Docker and AWS ECS

One image serves every deployment mode. nginx listens on 8000 and proxies to
the Nitro server on 127.0.0.1:3000; supervisord runs both. The mode is set per
ECS service through `DEPLOYMENT_MODE` and `JOB_QUEUE_ENABLED`.

| Path | What it is |
| --- | --- |
| `app/production/Dockerfile` | The image. Build context is the repository root. |
| `app/nginx/` | nginx config: ALB real IP, rate limits, static assets, the health check. |
| `app/supervisord.conf`, `app/start-*.sh` | Process supervision and the shutdown drain. |
| `app/production/docker-compose.yml` | Runs the image locally against `postgres/`. |
| `build-prod.sh`, `exec-prod.sh` | Build the image; run it with compose. |
| `aws/` | ECR push, task definitions, `db upgrade` task, and deploy. |

## Run the Image Locally

```sh
./postgres/postgres.sh up -d
./_docker/build-prod.sh
./_docker/exec-prod.sh up                      # all-in-one on http://localhost:8000
DEPLOYMENT_MODE=frontend JOB_QUEUE_ENABLED=false ./_docker/exec-prod.sh up
DEPLOYMENT_MODE=admin ./_docker/exec-prod.sh up
```

## Deploy to ECS

Copy `aws/aws.env.example` to `aws/aws.env` (gitignored) and fill it in. The
scripts use `AWS_PROFILE` from that file (`osu`), and refuse to run if the
profile's account does not match `AWS_ACCOUNT_ID`.

```sh
DOCKER_PLATFORM=linux/arm64 ./_docker/build-prod.sh   # native on Apple silicon
./_docker/aws/push.sh       # ECR: <repo>:app-<git sha>
./_docker/aws/deploy.sh     # register task defs, db upgrade, roll admin then app
```

`deploy.sh` renders both task definitions with
`aws/render-task-definitions.mjs`, runs `aws/migrate.sh` (a one-off task from
the new admin revision running `modulus db upgrade`), and only then updates the
services. `push.sh` refuses an image that is not arm64, and both scripts
refuse builds with uncommitted changes (`-dirty`).

## What the AWS Side Needs

The scripts deploy into existing infrastructure; they do not create it. Two
CloudFormation stacks create all of it except the database:

- **`aws/math-shared-alb.yaml`** (stack `math-shared-alb`): the department's
  shared internet-facing ALB, its security group, the HTTP to HTTPS redirect,
  and an HTTPS listener with a default certificate that answers 404. It holds no
  application routing and exports the listener ARN, security group ID and DNS
  name for application stacks.
- **`aws/osu-modulus.yaml`** (stack `osu-modulus`): the ECR repository, the
  cluster with its Graviton Auto Scaling group and capacity provider, the IAM
  roles, the (empty) secret and the log groups, and Modulus's routing on the
  shared ALB: an ACM certificate for both hostnames, the `app` and `admin`
  target groups, and host-header rules at priorities 100–199. Its outputs are
  the values `aws.env` needs.

`deploy.sh` creates the two ECS services on the first deploy and updates them
afterwards; neither stack owns them. Create the shared stack first; delete
`osu-modulus` before `math-shared-alb`, since it imports the shared exports.

```sh
aws cloudformation deploy --profile osu --region us-east-2 \
  --stack-name math-shared-alb --template-file _docker/aws/math-shared-alb.yaml \
  --parameter-overrides DefaultCertificateDomain=<hostname> \
    VpcId=<vpc> SubnetIds=<subnet>,<subnet>,<subnet>
aws cloudformation deploy --profile osu --region us-east-2 \
  --stack-name osu-modulus --template-file _docker/aws/osu-modulus.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides VpcId=<vpc> SubnetIds=<subnet>,<subnet>,<subnet>
```

DNS for the hostnames is not in Route 53, so each stack waits on its
certificate until the validation CNAMEs (in the stack events, or
`aws acm describe-certificate`) exist in DNS. Add them, and the hostname CNAMEs
pointing at the ALB's DNS name, as DNS-only (unproxied) records.

In detail, the AWS side is:

- **ECR repository** `ECR_REPOSITORY`.
- **ECS cluster** on the EC2 launch type: an Auto Scaling group of Graviton
  instances (for example `t4g`, `m7g`, `c7g`) from the ECS-optimized Amazon
  Linux 2023 ARM64 AMI, ideally as a capacity provider
  (`ECS_CAPACITY_PROVIDER`). Point the launch template at the AMI's public SSM
  parameter so new instances pick up the current recommended image:
  `/aws/service/ecs/optimized-ami/amazon-linux-2023/arm64/recommended/image_id`.
  The instances' user data joins the cluster with
  `echo ECS_CLUSTER=<cluster> >> /etc/ecs/ecs.config`. Size instance memory
  for the tasks' `TASK_MEMORY` plus a rolling deploy's extra app task.
- **Two services** from the rendered task definitions (bridge networking,
  dynamic host ports, constrained to arm64 instances):
  - **App** (`osu-modulus-app`, `DEPLOYMENT_MODE=frontend`): learner pages,
    LTI and agent endpoints, behind `APP_HOST`. Scale as needed.
  - **Admin** (`DEPLOYMENT_MODE=admin`): admin UI and the background jobs,
    behind `ADMIN_HOST`. Run exactly one task, with deployment
    `minimumHealthyPercent=0` and `maximumPercent=100`, so two job runners
    never overlap.
- **ALB** terminating TLS, with one target group per service of target type
  `instance`; ECS registers each task's dynamic host port (container port
  8000). The instances' security group must admit the ALB on the ephemeral
  range (32768–65535). Health check: `GET /routes/elb-status`, expecting 200.
- **Secrets Manager** secret `SECRET_ARN`: one JSON object with the keys listed
  in `render-task-definitions.mjs` (`SESSION_SECRET`,
  `POSTGRES_CONNECTION_STRING`, the JWT and LTI keys, SMTP and S3 credentials,
  and the OAuth client credentials). Generate the keys once with
  `pnpm exec modulus keys generate`; LMS registrations hold the LTI key.
- **IAM**: the task execution role needs ECR pull, CloudWatch Logs (including
  `logs:CreateLogGroup`), and `secretsmanager:GetSecretValue` on the secret.
  The container instances need the usual `AmazonEC2ContainerServiceforEC2Role`.
- **PostgreSQL 18** reachable from the container instances. Create the schema
  once with `modulus db init`, as a migrate-style one-off task or from a host
  with access.

## Shutdown Timing

ECS sends SIGTERM, then waits the container's `stopTimeout` (which overrides
the agent's 30 s `ECS_CONTAINER_STOP_TIMEOUT`) before SIGKILL. supervisord gives
Node up to 80 s (`stopwaitsecs`); the app drains jobs for up to 70 s
(`SHUTDOWN_DRAIN_SECONDS`) so an in-flight score submission (60 s timeout) can
finish, and Nitro closes HTTP after 25 s. The admin task definition therefore
sets `stopTimeout` to 90 s; the frontend, which runs no jobs, uses 30 s.
