# TypeScript Node.js Express MySQL Boilerplate

## Project Overview

This comprehensive boilerplate application provides developers with a robust, production-ready foundation for building scalable web applications and APIs. Designed with modern development practices in mind, it eliminates the time-consuming setup phase that typically accompanies new projects, allowing developers to focus on business logic rather than infrastructure configuration.

The boilerplate emphasizes type safety, scalability, and maintainability while incorporating industry-standard security practices and development tools. Whether you're building a RESTful API, a full-stack web application, or a microservice, this template provides the essential building blocks to accelerate your development process.

## Technologies Used

### TypeScript

TypeScript enhances JavaScript development by providing static type checking, improved IDE support, and better refactoring capabilities. The boilerplate leverages TypeScript's compile-time error detection to catch potential issues early in the development cycle, resulting in more reliable and maintainable code. Advanced features like interfaces, generics, and decorators enable better code organization and documentation.

### Node.js

Built on Chrome's V8 JavaScript engine, Node.js provides a non-blocking, event-driven architecture that excels at handling concurrent connections. This makes it ideal for building scalable network applications, particularly those requiring real-time features or high I/O throughput. The extensive npm ecosystem provides access to thousands of packages and libraries.

### Express

Express.js serves as the web application framework, offering a minimal yet flexible approach to building web applications and APIs. Its middleware-based architecture allows for modular functionality, while its simplicity enables rapid development without sacrificing performance. The framework provides robust routing, templating, and request handling capabilities.

### MySQL

MySQL was chosen as the primary database solution due to its proven reliability, excellent performance characteristics, and widespread industry adoption. As a mature relational database management system, it provides ACID compliance, strong data integrity, and sophisticated query optimization. Its compatibility with cloud platforms and hosting providers makes deployment straightforward.

### Sequelize ORM

Sequelize acts as the Object-Relational Mapping layer, abstracting complex SQL operations into intuitive JavaScript methods. It provides automatic model synchronization, database migrations, data validation, and relationship handling. The ORM supports multiple database dialects and includes built-in protection against SQL injection attacks.

## Project Structure

```
src/
├── config/
│   ├── database.ts          # Database configuration and connection
│   ├── environment.ts       # Environment variables and settings
│   └── constants.ts         # Application constants
├── controllers/
│   ├── auth.controller.ts   # Authentication related endpoints
│   ├── user.controller.ts   # User management endpoints
│   └── index.ts             # Controller exports
├── middlewares/
│   ├── auth.middleware.ts   # JWT authentication middleware
│   ├── validation.middleware.ts # Request validation
│   ├── error.middleware.ts  # Global error handling
│   └── logger.middleware.ts # Request logging
├── models/
│   ├── User.model.ts        # User database model
│   ├── index.ts             # Model associations and exports
│   └── associations.ts      # Model relationships
├── routes/
│   ├── auth.routes.ts       # Authentication routes
│   ├── user.routes.ts       # User routes
│   └── index.ts             # Route aggregation
├── services/
│   ├── auth.service.ts      # Authentication business logic
│   ├── user.service.ts      # User service layer
│   └── email.service.ts     # Email notifications
├── utils/
│   ├── logger.ts            # Winston logging configuration
│   ├── response.ts          # Standardized API responses
│   ├── validation.ts        # Input validation schemas
│   └── helpers.ts           # Utility functions
├── types/
│   ├── auth.types.ts        # Authentication type definitions
│   ├── user.types.ts        # User type definitions
│   └── common.types.ts      # Shared type definitions
├── database/
│   ├── migrations/          # Database migration files
│   ├── seeders/            # Database seed files
│   └── config.js           # Sequelize configuration
├── tests/
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   └── fixtures/           # Test data
└── app.ts                  # Express application setup
```

## Standard Utilities

The boilerplate includes a comprehensive set of utility functions designed to streamline common development tasks:

**Logging System**: Winston-based logging with multiple transport options (console, file, database) and configurable log levels. Includes request correlation IDs for tracing and structured logging for better searchability.

**Response Formatting**: Standardized API response structure ensuring consistency across all endpoints. Includes success and error response templates with proper HTTP status codes and message formatting.

**Error Handling**: Centralized error handling system with custom error classes, automatic error logging, and user-friendly error messages. Includes specific handlers for validation errors, authentication failures, and database constraints.

**Input Validation**: Joi-based validation schemas with custom validation rules, sanitization functions, and comprehensive error reporting. Supports nested object validation and custom validation messages.

**Date/Time Utilities**: Moment.js integration for consistent date handling, timezone management, and formatting across the application.

## Middlewares

The application implements several essential middlewares for robust request processing:

