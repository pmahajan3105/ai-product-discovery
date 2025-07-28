'use client';

import React, { useState } from 'react';
import styled from 'styled-components';
import { CustomFieldDefinition } from '../../lib/api';

const Container = styled.div`
  background: white;
  border: 1px solid #EAECF0;
  border-radius: 12px;
  overflow: hidden;
`;

const EmptyState = styled.div`
  padding: 48px 24px;
  text-align: center;
  color: #667085;
`;

const EmptyTitle = styled.h3`
  font-size: 18px;
  font-weight: 500;
  color: #344054;
  margin: 0 0 8px 0;
`;

const EmptyDescription = styled.p`
  margin: 0;
  font-size: 14px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Thead = styled.thead`
  background: #F9FAFB;
  border-bottom: 1px solid #EAECF0;
`;

const Th = styled.th`
  padding: 12px 16px;
  text-align: left;
  font-size: 12px;
  font-weight: 500;
  color: #667085;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const Tbody = styled.tbody``;

const Tr = styled.tr<{ isDragging?: boolean }>`
  border-bottom: 1px solid #EAECF0;
  cursor: ${props => props.isDragging ? 'grabbing' : 'grab'};
  opacity: ${props => props.isDragging ? 0.5 : 1};
  
  &:hover {
    background: #F9FAFB;
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const Td = styled.td`
  padding: 16px;
  font-size: 14px;
  color: #344054;
  vertical-align: top;
`;

const FieldName = styled.div`
  font-weight: 500;
  color: #101828;
  margin-bottom: 4px;
`;

const FieldLabel = styled.div`
  color: #667085;
  font-size: 13px;
`;

const TypeBadge = styled.span<{ type: string }>`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  
  ${props => {
    switch (props.type) {
      case 'text':
        return 'background: #EEF2FF; color: #3538CD;';
      case 'number':
        return 'background: #F0FDF4; color: #166534;';
      case 'boolean':
        return 'background: #FEF3F2; color: #B91C1C;';
      case 'date':
        return 'background: #FFFBEB; color: #B45309;';
      case 'select':
      case 'multiselect':
        return 'background: #F3E8FF; color: #7C3AED;';
      case 'url':
        return 'background: #ECFDF5; color: #059669;';
      case 'email':
        return 'background: #F0F9FF; color: #0284C7;';
      default:
        return 'background: #F3F4F6; color: #374151;';
    }
  }}
`;

const RequiredBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  background: #FEF2F2;
  color: #DC2626;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  margin-left: 8px;
`;

const OptionsPreview = styled.div`
  color: #667085;
  font-size: 12px;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ActionButton = styled.button<{ variant?: 'edit' | 'delete' }>`
  background: none;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  margin-right: 8px;
  transition: all 0.2s;
  
  ${props => props.variant === 'delete' ? `
    color: #DC2626;
    &:hover {
      background: #FEE2E2;
    }
  ` : `
    color: #5E72E4;
    &:hover {
      background: #EEF2FF;
    }
  `}
`;

const DragHandle = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  color: #9CA3AF;
  cursor: grab;
  
  &:active {
    cursor: grabbing;
  }
  
  &::before {
    content: '⋮⋮';
    font-size: 12px;
    line-height: 1;
  }
`;

interface CustomFieldsListProps {
  fields: CustomFieldDefinition[];
  onEdit: (field: CustomFieldDefinition) => void;
  onDelete: (fieldId: string) => void;
  onReorder: (fieldIds: string[]) => void;
}

export const CustomFieldsList: React.FC<CustomFieldsListProps> = ({
  fields,
  onEdit,
  onDelete,
  onReorder
}) => {
  const [draggedField, setDraggedField] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, fieldId: string) => {
    setDraggedField(fieldId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', fieldId);
  };

  const handleDragEnd = () => {
    setDraggedField(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetFieldId: string) => {
    e.preventDefault();
    
    const draggedFieldId = e.dataTransfer.getData('text/html');
    if (draggedFieldId === targetFieldId) return;

    const currentOrder = fields.map(f => f.id);
    const draggedIndex = currentOrder.indexOf(draggedFieldId);
    const targetIndex = currentOrder.indexOf(targetFieldId);

    const newOrder = [...currentOrder];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedFieldId);

    onReorder(newOrder);
  };

  if (fields.length === 0) {
    return (
      <Container>
        <EmptyState>
          <EmptyTitle>No custom fields yet</EmptyTitle>
          <EmptyDescription>
            Create your first custom field to start capturing additional information with your feedback.
          </EmptyDescription>
        </EmptyState>
      </Container>
    );
  }

  return (
    <Container>
      <Table>
        <Thead>
          <tr>
            <Th style={{ width: '30px' }}></Th>
            <Th>Field</Th>
            <Th>Type</Th>
            <Th>Configuration</Th>
            <Th>Created</Th>
            <Th style={{ width: '120px' }}>Actions</Th>
          </tr>
        </Thead>
        <Tbody>
          {fields.map((field) => (
            <Tr
              key={field.id}
              isDragging={draggedField === field.id}
              draggable
              onDragStart={(e) => handleDragStart(e, field.id)}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, field.id)}
            >
              <Td>
                <DragHandle />
              </Td>
              <Td>
                <FieldName>{field.label}</FieldName>
                <FieldLabel>{field.name}</FieldLabel>
              </Td>
              <Td>
                <TypeBadge type={field.type}>
                  {field.type}
                </TypeBadge>
                {field.required && <RequiredBadge>Required</RequiredBadge>}
              </Td>
              <Td>
                {field.options && field.options.length > 0 && (
                  <OptionsPreview>
                    Options: {field.options.join(', ')}
                  </OptionsPreview>
                )}
                {field.validation && (
                  <div style={{ fontSize: '12px', color: '#667085', marginTop: '4px' }}>
                    {field.validation.min !== undefined && `Min: ${field.validation.min} `}
                    {field.validation.max !== undefined && `Max: ${field.validation.max} `}
                    {field.validation.maxLength !== undefined && `Max Length: ${field.validation.maxLength} `}
                    {field.validation.pattern && `Pattern: ${field.validation.pattern}`}
                  </div>
                )}
                {field.helpText && (
                  <div style={{ fontSize: '12px', color: '#667085', marginTop: '4px' }}>
                    {field.helpText}
                  </div>
                )}
              </Td>
              <Td>
                <div style={{ fontSize: '12px', color: '#667085' }}>
                  {new Date(field.createdAt).toLocaleDateString()}
                </div>
              </Td>
              <Td>
                <ActionButton onClick={() => onEdit(field)}>
                  Edit
                </ActionButton>
                <ActionButton 
                  variant="delete" 
                  onClick={() => onDelete(field.id)}
                >
                  Delete
                </ActionButton>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Container>
  );
};