# CylinderX Logistics API

A comprehensive, production-ready API for logistics management built with TypeScript, Node.js, Express, and MySQL with Sequelize ORM.

## 📚 Documentation

For detailed documentation, please visit the [docs](./docs) directory:

- [Getting Started Guide](./docs/getting-started/README.md)
- [API Reference](./docs/api/README.md)
- [Feature Documentation](./docs/README.md)
- [Architecture Overview](./docs/architecture/README.md)
- [Contributing Guidelines](./docs/contributing/DOCUMENTATION.md)

## Features

### Core Features

- **TypeScript** for type safety and better developer experience
- **Express.js** web framework with modular architecture
- **MySQL** database with **Sequelize ORM**
- **JWT Authentication** with access and refresh tokens
- **Role-based Access Control (RBAC)**
- **Input Validation** using Joi
- **Error Handling** with custom error classes
- **Security Best Practices** (helmet, cors, rate limiting)
- **Logging** with Winston
- **Testing** setup with Jest
- **Environment Configuration** with dotenv
- **Database Migrations** and seeders
- **API Documentation** with Swagger/OpenAPI

### Enhanced Features

- **Email Service** with multiple provider support (AWS SES, SendGrid, Resend, SMTP)
- **Email Verification** system with secure token generation
- **Password Reset** functionality with email notifications
- **File Upload** service with S3/Spaces/Local storage support
- **Redis Caching** layer with decorators and middleware
- **Image Processing** with automatic resizing and optimization
- **Rate Limiting** with Redis-based distributed limiting
- **Comprehensive Documentation** in the `/docs` directory

## Prerequisites

- Node.js (v16 or higher)
- MySQL (v8.0 or higher)
- pnpm package manager

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd typescript-node-express-mysql-boilerplate
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Environment Setup

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Update the `.env` file with your configuration:

```env
# Application
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d
```

### 4. Database Setup

Create the database:

```bash
pnpm run db:create
```

Run migrations:

```bash
pnpm run db:migrate
```

(Optional) Seed the database:

```bash
pnpm run db:seed
```

### 5. Run the application

Development mode with hot reload:

```bash
pnpm run dev
```

Production mode:

```bash
pnpm run build
pnpm start
```

## Project Structure

```
src/
├── config/          # Configuration files
├── controllers/     # Route controllers
├── middlewares/     # Custom middlewares
├── models/          # Sequelize models
├── routes/          # API routes
├── services/        # Business logic
├── utils/           # Utility functions
├── types/           # TypeScript types
├── database/        # Migrations and seeders
├── tests/           # Test files
├── app.ts           # Express app setup
└── server.ts        # Server entry point
```

## Available Scripts

- `pnpm run dev` - Start development server with hot reload
- `pnpm run build` - Build for production
- `pnpm start` - Start production server
- `pnpm test` - Run tests
- `pnpm run lint` - Run ESLint
- `pnpm run format` - Format code with Prettier
- `pnpm run typecheck` - Run TypeScript type checking

## API Endpoints

### Authentication

- `POST /api/v1/auth/register` - Register a new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout (invalidate refresh token)
- `POST /api/v1/auth/logout-all` - Logout from all devices

### Users

- `GET /api/v1/users/profile` - Get current user profile
- `PATCH /api/v1/users/profile` - Update profile
- `PATCH /api/v1/users/email` - Update email
- `PATCH /api/v1/users/password` - Change password

### Admin Users

- `GET /api/v1/users` - Get all users (paginated)
- `GET /api/v1/users/:id` - Get user by ID
- `DELETE /api/v1/users/:id` - Delete user
- `PATCH /api/v1/users/:id/toggle-status` - Toggle user active status

## Authentication Flow

1. **Registration**: Users register with email, password, and profile information
2. **Login**: Users receive access token (short-lived) and refresh token (long-lived)
3. **Protected Routes**: Include access token in Authorization header: `Bearer <token>`
4. **Token Refresh**: Use refresh token to get new access token when expired

## Security Features

- Password hashing with bcrypt
- JWT tokens for authentication
- Rate limiting on authentication endpoints
- Input validation and sanitization
- SQL injection prevention via Sequelize
- XSS protection with helmet
- CORS configuration

## Testing

Run all tests:

```bash
pnpm test
```

Run tests in watch mode:

```bash
pnpm test:watch
```

Run tests with coverage:

```bash
pnpm test:coverage
```

## Development Guidelines

### Adding a New Feature

1. Create model in `src/models/`
2. Create migration: `pnpm run db:migration:generate --name=your-migration`
3. Create service in `src/services/`
4. Create controller in `src/controllers/`
5. Add routes in `src/routes/`
6. Add validation schemas in `src/utils/validation.ts`
7. Write tests

### Code Style

- Follow TypeScript best practices
- Use ESLint and Prettier for consistent code style
- Write meaningful commit messages
- Add JSDoc comments for public functions
- Keep functions small and focused

## Error Handling

The application uses custom error classes for different scenarios:

- `ValidationError` - For input validation errors
- `UnauthorizedError` - For authentication failures
- `ForbiddenError` - For authorization failures
- `NotFoundError` - For resource not found
- `ConflictError` - For resource conflicts
- `BadRequestError` - For bad requests

## Environment Variables

See `.env.example` for all available environment variables and their descriptions.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
