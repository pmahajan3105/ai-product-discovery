/**
 * Custom Fields Service
 * Manages custom field definitions and values for feedback
 * 
 * Architecture: Uses JSONB metadata field with structured approach
 * Can be migrated to dedicated tables later for better performance/querying
 */

import { db } from './database';
import { Op } from 'sequelize';
import { organizationService } from './organizationService';

export interface CustomFieldDefinition {
  id: string;
  organizationId: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'date' | 'select' | 'multiselect' | 'url' | 'email';
  required: boolean;
  options?: string[]; // For select/multiselect types
  placeholder?: string;
  helpText?: string;
  validation?: {
    min?: number; // For number types
    max?: number; // For number types
    pattern?: string; // For text validation (regex)
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
  displayValue?: string; // For display purposes (e.g., option labels)
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

export class CustomFieldsService {
  private static readonly CUSTOM_FIELDS_KEY = '_customFieldDefinitions';
  private static readonly CUSTOM_VALUES_KEY = '_customFieldValues';

  /**
   * Helper method to check user permissions for organization
   */
  private async checkPermission(organizationId: string, userId: string, allowedRoles: string[]): Promise<void> {
    const role = await organizationService.getUserRole(organizationId, userId);
    if (!role || !allowedRoles.includes(role)) {
      throw new Error('Insufficient permissions');
    }
  }

  /**
   * Get organization metadata (where we store custom field definitions)
   */
  private async getOrganizationMetadata(organizationId: string): Promise<Record<string, any>> {
    const org = await db.models.Organization.findByPk(organizationId);
    if (!org) {
      throw new Error('Organization not found');
    }
    return (org as any).metadata || {};
  }

  /**
   * Update organization metadata
   */
  private async updateOrganizationMetadata(organizationId: string, metadata: Record<string, any>): Promise<void> {
    await db.models.Organization.update(
      { metadata },
      { where: { id: organizationId } }
    );
  }

  /**
   * Create new custom field definition
   */
  async createCustomField(organizationId: string, data: CreateCustomFieldRequest, userId: string): Promise<CustomFieldDefinition> {
    await this.checkPermission(organizationId, userId, ['owner', 'admin']);

    // Validate field name is unique
    const existingFields = await this.getCustomFields(organizationId, userId);
    if (existingFields.some(field => field.name === data.name)) {
      throw new Error('A custom field with this name already exists');
    }

    // Validate select/multiselect fields have options
    if ((data.type === 'select' || data.type === 'multiselect') && (!data.options || data.options.length === 0)) {
      throw new Error('Select and multiselect fields must have at least one option');
    }

    const fieldId = `cf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newField: CustomFieldDefinition = {
      id: fieldId,
      organizationId,
      name: data.name,
      label: data.label,
      type: data.type,
      required: data.required || false,
      options: data.options,
      placeholder: data.placeholder,
      helpText: data.helpText,
      validation: data.validation,
      displayOrder: existingFields.length,
      isActive: true,
      createdBy: userId,
      createdAt: new Date().toISOString()
    };

    // Get current metadata and add new field
    const metadata = await this.getOrganizationMetadata(organizationId);
    const customFields = metadata[CustomFieldsService.CUSTOM_FIELDS_KEY] || [];
    customFields.push(newField);
    metadata[CustomFieldsService.CUSTOM_FIELDS_KEY] = customFields;

    await this.updateOrganizationMetadata(organizationId, metadata);

    return newField;
  }

  /**
   * Get all custom field definitions for organization
   */
  async getCustomFields(organizationId: string, userId: string): Promise<CustomFieldDefinition[]> {
    await this.checkPermission(organizationId, userId, ['owner', 'admin', 'member', 'viewer']);

    const metadata = await this.getOrganizationMetadata(organizationId);
    const customFields = metadata[CustomFieldsService.CUSTOM_FIELDS_KEY] || [];
    
    return customFields
      .filter((field: CustomFieldDefinition) => field.isActive)
      .sort((a: CustomFieldDefinition, b: CustomFieldDefinition) => a.displayOrder - b.displayOrder);
  }

  /**
   * Update custom field definition
   */
  async updateCustomField(organizationId: string, fieldId: string, data: UpdateCustomFieldRequest, userId: string): Promise<CustomFieldDefinition> {
    await this.checkPermission(organizationId, userId, ['owner', 'admin']);

    const metadata = await this.getOrganizationMetadata(organizationId);
    const customFields = metadata[CustomFieldsService.CUSTOM_FIELDS_KEY] || [];
    
    const fieldIndex = customFields.findIndex((field: CustomFieldDefinition) => field.id === fieldId);
    if (fieldIndex === -1) {
      throw new Error('Custom field not found');
    }

    const existingField = customFields[fieldIndex];
    
    // Validate select/multiselect fields have options
    if ((existingField.type === 'select' || existingField.type === 'multiselect') && 
        data.options !== undefined && data.options.length === 0) {
      throw new Error('Select and multiselect fields must have at least one option');
    }

    // Update field
    const updatedField: CustomFieldDefinition = {
      ...existingField,
      ...data,
      updatedAt: new Date().toISOString()
    };

    customFields[fieldIndex] = updatedField;
    metadata[CustomFieldsService.CUSTOM_FIELDS_KEY] = customFields;

    await this.updateOrganizationMetadata(organizationId, metadata);

    return updatedField;
  }

  /**
   * Delete custom field definition (soft delete)
   */
  async deleteCustomField(organizationId: string, fieldId: string, userId: string): Promise<void> {
    await this.checkPermission(organizationId, userId, ['owner', 'admin']);

    const metadata = await this.getOrganizationMetadata(organizationId);
    const customFields = metadata[CustomFieldsService.CUSTOM_FIELDS_KEY] || [];
    
    const fieldIndex = customFields.findIndex((field: CustomFieldDefinition) => field.id === fieldId);
    if (fieldIndex === -1) {
      throw new Error('Custom field not found');
    }

    // Soft delete by setting isActive to false
    customFields[fieldIndex].isActive = false;
    customFields[fieldIndex].updatedAt = new Date().toISOString();
    
    metadata[CustomFieldsService.CUSTOM_FIELDS_KEY] = customFields;
    await this.updateOrganizationMetadata(organizationId, metadata);
  }

  /**
   * Reorder custom fields
   */
  async reorderCustomFields(organizationId: string, fieldIds: string[], userId: string): Promise<CustomFieldDefinition[]> {
    await this.checkPermission(organizationId, userId, ['owner', 'admin']);

    const metadata = await this.getOrganizationMetadata(organizationId);
    const customFields = metadata[CustomFieldsService.CUSTOM_FIELDS_KEY] || [];
    
    // Update display order based on array position
    fieldIds.forEach((fieldId, index) => {
      const fieldIndex = customFields.findIndex((field: CustomFieldDefinition) => field.id === fieldId);
      if (fieldIndex !== -1) {
        customFields[fieldIndex].displayOrder = index;
        customFields[fieldIndex].updatedAt = new Date().toISOString();
      }
    });

    metadata[CustomFieldsService.CUSTOM_FIELDS_KEY] = customFields;
    await this.updateOrganizationMetadata(organizationId, metadata);

    return customFields
      .filter((field: CustomFieldDefinition) => field.isActive)
      .sort((a: CustomFieldDefinition, b: CustomFieldDefinition) => a.displayOrder - b.displayOrder);
  }

  /**
   * Set custom field values for feedback
   */
  async setFeedbackCustomFields(feedbackId: string, values: CustomFieldValue[], userId: string): Promise<void> {
    const feedback = await db.models.Feedback.findByPk(feedbackId);
    if (!feedback) {
      throw new Error('Feedback not found');
    }

    await this.checkPermission(feedback.organizationId, userId, ['owner', 'admin', 'member']);

    // Get field definitions to validate values
    const fieldDefinitions = await this.getCustomFields(feedback.organizationId, userId);
    const fieldDefMap = new Map(fieldDefinitions.map(field => [field.id, field]));

    // Validate values
    for (const value of values) {
      const fieldDef = fieldDefMap.get(value.fieldId);
      if (!fieldDef) {
        throw new Error(`Custom field ${value.fieldId} not found`);
      }

      if (fieldDef.required && (value.value === null || value.value === undefined || value.value === '')) {
        throw new Error(`Custom field ${fieldDef.label} is required`);
      }

      // Type-specific validation
      if (value.value !== null && value.value !== undefined) {
        await this.validateFieldValue(fieldDef, value.value);
      }
    }

    // Store values in feedback metadata
    const metadata = feedback.metadata || {};
    metadata[CustomFieldsService.CUSTOM_VALUES_KEY] = values;

    await feedback.update({ metadata });
  }

  /**
   * Get custom field values for feedback
   */
  async getFeedbackCustomFields(feedbackId: string, userId: string): Promise<CustomFieldValue[]> {
    const feedback = await db.models.Feedback.findByPk(feedbackId);
    if (!feedback) {
      throw new Error('Feedback not found');
    }

    await this.checkPermission(feedback.organizationId, userId, ['owner', 'admin', 'member', 'viewer']);

    const metadata = feedback.metadata || {};
    return metadata[CustomFieldsService.CUSTOM_VALUES_KEY] || [];
  }

  /**
   * Validate field value based on field definition
   */
  private async validateFieldValue(fieldDef: CustomFieldDefinition, value: any): Promise<void> {
    switch (fieldDef.type) {
      case 'text':
      case 'email':
      case 'url':
        if (typeof value !== 'string') {
          throw new Error(`${fieldDef.label} must be a string`);
        }
        if (fieldDef.validation?.maxLength && value.length > fieldDef.validation.maxLength) {
          throw new Error(`${fieldDef.label} must be ${fieldDef.validation.maxLength} characters or less`);
        }
        if (fieldDef.validation?.pattern) {
          const regex = new RegExp(fieldDef.validation.pattern);
          if (!regex.test(value)) {
            throw new Error(`${fieldDef.label} format is invalid`);
          }
        }
        if (fieldDef.type === 'email') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            throw new Error(`${fieldDef.label} must be a valid email address`);
          }
        }
        if (fieldDef.type === 'url') {
          try {
            new URL(value);
          } catch {
            throw new Error(`${fieldDef.label} must be a valid URL`);
          }
        }
        break;

      case 'number':
        const numValue = Number(value);
        if (isNaN(numValue)) {
          throw new Error(`${fieldDef.label} must be a number`);
        }
        if (fieldDef.validation?.min !== undefined && numValue < fieldDef.validation.min) {
          throw new Error(`${fieldDef.label} must be ${fieldDef.validation.min} or greater`);
        }
        if (fieldDef.validation?.max !== undefined && numValue > fieldDef.validation.max) {
          throw new Error(`${fieldDef.label} must be ${fieldDef.validation.max} or less`);
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          throw new Error(`${fieldDef.label} must be true or false`);
        }
        break;

      case 'date':
        const dateValue = new Date(value);
        if (isNaN(dateValue.getTime())) {
          throw new Error(`${fieldDef.label} must be a valid date`);
        }
        break;

      case 'select':
        if (!fieldDef.options || !fieldDef.options.includes(value)) {
          throw new Error(`${fieldDef.label} must be one of: ${fieldDef.options?.join(', ')}`);
        }
        break;

      case 'multiselect':
        if (!Array.isArray(value)) {
          throw new Error(`${fieldDef.label} must be an array`);
        }
        for (const item of value) {
          if (!fieldDef.options || !fieldDef.options.includes(item)) {
            throw new Error(`${fieldDef.label} contains invalid option: ${item}`);
          }
        }
        break;
    }
  }

  /**
   * Get custom fields with their values for a feedback item
   */
  async getFeedbackCustomFieldsWithDefinitions(feedbackId: string, userId: string): Promise<Array<CustomFieldDefinition & { value?: CustomFieldValue }>> {
    const feedback = await db.models.Feedback.findByPk(feedbackId);
    if (!feedback) {
      throw new Error('Feedback not found');
    }

    const [fieldDefinitions, fieldValues] = await Promise.all([
      this.getCustomFields(feedback.organizationId, userId),
      this.getFeedbackCustomFields(feedbackId, userId)
    ]);

    const valueMap = new Map(fieldValues.map(value => [value.fieldId, value]));

    return fieldDefinitions.map(field => ({
      ...field,
      value: valueMap.get(field.id)
    }));
  }
}

export const customFieldsService = new CustomFieldsService();