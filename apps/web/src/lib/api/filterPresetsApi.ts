import { apiClient } from './apiClient';
import { FilterCondition } from '../../components/Filter/filterHelpers';

export interface SavedFilterPreset {
  id: string;
  name: string;
  filters: FilterCondition[];
  createdBy: string;
  organizationId: string;
  isDefault: boolean;
  isShared: boolean;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface CreateFilterPresetRequest {
  name: string;
  filters: FilterCondition[];
  isShared?: boolean;
}

export interface UpdateFilterPresetRequest {
  name?: string;
  filters?: FilterCondition[];
  isShared?: boolean;
}

export interface ExportFeedbackRequest {
  filters?: Record<string, any>;
  format?: 'csv' | 'json' | 'xlsx';
}

export interface ExportFeedbackResponse {
  data: any[];
  format: string;
  filename: string;
  totalCount: number;
}

export const filterPresetsApi = {
  /**
   * Get all filter presets for an organization
   */
  async getFilterPresets(organizationId: string): Promise<SavedFilterPreset[]> {
    const response = await apiClient.get(`/organizations/${organizationId}/filter-presets`);
    return response.data.data;
  },

  /**
   * Create a new filter preset
   */
  async createFilterPreset(
    organizationId: string, 
    data: CreateFilterPresetRequest
  ): Promise<SavedFilterPreset> {
    const response = await apiClient.post(`/organizations/${organizationId}/filter-presets`, data);
    return response.data.data;
  },

  /**
   * Update an existing filter preset
   */
  async updateFilterPreset(
    presetId: string, 
    data: UpdateFilterPresetRequest
  ): Promise<SavedFilterPreset> {
    const response = await apiClient.put(`/filter-presets/${presetId}`, data);
    return response.data.data;
  },

  /**
   * Delete a filter preset
   */
  async deleteFilterPreset(presetId: string): Promise<void> {
    await apiClient.delete(`/filter-presets/${presetId}`);
  },

  /**
   * Set a filter preset as default for the current user
   */
  async setDefaultFilterPreset(presetId: string): Promise<SavedFilterPreset> {
    const response = await apiClient.post(`/filter-presets/${presetId}/default`);
    return response.data.data;
  },

  /**
   * Export feedback data with current filters
   */
  async exportFeedback(
    organizationId: string, 
    data: ExportFeedbackRequest
  ): Promise<ExportFeedbackResponse> {
    const response = await apiClient.post(`/organizations/${organizationId}/feedback/export`, data);
    return response.data.data;
  }
};