import dotenv from 'dotenv';
import Joi from 'joi';

dotenv.config();

const envVarsSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),

  // Database
  DB_HOST: Joi.string().required().description('Database host'),
  DB_PORT: Joi.number().default(3306),
  DB_NAME: Joi.string().required().description('Database name'),
  DB_USER: Joi.string().required().description('Database user'),
  DB_PASSWORD: Joi.string().required().description('Database password'),

  // JWT
  JWT_SECRET: Joi.string().required().description('JWT secret key'),
  JWT_REFRESH_SECRET: Joi.string().required().description('JWT refresh secret key'),
  JWT_EXPIRE: Joi.string().default('15m').description('JWT expiration time'),
  JWT_REFRESH_EXPIRE: Joi.string().default('7d').description('JWT refresh expiration time'),

  // Cookie
  COOKIE_SECRET: Joi.string().default('cylinderx-cookie-secret').description('Cookie secret key'),
  COOKIE_SECURE: Joi.boolean().default(false).description('Secure cookie flag'),
  COOKIE_SAME_SITE: Joi.string().valid('strict', 'lax', 'none').default('lax'),

  // Email
  EMAIL_PROVIDER: Joi.string().valid('aws-ses', 'sendgrid', 'resend', 'smtp').default('smtp'),
  EMAIL_FROM: Joi.string().email().required().description('Default from email address'),
  EMAIL_FROM_NAME: Joi.string().optional().description('Default from name'),
  EMAIL_REPLY_TO: Joi.string().email().optional(),

  // SMTP (for smtp provider)
  EMAIL_HOST: Joi.string().when('EMAIL_PROVIDER', { is: 'smtp', then: Joi.required() }),
  EMAIL_PORT: Joi.number().when('EMAIL_PROVIDER', { is: 'smtp', then: Joi.required() }),
  EMAIL_USER: Joi.string().when('EMAIL_PROVIDER', { is: 'smtp', then: Joi.required() }),
  EMAIL_PASSWORD: Joi.string().when('EMAIL_PROVIDER', { is: 'smtp', then: Joi.required() }),
  EMAIL_SECURE: Joi.boolean().optional(),

  // AWS SES (for aws-ses provider)
  AWS_REGION: Joi.string().when('EMAIL_PROVIDER', { is: 'aws-ses', then: Joi.required() }),
  AWS_ACCESS_KEY_ID: Joi.string().optional(),
  AWS_SECRET_ACCESS_KEY: Joi.string().optional(),

  // SendGrid (for sendgrid provider)
  SENDGRID_API_KEY: Joi.string().when('EMAIL_PROVIDER', { is: 'sendgrid', then: Joi.required() }),

  // Resend (for resend provider)
  RESEND_API_KEY: Joi.string().when('EMAIL_PROVIDER', { is: 'resend', then: Joi.required() }),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: Joi.number().default(15 * 60 * 1000),
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),

  // Logging
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  LOG_FILE_PATH: Joi.string().default('logs/app.log'),

  // Application
  FRONTEND_URL: Joi.string().uri().default('http://localhost:3000'),
  COMPANY_NAME: Joi.string().default('CellerHut Logistics'),
  SUPPORT_EMAIL: Joi.string().email().default('support@cellerhutlogistics.com'),

  // Storage
  STORAGE_PROVIDER: Joi.string().valid('local', 's3', 'spaces').default('local'),

  // Local storage
  LOCAL_STORAGE_PATH: Joi.string().default('uploads'),
  LOCAL_STORAGE_BASE_URL: Joi.string().uri().optional(),

  // S3 storage
  S3_BUCKET: Joi.string().when('STORAGE_PROVIDER', { is: 's3', then: Joi.required() }),
  S3_REGION: Joi.string().when('STORAGE_PROVIDER', { is: 's3', then: Joi.required() }),
  S3_ACCESS_KEY_ID: Joi.string().when('STORAGE_PROVIDER', { is: 's3', then: Joi.required() }),
  S3_SECRET_ACCESS_KEY: Joi.string().when('STORAGE_PROVIDER', { is: 's3', then: Joi.required() }),
  S3_DEFAULT_ACL: Joi.string().valid('private', 'public-read').default('private'),
  S3_CDN_URL: Joi.string().uri().optional(),

  // DigitalOcean Spaces
  SPACES_BUCKET: Joi.string().when('STORAGE_PROVIDER', { is: 'spaces', then: Joi.required() }),
  SPACES_REGION: Joi.string().when('STORAGE_PROVIDER', { is: 'spaces', then: Joi.required() }),
  SPACES_ENDPOINT: Joi.string().when('STORAGE_PROVIDER', { is: 'spaces', then: Joi.required() }),
  SPACES_ACCESS_KEY_ID: Joi.string().when('STORAGE_PROVIDER', {
    is: 'spaces',
    then: Joi.required(),
  }),
  SPACES_SECRET_ACCESS_KEY: Joi.string().when('STORAGE_PROVIDER', {
    is: 'spaces',
    then: Joi.required(),
  }),
  SPACES_DEFAULT_ACL: Joi.string().valid('private', 'public-read').default('private'),
  SPACES_CDN_URL: Joi.string().uri().optional(),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().optional().allow(''),
  REDIS_DB: Joi.number().default(0),
  REDIS_KEY_PREFIX: Joi.string().default('cellerhut:'),
  REDIS_TTL_DEFAULT: Joi.number().default(3600), // 1 hour in seconds
  REDIS_ENABLE_OFFLINE_QUEUE: Joi.boolean().default(true),
  REDIS_CONNECT_TIMEOUT: Joi.number().default(10000), // 10 seconds
  REDIS_MAX_RETRIES: Joi.number().default(3),
}).unknown();