**Body Parsing**: Configured to handle JSON, URL-encoded, and multipart form data with appropriate size limits and security considerations. Includes file upload handling with validation and storage management.

**CORS Handling**: Comprehensive Cross-Origin Resource Sharing configuration with environment-specific settings, credential handling, and preflight request support. Allows fine-grained control over allowed origins, methods, and headers.

**Request Logging**: Detailed request logging capturing method, URL, response time, status codes, and user information. Includes IP address tracking and user agent parsing for security monitoring.

**Error Handling**: Global error handler that catches unhandled exceptions, formats error responses, logs errors appropriately, and ensures graceful degradation. Includes stack trace sanitization for production environments.

**Rate Limiting**: Configurable rate limiting to prevent abuse and brute-force attacks. Includes different limits for authenticated vs. anonymous users and special handling for authentication endpoints.

**Security Headers**: Automatic injection of security headers including HSTS, X-Frame-Options, X-Content-Type-Options, and CSP headers to protect against common web vulnerabilities.

## Authentication

The boilerplate implements a comprehensive JWT-based authentication system:

**JWT Implementation**: Secure token generation using strong secrets, configurable expiration times, and refresh token support. Includes token blacklisting for logout functionality and automatic token refresh mechanisms.

**User Registration**: Complete registration flow with email validation, password strength requirements, and optional email verification. Includes duplicate email detection and secure password hashing using bcrypt.

**Login Flow**: Secure authentication with rate limiting, account lockout after failed attempts, and optional two-factor authentication support. Includes "remember me" functionality and device tracking.

**Route Protection**: Flexible middleware system for protecting routes based on authentication status, user roles, and permissions. Supports both required and optional authentication scenarios.

**Password Management**: Secure password reset functionality with time-limited tokens, email verification, and password history tracking to prevent reuse.

## Security Best Practices

The boilerplate incorporates multiple layers of security protection:

**Input Validation**: Comprehensive validation and sanitization of all user inputs using Joi schemas. Includes protection against XSS attacks, SQL injection, and NoSQL injection attempts.

**HTTPS Enforcement**: Automatic HTTPS redirection in production environments with HSTS headers to prevent protocol downgrade attacks.

**Rate Limiting**: Multiple rate limiting strategies including per-IP, per-user, and per-endpoint limits. Includes progressive delays and temporary account lockouts for suspicious activity.

**Environment Management**: Secure handling of sensitive configuration data using environment variables. Includes validation of required environment variables and secure defaults.

**SQL Injection Prevention**: Parameterized queries through Sequelize ORM with additional input sanitization and query logging for security monitoring.

**Session Security**: Secure session management with httpOnly cookies, secure flags, and proper session expiration handling.

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MySQL (v8.0 or higher)
- pnpm package manager
- Git for version control

### Installation Steps

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd typescript-node-express-mysql-boilerplate
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Environment Configuration**

   ```bash
   cp .env.example .env
   # Edit .env with your database credentials and configuration
   ```

4. **Database Setup**

   ```bash
   # Create database
   pnpm run db:create

   # Run migrations
   pnpm run db:migrate

   # Seed initial data (optional)
   pnpm run db:seed
   ```

5. **Run the application**

   ```bash
   # Development mode with hot reload
   pnpm run dev

   # Production build
   pnpm run build
   pnpm start
   ```

The application will be available at `http://localhost:3000` (or your configured port).

## Contribution Guidelines

We welcome contributions from the developer community. To maintain code quality and consistency, please follow these guidelines:

**Code Standards**: The project uses ESLint and Prettier for code formatting and linting. All code must pass linting checks before submission. TypeScript strict mode is enabled, and all code should be properly typed.

**Testing Requirements**: All new features must include appropriate unit and integration tests. The project maintains a minimum test coverage threshold of 80%. Use Jest for testing framework and include both positive and negative test cases.

**Pull Request Process**: Fork the repository, create a feature branch with a descriptive name, implement your changes with tests, and submit a pull request with a clear description of the changes and their purpose.

**Documentation**: Update relevant documentation for any new features or changes. Include JSDoc comments for all public functions and maintain the README file with any configuration changes.

**Commit Messages**: Use conventional commit format with clear, descriptive messages. Include issue numbers when applicable and provide context for complex changes.

## Licensing

This project is released under the MIT License, which permits unrestricted use, modification, and distribution. The MIT License encourages open-source collaboration while providing maximum flexibility for both personal and commercial use.

You are free to use this boilerplate in your projects, modify it according to your needs, and distribute it with or without changes. Attribution is appreciated but not required. The license ensures that you can confidently build upon this foundation without legal concerns.

For the complete license text and terms, please refer to the LICENSE file in the project repository.
