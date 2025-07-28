/**
 * User Routes
 * RESTful API endpoints for user profile management
 * Following Zeda patterns for clean API design
 */

import { Router } from 'express';
import { verifySession } from 'supertokens-node/recipe/session/framework/express';
import { userController } from '../controllers/userController';

const router = Router();

// All user routes require authentication
router.use(verifySession());

/**
 * User profile management
 */

// POST /api/users/profile - Create user profile (after SuperTokens registration)
router.post('/profile', userController.createUserProfile.bind(userController));

// GET /api/users/me - Get current user profile
router.get('/me', userController.getCurrentUser.bind(userController));

// PUT /api/users/me - Update current user profile
router.put('/me', userController.updateUserProfile.bind(userController));

// DELETE /api/users/me - Delete user profile
router.delete('/me', userController.deleteUserProfile.bind(userController));

// GET /api/users/me/stats - Get user statistics
router.get('/me/stats', userController.getUserStats.bind(userController));

/**
 * User verification and activity
 */

// PUT /api/users/verify-email - Mark email as verified
router.put('/verify-email', userController.markEmailVerified.bind(userController));

// POST /api/users/activity - Update user activity
router.post('/activity', userController.updateActivity.bind(userController));

/**
 * Organization-related user operations
 */

// GET /api/users/organizations - Get user's organizations
router.get('/organizations', userController.getUserOrganizations.bind(userController));

// GET /api/users/organizations/:organizationId/access - Check organization access
router.get('/organizations/:organizationId/access', userController.checkOrganizationAccess.bind(userController));

/**
 * User search and management
 */

// GET /api/users/search - Search users by email (for invitations)
router.get('/search', userController.searchUsers.bind(userController));

// GET /api/users/:userId - Get user by ID (limited access)
router.get('/:userId', userController.getUserById.bind(userController));

export default router;