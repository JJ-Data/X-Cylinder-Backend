import crypto from 'crypto';
import { Request } from 'express';

/**
 * Generate cache key for user-specific data
 */
export function userCacheKey(userId: string, resource: string, ...params: any[]): string {
  const paramsKey = params.length > 0 ? `:${hashParams(params)}` : '';
  return `user:${userId}:${resource}${paramsKey}`;
}

/**
 * Generate cache key for resource lists with pagination
 */
export function listCacheKey(
  resource: string,
  page: number = 1,
  limit: number = 10,
  filters: Record<string, any> = {}
): string {
  const filterKey = Object.keys(filters).length > 0 ? `:${hashParams([filters])}` : '';
  return `list:${resource}:page${page}:limit${limit}${filterKey}`;
}

/**
 * Generate cache key for single resource by ID
 */
export function resourceCacheKey(resource: string, id: string | number): string {
  return `${resource}:${id}`;
}

/**
 * Generate cache key for API endpoints
 */
export function apiCacheKey(req: Request): string {
  const { method, path, query, params } = req;
  const userId = (req as any).user?.id;

  const parts = ['api', method.toLowerCase(), path.replace(/\//g, ':')];

  // Add user ID if authenticated
  if (userId) {
    parts.push(`user:${userId}`);
  }

  // Add route params
  if (Object.keys(params).length > 0) {
    parts.push(`params:${hashParams([params])}`);
  }

  // Add query params
  if (Object.keys(query).length > 0) {
    parts.push(`query:${hashParams([query])}`);
  }

  return parts.join(':');
}

/**
 * Generate cache key for search results
 */
export function searchCacheKey(
  resource: string,
  searchTerm: string,
  options: {
    page?: number;
    limit?: number;
    sort?: string;
    filters?: Record<string, any>;
  } = {}
): string {
  const { page = 1, limit = 10, sort = '', filters = {} } = options;

  const parts = ['search', resource, hashParams([searchTerm]), `page${page}`, `limit${limit}`];

  if (sort) {
    parts.push(`sort:${sort}`);
  }

  if (Object.keys(filters).length > 0) {
    parts.push(`filters:${hashParams([filters])}`);
  }

  return parts.join(':');
}

/**
 * Generate cache key for aggregated data
 */
export function aggregateCacheKey(
  resource: string,
  aggregationType: string,
  params: Record<string, any> = {}
): string {
  const paramsKey = Object.keys(params).length > 0 ? `:${hashParams([params])}` : '';
  return `aggregate:${resource}:${aggregationType}${paramsKey}`;
}

/**
 * Generate cache key for session data
 */
export function sessionCacheKey(sessionId: string, dataType?: string): string {
  return dataType ? `session:${sessionId}:${dataType}` : `session:${sessionId}`;
}

/**
 * Generate cache key for temporary data (OTP, tokens, etc.)
 */
export function tempDataCacheKey(type: string, identifier: string): string {
  return `temp:${type}:${identifier}`;
}

/**
 * Generate cache key patterns for invalidation
 */
export const cachePatterns = {
  // User-related patterns
  userAll: (userId: string): string => `user:${userId}:*`,
  userResource: (userId: string, resource: string): string => `user:${userId}:${resource}*`,

  // Resource patterns
  resourceAll: (resource: string): string => `${resource}:*`,
  resourceLists: (resource: string): string => `list:${resource}:*`,
  resourceSearch: (resource: string): string => `search:${resource}:*`,

  // API patterns
  apiEndpoint: (path: string): string => `api:*:${path.replace(/\//g, ':')}:*`,
  apiUser: (userId: string): string => `api:*:*:user:${userId}:*`,

  // Session patterns
  sessionAll: (sessionId: string): string => `session:${sessionId}:*`,

  // Temporary data patterns
  tempDataType: (type: string): string => `temp:${type}:*`,
};

/**
 * Hash parameters to create a consistent key
 */
function hashParams(params: any[]): string {
  const str = JSON.stringify(params);
  return crypto.createHash('md5').update(str).digest('hex').substring(0, 8);
}

/**
 * Generate versioned cache key
 */
export function versionedCacheKey(key: string, version: string | number): string {
  return `v${version}:${key}`;
}

/**
 * Generate cache key with namespace
 */
export function namespacedCacheKey(namespace: string, key: string): string {
  return `${namespace}:${key}`;
}

/**
 * Generate cache key for role-based data
 */
export function roleCacheKey(role: string, resource: string, ...params: any[]): string {
  const paramsKey = params.length > 0 ? `:${hashParams(params)}` : '';
  return `role:${role}:${resource}${paramsKey}`;
}

/**
 * Generate cache key for permission checks
 */
export function permissionCacheKey(userId: string, resource: string, action: string): string {
  return `permission:${userId}:${resource}:${action}`;
}

/**
 * Generate cache key for rate limiting
 */
export function rateLimitKey(identifier: string, window: string): string {
  return `ratelimit:${identifier}:${window}`;
}

/**
 * Generate cache key for distributed locks
 */
export function lockKey(resource: string, identifier: string): string {
  return `lock:${resource}:${identifier}`;
}
