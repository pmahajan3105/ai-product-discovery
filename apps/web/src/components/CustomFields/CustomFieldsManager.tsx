'use client';

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { customFieldsApi, CustomFieldDefinition, CreateCustomFieldRequest, UpdateCustomFieldRequest } from '../../lib/api';
import { CustomFieldForm } from './CustomFieldForm';
import { CustomFieldsList } from './CustomFieldsList';

const Container = styled.div`
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 600;
  color: #101828;
  margin: 0;
`;

const Description = styled.p`
  color: #667085;
  margin: 8px 0 0 0;
  font-size: 16px;
`;

const AddButton = styled.button`
  background: #5E72E4;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background: #4C63D2;
  }

  &:disabled {
    background: #D0D5DD;
    cursor: not-allowed;
  }
`;

const Modal = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: ${props => props.isOpen ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
`;

const ErrorMessage = styled.div`
  background: #FEF2F2;
  border: 1px solid #FECACA;
  border-radius: 8px;
  padding: 12px;
  color: #DC2626;
  margin-bottom: 16px;
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: #667085;
`;

interface CustomFieldsManagerProps {
  organizationId: string;
}

export const CustomFieldsManager: React.FC<CustomFieldsManagerProps> = ({ organizationId }) => {
  const [fields, setFields] = useState<CustomFieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null);

  useEffect(() => {
    loadCustomFields();
  }, [organizationId]);

  const loadCustomFields = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedFields = await customFieldsApi.getCustomFields(organizationId);
      setFields(fetchedFields);
    } catch (err) {
      console.error('Failed to load custom fields:', err);
      setError('Failed to load custom fields. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateField = async (data: CreateCustomFieldRequest) => {
    try {
      const newField = await customFieldsApi.createCustomField(organizationId, data);
      setFields(prev => [...prev, newField]);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to create custom field:', err);
      throw new Error('Failed to create custom field. Please try again.');
    }
  };

  const handleUpdateField = async (fieldId: string, data: UpdateCustomFieldRequest) => {
    try {
      const updatedField = await customFieldsApi.updateCustomField(organizationId, fieldId, data);
      setFields(prev => prev.map(field => field.id === fieldId ? updatedField : field));
      setIsModalOpen(false);
      setEditingField(null);
    } catch (err) {
      console.error('Failed to update custom field:', err);
      throw new Error('Failed to update custom field. Please try again.');
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    if (!confirm('Are you sure you want to delete this custom field? This action cannot be undone.')) {
      return;
    }

    try {
      await customFieldsApi.deleteCustomField(organizationId, fieldId);
      setFields(prev => prev.filter(field => field.id !== fieldId));
    } catch (err) {
      console.error('Failed to delete custom field:', err);
      setError('Failed to delete custom field. Please try again.');
    }
  };

  const handleReorderFields = async (reorderedFieldIds: string[]) => {
    try {
      const reorderedFields = await customFieldsApi.reorderCustomFields(organizationId, reorderedFieldIds);
      setFields(reorderedFields);
    } catch (err) {
      console.error('Failed to reorder custom fields:', err);
      setError('Failed to reorder custom fields. Please try again.');
    }
  };

  const openCreateModal = () => {
    setEditingField(null);
    setIsModalOpen(true);
  };

  const openEditModal = (field: CustomFieldDefinition) => {
    setEditingField(field);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingField(null);
  };

  if (loading) {
    return (
      <Container>
        <LoadingSpinner>Loading custom fields...</LoadingSpinner>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <div>
          <Title>Custom Fields</Title>
          <Description>
            Create and manage custom fields to capture additional information with your feedback.
          </Description>
        </div>
        <AddButton onClick={openCreateModal}>
          Add Custom Field
        </AddButton>
      </Header>

      {error && (
        <ErrorMessage>
          {error}
        </ErrorMessage>
      )}

      <CustomFieldsList
        fields={fields}
        onEdit={openEditModal}
        onDelete={handleDeleteField}
        onReorder={handleReorderFields}
      />

      <Modal isOpen={isModalOpen}>
        <ModalContent>
          <CustomFieldForm
            field={editingField}
            onSubmit={editingField ? 
              (data) => handleUpdateField(editingField.id, data) : 
              handleCreateField
            }
            onCancel={closeModal}
          />
        </ModalContent>
      </Modal>
    </Container>
  );
};