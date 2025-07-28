'use client';

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { CustomFieldDefinition, CreateCustomFieldRequest, UpdateCustomFieldRequest } from '../../lib/api';

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const Title = styled.h2`
  font-size: 20px;
  font-weight: 600;
  color: #101828;
  margin: 0 0 16px 0;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-size: 14px;
  font-weight: 500;
  color: #344054;
`;

const Input = styled.input`
  border: 1px solid #D0D5DD;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 14px;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #5E72E4;
    box-shadow: 0 0 0 3px rgba(94, 114, 228, 0.1);
  }

  &:disabled {
    background: #F9FAFB;
    color: #667085;
  }
`;

const TextArea = styled.textarea`
  border: 1px solid #D0D5DD;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 14px;
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #5E72E4;
    box-shadow: 0 0 0 3px rgba(94, 114, 228, 0.1);
  }
`;

const Select = styled.select`
  border: 1px solid #D0D5DD;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 14px;
  background: white;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #5E72E4;
    box-shadow: 0 0 0 3px rgba(94, 114, 228, 0.1);
  }
`;

const Checkbox = styled.input`
  margin-right: 8px;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  font-size: 14px;
  color: #344054;
  cursor: pointer;
`;

const OptionsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const OptionInput = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const RemoveButton = styled.button`
  background: #F04438;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  min-width: 60px;

  &:hover {
    background: #D92D20;
  }
`;

const AddOptionButton = styled.button`
  background: #F9FAFB;
  color: #344054;
  border: 1px solid #D0D5DD;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  align-self: flex-start;

  &:hover {
    background: #F2F4F7;
  }
`;

const ValidationSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: #F9FAFB;
  border-radius: 8px;
`;

const ValidationRow = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const ValidationInput = styled(Input)`
  max-width: 120px;
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #EAECF0;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  
  ${props => props.variant === 'primary' ? `
    background: #5E72E4;
    color: white;
    border: none;
    
    &:hover {
      background: #4C63D2;
    }
    
    &:disabled {
      background: #D0D5DD;
      cursor: not-allowed;
    }
  ` : `
    background: white;
    color: #344054;
    border: 1px solid #D0D5DD;
    
    &:hover {
      background: #F9FAFB;
    }
  `}
`;

const ErrorMessage = styled.div`
  color: #F04438;
  font-size: 12px;
  margin-top: 4px;
`;

const HelpText = styled.div`
  color: #667085;
  font-size: 12px;
  margin-top: 4px;
