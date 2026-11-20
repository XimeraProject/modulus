---
name: deploy
description: Use when asked to deploy, release to production, push an image to ECR, run the production database upgrade, or update the ECS services for this installation. Every step that touches AWS requires explicit user authorisation.
---

# Deploying to AWS ECS

Production runs on AWS ECS, EC2 launch type on Graviton (arm64) instances, as
two services from one image: `frontend` (learners, LTI, agent endpoints) and
`admin` (administration and background jobs, exactly one task). The scripts and
the infrastructure they expect are described in `_docker/README.md`; read it
first.

## Authorisation

Pushing to ECR, registering task definitions, running the database upgrade
task, and updating services all change production. Do them only with explicit
authorisation for this deploy in this conversation. Show the user the version
(git sha), the AWS profile and region from `_docker/aws/aws.env`, and the steps
below, and ask before step 3. Never proceed past an instruction to hold off.
Never print secrets, the contents of `aws.env`, or AWS account identifiers into
commit messages, PRs, or docs.

## Steps

1. **Preconditions.**
   - Deploy from `main`, with a clean working tree (`git status`), and `main`
     pushed. The scripts refuse a `-dirty` version.
   - `_docker/aws/aws.env` exists (copied from `aws.env.example`). If it does
     not, stop and ask the user to create it; never invent account values.
   - The change was verified (the `verify` skill, including the image check).
2. **Build** the arm64 image:
   `DOCKER_PLATFORM=linux/arm64 ./_docker/build-prod.sh`.
3. **Push** (authorised): `./_docker/aws/push.sh`. It checks that the
   `AWS_PROFILE` account matches `aws.env` and that the image is arm64.
4. **Deploy** (authorised): `./_docker/aws/deploy.sh`. It renders and registers
   both task definitions, runs `modulus db upgrade` as a one-off task from the
   new admin revision and stops if it fails, then updates the admin and
   frontend services and waits for them to stabilise.
5. **Check** the public health endpoints for both hosts (`FRONTEND_HOST` and
   `ADMIN_HOST` from `aws.env`) at `/routes/elb-status`, and confirm each
   reports its mode.

## When Something Fails

- **Migration task failed:** the services were not updated. Read the
  `/ecs/<admin family>` log group, report the error, and stop.
- **Services did not stabilise:** report the ECS service events
  (`aws ecs describe-services`) and target-group health. Rolling back means
  updating the services to the previous task definition revisions — ask first.

Report the deployed version and what was checked, with real results.
