/**
 * Custom Fields API Client
 * Handles custom field management API calls
 */

import { apiClient } from './apiClient';

// Types (matching backend interfaces)
export interface CustomFieldDefinition {
  id: string;
  organizationId: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'date' | 'select' | 'multiselect' | 'url' | 'email';
  required: boolean;
  options?: string[];
  placeholder?: string;
  helpText?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    maxLength?: number;
  };
  displayOrder: number;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CustomFieldValue {
  fieldId: string;
  value: any;
  displayValue?: string;
}

export interface CreateCustomFieldRequest {
  name: string;
  label: string;
  type: CustomFieldDefinition['type'];
  required?: boolean;
  options?: string[];
  placeholder?: string;
  helpText?: string;
  validation?: CustomFieldDefinition['validation'];
}

export interface UpdateCustomFieldRequest {
  label?: string;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  helpText?: string;
  validation?: CustomFieldDefinition['validation'];
  isActive?: boolean;
}

export class CustomFieldsApi {
  /**
   * Create new custom field definition
   */
  async createCustomField(organizationId: string, data: CreateCustomFieldRequest): Promise<CustomFieldDefinition> {
    const response = await apiClient.post(`/organizations/${organizationId}/custom-fields`, data);
    return response.data;
  }

  /**
   * Get all custom field definitions for organization
   */
  async getCustomFields(organizationId: string): Promise<CustomFieldDefinition[]> {
    const response = await apiClient.get(`/organizations/${organizationId}/custom-fields`);
    return response.data;
  }

  /**
   * Update custom field definition
   */
  async updateCustomField(organizationId: string, fieldId: string, data: UpdateCustomFieldRequest): Promise<CustomFieldDefinition> {
    const response = await apiClient.put(`/organizations/${organizationId}/custom-fields/${fieldId}`, data);
    return response.data;
  }

  /**
   * Delete custom field definition
   */
  async deleteCustomField(organizationId: string, fieldId: string): Promise<void> {
    await apiClient.delete(`/organizations/${organizationId}/custom-fields/${fieldId}`);
  }

  /**
   * Reorder custom fields
   */
  async reorderCustomFields(organizationId: string, fieldIds: string[]): Promise<CustomFieldDefinition[]> {
    const response = await apiClient.put(`/organizations/${organizationId}/custom-fields/reorder`, { fieldIds });
    return response.data;
  }

  /**
   * Set custom field values for feedback
   */
  async setFeedbackCustomFields(feedbackId: string, values: CustomFieldValue[]): Promise<void> {
    await apiClient.put(`/feedback/${feedbackId}/custom-fields`, { values });
  }

  /**
   * Get custom field values for feedback
   */
  async getFeedbackCustomFields(feedbackId: string): Promise<Array<CustomFieldDefinition & { value?: CustomFieldValue }>> {
    const response = await apiClient.get(`/feedback/${feedbackId}/custom-fields`);
    return response.data;
  }
}

export const customFieldsApi = new CustomFieldsApi();