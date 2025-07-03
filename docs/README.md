# CellerHut Logistics API Documentation

Welcome to the comprehensive documentation for the CellerHut Logistics API - a TypeScript Node.js Express MySQL boilerplate with advanced features.

## 📚 Documentation Structure

### [Getting Started](./getting-started/README.md)
- Quick start guide
- Installation instructions
- Environment setup
- Running the application

### [Features](./features/)
- [Email Verification](./features/email-verification.md) - Email verification system with token-based validation
- [Password Reset](./features/password-reset.md) - Secure password reset flow with email notifications
- [File Upload](./features/file-upload.md) - Multi-provider file upload with image processing
- [Redis Cache](./features/redis-cache.md) - Comprehensive caching layer with decorators

### [API Documentation](./api/README.md)
- REST API endpoints
- Authentication flows
- Request/Response formats
- Swagger documentation at `/api-docs`

### [Architecture](./architecture/README.md)
- System design overview
- Database schema
- Service layer patterns
- [Email Verification Implementation](./architecture/email-verification-implementation.md)

### [Contributing](./contributing/DOCUMENTATION.md)
- Documentation guidelines
- Code style guide
- Pull request process

## ✅ Implemented Features

### 1. Email Service Integration
- **Providers Supported**: AWS SES, SendGrid, Resend, SMTP
- **Architecture**: Provider pattern with abstraction layer
- **Templates**: Base template system with Welcome, Password Reset, Email Verification templates
- **Configuration**: Environment-based provider selection

### 2. Password Reset Flow
- **Security**: One-time use tokens with 1-hour expiration
- **Endpoints**: Forgot password, reset password, validate token
- **Features**: Rate limiting, session invalidation after reset

### 3. Email Verification
- **Automatic**: Sends verification email on registration
- **Flexible**: 24-hour token expiration with resend capability
- **Middleware**: Protected routes requiring verified email

### 4. File Upload Handling
- **Storage Providers**: Local, AWS S3, DigitalOcean Spaces
- **Image Processing**: Sharp integration for resize, compress, format conversion
- **Features**: Thumbnail generation, file type validation, batch uploads

### 5. Redis Caching Layer
- **Decorators**: @Cacheable, @CacheEvict, @CachePut
- **Middleware**: HTTP response caching
- **Utilities**: Key generators, invalidation strategies, rate limiting

### 6. Swagger API Documentation
- **Architecture**: TypeScript-based, no JSDoc dependency
- **Access**: Available at `/api-docs` endpoint
- **Coverage**: All API endpoints documented

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env

# Run database migrations
pnpm run db:migrate

# Start development server
pnpm run dev
```

## 📝 Configuration

All services are configured through environment variables. See `.env.example` for complete configuration options.

## 🏗️ Architecture Overview

The application follows a modular architecture with clear separation of concerns:

```
src/
├── controllers/    # Request handlers
├── services/       # Business logic
├── models/         # Database models
├── middlewares/    # Express middleware
├── routes/         # API routes
├── utils/          # Helper functions
└── types/          # TypeScript definitions
```

## 🔒 Security

- JWT authentication with refresh tokens
- Role-based access control (RBAC)
- Rate limiting on all endpoints
- Input validation with Joi
- SQL injection protection with Sequelize ORM
- XSS protection with Helmet
- CORS configuration

## 📊 Database

- MySQL with Sequelize ORM
- Migration support
- Model associations
- Transaction support

## 🧪 Testing

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run tests in watch mode
pnpm test:watch
```

## 📦 Dependencies

Key technologies used:
- **Runtime**: Node.js (>=16.0.0)
- **Framework**: Express 5.x
- **Database**: MySQL with Sequelize
- **Authentication**: JWT with bcrypt
- **Validation**: Joi
- **Email**: Nodemailer with multiple providers
- **Caching**: Redis with ioredis
- **File Storage**: AWS S3, DigitalOcean Spaces
- **Documentation**: Swagger UI

## 🤝 Contributing

Please read our [contributing guidelines](./contributing/DOCUMENTATION.md) before submitting pull requests.

## 📄 License

This project is licensed under the MIT License.