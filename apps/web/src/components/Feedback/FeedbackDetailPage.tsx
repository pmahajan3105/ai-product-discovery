/**
 * Feedback Detail Page
 * Comprehensive feedback view with full editing capabilities and comment system
 * Following Zeda patterns for detailed feedback management
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styled from '@emotion/styled';
import { Colors } from '../../theme/colors';
import { Feedback, FeedbackComment, FeedbackState, FeedbackPriority, FeedbackSource } from '@feedback-hub/types';
import { DashboardLayout } from '../Layout/DashboardLayout';
import { feedbackApi, UpdateFeedbackRequest, AddCommentRequest } from '../../lib/api/feedbackApi';
import { authApi } from '../../lib/api/authApi';
import { customFieldsApi, CustomFieldDefinition, CustomFieldValue } from '../../lib/api/customFieldsApi';
import { CustomFieldRenderer } from '../CustomFields/CustomFieldRenderer';
import Button from '../Button/Button';
import FlexContainer from '../Container/FlexContainer';
import Input from '../Zeda/Input/Input';
import Textarea from '../Zeda/Input/Textarea';
import Select, { SelectOption } from '../Zeda/Select/Select';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { SourceIcon } from './SourceIcon';
import { 
  Edit3, 
  Save, 
  X, 
  MessageCircle, 
  ThumbsUp, 
  Calendar, 
  User, 
  Mail, 
  Building, 
  ArrowLeft,
  MoreHorizontal,
  Archive,
  Trash2
} from 'lucide-react';

const DetailContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 24px;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
`;

const MainContent = styled.div`
  background: white;
  border: 1px solid ${Colors.grey200};
  border-radius: 8px;
  overflow: hidden;
`;

const Sidebar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const FeedbackHeader = styled.div`
  padding: 24px;
  border-bottom: 1px solid ${Colors.grey200};
`;

const HeaderTop = styled(FlexContainer)`
  margin-bottom: 16px;
`;

const FeedbackMeta = styled(FlexContainer)`
  font-size: 14px;
  color: ${Colors.grey600};
  gap: 16px;
  flex-wrap: wrap;
`;

const FeedbackTitle = styled.h1`
  font-size: 24px;
  font-weight: 600;
  color: ${Colors.grey900};
  margin: 0 0 8px 0;
  line-height: 1.3;
`;

const FeedbackContent = styled.div`
  padding: 24px;
  border-bottom: 1px solid ${Colors.grey200};
`;

const SectionTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: ${Colors.grey900};
  margin: 0 0 12px 0;
`;

const DescriptionText = styled.div`
  font-size: 14px;
  color: ${Colors.grey700};
  line-height: 1.6;
  white-space: pre-wrap;
`;

const CommentsSection = styled.div`
  padding: 24px;
`;

const CommentItem = styled.div`
  padding: 16px;
  border: 1px solid ${Colors.grey200};
  border-radius: 8px;
  margin-bottom: 12px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const CommentHeader = styled(FlexContainer)`
  margin-bottom: 8px;
`;

const CommentAuthor = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: ${Colors.grey900};
`;

const CommentDate = styled.span`
  font-size: 12px;
  color: ${Colors.grey500};
`;

const CommentText = styled.div`
  font-size: 14px;
  color: ${Colors.grey700};
  line-height: 1.5;
`;

const SidebarCard = styled.div`
  background: white;
  border: 1px solid ${Colors.grey200};
  border-radius: 8px;
  padding: 20px;
`;

const FieldRow = styled(FlexContainer)`
  margin-bottom: 12px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const FieldLabel = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${Colors.grey600};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  min-width: 80px;
`;

const FieldValue = styled.div`
  font-size: 14px;
  color: ${Colors.grey900};
  flex: 1;
`;

const EditForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const ActionButton = styled(Button)`
  min-width: auto;
`;

interface FeedbackDetailPageProps {
  feedbackId: string;
  onBack?: () => void;
}

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

export const FeedbackDetailPage: React.FC<FeedbackDetailPageProps> = ({
  feedbackId,
  onBack
}) => {
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [comments, setComments] = useState<FeedbackComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Custom fields state
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<CustomFieldValue[]>([]);
  const [customFieldErrors, setCustomFieldErrors] = useState<Record<string, string>>({});
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    state: FeedbackState.OPEN,
    priority: '',
    customerName: '',
    customerEmail: '',
  });

  // New comment state
  const [newComment, setNewComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);

  const [user, setUser] = useState<any>(null);

  // Load user data and feedback
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      try {
        // Load user profile
        const authResponse = await authApi.getAuthStatus();
        if (authResponse.success && authResponse.data?.profile) {
          setUser({
            name: `${authResponse.data.profile.firstName} ${authResponse.data.profile.lastName}`.trim() || authResponse.data.profile.email,
            email: authResponse.data.profile.email
          });
        }

        // Load feedback data
        const feedbackResponse = await feedbackApi.getFeedbackById(feedbackId);
        if (feedbackResponse.success && feedbackResponse.data) {
          const feedbackData = feedbackResponse.data;
          setFeedback(feedbackData);
          
          // Initialize edit form
          setEditForm({
            title: feedbackData.title,
            description: feedbackData.description,
            state: feedbackData.state,
            priority: feedbackData.priority || '',
            customerName: feedbackData.customerName || '',
            customerEmail: feedbackData.customerEmail || '',
          });

          // Load custom fields for the organization
          if (feedbackData.workspaceId) {
            try {
              const [customFieldsResponse, customFieldValuesResponse] = await Promise.all([
                customFieldsApi.getCustomFields(feedbackData.workspaceId),
                customFieldsApi.getFeedbackCustomFields(feedbackId)
              ]);
              
              setCustomFields(customFieldsResponse);
              setCustomFieldValues(customFieldValuesResponse.map(cf => cf.value).filter(Boolean));
            } catch (error) {
              console.warn('Failed to load custom fields:', error);
              // Continue without custom fields
            }
          }

          // Load comments (mock for now - will be real API later)
          const mockComments: FeedbackComment[] = [
            {
              id: 'comment1',
              feedbackId: feedbackId,
              text: 'This is a great suggestion! We\'ve been hearing similar requests from other customers.',
              mentions: [],
              createdByExternalUser: false,
              authorName: 'Product Manager',
              authorEmail: 'pm@feedbackhub.com',
              isInternal: false,
              visibility: 'INTERNAL_AND_EXTERNAL' as any,
              createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
              updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
              workspaceId: 'workspace1'
            }
          ];
          setComments(mockComments);
        } else {
          console.error('Failed to load feedback:', feedbackResponse.error);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (feedbackId) {
      loadData();
    }
  }, [feedbackId]);

  const handleEdit = () => {
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    // Reset form to original values
    if (feedback) {
      setEditForm({
        title: feedback.title,
        description: feedback.description,
        state: feedback.state,
        priority: feedback.priority || '',
        customerName: feedback.customerName || '',
        customerEmail: feedback.customerEmail || '',
      });
    }
  };

  // Custom field value handling
  const handleCustomFieldChange = (fieldId: string, value: any, displayValue?: string) => {
    setCustomFieldValues(prev => {
      const existing = prev.find(cv => cv.fieldId === fieldId);
      if (existing) {
        return prev.map(cv => 
          cv.fieldId === fieldId 
            ? { ...cv, value, displayValue }
            : cv
        );
      } else {
        return [...prev, { fieldId, value, displayValue }];
      }
    });
    
    // Clear any error for this field
    if (customFieldErrors[fieldId]) {
      setCustomFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const validateCustomFields = (): boolean => {
    const errors: Record<string, string> = {};
    let isValid = true;

    customFields.forEach(field => {
      if (field.required) {
        const value = customFieldValues.find(cv => cv.fieldId === field.id)?.value;
        if (!value || value === '' || (Array.isArray(value) && value.length === 0)) {
          errors[field.id] = `${field.label} is required`;
          isValid = false;
        }
      }
    });

    setCustomFieldErrors(errors);
    return isValid;
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (!feedback) return;

      // Validate custom fields
      if (!validateCustomFields()) {
        setSaving(false);
        return;
      }

      const updateData: UpdateFeedbackRequest = {
        title: editForm.title,
        description: editForm.description,
        status: editForm.state as FeedbackState,
        priority: editForm.priority ? (editForm.priority as FeedbackPriority) : undefined,
        // Note: customerName and customerEmail updates should be handled via customer API
        // For now, we'll update the feedback metadata
        metadata: {
          ...feedback.metadata,
          customerName: editForm.customerName || undefined,
          customerEmail: editForm.customerEmail || undefined
        }
      };

      // Update feedback first
      const response = await feedbackApi.updateFeedback(feedback.id, updateData);
      
      if (response.success && response.data) {
        // Update custom field values
        if (customFieldValues.length > 0) {
          try {
            await customFieldsApi.setFeedbackCustomFields(feedback.id, customFieldValues);
          } catch (error) {
            console.warn('Failed to save custom field values:', error);
            // Continue - feedback update succeeded
          }
        }

        setFeedback(response.data);
        setEditing(false);
        setCustomFieldErrors({});
      } else {
        console.error('Failed to update feedback:', response.error);
        // TODO: Show user-friendly error message
      }
    } catch (error) {
      console.error('Error updating feedback:', error);
      // TODO: Show user-friendly error message
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return;
    
    setAddingComment(true);
    
    try {
      const commentData: AddCommentRequest = {
        content: newComment,
        isInternal: false // Default to public comment
      };

      const response = await feedbackApi.addComment(feedbackId, commentData);
      
      if (response.success && response.data) {
        setComments(prev => [...prev, response.data]);
        setNewComment('');
        
        // Update comment count in feedback
        if (feedback) {
          setFeedback(prev => prev ? { ...prev, commentCount: prev.commentCount + 1 } : null);
        }
      } else {
        console.error('Failed to add comment:', response.error);
        // TODO: Show user-friendly error message
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      // TODO: Show user-friendly error message
    } finally {
      setAddingComment(false);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.push('/feedback');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading || !user) {
    return (
      <DashboardLayout title="Loading..." user={user || { name: 'Loading...', email: '' }}>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          Loading feedback details...
        </div>
      </DashboardLayout>
    );
  }

  if (!feedback) {
    return (
      <DashboardLayout title="Feedback Not Found" user={user}>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <h2>Feedback not found</h2>
          <Button variant="primary" onClick={handleBack}>
            Back to Feedback
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const headerActions = (
    <FlexContainer gap={8}>
      <ActionButton variant="secondary" onClick={handleBack}>
        <ArrowLeft size={16} />
        Back
      </ActionButton>
      {!editing && (
        <ActionButton variant="primary" onClick={handleEdit}>
          <Edit3 size={16} />
          Edit
        </ActionButton>
      )}
    </FlexContainer>
  );

  return (
    <DashboardLayout 
      title={`${feedback.feedbackCode || feedback.id} - ${feedback.title}`} 
      user={user}
      actions={headerActions}
    >
      <DetailContainer>
        <MainContent>
          {/* Header */}
          <FeedbackHeader>
            {editing ? (
              <EditForm onSubmit={handleSaveEdit}>
                <Input
                  id="title"
                  label="Title"
                  value={editForm.title}
                  onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                  required
                  fullWidth
                  disabled={saving}
                />
                
                <Textarea
                  id="description"
                  label="Description"
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  required
                  fullWidth
                  minHeight={120}
                  disabled={saving}
                />
                
                <FormRow>
                  <Select
                    id="state"
                    label="Status"
                    value={editForm.state}
                    onChange={(e) => setEditForm(prev => ({ ...prev, state: e.target.value as FeedbackState }))}
                    options={stateOptions}
                    required
                    fullWidth
                    disabled={saving}
                  />
                  
                  <Select
                    id="priority"
                    label="Priority"
                    value={editForm.priority}
                    onChange={(e) => setEditForm(prev => ({ ...prev, priority: e.target.value }))}
                    options={priorityOptions}
                    fullWidth
                    disabled={saving}
                  />
                </FormRow>
                
                <FormRow>
                  <Input
                    id="customerName"
                    label="Customer Name"
                    value={editForm.customerName}
                    onChange={(e) => setEditForm(prev => ({ ...prev, customerName: e.target.value }))}
                    fullWidth
                    disabled={saving}
                  />
                  
                  <Input
                    id="customerEmail"
                    label="Customer Email"
                    type="email"
                    value={editForm.customerEmail}
                    onChange={(e) => setEditForm(prev => ({ ...prev, customerEmail: e.target.value }))}
                    fullWidth
                    disabled={saving}
                  />
                </FormRow>
                
                {/* Custom Fields */}
                {customFields.length > 0 && (
                  <div style={{ marginTop: '24px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '500', color: '#101828', marginBottom: '16px' }}>
                      Custom Fields
                    </h3>
                    {customFields.map(field => {
                      const fieldValue = customFieldValues.find(cv => cv.fieldId === field.id);
                      return (
                        <CustomFieldRenderer
                          key={field.id}
                          field={field}
                          value={fieldValue}
                          onChange={(value, displayValue) => handleCustomFieldChange(field.id, value, displayValue)}
                          error={customFieldErrors[field.id]}
                          mode="form"
                        />
                      );
                    })}
                  </div>
                )}
                
                <FlexContainer justify="flex-end" gap={12}>
                  <Button 
                    variant="secondary" 
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={saving}
                  >
                    <X size={16} />
                    Cancel
                  </Button>
                  <Button 
                    variant="primary" 
                    type="submit"
                    disabled={saving}
                  >
                    <Save size={16} />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </FlexContainer>
              </EditForm>
            ) : (
              <>
                <HeaderTop justify="space-between" align="flex-start">
                  <div style={{ flex: 1 }}>
                    <FeedbackTitle>{feedback.title}</FeedbackTitle>
                    <FeedbackMeta>
                      <FlexContainer align="center" gap={4}>
                        <SourceIcon source={feedback.source} size={14} />
                        {feedback.source}
                      </FlexContainer>
                      <FlexContainer align="center" gap={4}>
                        <Calendar size={14} />
                        Created {formatDate(feedback.createdAt)}
                      </FlexContainer>
                      <FlexContainer align="center" gap={4}>
                        <ThumbsUp size={14} />
                        {feedback.upvoteCount} upvotes
                      </FlexContainer>
                      <FlexContainer align="center" gap={4}>
                        <MessageCircle size={14} />
                        {feedback.commentCount} comments
                      </FlexContainer>
                    </FeedbackMeta>
                  </div>
                  <FlexContainer gap={8}>
                    <StatusBadge state={feedback.state} />
                    {feedback.priority && <PriorityBadge priority={feedback.priority} />}
                  </FlexContainer>
                </HeaderTop>
              </>
            )}
          </FeedbackHeader>

          {/* Content */}
          {!editing && (
            <FeedbackContent>
              <SectionTitle>Description</SectionTitle>
              <DescriptionText>{feedback.description}</DescriptionText>
              
              {/* Custom Fields Display */}
              {customFields.length > 0 && customFieldValues.length > 0 && (
                <div style={{ marginTop: '24px' }}>
                  <SectionTitle>Custom Fields</SectionTitle>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    {customFields.map(field => {
                      const fieldValue = customFieldValues.find(cv => cv.fieldId === field.id);
                      return (
                        <CustomFieldRenderer
                          key={field.id}
                          field={field}
                          value={fieldValue}
                          mode="display"
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </FeedbackContent>
          )}

          {/* Comments */}
          <CommentsSection>
            <SectionTitle>Comments ({comments.length})</SectionTitle>
            
            {comments.map(comment => (
              <CommentItem key={comment.id}>
                <CommentHeader justify="space-between">
                  <FlexContainer gap={8}>
                    <CommentAuthor>{comment.authorName}</CommentAuthor>
                    {comment.isInternal && (
                      <span style={{ 
                        fontSize: '11px', 
                        background: Colors.grey100, 
                        color: Colors.grey600,
                        padding: '2px 6px',
                        borderRadius: '4px'
                      }}>
                        Internal
                      </span>
                    )}
                  </FlexContainer>
                  <CommentDate>{formatDate(comment.createdAt)}</CommentDate>
                </CommentHeader>
                <CommentText>{comment.text}</CommentText>
              </CommentItem>
            ))}
            
            <div style={{ marginTop: '20px' }}>
              <Textarea
                id="newComment"
                label="Add Comment"
                placeholder="Share your thoughts or updates..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                fullWidth
                minHeight={80}
                disabled={addingComment}
              />
              <div style={{ marginTop: '12px' }}>
                <Button
                  variant="primary"
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || addingComment}
                >
                  {addingComment ? 'Adding...' : 'Add Comment'}
                </Button>
              </div>
            </div>
          </CommentsSection>
        </MainContent>

        {/* Sidebar */}
        <Sidebar>
          <SidebarCard>
            <SectionTitle>Details</SectionTitle>
            <FieldRow>
              <FieldLabel>Code</FieldLabel>
              <FieldValue>{feedback.feedbackCode}</FieldValue>
            </FieldRow>
            <FieldRow>
              <FieldLabel>Status</FieldLabel>
              <FieldValue>
                <StatusBadge state={feedback.state} />
              </FieldValue>
            </FieldRow>
            {feedback.priority && (
              <FieldRow>
                <FieldLabel>Priority</FieldLabel>
                <FieldValue>
                  <PriorityBadge priority={feedback.priority} />
                </FieldValue>
              </FieldRow>
            )}
            <FieldRow>
              <FieldLabel>Source</FieldLabel>
              <FieldValue>
                <FlexContainer align="center" gap={6}>
                  <SourceIcon source={feedback.source} size={16} />
                  {feedback.source}
                </FlexContainer>
              </FieldValue>
            </FieldRow>
            <FieldRow>
              <FieldLabel>Updated</FieldLabel>
              <FieldValue>{formatDate(feedback.updatedAt)}</FieldValue>
            </FieldRow>
          </SidebarCard>

          {(feedback.customerName || feedback.customerEmail) && (
            <SidebarCard>
              <SectionTitle>Customer</SectionTitle>
              {feedback.customerName && (
                <FieldRow>
                  <FieldLabel>Name</FieldLabel>
                  <FieldValue>
                    <FlexContainer align="center" gap={6}>
                      <User size={14} />
                      {feedback.customerName}
                    </FlexContainer>
                  </FieldValue>
                </FieldRow>
              )}
              {feedback.customerEmail && (
                <FieldRow>
                  <FieldLabel>Email</FieldLabel>
                  <FieldValue>
                    <FlexContainer align="center" gap={6}>
                      <Mail size={14} />
                      {feedback.customerEmail}
                    </FlexContainer>
                  </FieldValue>
                </FieldRow>
              )}
              {feedback.revenueImpact && (
                <FieldRow>
                  <FieldLabel>Revenue</FieldLabel>
                  <FieldValue>${feedback.revenueImpact.toLocaleString()}</FieldValue>
                </FieldRow>
              )}
            </SidebarCard>
          )}

          {feedback.metadata.tags && feedback.metadata.tags.length > 0 && (
            <SidebarCard>
              <SectionTitle>Tags</SectionTitle>
              <FlexContainer gap={6} wrap>
                {feedback.metadata.tags.map(tag => (
                  <span
                    key={tag}
                    style={{
                      fontSize: '12px',
                      background: Colors.grey100,
                      color: Colors.grey700,
                      padding: '4px 8px',
                      borderRadius: '12px'
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </FlexContainer>
            </SidebarCard>
          )}
        </Sidebar>
      </DetailContainer>
    </DashboardLayout>
  );
};

export default FeedbackDetailPage;