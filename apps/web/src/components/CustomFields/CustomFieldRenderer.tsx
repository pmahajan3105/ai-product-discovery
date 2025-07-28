'use client';

import React from 'react';
import styled from 'styled-components';
import { CustomFieldDefinition, CustomFieldValue } from '../../lib/api';

const FieldContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
`;

const Label = styled.label<{ required?: boolean }>`
  font-size: 14px;
  font-weight: 500;
  color: #344054;
  
  ${props => props.required && `
    &::after {
      content: '*';
      color: #F04438;
      margin-left: 4px;
    }
  `}
`;

const Input = styled.input<{ hasError?: boolean }>`
  border: 1px solid ${props => props.hasError ? '#F04438' : '#D0D5DD'};
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 14px;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: ${props => props.hasError ? '#F04438' : '#5E72E4'};
    box-shadow: 0 0 0 3px ${props => props.hasError ? 'rgba(240, 68, 56, 0.1)' : 'rgba(94, 114, 228, 0.1)'};
  }

  &::placeholder {
    color: #9CA3AF;
  }
`;

const TextArea = styled.textarea<{ hasError?: boolean }>`
  border: 1px solid ${props => props.hasError ? '#F04438' : '#D0D5DD'};
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 14px;
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: ${props => props.hasError ? '#F04438' : '#5E72E4'};
    box-shadow: 0 0 0 3px ${props => props.hasError ? 'rgba(240, 68, 56, 0.1)' : 'rgba(94, 114, 228, 0.1)'};
  }

  &::placeholder {
    color: #9CA3AF;
  }
`;

const Select = styled.select<{ hasError?: boolean }>`
  border: 1px solid ${props => props.hasError ? '#F04438' : '#D0D5DD'};
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 14px;
  background: white;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: ${props => props.hasError ? '#F04438' : '#5E72E4'};
    box-shadow: 0 0 0 3px ${props => props.hasError ? 'rgba(240, 68, 56, 0.1)' : 'rgba(94, 114, 228, 0.1)'};
  }
`;

const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  accent-color: #5E72E4;
`;

const CheckboxLabel = styled.label`
  font-size: 14px;
  color: #344054;
  cursor: pointer;
`;

const MultiSelectContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #D0D5DD;
  border-radius: 8px;
  padding: 8px;
`;

const MultiSelectOption = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;

  &:hover {
    background: #F9FAFB;
  }
`;

const HelpText = styled.div`
  color: #667085;
  font-size: 12px;
  margin-top: 4px;
`;

const ErrorMessage = styled.div`
  color: #F04438;
  font-size: 12px;
  margin-top: 4px;
`;

const DisplayValue = styled.div`
  font-size: 14px;
  color: #344054;
  padding: 8px 0;
`;

const DisplayLabel = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: #344054;
  margin-bottom: 4px;
`;

interface CustomFieldRendererProps {
  field: CustomFieldDefinition;
  value?: CustomFieldValue;
  onChange?: (value: any, displayValue?: string) => void;
  error?: string;
  mode?: 'form' | 'display';
}

export const CustomFieldRenderer: React.FC<CustomFieldRendererProps> = ({
  field,
  value,
  onChange,
  error,
  mode = 'form'
}) => {
  const fieldValue = value?.value;
  const displayValue = value?.displayValue || fieldValue;

  const handleChange = (newValue: any, newDisplayValue?: string) => {
    if (onChange) {
      onChange(newValue, newDisplayValue);
    }
  };

  // Display mode - just show the value
  if (mode === 'display') {
    if (!value || value.value === null || value.value === undefined || value.value === '') {
      return null;
    }

    return (
      <FieldContainer>
        <DisplayLabel>{field.label}</DisplayLabel>
        <DisplayValue>
          {field.type === 'boolean' 
            ? (fieldValue ? 'Yes' : 'No')
            : field.type === 'multiselect'
              ? Array.isArray(fieldValue) ? fieldValue.join(', ') : fieldValue
              : displayValue || fieldValue
          }
        </DisplayValue>
      </FieldContainer>
    );
  }

  // Form mode - render input fields
  const renderInput = () => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'url':
        return (
          <Input
            type={field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'}
            value={fieldValue || ''}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={field.placeholder}
            hasError={!!error}
            maxLength={field.validation?.maxLength}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={fieldValue || ''}
            onChange={(e) => handleChange(e.target.value ? Number(e.target.value) : null)}
            placeholder={field.placeholder}
            hasError={!!error}
            min={field.validation?.min}
            max={field.validation?.max}
          />
        );

      case 'date':
        return (
          <Input
            type="date"
            value={fieldValue || ''}
            onChange={(e) => handleChange(e.target.value)}
            hasError={!!error}
          />
        );

      case 'boolean':
        return (
          <CheckboxContainer>
            <Checkbox
              type="checkbox"
              checked={fieldValue || false}
              onChange={(e) => handleChange(e.target.checked)}
            />
            <CheckboxLabel>
              {field.placeholder || 'Yes'}
            </CheckboxLabel>
          </CheckboxContainer>
        );

      case 'select':
        return (
          <Select
            value={fieldValue || ''}
            onChange={(e) => {
              const selectedValue = e.target.value;
              const selectedOption = field.options?.find(opt => opt === selectedValue);
              handleChange(selectedValue, selectedOption);
            }}
            hasError={!!error}
          >
            <option value="">
              {field.placeholder || 'Select an option...'}
            </option>
            {field.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        );

      case 'multiselect':
        const selectedValues = Array.isArray(fieldValue) ? fieldValue : [];
        return (
          <MultiSelectContainer>
            {field.options?.map((option) => (
              <MultiSelectOption key={option}>
                <Checkbox
                  type="checkbox"
                  checked={selectedValues.includes(option)}
                  onChange={(e) => {
                    const newValues = e.target.checked
                      ? [...selectedValues, option]
                      : selectedValues.filter(v => v !== option);
                    handleChange(newValues, newValues.join(', '));
                  }}
                />
                {option}
              </MultiSelectOption>
            ))}
          </MultiSelectContainer>
        );

      default:
        return (
          <Input
            type="text"
            value={fieldValue || ''}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={field.placeholder}
            hasError={!!error}
          />
        );
    }
  };

  return (
    <FieldContainer>
      <Label required={field.required}>
        {field.label}
      </Label>
      {renderInput()}
      {field.helpText && <HelpText>{field.helpText}</HelpText>}
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </FieldContainer>
  );
};