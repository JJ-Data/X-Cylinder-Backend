# Getting Started with CellerHut Logistics API

This guide will help you get the CellerHut Logistics API up and running quickly.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **MySQL** (v8.0 or higher) - [Download](https://www.mysql.com/downloads/)
- **Redis** (optional, for caching) - [Download](https://redis.io/download)
- **pnpm** package manager - Install with `npm install -g pnpm`

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd "CellerHut Logistics/API"
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration. At minimum, you need:

```env
# Application
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=cellerhut_logistics
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password

# JWT Secrets (generate secure random strings)
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here
```

### 4. Setup Database

Create the database:

```bash
pnpm run db:create
```

Run migrations:

```bash
pnpm run db:migrate
```

### 5. Start the Application

Development mode (with hot reload):

```bash
pnpm run dev
```

The API will be available at `http://localhost:3000`

## First Steps

### 1. Check API Health

```bash
curl http://localhost:3000/api/v1/health
```

### 2. View API Documentation

Open your browser and navigate to:
- Swagger UI: `http://localhost:3000/api-docs`

### 3. Register Your First User

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "SecurePass123!",
    "firstName": "Admin",
    "lastName": "User"
  }'
```

### 4. Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "SecurePass123!"
  }'
```

Save the `accessToken` from the response for authenticated requests.

### 5. Make an Authenticated Request

```bash
curl http://localhost:3000/api/v1/users/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Next Steps

### Enable Additional Features

1. **Email Service**: Configure email provider in `.env`:
   ```env
   EMAIL_PROVIDER=smtp
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   ```

2. **Redis Caching**: Configure Redis in `.env`:
   ```env
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```

3. **File Upload**: Configure storage provider in `.env`:
   ```env
   STORAGE_PROVIDER=local
   LOCAL_STORAGE_PATH=uploads
   ```

### Explore the Documentation

- [API Reference](../api/README.md) - Complete API documentation
- [Features Guide](../features/README.md) - Detailed feature documentation
- [Architecture Overview](../architecture/README.md) - System design and patterns

### Development Tools

- **Run Tests**: `pnpm test`
- **Lint Code**: `pnpm run lint`
- **Type Check**: `pnpm run typecheck`
- **Format Code**: `pnpm run format`

## Common Issues

### Database Connection Failed
- Ensure MySQL is running
- Check database credentials in `.env`
- Verify database exists: `pnpm run db:create`

### Port Already in Use
- Change the PORT in `.env` to another value (e.g., 3001)
- Or stop the process using port 3000

### Missing Dependencies
- Run `pnpm install` again
- Delete `node_modules` and `pnpm-lock.yaml`, then reinstall

## Getting Help

- Check [Troubleshooting Guide](../troubleshooting.md)
- Review [FAQ](../faq.md)
- Explore [API Examples](../api/examples.md)

---

Ready to build something amazing? Happy coding!