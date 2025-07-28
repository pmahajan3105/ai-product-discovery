// Feedback creation and editing modal using Zeda components
import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { Colors } from '../../theme/colors';
import { Feedback, FeedbackState, FeedbackSource, FeedbackPriority } from '@feedback-hub/types';
import Modal from '../Zeda/Modal/Modal';
import Input from '../Zeda/Input/Input';
import Textarea from '../Zeda/Input/Textarea';
import Select, { SelectOption } from '../Zeda/Select/Select';
import Button from '../Button/Button';
import FlexContainer from '../Container/FlexContainer';

const ModalHeader = styled.div`
  margin-bottom: 24px;
`;

const ModalTitle = styled.h2`
  font-size: 20px;
  font-weight: 600;
  color: ${Colors.grey900};
  margin: 0 0 8px 0;
`;

const ModalDescription = styled.p`
  font-size: 14px;
  color: ${Colors.grey600};
  margin: 0;
  line-height: 1.5;
`;

const FormContainer = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const FormActions = styled(FlexContainer)`
  margin-top: 32px;
  padding-top: 20px;
  border-top: 1px solid ${Colors.grey200};
`;

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (feedback: Partial<Feedback>) => void;
  editingFeedback?: Feedback | null;
  loading?: boolean;
}

const sourceOptions: SelectOption[] = [
  { value: FeedbackSource.DASHBOARD, label: 'Dashboard' },
  { value: FeedbackSource.WIDGET, label: 'Widget' },
  { value: FeedbackSource.EMAIL, label: 'Email' },
  { value: FeedbackSource.SLACK, label: 'Slack' },
  { value: FeedbackSource.ZENDESK, label: 'Zendesk' },
  { value: FeedbackSource.INTERCOM, label: 'Intercom' },
  { value: FeedbackSource.CSV_IMPORT, label: 'CSV Import' },
  { value: FeedbackSource.API, label: 'API' },
];

const stateOptions: SelectOption[] = [
  { value: FeedbackState.BACKLOG, label: 'Backlog' },
  { value: FeedbackState.OPEN, label: 'Open' },
  { value: FeedbackState.IN_PROGRESS, label: 'In Progress' },
  { value: FeedbackState.RESOLVED, label: 'Resolved' },
  { value: FeedbackState.ARCHIVED, label: 'Archived' },
];

const priorityOptions: SelectOption[] = [
  { value: '', label: 'No Priority' },
  { value: FeedbackPriority.LOW, label: 'Low' },
  { value: FeedbackPriority.MEDIUM, label: 'Medium' },
  { value: FeedbackPriority.HIGH, label: 'High' },
  { value: FeedbackPriority.URGENT, label: 'Urgent' },
];

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingFeedback,
  loading = false
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    source: FeedbackSource.DASHBOARD,
    state: FeedbackState.OPEN,
    priority: '',
    customerName: '',
    customerEmail: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditing = !!editingFeedback;

  // Initialize form with editing data
  useEffect(() => {
    if (editingFeedback) {
      setFormData({
        title: editingFeedback.title,
        description: editingFeedback.description,
        source: editingFeedback.source,
        state: editingFeedback.state,
        priority: editingFeedback.priority || '',
        customerName: editingFeedback.customerName || '',
        customerEmail: editingFeedback.customerEmail || '',
      });
    } else {
      // Reset form for new feedback
      setFormData({
        title: '',
        description: '',
        source: FeedbackSource.DASHBOARD,
        state: FeedbackState.OPEN,
        priority: '',
        customerName: '',
        customerEmail: '',
      });
    }
    setErrors({});
  }, [editingFeedback, isOpen]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (formData.customerEmail && !isValidEmail(formData.customerEmail)) {
      newErrors.customerEmail = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const feedbackData: Partial<Feedback> = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      source: formData.source as FeedbackSource,
      state: formData.state as FeedbackState,
      priority: formData.priority ? (formData.priority as FeedbackPriority) : undefined,
      customerName: formData.customerName.trim() || undefined,
      customerEmail: formData.customerEmail.trim() || undefined,
      createdByExternalUser: false,
    };

    if (isEditing && editingFeedback) {
      feedbackData.id = editingFeedback.id;
      feedbackData.updatedAt = new Date().toISOString();
    } else {
      feedbackData.createdAt = new Date().toISOString();
      feedbackData.updatedAt = new Date().toISOString();
      feedbackData.upvoteCount = 0;
      feedbackData.commentCount = 0;
      feedbackData.isArchived = false;
      feedbackData.isActive = true;
      feedbackData.metadata = {};
      feedbackData.customFields = [];
      feedbackData.feedbackCode = `FB-${Date.now()}`;
    }

    onSubmit(feedbackData);
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      toggle={handleClose}
      width={600}
      maxWidth="90vw"
      disableBackDropClick={loading}
    >
      <ModalHeader>
        <ModalTitle>
          {isEditing ? 'Edit Feedback' : 'Create New Feedback'}
        </ModalTitle>
        <ModalDescription>
          {isEditing 
            ? 'Update the feedback details below.' 
            : 'Add a new feedback item to track and manage customer input.'
          }
        </ModalDescription>
      </ModalHeader>

      <FormContainer onSubmit={handleSubmit}>
        <Input
          id="title"
          label="Title"
          placeholder="Enter feedback title..."
          value={formData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          error={errors.title}
          required
          fullWidth
          disabled={loading}
        />

        <Textarea
          id="description"
          label="Description"
          placeholder="Describe the feedback in detail..."
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          error={errors.description}
          required
          fullWidth
          minHeight={100}
          maxLength={1000}
          disabled={loading}
        />

        <FormRow>
          <Select
            id="source"
            label="Source"
            value={formData.source}
            onChange={(e) => handleInputChange('source', e.target.value)}
            options={sourceOptions}
            required
            fullWidth
            disabled={loading}
          />

          <Select
            id="state"
            label="Status"
            value={formData.state}
            onChange={(e) => handleInputChange('state', e.target.value)}
            options={stateOptions}
            required
            fullWidth
            disabled={loading}
          />
        </FormRow>

        <Select
          id="priority"
          label="Priority"
          value={formData.priority}
          onChange={(e) => handleInputChange('priority', e.target.value)}
          options={priorityOptions}
          placeholder="Select priority..."
          fullWidth
          disabled={loading}
        />

        <FormRow>
          <Input
            id="customerName"
            label="Customer Name"
            placeholder="Enter customer name..."
            value={formData.customerName}
            onChange={(e) => handleInputChange('customerName', e.target.value)}
            fullWidth
            disabled={loading}
          />

          <Input
            id="customerEmail"
            label="Customer Email"
            type="email"
            placeholder="customer@example.com"
            value={formData.customerEmail}
            onChange={(e) => handleInputChange('customerEmail', e.target.value)}
            error={errors.customerEmail}
            fullWidth
            disabled={loading}
          />
        </FormRow>

        <FormActions justify="flex-end" gap={12}>
          <Button 
            variant="secondary" 
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            type="submit"
            disabled={loading}
          >
            {loading ? 'Saving...' : (isEditing ? 'Update Feedback' : 'Create Feedback')}
          </Button>
        </FormActions>
      </FormContainer>
    </Modal>
  );
};

export default FeedbackModal;