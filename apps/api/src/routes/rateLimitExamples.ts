/**
 * Rate Limiting Integration Examples
 * Demonstrates how to apply rate limiting middleware to different types of routes
 * Based on Zeda's production patterns
 */

import { Router } from 'express';
import { verifySession } from 'supertokens-node/recipe/session/framework/express';
import { 
  createRateLimitMiddleware, 
  rateLimitMiddleware, 
  RateLimitEntity,
  DEFAULT_RATE_LIMITS 
} from '../middleware/rateLimitMiddleware';
import { authController } from '../controllers/authController';
import { feedbackController } from '../controllers/feedbackController';
import { organizationController } from '../controllers/organizationController';

/**
 * Example 1: Authentication Routes with Strict Rate Limiting
 * These routes need strict rate limiting to prevent brute force attacks
 */
export function createAuthRoutesWithRateLimit(): Router {
  const router = Router();

  // Apply authentication-specific rate limiting
  // More restrictive than general API rate limiting
  router.use(rateLimitMiddleware.auth);

  // Apply session verification after rate limiting
  router.use(verifySession());

  // Profile setup - allow more requests since users might retry
  const profileSetupRateLimit = createRateLimitMiddleware({
    interval: 60 * 1000,      // 1 minute
    maxInInterval: 10,        // 10 attempts per minute
    entity: RateLimitEntity.USER,
    customMessage: 'Too many profile setup attempts. Please wait before trying again.',
    headers: true
  });

  router.post('/setup-profile', 
    profileSetupRateLimit,
    authController.setupProfile.bind(authController)
  );

  // Profile status - lighter rate limiting for read operations
  const profileStatusRateLimit = createRateLimitMiddleware({
    interval: 60 * 1000,      // 1 minute
    maxInInterval: 30,        // 30 requests per minute
    entity: RateLimitEntity.USER,
    headers: true
  });

  router.get('/profile-status', 
    profileStatusRateLimit,
    authController.getProfileStatus.bind(authController)
  );

  // Account deletion - very strict rate limiting
  const accountDeletionRateLimit = createRateLimitMiddleware({
    interval: 60 * 60 * 1000,  // 1 hour
    maxInInterval: 3,          // 3 attempts per hour
    entity: RateLimitEntity.USER,
    customMessage: 'Account deletion attempts are limited. Please contact support if you need assistance.',
    headers: true
  });

  router.delete('/account', 
    accountDeletionRateLimit,
    authController.handleAccountDeletion.bind(authController)
  );

  return router;
}

/**
 * Example 2: API Routes with User-based Rate Limiting
 * Standard API operations with user-specific limits
 */
export function createAPIRoutesWithRateLimit(): Router {
  const router = Router();

  // Apply session verification
  router.use(verifySession());

  // Read operations - more permissive
  const readRateLimit = createRateLimitMiddleware({
    ...DEFAULT_RATE_LIMITS.API_READ,
    headers: true,
    customMessage: 'API read limit exceeded. Please slow down your requests.'
  });

  // Write operations - more restrictive
  const writeRateLimit = createRateLimitMiddleware({
    ...DEFAULT_RATE_LIMITS.API_WRITE,
    headers: true,
    customMessage: 'API write limit exceeded. Please reduce the frequency of write operations.'
  });

  // Delete operations - most restrictive
  const deleteRateLimit = createRateLimitMiddleware({
    ...DEFAULT_RATE_LIMITS.API_DELETE,
    headers: true,
    customMessage: 'API delete limit exceeded. Delete operations are strictly limited for safety.'
  });

  // Apply rate limiting to specific operations
  router.get('/feedback', readRateLimit); // List feedback
  router.get('/feedback/:id', readRateLimit); // Get single feedback
  
  router.post('/feedback', writeRateLimit); // Create feedback
  router.put('/feedback/:id', writeRateLimit); // Update feedback
  
  router.delete('/feedback/:id', deleteRateLimit); // Delete feedback

  return router;
}

/**
 * Example 3: Public API Routes with API Key-based Rate Limiting
 * For external integrations and third-party access
 */
export function createPublicAPIRoutesWithRateLimit(): Router {
  const router = Router();

  // Custom middleware to extract API key and determine tier
  const apiKeyMiddleware = (req: any, res: any, next: any) => {
    const apiKey = req.headers.authorization?.replace('Bearer ', '');
    
    // In a real implementation, you'd look up the API key in your database
    // and determine the tier (free, paid, enterprise)
    req.apiTier = 'free'; // Default to free tier
    req.organizationId = 'org-from-api-key'; // Set from API key lookup
    
    next();
  };

  router.use(apiKeyMiddleware);

  // Different rate limits based on API tier
  const freeAPIRateLimit = createRateLimitMiddleware({
    interval: 60 * 60 * 1000,  // 1 hour
    maxInInterval: 100,        // 100 requests per hour for free tier
    entity: RateLimitEntity.API_KEY,
    customMessage: 'Free tier API limit exceeded. Please upgrade your plan for higher limits.',
    headers: true
  });

  const paidAPIRateLimit = createRateLimitMiddleware({
    interval: 60 * 60 * 1000,  // 1 hour
    maxInInterval: 10000,      // 10,000 requests per hour for paid tier
    entity: RateLimitEntity.API_KEY,
    customMessage: 'Paid tier API limit exceeded. Please contact support if you need higher limits.',
    headers: true
  });

  // Apply rate limiting based on tier
  const tierBasedRateLimit = (req: any, res: any, next: any) => {
    const rateLimit = req.apiTier === 'free' ? freeAPIRateLimit : paidAPIRateLimit;
    rateLimit(req, res, next);
  };

  router.use(tierBasedRateLimit);

  // Public API endpoints
  router.post('/feedback', (req, res) => {
    res.json({ message: 'Feedback created via public API' });
  });

  router.get('/feedback', (req, res) => {
    res.json({ message: 'Feedback list via public API' });
  });

  return router;
}

