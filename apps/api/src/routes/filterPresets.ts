import { Router } from 'express';
import { verifySession } from 'supertokens-node/recipe/session/framework/express';
import { feedbackService, FeedbackFilters } from '../services/feedbackService';
import { ResponseBuilder } from '../utils/ResponseBuilder';

const router = Router();

// Apply auth middleware to all routes
router.use(verifySession());

/**
 * GET /api/organizations/:orgId/filter-presets
 * Get all filter presets for organization
 */
router.get('/organizations/:orgId/filter-presets', async (req, res) => {
  try {
    const { orgId } = req.params;
    const userId = req.session!.getUserId();

    const presets = await feedbackService.getFilterPresets(orgId, userId);

    res.json(ResponseBuilder.success(presets));
  } catch (error) {
    console.error('Get filter presets error:', error);
    res.status(400).json(ResponseBuilder.error(
      error instanceof Error ? error.message : 'Failed to get filter presets'
    ));
  }
});

/**
 * POST /api/organizations/:orgId/filter-presets
 * Create a new filter preset
 */
router.post('/organizations/:orgId/filter-presets', async (req, res) => {
  try {
    const { orgId } = req.params;
    const { name, filters, isShared = false } = req.body;
    const userId = req.session!.getUserId();

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json(ResponseBuilder.error('Preset name is required'));
    }

    if (!filters || typeof filters !== 'object') {
      return res.status(400).json(ResponseBuilder.error('Filters are required'));
    }

    const preset = await feedbackService.saveFilterPreset(
      orgId,
      name.trim(),
      filters as FeedbackFilters,
      userId,
      Boolean(isShared)
    );

    res.status(201).json(ResponseBuilder.success(preset));
  } catch (error) {
    console.error('Create filter preset error:', error);
    res.status(400).json(ResponseBuilder.error(
      error instanceof Error ? error.message : 'Failed to create filter preset'
    ));
  }
});

/**
 * PUT /api/filter-presets/:presetId
 * Update a filter preset
 */
router.put('/filter-presets/:presetId', async (req, res) => {
  try {
    const { presetId } = req.params;
    const { name, filters, isShared } = req.body;
    const userId = req.session!.getUserId();

    const updates: any = {};
    
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json(ResponseBuilder.error('Invalid preset name'));
      }
      updates.name = name.trim();
    }

    if (filters !== undefined) {
      if (typeof filters !== 'object') {
        return res.status(400).json(ResponseBuilder.error('Invalid filters'));
      }
      updates.filters = filters;
    }

    if (isShared !== undefined) {
      updates.isShared = Boolean(isShared);
    }

    const preset = await feedbackService.updateFilterPreset(presetId, updates, userId);

    res.json(ResponseBuilder.success(preset));
  } catch (error) {
    console.error('Update filter preset error:', error);
    res.status(400).json(ResponseBuilder.error(
      error instanceof Error ? error.message : 'Failed to update filter preset'
    ));
  }
});

/**
 * DELETE /api/filter-presets/:presetId
 * Delete a filter preset
 */
router.delete('/filter-presets/:presetId', async (req, res) => {
  try {
    const { presetId } = req.params;
    const userId = req.session!.getUserId();

    const result = await feedbackService.deleteFilterPreset(presetId, userId);

    res.json(ResponseBuilder.success(result));
  } catch (error) {
    console.error('Delete filter preset error:', error);
    res.status(400).json(ResponseBuilder.error(
      error instanceof Error ? error.message : 'Failed to delete filter preset'
    ));
  }
});

/**
 * POST /api/filter-presets/:presetId/default
 * Set a filter preset as default for the user
 */
router.post('/filter-presets/:presetId/default', async (req, res) => {
  try {
    const { presetId } = req.params;
    const userId = req.session!.getUserId();

    const preset = await feedbackService.setDefaultFilterPreset(presetId, userId);

    res.json(ResponseBuilder.success(preset));
  } catch (error) {
    console.error('Set default filter preset error:', error);
    res.status(400).json(ResponseBuilder.error(
      error instanceof Error ? error.message : 'Failed to set default filter preset'
    ));
  }
});

/**
 * POST /api/organizations/:orgId/feedback/export
 * Export feedback data with filters
 */
router.post('/organizations/:orgId/feedback/export', async (req, res) => {
  try {
    const { orgId } = req.params;
    const { filters = {}, format = 'csv' } = req.body;
    const userId = req.session!.getUserId();

    if (!['csv', 'json', 'xlsx'].includes(format)) {
      return res.status(400).json(ResponseBuilder.error('Invalid export format'));
    }

    const exportResult = await feedbackService.exportFeedback(
      orgId,
      filters as FeedbackFilters,
      format as 'csv' | 'json' | 'xlsx',
      userId
    );

    res.json(ResponseBuilder.success(exportResult));
  } catch (error) {
    console.error('Export feedback error:', error);
    res.status(400).json(ResponseBuilder.error(
      error instanceof Error ? error.message : 'Failed to export feedback'
    ));
  }
});

export default router;