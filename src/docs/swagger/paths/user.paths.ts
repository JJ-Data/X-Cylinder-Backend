import { PathBuilder } from '../builder/PathBuilder';

const pb = new PathBuilder();

export const userPaths = {
  '/users/profile': {
    get: pb
      .endpoint('getUserProfile', 'Users')
      .summary('Get user profile')
      .description("Get the authenticated user's profile information")
      .security([{ BearerAuth: [] }])
      .response(200, 'UserProfileResponse', 'User profile retrieved successfully')
      .response(401, 'Error', 'Unauthorized')
      .response(500, 'Error', 'Internal server error')
      .build(),

    patch: pb
      .endpoint('updateUserProfile', 'Users')
      .summary('Update user profile')
      .description("Update the authenticated user's profile information")
      .security([{ BearerAuth: [] }])
      .body('UpdateProfileRequest')
      .response(200, 'UserProfileResponse', 'Profile updated successfully')
      .response(400, 'ValidationError', 'Invalid input data')
      .response(401, 'Error', 'Unauthorized')
      .response(500, 'Error', 'Internal server error')
      .build(),
  },

  '/users/email': {
    patch: pb
      .endpoint('updateUserEmail', 'Users')
      .summary('Update user email')
      .description(
        "Update the authenticated user's email address. Requires password confirmation and will trigger email verification."
      )
      .security([{ BearerAuth: [] }])
      .body('UpdateEmailRequest')
      .response(200, 'SuccessResponse', 'Email update initiated. Verification email sent.')
      .response(400, 'ValidationError', 'Invalid input data')
      .response(401, 'Error', 'Invalid password')
      .response(409, 'Error', 'Email already in use')
      .response(500, 'Error', 'Internal server error')
      .build(),
  },

  '/users/password': {
    patch: pb
      .endpoint('changeUserPassword', 'Users')
      .summary('Change user password')
      .description("Change the authenticated user's password")
      .security([{ BearerAuth: [] }])
      .body('ChangePasswordRequest')
      .response(200, 'SuccessResponse', 'Password changed successfully')
      .response(400, 'ValidationError', 'Invalid input data')
      .response(401, 'Error', 'Invalid current password')
      .response(500, 'Error', 'Internal server error')
      .build(),
  },

  '/users': {
    get: pb
      .endpoint('getUsers', 'Users')
      .summary('Get all users (Admin only)')
      .description('Retrieve a paginated list of all users. Requires admin role.')
      .security([{ BearerAuth: [] }])
      .query('page', 'integer', false, 'Page number')
      .query('pageSize', 'integer', false, 'Items per page')
      .query('sortBy', 'string', false, 'Sort field')
      .query('sortOrder', 'string', false, 'Sort order (asc/desc)')
      .query('role', 'string', false, 'Filter by user role')
      .query('isActive', 'boolean', false, 'Filter by active status')
      .query('emailVerified', 'boolean', false, 'Filter by email verification status')
      .response(200, 'UsersListResponse', 'Users retrieved successfully')
      .response(400, 'ValidationError', 'Invalid query parameters')
      .response(401, 'Error', 'Unauthorized')
      .response(403, 'Error', 'Forbidden - Admin only')
      .response(500, 'Error', 'Internal server error')
      .build(),
  },

  '/users/{id}': {
    get: pb
      .endpoint('getUserById', 'Users')
      .summary('Get user by ID (Admin only)')
      .description('Retrieve a specific user by their ID. Requires admin role.')
      .security([{ BearerAuth: [] }])
      .path('id', 'integer', 'User ID')
      .response(200, 'UserProfileResponse', 'User retrieved successfully')
      .response(400, 'ValidationError', 'Invalid user ID')
      .response(401, 'Error', 'Unauthorized')
      .response(403, 'Error', 'Forbidden - Admin only')
      .response(404, 'Error', 'User not found')
      .response(500, 'Error', 'Internal server error')
      .build(),

    delete: pb
      .endpoint('deleteUser', 'Users')
      .summary('Delete user (Admin only)')
      .description('Delete a user account. Requires admin role. Cannot delete own account.')
      .security([{ BearerAuth: [] }])
      .path('id', 'integer', 'User ID')
      .response(200, 'SuccessResponse', 'User deleted successfully')
      .response(400, 'Error', 'Cannot delete own account')
      .response(401, 'Error', 'Unauthorized')
      .response(403, 'Error', 'Forbidden - Admin only')
      .response(404, 'Error', 'User not found')
      .response(500, 'Error', 'Internal server error')
      .build(),
  },

  '/users/{id}/toggle-status': {
    patch: pb
      .endpoint('toggleUserStatus', 'Users')
      .summary('Toggle user status (Admin only)')
      .description('Activate or deactivate a user account. Requires admin role.')
      .security([{ BearerAuth: [] }])
      .path('id', 'integer', 'User ID')
      .response(200, 'UserProfileResponse', 'User status toggled successfully')
      .response(400, 'ValidationError', 'Invalid user ID')
      .response(401, 'Error', 'Unauthorized')
      .response(403, 'Error', 'Forbidden - Admin only')
      .response(404, 'Error', 'User not found')
      .response(500, 'Error', 'Internal server error')
      .build(),
  },
};
