# Email Verification Usage Guide

## Overview
The email verification functionality has been implemented to ensure users verify their email addresses after registration.

## Implementation Details

### 1. User Registration Flow
When a user registers:
- A user account is created with `emailVerified: false`
- An email verification token is generated and stored in the `email_verification_tokens` table
- A verification email is sent to the user's email address
- The user receives authentication tokens (can login immediately but with limited access)

### 2. Email Verification Process
Users can verify their email by:
- Clicking the verification link in the email
- The link contains a unique token valid for 24 hours
- Upon successful verification:
  - `emailVerified` is set to `true`
  - `emailVerifiedAt` is set to the current timestamp
  - The verification token is marked as used

### 3. Resending Verification Email
If users don't receive or lose the verification email:
- They can request a new verification email
- Rate limiting prevents spam (5-minute cooldown between requests)
- Old unused tokens are invalidated when a new one is created

## API Endpoints

### 1. Verify Email
```
GET /api/v1/auth/verify-email/:token
```
- **Purpose**: Verify user's email address
- **Parameters**: `token` (URL parameter)
- **Response**: Success message and user data

### 2. Resend Verification Email
```
POST /api/v1/auth/resend-verification-email
```
- **Purpose**: Send a new verification email
- **Body**: 
```json
{
  "email": "user@example.com"
}
```
- **Response**: Success message (generic for security)

## Middleware Usage

### 1. Require Verified Email
Use this middleware to protect routes that require email verification:

```typescript
import { authenticate } from '@middlewares/auth.middleware';
import { requireVerifiedEmail } from '@middlewares/emailVerification.middleware';

router.post(
  '/sensitive-action',
  authenticate,
  requireVerifiedEmail,
  SomeController.sensitiveAction
);
```

### 2. Check Email Verification Status
Use this middleware to check verification status without blocking:

```typescript
import { authenticate } from '@middlewares/auth.middleware';
import { checkEmailVerification } from '@middlewares/emailVerification.middleware';

router.get(
  '/profile',
  authenticate,
  checkEmailVerification,
  (req, res) => {
    // Access req.emailVerified to know status
    if (req.emailVerified) {
      // Full access
    } else {
      // Limited access with warning
    }
  }
);
```

## Security Considerations

1. **Token Security**:
   - Tokens are cryptographically secure random strings
   - Tokens expire after 24 hours
   - Tokens are single-use only

2. **Rate Limiting**:
   - Verification email resend is rate-limited
   - 5-minute cooldown between requests

3. **Information Disclosure**:
   - Generic messages prevent email enumeration
   - Same response whether email exists or not

## Database Schema

### EmailVerificationToken Model
- `id`: Primary key
- `userId`: Foreign key to users table
- `token`: Unique verification token
- `expiresAt`: Token expiration timestamp
- `verified`: Boolean flag
- `verifiedAt`: Verification timestamp
- `createdAt`, `updatedAt`: Timestamps

### User Model Updates
- `emailVerified`: Boolean (default: false)
- `emailVerifiedAt`: Timestamp (nullable)

## Edge Cases Handled

1. **Already Verified Email**: Returns success with appropriate message
2. **Expired Token**: Returns error with clear message
3. **Invalid/Used Token**: Returns error
4. **User Not Found**: Returns error
5. **Recent Request**: Prevents spam with rate limiting
6. **Failed Email Send**: Logs error but doesn't fail registration

## Testing the Implementation

1. **Register a new user**:
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

2. **Check email for verification link** or manually verify:
```bash
curl -X GET http://localhost:3000/api/v1/auth/verify-email/YOUR_TOKEN_HERE
```

3. **Resend verification email**:
```bash
curl -X POST http://localhost:3000/api/v1/auth/resend-verification-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

## Integration with Frontend

The frontend should:
1. Show a banner/notification for unverified users
2. Provide a "Resend Verification Email" button
3. Handle the verification link redirect
4. Update UI when email is verified
5. Restrict access to certain features for unverified users