/**
 * Example 4: Organization-level Rate Limiting
 * Prevents any single organization from overwhelming the system
 */
export function createOrganizationRoutesWithRateLimit(): Router {
  const router = Router();

  router.use(verifySession());

  // Organization-level rate limiting for resource-intensive operations
  const orgSyncRateLimit = createRateLimitMiddleware({
    interval: 60 * 60 * 1000,  // 1 hour
    maxInInterval: 50,         // 50 sync operations per hour per organization
    entity: RateLimitEntity.ORGANIZATION,
    customMessage: 'Organization sync limit exceeded. Please wait before syncing again.',
    headers: true
  });

  const orgBulkOperationsRateLimit = createRateLimitMiddleware({
    interval: 60 * 60 * 1000,  // 1 hour
    maxInInterval: 10,         // 10 bulk operations per hour per organization
    entity: RateLimitEntity.ORGANIZATION,
    customMessage: 'Organization bulk operation limit exceeded. These operations are resource-intensive.',
    headers: true
  });

  // Apply to resource-intensive endpoints
  router.post('/sync-integrations', 
    orgSyncRateLimit,
    organizationController.syncIntegrations?.bind(organizationController)
  );

  router.post('/bulk-update-feedback', 
    orgBulkOperationsRateLimit,
    feedbackController.bulkUpdate?.bind(feedbackController)
  );

  return router;
}

/**
 * Example 5: Webhook Routes with IP-based Rate Limiting
 * For incoming webhooks from external services
 */
export function createWebhookRoutesWithRateLimit(): Router {
  const router = Router();

  // Webhook rate limiting by IP - prevent webhook spam
  const webhookRateLimit = createRateLimitMiddleware({
    interval: 60 * 1000,       // 1 minute
    maxInInterval: 100,        // 100 webhook calls per minute per IP
    entity: RateLimitEntity.IP,
    customMessage: 'Webhook rate limit exceeded. Please check your webhook configuration.',
    headers: true,
    skipPaths: ['/webhooks/health'] // Don't rate limit health checks
  });

  router.use(webhookRateLimit);

  // Webhook endpoints
  router.post('/slack', (req, res) => {
    res.json({ message: 'Slack webhook processed' });
  });

  router.post('/zendesk', (req, res) => {
    res.json({ message: 'Zendesk webhook processed' });
  });

  router.post('/intercom', (req, res) => {
    res.json({ message: 'Intercom webhook processed' });
  });

  return router;
}

/**
 * Example 6: Custom Rate Limiting for Specific Use Cases
 */
export function createCustomRateLimitExamples(): Router {
  const router = Router();

  // Example: File upload rate limiting
  const fileUploadRateLimit = createRateLimitMiddleware({
    interval: 60 * 60 * 1000,  // 1 hour
    maxInInterval: 10,         // 10 file uploads per hour
    entity: RateLimitEntity.USER,
    customMessage: 'File upload limit exceeded. Please wait before uploading more files.',
    headers: true
  });

  // Example: Email sending rate limiting
  const emailRateLimit = createRateLimitMiddleware({
    interval: 60 * 60 * 1000,  // 1 hour
    maxInInterval: 50,         // 50 emails per hour per user
    entity: RateLimitEntity.USER,
    customMessage: 'Email sending limit exceeded to prevent spam.',
    headers: true
  });

  // Example: Search rate limiting (to prevent expensive queries)
  const searchRateLimit = createRateLimitMiddleware({
    interval: 60 * 1000,       // 1 minute
    maxInInterval: 20,         // 20 searches per minute
    entity: RateLimitEntity.USER,
    customMessage: 'Search rate limit exceeded. Please wait before searching again.',
    headers: true
  });

  router.post('/upload', fileUploadRateLimit, (req, res) => {
    res.json({ message: 'File upload endpoint' });
  });

  router.post('/send-email', emailRateLimit, (req, res) => {
    res.json({ message: 'Email sent' });
  });

  router.get('/search', searchRateLimit, (req, res) => {
    res.json({ message: 'Search results' });
  });

  return router;
}

// Export all examples for use in the main application
export default {
  createAuthRoutesWithRateLimit,
  createAPIRoutesWithRateLimit,
  createPublicAPIRoutesWithRateLimit,
  createOrganizationRoutesWithRateLimit,
  createWebhookRoutesWithRateLimit,
  createCustomRateLimitExamples
};