const { value: envVars, error } = envVarsSchema
  .prefs({ errors: { label: 'key' } })
  .validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export const config = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,

  app: {
    baseUrl: envVars.LOCAL_STORAGE_BASE_URL || `http://localhost:${envVars.PORT}`,
  },

  database: {
    host: envVars.DB_HOST,
    port: envVars.DB_PORT,
    name: envVars.DB_NAME,
    user: envVars.DB_USER,
    password: envVars.DB_PASSWORD,
  },

  jwt: {
    secret: envVars.JWT_SECRET,
    refreshSecret: envVars.JWT_REFRESH_SECRET,
    expiresIn: envVars.JWT_EXPIRE,
    refreshExpiresIn: envVars.JWT_REFRESH_EXPIRE,
  },

  cookie: {
    secret: envVars.COOKIE_SECRET,
    secure: envVars.COOKIE_SECURE || envVars.NODE_ENV === 'production',
    sameSite: envVars.COOKIE_SAME_SITE,
  },

  email: {
    provider: envVars.EMAIL_PROVIDER,
    from: envVars.EMAIL_FROM,
    fromName: envVars.EMAIL_FROM_NAME || 'CylinderX',
    replyTo: envVars.EMAIL_REPLY_TO,
    smtp: {
      host: envVars.EMAIL_HOST,
      port: envVars.EMAIL_PORT,
      secure: envVars.EMAIL_SECURE,
      auth: {
        user: envVars.EMAIL_USER,
        pass: envVars.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: envVars.NODE_ENV === 'production',
      },
    },
    aws: {
      region: envVars.AWS_REGION,
      accessKeyId: envVars.AWS_ACCESS_KEY_ID,
      secretAccessKey: envVars.AWS_SECRET_ACCESS_KEY,
    },
    sendgrid: {
      apiKey: envVars.SENDGRID_API_KEY,
    },
    resend: {
      apiKey: envVars.RESEND_API_KEY,
    },
  },

  rateLimiting: {
    windowMs: envVars.RATE_LIMIT_WINDOW_MS,
    maxRequests: envVars.RATE_LIMIT_MAX_REQUESTS,
  },

  logging: {
    level: envVars.LOG_LEVEL,
    filePath: envVars.LOG_FILE_PATH,
  },

  frontendUrl: envVars.FRONTEND_URL,
  companyName: envVars.COMPANY_NAME,
  supportEmail: envVars.SUPPORT_EMAIL,

  storage: {
    provider: envVars.STORAGE_PROVIDER,
    local: {
      path: envVars.LOCAL_STORAGE_PATH,
      baseUrl: envVars.LOCAL_STORAGE_BASE_URL || `http://localhost:${envVars.PORT}`,
    },
    s3: {
      bucket: envVars.S3_BUCKET,
      region: envVars.S3_REGION,
      accessKeyId: envVars.S3_ACCESS_KEY_ID,
      secretAccessKey: envVars.S3_SECRET_ACCESS_KEY,
      defaultAcl: envVars.S3_DEFAULT_ACL,
      cdnUrl: envVars.S3_CDN_URL,
    },
    spaces: {
      bucket: envVars.SPACES_BUCKET,
      region: envVars.SPACES_REGION,
      endpoint: envVars.SPACES_ENDPOINT,
      accessKeyId: envVars.SPACES_ACCESS_KEY_ID,
      secretAccessKey: envVars.SPACES_SECRET_ACCESS_KEY,
      defaultAcl: envVars.SPACES_DEFAULT_ACL,
      cdnUrl: envVars.SPACES_CDN_URL,
    },
  },

  redis: {
    host: envVars.REDIS_HOST,
    port: envVars.REDIS_PORT,
    password: envVars.REDIS_PASSWORD,
    db: envVars.REDIS_DB,
    keyPrefix: envVars.REDIS_KEY_PREFIX,
    defaultTTL: envVars.REDIS_TTL_DEFAULT,
    enableOfflineQueue: envVars.REDIS_ENABLE_OFFLINE_QUEUE,
    connectTimeout: envVars.REDIS_CONNECT_TIMEOUT,
    maxRetries: envVars.REDIS_MAX_RETRIES,
  },

  isDevelopment: envVars.NODE_ENV === 'development',
  isProduction: envVars.NODE_ENV === 'production',
  isTest: envVars.NODE_ENV === 'test',
};

export default config;
