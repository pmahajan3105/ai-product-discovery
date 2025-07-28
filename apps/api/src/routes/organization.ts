/**
 * Organization Routes
 * RESTful API endpoints for organization management
 */

import { Router } from 'express';
import { verifySession } from 'supertokens-node/recipe/session/framework/express';
import { organizationController } from '../controllers/organizationController';

const router = Router();

// Routes that don't require authentication
// GET /api/organizations/check-unique-name - Check if unique name is available (public)
router.get('/check-unique-name', organizationController.checkUniqueName.bind(organizationController));

// All other organization routes require authentication
router.use(verifySession());

/**
 * Organization CRUD operations
 */

// POST /api/organizations - Create new organization
router.post('/', organizationController.createOrganization.bind(organizationController));

// GET /api/organizations - Get user's organizations
router.get('/', organizationController.getUserOrganizations.bind(organizationController));

// GET /api/organizations/:organizationId - Get organization by ID
router.get('/:organizationId', organizationController.getOrganizationById.bind(organizationController));

// PUT /api/organizations/:organizationId - Update organization
router.put('/:organizationId', organizationController.updateOrganization.bind(organizationController));

// DELETE /api/organizations/:organizationId - Delete organization
router.delete('/:organizationId', organizationController.deleteOrganization.bind(organizationController));

/**
 * Organization member management
 */

// POST /api/organizations/:organizationId/members - Add member to organization
router.post('/:organizationId/members', organizationController.addMember.bind(organizationController));

// PUT /api/organizations/:organizationId/members/:userId - Update member role
router.put('/:organizationId/members/:userId', organizationController.updateMemberRole.bind(organizationController));

// DELETE /api/organizations/:organizationId/members/:userId - Remove member from organization
router.delete('/:organizationId/members/:userId', organizationController.removeMember.bind(organizationController));

/**
 * Organization information and stats
 */

// GET /api/organizations/:organizationId/stats - Get organization statistics
router.get('/:organizationId/stats', organizationController.getOrganizationStats.bind(organizationController));

// GET /api/organizations/:organizationId/role - Get user's role in organization
router.get('/:organizationId/role', organizationController.getUserRole.bind(organizationController));

export default router;