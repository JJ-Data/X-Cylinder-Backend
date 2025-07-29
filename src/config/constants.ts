export const CONSTANTS = {
  // API versioning
  API_PREFIX: '/api',
  API_VERSION: 'v1',

  // Pagination
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  // Authentication
  SALT_ROUNDS: 10,
  PASSWORD_MIN_LENGTH: 6,
  PASSWORD_REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,

  // User roles
  USER_ROLES: {
    ADMIN: 'admin',
    CUSTOMER: 'customer',
    STAFF: 'staff',
    REFILL_OPERATOR: 'refill_operator',
  } as const,

  // Cylinder status
  CYLINDER_STATUS: {
    AVAILABLE: 'available',
    LEASED: 'leased',
    REFILLING: 'refilling',
    DAMAGED: 'damaged',
    RETIRED: 'retired',
  } as const,

  // HTTP Status codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
  } as const,

  // Error messages
  ERROR_MESSAGES: {
    INVALID_CREDENTIALS: 'Invalid email or password',
    UNAUTHORIZED: 'Unauthorized access',
    FORBIDDEN: 'Forbidden access',
    NOT_FOUND: 'Resource not found',
    VALIDATION_ERROR: 'Validation error',
    INTERNAL_ERROR: 'Internal server error',
    DUPLICATE_EMAIL: 'Email already exists',
    INVALID_TOKEN: 'Invalid or expired token',
    TOKEN_EXPIRED: 'Token has expired',
    RATE_LIMIT_EXCEEDED: 'Too many requests, please try again later',
    EMAIL_NOT_VERIFIED: 'Email verification required',
    EMAIL_ALREADY_VERIFIED: 'Email is already verified',
  } as const,

  // Success messages
  SUCCESS_MESSAGES: {
    LOGIN_SUCCESS: 'Login successful',
    LOGOUT_SUCCESS: 'Logout successful',
    REGISTER_SUCCESS: 'Registration successful',
    PASSWORD_RESET_SUCCESS: 'Password reset successful',
    EMAIL_SENT: 'Email sent successfully',
    EMAIL_VERIFIED: 'Email verified successfully',
    VERIFICATION_EMAIL_SENT: 'Verification email sent successfully',
    RESOURCE_CREATED: 'Resource created successfully',
    RESOURCE_UPDATED: 'Resource updated successfully',
    RESOURCE_DELETED: 'Resource deleted successfully',
  } as const,

  // Regex patterns
  REGEX: {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  } as const,
} as const;

export type UserRole = (typeof CONSTANTS.USER_ROLES)[keyof typeof CONSTANTS.USER_ROLES];
export type CylinderStatus =
  (typeof CONSTANTS.CYLINDER_STATUS)[keyof typeof CONSTANTS.CYLINDER_STATUS];
export type HttpStatus = (typeof CONSTANTS.HTTP_STATUS)[keyof typeof CONSTANTS.HTTP_STATUS];
export type ErrorMessage = (typeof CONSTANTS.ERROR_MESSAGES)[keyof typeof CONSTANTS.ERROR_MESSAGES];
export type SuccessMessage =
  (typeof CONSTANTS.SUCCESS_MESSAGES)[keyof typeof CONSTANTS.SUCCESS_MESSAGES];
