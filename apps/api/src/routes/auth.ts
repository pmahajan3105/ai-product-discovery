/**
 * Auth Routes
 * Authentication-related endpoints that bridge SuperTokens with our user system
 */

import { Router } from 'express';
import { verifySession } from 'supertokens-node/recipe/session/framework/express';
import { authController } from '../controllers/authController';

const router = Router();

// All auth routes require authentication (user must be logged in)
router.use(verifySession());

/**
 * Profile setup and management
 */

// POST /api/auth/setup-profile - Setup user profile after authentication
router.post('/setup-profile', authController.setupProfile.bind(authController));

// GET /api/auth/profile-status - Check if profile setup is needed
router.get('/profile-status', authController.getProfileStatus.bind(authController));

// POST /api/auth/sync-profile - Sync profile data from SuperTokens
router.post('/sync-profile', authController.syncProfile.bind(authController));

/**
 * Email verification
 */

// POST /api/auth/complete-email-verification - Complete email verification process
router.post('/complete-email-verification', authController.completeEmailVerification.bind(authController));

/**
 * Session management
 */

// GET /api/auth/status - Get comprehensive auth and profile status
router.get('/status', authController.getAuthStatus.bind(authController));

// POST /api/auth/signout - Handle signout cleanup
router.post('/signout', authController.handleSignout.bind(authController));

/**
 * Account management
 */

// DELETE /api/auth/account - Handle account deletion cleanup
router.delete('/account', authController.handleAccountDeletion.bind(authController));

export default router;