`;

interface CustomFieldFormProps {
  field?: CustomFieldDefinition | null;
  onSubmit: (data: CreateCustomFieldRequest | UpdateCustomFieldRequest) => Promise<void>;
  onCancel: () => void;
}

export const CustomFieldForm: React.FC<CustomFieldFormProps> = ({ field, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    label: '',
    type: 'text' as const,
    required: false,
    options: [] as string[],
    placeholder: '',
    helpText: '',
    validation: {
      min: undefined as number | undefined,
      max: undefined as number | undefined,
      pattern: '',
      maxLength: undefined as number | undefined,
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (field) {
      setFormData({
        name: field.name,
        label: field.label,
        type: field.type,
        required: field.required,
        options: field.options || [],
        placeholder: field.placeholder || '',
        helpText: field.helpText || '',
        validation: {
          min: field.validation?.min,
          max: field.validation?.max,
          pattern: field.validation?.pattern || '',
          maxLength: field.validation?.maxLength,
        }
      });
    }
  }, [field]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const submitData: CreateCustomFieldRequest | UpdateCustomFieldRequest = {
        ...(!field && { name: formData.name }), // Only include name for creation
        label: formData.label,
        ...(formData.type && { type: formData.type }),
        required: formData.required,
        ...(formData.options.length > 0 && { options: formData.options }),
        ...(formData.placeholder && { placeholder: formData.placeholder }),
        ...(formData.helpText && { helpText: formData.helpText }),
        validation: {
          ...(formData.validation.min !== undefined && { min: formData.validation.min }),
          ...(formData.validation.max !== undefined && { max: formData.validation.max }),
          ...(formData.validation.pattern && { pattern: formData.validation.pattern }),
          ...(formData.validation.maxLength !== undefined && { maxLength: formData.validation.maxLength }),
        }
      };

      // Remove empty validation object
      if (Object.keys(submitData.validation || {}).length === 0) {
        delete submitData.validation;
      }

      await onSubmit(submitData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const addOption = () => {
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, '']
    }));
  };

  const updateOption = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => i === index ? value : opt)
    }));
  };

  const removeOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  const requiresOptions = formData.type === 'select' || formData.type === 'multiselect';
  const showValidation = ['text', 'number', 'email', 'url'].includes(formData.type);

  return (
    <Form onSubmit={handleSubmit}>
      <Title>{field ? 'Edit Custom Field' : 'Create Custom Field'}</Title>
      
      {error && <ErrorMessage>{error}</ErrorMessage>}

      <FormGroup>
        <Label>Field Name *</Label>
        <Input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="e.g., priority, customer_type"
          required
          disabled={!!field} // Can't change name when editing
        />
        <HelpText>
          Internal identifier for the field. Can only contain letters, numbers, and underscores.
        </HelpText>
      </FormGroup>

      <FormGroup>
        <Label>Display Label *</Label>
        <Input
          type="text"
          value={formData.label}
          onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
          placeholder="e.g., Priority Level, Customer Type"
          required
        />
        <HelpText>
          User-friendly label that will be displayed in forms and views.
        </HelpText>
      </FormGroup>

      <FormGroup>
        <Label>Field Type *</Label>
        <Select
          value={formData.type}
          onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
          disabled={!!field} // Can't change type when editing
        >
          <option value="text">Text</option>
          <option value="number">Number</option>
          <option value="boolean">Yes/No</option>
          <option value="date">Date</option>
          <option value="select">Single Choice</option>
          <option value="multiselect">Multiple Choice</option>
          <option value="url">URL</option>
          <option value="email">Email</option>
        </Select>
      </FormGroup>

      {requiresOptions && (
        <FormGroup>
          <Label>Options *</Label>
          <OptionsContainer>
            {formData.options.map((option, index) => (
              <OptionInput key={index}>
                <Input
                  type="text"
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  required
                />
                <RemoveButton type="button" onClick={() => removeOption(index)}>
                  Remove
                </RemoveButton>
              </OptionInput>
            ))}
            <AddOptionButton type="button" onClick={addOption}>
              Add Option
            </AddOptionButton>
          </OptionsContainer>
          <HelpText>
            Add at least one option for single/multiple choice fields.
          </HelpText>
        </FormGroup>
      )}

      <FormGroup>
        <Label>Placeholder Text</Label>
        <Input
          type="text"
          value={formData.placeholder}
          onChange={(e) => setFormData(prev => ({ ...prev, placeholder: e.target.value }))}
          placeholder="e.g., Enter priority level..."
        />
      </FormGroup>

      <FormGroup>
        <Label>Help Text</Label>
        <TextArea
          value={formData.helpText}
          onChange={(e) => setFormData(prev => ({ ...prev, helpText: e.target.value }))}
          placeholder="Optional description to help users understand what this field is for..."
        />
      </FormGroup>

      {showValidation && (
        <FormGroup>
          <Label>Validation Rules</Label>
          <ValidationSection>
            {formData.type === 'number' && (
              <>
                <ValidationRow>
                  <Label>Minimum Value:</Label>
                  <ValidationInput
                    type="number"
                    value={formData.validation.min || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      validation: { ...prev.validation, min: e.target.value ? Number(e.target.value) : undefined }
                    }))}
                  />
                </ValidationRow>
                <ValidationRow>
                  <Label>Maximum Value:</Label>
                  <ValidationInput
                    type="number"
                    value={formData.validation.max || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      validation: { ...prev.validation, max: e.target.value ? Number(e.target.value) : undefined }
                    }))}
                  />
                </ValidationRow>
              </>
            )}
            {['text', 'email', 'url'].includes(formData.type) && (
              <>
                <ValidationRow>
                  <Label>Maximum Length:</Label>
                  <ValidationInput
                    type="number"
                    value={formData.validation.maxLength || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      validation: { ...prev.validation, maxLength: e.target.value ? Number(e.target.value) : undefined }
                    }))}
                  />
                </ValidationRow>
                {formData.type === 'text' && (
                  <ValidationRow>
                    <Label>Pattern (RegEx):</Label>
                    <Input
                      type="text"
                      value={formData.validation.pattern}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        validation: { ...prev.validation, pattern: e.target.value }
                      }))}
                      placeholder="e.g., ^[A-Z]{2,3}$"
                    />
                  </ValidationRow>
                )}
              </>
            )}
          </ValidationSection>
        </FormGroup>
      )}

      <CheckboxLabel>
        <Checkbox
          type="checkbox"
          checked={formData.required}
          onChange={(e) => setFormData(prev => ({ ...prev, required: e.target.checked }))}
        />
        This field is required
      </CheckboxLabel>

      <ButtonContainer>
        <Button type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? 'Saving...' : field ? 'Update Field' : 'Create Field'}
        </Button>
      </ButtonContainer>
    </Form>
  );
};