#!/usr/bin/env node
// Renders the ECS task definitions for the app and admin services from
// _docker/aws/aws.env, for one image tag:
//
//   node _docker/aws/render-task-definitions.mjs <image-tag>
//
// Writes _docker/aws/.rendered/{app,admin}.json (gitignored). The variable
// sets mirror the host package's per-mode requirements
// (@modulus-learning/host-tanstack-start src/config/fixtures/mode-env.ts):
// config validation fails at boot, naming the setting, if one is missing.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const tag = process.argv[2]
if (!tag) {
  console.error('usage: render-task-definitions.mjs <image-tag>')
  process.exit(1)
}

const env = Object.fromEntries(
  readFileSync(join(here, 'aws.env'), 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const i = line.indexOf('=')
      return [line.slice(0, i), line.slice(i + 1).replace(/^(['"])(.*)\1$/, '$2')]
    })
)
const need = (key) => {
  if (!env[key]) throw new Error(`aws.env: ${key} is not set`)
  return env[key]
}

const image = `${need('AWS_ACCOUNT_ID')}.dkr.ecr.${need('AWS_REGION')}.amazonaws.com/${need('ECR_REPOSITORY')}:${tag}`
const appOrigin = `https://${need('APP_HOST')}`
const adminOrigin = `https://${need('ADMIN_HOST')}`

const cookie = (prefix, name, sameSite) => ({
  [`${prefix}_NAME`]: name,
  [`${prefix}_SAME_SITE`]: sameSite,
  [`${prefix}_HTTP_ONLY`]: 'true',
  [`${prefix}_SECURE`]: 'true',
})

// Plain environment values: public, or deployment shape rather than secret.
const common = (host, origin) => ({
  PORT: '3000',
  NODE_MAX_OLD_SPACE_SIZE: need('NODE_MAX_OLD_SPACE_SIZE'),
  VITE_SITE_NAME: need('SITE_NAME'),
  VITE_SITE_DESCRIPTION: need('SITE_DESCRIPTION'),
  // Each instance's own origin; the browser receives it from the server.
  VITE_PUBLIC_SERVER_URL: origin,
  VITE_CSP_ENABLED: 'false',
  DATA_REQUEST_CACHING: 'true',
  ANALYTICS_ENABLED: 'false',
  LOG_PRETTY: 'false',
  ...cookie('FLASH_COOKIE', 'flash', 'lax'),
  SYSTEM_EMAIL_FROM_ADDRESS: need('SYSTEM_EMAIL_FROM_ADDRESS'),
  CONTACT_SUBMISSION_FROM_ADDRESS: need('SYSTEM_EMAIL_FROM_ADDRESS'),
  SMTP_HOST: need('SMTP_HOST'),
  SMTP_PORT: need('SMTP_PORT'),
  SMTP_SECURE: need('SMTP_SECURE'),
  S3_BUCKET: need('S3_BUCKET'),
  S3_CDN_DOMAIN: need('S3_CDN_DOMAIN'),
  SERVER_HOST: host,
  SERVER_BASE_URL: origin,
  // Tokens and LTI launches are issued against the learner-facing origin by
  // both instances.
  API_JWT_ISSUER: appOrigin,
  API_JWT_AUDIENCE: appOrigin,
  API_JWT_ACCESS_TOKEN_EXPIRES_IN: '600',
  API_JWT_REFRESH_TOKEN_EXPIRES_IN: '2592000',
  LTI_REDIRECT_URI: `${appOrigin}/routes/lti/launch`,
})

const appEnv = {
  ...common(need('APP_HOST'), appOrigin),
  DEPLOYMENT_MODE: 'frontend',
  JOB_QUEUE_ENABLED: 'false',
  // SameSite=None: the learner surface runs inside the LMS iframe.
  ...cookie('USER_SESSION_COOKIE', 'user_session', 'none'),
  ...cookie('USER_REFRESH_COOKIE', 'user_refresh', 'none'),
  API_BASE_URL: `${appOrigin}/routes`,
  VITE_RECAPTCHA_ENABLED: 'false',
  VITE_RECAPTCHA_MANDATORY: 'false',
  OAUTH_GITHUB_AUTH_URL: 'https://github.com/login/oauth/authorize',
  OAUTH_GITHUB_ACCESS_TOKEN_URL: 'https://github.com/login/oauth/access_token',
  OAUTH_GITHUB_USER_URL: 'https://api.github.com/user',
  OAUTH_GITHUB_RETURN_URL: `${appOrigin}/routes/oauth/github`,
  OAUTH_GOOGLE_AUTH_URL: 'https://accounts.google.com/o/oauth2/auth',
  OAUTH_GOOGLE_ACCESS_TOKEN_URL: 'https://oauth2.googleapis.com/token',
  OAUTH_GOOGLE_RETURN_URL: `${appOrigin}/routes/oauth/google`,
}

const adminEnv = {
  ...common(need('ADMIN_HOST'), adminOrigin),
  DEPLOYMENT_MODE: 'admin',
  JOB_QUEUE_ENABLED: 'true',
  ...cookie('ADMIN_SESSION_COOKIE', 'admin_session', 'lax'),
  ...cookie('ADMIN_REFRESH_COOKIE', 'admin_refresh', 'lax'),
}

// Keys of the JSON object stored in the SECRET_ARN secret. The public keys and
// key ID are not secret, but they belong with their private halves.
const commonSecrets = [
  'SESSION_SECRET',
  'POSTGRES_CONNECTION_STRING',
  'API_JWT_PRIVATE_KEY',
  'API_JWT_PUBLIC_KEY',
  'LTI_JWKS_KEY_ID',
  'LTI_JWKS_PRIVATE_KEY',
  'LTI_JWKS_PUBLIC_KEY',
  'SMTP_USER',
  'SMTP_PASSWORD',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
]
const appSecrets = [
  ...commonSecrets,
  'OAUTH_GITHUB_CLIENT_ID',
  'OAUTH_GITHUB_CLIENT_SECRET',
  'OAUTH_GOOGLE_CLIENT_ID',
  'OAUTH_GOOGLE_CLIENT_SECRET',
]

// EC2 launch type on Graviton container instances (ECS-optimized ARM64 AMI).
// Bridge networking with a dynamic host port: the ALB target group uses the
// `instance` target type and ECS registers each task's host port.
const taskDefinition = ({ family, environment, secrets, stopTimeout }) => ({
  family,
  requiresCompatibilities: ['EC2'],
  networkMode: 'bridge',
  cpu: need('TASK_CPU'),
  memory: need('TASK_MEMORY'),
  runtimePlatform: { cpuArchitecture: 'ARM64', operatingSystemFamily: 'LINUX' },
  placementConstraints: [
    { type: 'memberOf', expression: 'attribute:ecs.cpu-architecture == arm64' },
  ],
  executionRoleArn: need('EXECUTION_ROLE_ARN'),
  taskRoleArn: need('TASK_ROLE_ARN'),
  containerDefinitions: [
    {
      name: 'app',
      image,
      essential: true,
      portMappings: [{ containerPort: 8000, hostPort: 0, protocol: 'tcp' }],
      environment: Object.entries(environment)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, value]) => ({ name, value })),
      secrets: secrets.map((name) => ({
        name,
        valueFrom: `${need('SECRET_ARN')}:${name}::`,
      })),
      // SIGTERM → supervisord (stopwaitsecs 80) → Node drain. Overrides the
      // agent's ECS_CONTAINER_STOP_TIMEOUT (30 s default); ECS caps it at 120 s.
      stopTimeout,
      logConfiguration: {
        logDriver: 'awslogs',
        options: {
          'awslogs-create-group': 'true',
          'awslogs-group': `/ecs/${family}`,
          'awslogs-region': need('AWS_REGION'),
          'awslogs-stream-prefix': 'ecs',
        },
      },
    },
  ],
})

const out = join(here, '.rendered')
mkdirSync(out, { recursive: true })
const write = (name, def) => {
  writeFileSync(join(out, `${name}.json`), `${JSON.stringify(def, null, 2)}\n`)
  console.log(join(out, `${name}.json`))
}

// The app (frontend mode) serves only HTTP (Nitro closes in 25 s); the admin
// instance must also let an in-flight score submission (60 s) finish.
write(
  'app',
  taskDefinition({
    family: need('TASK_FAMILY_APP'),
    environment: appEnv,
    secrets: appSecrets,
    stopTimeout: 30,
  })
)
write(
  'admin',
  taskDefinition({
    family: need('TASK_FAMILY_ADMIN'),
    environment: adminEnv,
    secrets: commonSecrets,
    stopTimeout: 90,
  })
)
