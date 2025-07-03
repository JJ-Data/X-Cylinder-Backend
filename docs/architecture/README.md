# Architecture Overview

## System Architecture

The CellerHut Logistics API follows a layered architecture pattern that promotes separation of concerns, maintainability, and scalability.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Applications                   │
│                 (Web, Mobile, Third-party APIs)             │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                       │
│                  (Express.js + Middleware)                   │
├─────────────────────────────────────────────────────────────┤
│  • Rate Limiting        • CORS              • Compression   │
│  • Authentication       • Logging           • Error Handler │
│  • Request Validation   • Cache Headers     • Security      │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                      Route Layer                             │
│                   (RESTful Endpoints)                        │
├─────────────────────────────────────────────────────────────┤
│  • /auth/*             • /users/*          • /upload/*      │
│  • /admin/*            • /health           • /api-docs      │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    Controller Layer                          │
│              (Request/Response Handling)                     │
├─────────────────────────────────────────────────────────────┤
│  • Request parsing     • Response formatting                │
│  • Input validation    • Error handling                     │
│  • Service orchestration                                     │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                     Service Layer                            │
│                  (Business Logic)                            │
├─────────────────────────────────────────────────────────────┤
│  • AuthService         • UserService       • EmailService   │
│  • FileUploadService   • CacheService      • TokenService   │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Access Layer                         │
│              (Sequelize ORM + Models)                        │
├─────────────────────────────────────────────────────────────┤
│  • User Model          • RefreshToken Model                 │
│  • PasswordResetToken  • EmailVerificationToken             │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                   Infrastructure Layer                       │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │    MySQL     │  │    Redis     │  │  Storage (S3)    │ │
│  │   Database   │  │    Cache     │  │  File Storage    │ │
│  └──────────────┘  └──────────────┘  └──────────────────┘ │
│  ┌──────────────┐  ┌──────────────┐                       │
│  │ Email Provider│ │   Logging    │                       │
│  │ (SES/SMTP)   │  │  (Winston)   │                       │
│  └──────────────┘  └──────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
src/
├── config/              # Configuration files
│   ├── constants.ts     # Application constants
│   ├── database.ts      # Database configuration
│   └── environment.ts   # Environment variables
│
├── controllers/         # Request handlers
│   ├── auth.controller.ts
│   └── user.controller.ts
│
├── middlewares/         # Express middlewares
│   ├── auth.middleware.ts
│   ├── cache.middleware.ts
│   ├── error.middleware.ts
│   └── validation.middleware.ts
│
├── models/             # Database models
│   ├── User.model.ts
│   ├── RefreshToken.model.ts
│   └── associations.ts
│
├── routes/             # API routes
│   ├── auth.routes.ts
│   ├── user.routes.ts
│   └── index.ts
│
├── services/           # Business logic
│   ├── auth.service.ts
│   ├── user.service.ts
│   ├── email/
│   ├── cache/
│   └── storage/
│
├── utils/              # Utility functions
│   ├── errors.ts
│   ├── helpers.ts
│   ├── logger.ts
│   └── validation.ts
│
├── types/              # TypeScript types
│   ├── auth.types.ts
│   ├── common.types.ts
│   └── user.types.ts
│
├── app.ts              # Express app setup
└── server.ts           # Server entry point
```

## Core Components

### 1. Express Application

The Express application is configured with essential middleware:

```typescript
// app.ts
app.use(helmet());           // Security headers
app.use(cors());            // CORS support
app.use(compression());     // Response compression
app.use(express.json());    // JSON parsing
app.use(morgan());          // Request logging
app.use(rateLimiter());     // Rate limiting
```

### 2. Database Layer

Using Sequelize ORM with MySQL:

- **Models**: Define database schema with TypeScript
- **Migrations**: Version control for database changes
- **Associations**: Define relationships between models
- **Transactions**: Ensure data consistency

### 3. Authentication System

JWT-based authentication with:

- **Access Tokens**: Short-lived tokens for API access
- **Refresh Tokens**: Long-lived tokens for token renewal
- **Token Rotation**: Security through token rotation
- **Session Management**: Track and invalidate sessions

### 4. Service Layer Pattern

Services encapsulate business logic:

```typescript
class AuthService {
  async register(data: RegisterDTO): Promise<User> {
    // Business logic
  }
  
  async login(credentials: LoginDTO): Promise<TokenPair> {
    // Business logic
  }
}
```

### 5. Error Handling

Centralized error handling with custom error classes:

```typescript
class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 422, 'VALIDATION_ERROR', details);
  }
}
```

### 6. Caching Strategy

Redis-based caching with:

- **Method Decorators**: `@Cacheable`, `@CacheEvict`
- **HTTP Response Caching**: Middleware for response caching
- **Cache Invalidation**: Smart invalidation strategies
- **Fallback Mechanism**: Graceful degradation when Redis is unavailable

### 7. File Storage

Abstracted storage layer supporting:

- **Local Storage**: Development environment
- **AWS S3**: Production cloud storage
- **DigitalOcean Spaces**: Alternative cloud storage
- **Provider Pattern**: Easy switching between providers

## Design Patterns

### 1. Singleton Pattern

Used for services that should have a single instance:

```typescript
class EmailService {
  private static instance: EmailService;
  
  static getInstance(): EmailService {
    if (!this.instance) {
      this.instance = new EmailService();
    }
    return this.instance;
  }
}
```

### 2. Factory Pattern

Used for creating provider instances:

```typescript
class StorageProviderFactory {
  static create(type: string): StorageProvider {
    switch(type) {
      case 's3': return new S3Provider();
      case 'local': return new LocalProvider();
      default: throw new Error('Unknown provider');
    }
  }
}
```

### 3. Decorator Pattern

Used for adding functionality to methods:

```typescript
@Cacheable({ ttl: 3600 })
async getUser(id: number): Promise<User> {
  return await User.findByPk(id);
}
```

### 4. Repository Pattern

Abstraction over data access:

```typescript
class UserRepository {
  async findById(id: number): Promise<User | null> {
    return await User.findByPk(id);
  }
  
  async findByEmail(email: string): Promise<User | null> {
    return await User.findOne({ where: { email } });
  }
}
```

## Security Architecture

### Authentication & Authorization

1. **JWT Tokens**: Stateless authentication
2. **Refresh Token Rotation**: Enhanced security
3. **Role-Based Access Control**: Fine-grained permissions
4. **Session Management**: Track active sessions

### Data Protection

1. **Password Hashing**: bcrypt with salt rounds
2. **Input Validation**: Joi schema validation
3. **SQL Injection Prevention**: Parameterized queries
4. **XSS Protection**: Content security policies

### API Security

1. **Rate Limiting**: Prevent abuse
2. **CORS Configuration**: Control cross-origin access
3. **Helmet.js**: Security headers
4. **HTTPS Enforcement**: Encrypted communication

## Scalability Considerations

### Horizontal Scaling

- **Stateless Design**: No server-side sessions
- **Load Balancing**: Ready for multiple instances
- **Shared Cache**: Redis for distributed caching
- **Database Pooling**: Connection management

### Performance Optimization

- **Response Caching**: Redis-based caching
- **Database Indexing**: Optimized queries
- **Lazy Loading**: Load data as needed
- **Compression**: Gzip response compression

### Monitoring & Logging

- **Structured Logging**: Winston with JSON format
- **Error Tracking**: Centralized error handling
- **Performance Metrics**: Response time tracking
- **Health Checks**: Endpoint monitoring

## Deployment Architecture

### Development Environment

```
Developer Machine
├── Node.js Application
├── MySQL (Docker)
├── Redis (Docker)
└── Local File Storage
```

### Production Environment

```
Load Balancer
├── Node.js Instance 1
├── Node.js Instance 2
└── Node.js Instance N
    │
    ├── MySQL Cluster
    ├── Redis Cluster
    ├── S3 Storage
    └── Email Service (SES)
```

## Future Considerations

### Microservices Migration

The current monolithic architecture can be split into:

1. **Auth Service**: Authentication and authorization
2. **User Service**: User management
3. **File Service**: File upload and management
4. **Notification Service**: Email and notifications

### Event-Driven Architecture

Consider implementing:

1. **Message Queue**: RabbitMQ or AWS SQS
2. **Event Bus**: For service communication
3. **CQRS Pattern**: Separate read/write operations
4. **Event Sourcing**: Audit trail and history

### API Gateway

Implement a dedicated API gateway for:

1. **Request Routing**: Route to appropriate services
2. **Authentication**: Centralized auth handling
3. **Rate Limiting**: Global rate limits
4. **API Versioning**: Manage multiple versions

## Best Practices

1. **Separation of Concerns**: Keep layers independent
2. **Dependency Injection**: Loose coupling
3. **Interface Segregation**: Small, focused interfaces
4. **Single Responsibility**: One purpose per class/function
5. **DRY Principle**: Avoid code duplication
6. **SOLID Principles**: Follow OOP best practices

## Conclusion

The architecture is designed to be:

- **Maintainable**: Clear structure and separation
- **Scalable**: Ready for growth
- **Secure**: Multiple security layers
- **Testable**: Easy to unit and integration test
- **Flexible**: Easy to extend and modify