import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import { FeedbackTable } from '../components/Feedback/FeedbackTable';
import { FeedbackModal } from '../components/Feedback/FeedbackModal';
import CSVImportModal from '../components/CSV/CSVImportModal';
import { useAuth } from '../hooks/useAuth';
import { feedbackApi, FeedbackListParams } from '../lib/api/feedbackApi';
import { Feedback, FeedbackState, FeedbackPriority } from '@feedback-hub/types';
import { FilterCondition } from '../components/Filter';
import Button from '../components/Button/Button';
import { Plus, Upload, Link, AlertCircle } from 'lucide-react';
import { copyCurrentUrlToClipboard } from '../hooks/useUrlState';

export default function FeedbackPage() {
  const router = useRouter();
  const { user, organizationId } = useAuth();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState<Feedback | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [statusOptions, setStatusOptions] = useState<Array<{value: string, label: string}>>([]);
  const [assigneeOptions, setAssigneeOptions] = useState<Array<{value: string, label: string}>>([]);
  const [currentParams, setCurrentParams] = useState<FeedbackListParams>({});

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
  }, [user, router]);

  // Load feedback data on mount and when organization changes
  useEffect(() => {
    if (organizationId) {
      loadFeedbackData();
      loadFilterOptions();
    }
  }, [organizationId]);

  const loadFeedbackData = async (params: FeedbackListParams = {}) => {
    if (!organizationId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await feedbackApi.getFeedbackList(organizationId, params);
      
      if (response.success && response.data) {
        setFeedbacks(response.data);
        setCurrentParams(params);
      } else {
        throw new Error(response.error || 'Failed to load feedback');
      }
    } catch (err) {
      console.error('Error loading feedback:', err);
      setError(err instanceof Error ? err.message : 'Failed to load feedback');
      setFeedbacks([]);
    } finally {
      setLoading(false);
    }
  };

  const loadFilterOptions = async () => {
    if (!organizationId) return;

    try {
      const response = await feedbackApi.getFilterOptions(organizationId);
      
      if (response.success && response.data) {
        const { statuses, assignees } = response.data;
        
        setStatusOptions(statuses.map(status => ({
          value: status,
          label: status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')
        })));
        
        setAssigneeOptions(assignees.map(assignee => ({
          value: assignee.id,
          label: assignee.name
        })));
      }
    } catch (err) {
      console.error('Error loading filter options:', err);
      // Set fallback options
      setStatusOptions([
        { value: 'new', label: 'New' },
        { value: 'in-progress', label: 'In Progress' },
        { value: 'resolved', label: 'Resolved' },
        { value: 'closed', label: 'Closed' }
      ]);
      setAssigneeOptions([]);
    }
  };

  const handleCreateFeedback = () => {
    setEditingFeedback(null);
    setModalOpen(true);
  };

  const handleEditFeedback = (feedback: Feedback) => {
    setEditingFeedback(feedback);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingFeedback(null);
  };

  const handleFeedbackSubmit = async (feedbackData: Partial<Feedback>) => {
    if (!organizationId) return;
    
    setModalLoading(true);
    
    try {
      if (editingFeedback) {
        // Update existing feedback
        const response = await feedbackApi.updateFeedback(editingFeedback.id, {
          title: feedbackData.title,
          description: feedbackData.description,
          status: feedbackData.state,
          priority: feedbackData.priority,
          assignedTo: feedbackData.assigneeId,
          metadata: {
            ...feedbackData.metadata,
            category: feedbackData.metadata?.category
          }
        });
        
        if (response.success && response.data) {
          setFeedbacks(prev => prev.map(f => 
            f.id === editingFeedback.id ? response.data! : f
          ));
        } else {
          throw new Error(response.error || 'Failed to update feedback');
        }
      } else {
        // Create new feedback
        const response = await feedbackApi.createFeedback(organizationId, {
          title: feedbackData.title || '',
          description: feedbackData.description || '',
          source: feedbackData.source || 'manual',
          priority: feedbackData.priority as FeedbackPriority,
          assignedTo: feedbackData.assigneeId,
          metadata: {
            ...feedbackData.metadata,
            category: feedbackData.metadata?.category
          }
        });
        
        if (response.success && response.data) {
          setFeedbacks(prev => [response.data!, ...prev]);
        } else {
          throw new Error(response.error || 'Failed to create feedback');
        }
      }
      
      handleModalClose();
    } catch (error) {
      console.error('Error saving feedback:', error);
      setError(error instanceof Error ? error.message : 'Failed to save feedback');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteFeedback = async (feedbackIds: string[]) => {
    try {
      // Delete each feedback item
      await Promise.all(feedbackIds.map(id => feedbackApi.deleteFeedback(id)));
      
      // Remove from local state
      setFeedbacks(prev => prev.filter(f => !feedbackIds.includes(f.id)));
    } catch (error) {
      console.error('Error deleting feedback:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete feedback');
    }
  };

  const handleUpdateStatus = async (feedbackId: string, status: FeedbackState) => {
    try {
      const response = await feedbackApi.updateFeedback(feedbackId, { status });
      
      if (response.success && response.data) {
        setFeedbacks(prev => prev.map(f => 
          f.id === feedbackId ? response.data! : f
        ));
      } else {
        throw new Error(response.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      setError(error instanceof Error ? error.message : 'Failed to update status');
    }
  };
  
  const handleUpdatePriority = async (feedbackId: string, priority: FeedbackPriority) => {
    try {
      const response = await feedbackApi.updateFeedback(feedbackId, { priority });
      
      if (response.success && response.data) {
        setFeedbacks(prev => prev.map(f => 
          f.id === feedbackId ? response.data! : f
        ));
      } else {
        throw new Error(response.error || 'Failed to update priority');
      }
    } catch (error) {
      console.error('Error updating priority:', error);
      setError(error instanceof Error ? error.message : 'Failed to update priority');
    }
  };
  
  const handleBulkStatusUpdate = async (feedbackIds: string[], status: string) => {
    if (!organizationId) return;
    
    try {
      const response = await feedbackApi.bulkUpdateStatus(organizationId, feedbackIds, status);
      
      if (response.success) {
        // Reload the feedback list to get updated data
        await loadFeedbackData(currentParams);
      } else {
        throw new Error(response.error || 'Failed to bulk update status');
      }
    } catch (error) {
      console.error('Error bulk updating status:', error);
      setError(error instanceof Error ? error.message : 'Failed to bulk update status');
    }
  };
  
  const handleBulkAssign = async (feedbackIds: string[], assigneeId: string | null) => {
    if (!organizationId) return;
    
    try {
      const response = await feedbackApi.bulkAssign(organizationId, feedbackIds, assigneeId);
      
      if (response.success) {
        // Reload the feedback list to get updated data
        await loadFeedbackData(currentParams);
      } else {
        throw new Error(response.error || 'Failed to bulk assign');
      }
    } catch (error) {
      console.error('Error bulk assigning:', error);
      setError(error instanceof Error ? error.message : 'Failed to bulk assign');
    }
  };
  
  const handleBulkArchive = async (feedbackIds: string[]) => {
    try {
      // Archive by updating each feedback
      await Promise.all(feedbackIds.map(id => 
        feedbackApi.updateFeedback(id, { metadata: { archived: true } })
      ));
      
      // Reload the feedback list
      await loadFeedbackData(currentParams);
    } catch (error) {
      console.error('Error bulk archiving:', error);
      setError(error instanceof Error ? error.message : 'Failed to bulk archive');
    }
  };
  
  const handleBulkExport = (feedbackIds: string[], format: 'csv' | 'json' | 'xlsx') => {
    console.log('Bulk export:', feedbackIds, format);
    // Implement export functionality
  };
  
  const handleShareFeedbackView = async () => {
    setShareLoading(true);
    try {
      await copyCurrentUrlToClipboard();
      console.log('Feedback view URL copied to clipboard!');
      // In a real app, you'd show a toast notification here
    } catch (error) {
      console.error('Failed to copy URL:', error);
    } finally {
      setShareLoading(false);
    }
  };

  const handleCsvImport = async (data: { file: File; mapping: { [key: string]: string } }) => {
    console.log('CSV Import:', data);
    
    // Simulate API call
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({ data: { result: { id: `task-${Date.now()}` } } });
      }, 1000);
    });
  };

  const feedbackFields = [
    { displayName: 'Title', isRequired: true, typeId: 'title' },
    { displayName: 'Description', isRequired: true, typeId: 'description' },
    { displayName: 'Customer Email', isRequired: false, typeId: 'customerEmail' },
    { displayName: 'Priority', isRequired: false, typeId: 'priority' },
    { displayName: 'Category', isRequired: false, typeId: 'category' },
    { displayName: 'Status', isRequired: false, typeId: 'state' },
  ];


  // Handle URL state changes from the table
  const handleUrlStateChange = async (state: any) => {
    const params: FeedbackListParams = {
      search: state.search || undefined,
      status: state.status?.join(',') || undefined,
      category: state.category?.join(',') || undefined,
      assignedTo: state.assignedTo?.join(',') || undefined,
      sortBy: state.sortBy || 'createdAt',
      sortOrder: state.sortOrder || 'DESC',
      page: state.page || 1,
      limit: state.limit || 25,
    };
    
    await loadFeedbackData(params);
  };

  // Show loading state if not authenticated or no organization
  if (!user || !organizationId) {
    return (
      <DashboardLayout title="Feedback Management" user={user}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const dashboardActions = (
    <div style={{ display: 'flex', gap: '12px' }}>
      <Button 
        variant="secondary" 
        onClick={handleShareFeedbackView}
        disabled={shareLoading}
      >
        <Link size={16} className={shareLoading ? 'animate-pulse' : ''} />
        Share View
      </Button>
      <Button variant="secondary" onClick={() => setCsvModalOpen(true)}>
        <Upload size={16} />
        Import CSV
      </Button>
      <Button variant="primary" onClick={handleCreateFeedback}>
        <Plus size={16} />
        New Feedback
      </Button>
    </div>
  );

  return (
    <DashboardLayout 
      title="Feedback Management" 
      user={user}
      actions={dashboardActions}
    >
      <div className="space-y-6">
        {/* Error State */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-md">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  <strong>Error:</strong> {error}
                </p>
                <button 
                  onClick={() => loadFeedbackData(currentParams)}
                  className="mt-2 text-sm text-red-800 underline hover:text-red-900"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* URL State Demo Notice */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-md">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>Real-time Feedback Management:</strong> All data is now synced with the backend API. 
                Filter, search, sort, and manage feedback with real database integration.
                Use the "Share View" button to copy the current URL with applied filters.
              </p>
            </div>
          </div>
        </div>

        {/* Enhanced Feedback Table with Real API Integration */}
        <FeedbackTable
          feedbacks={feedbacks}
          loading={loading}
          onCreateFeedback={handleCreateFeedback}
          onEditFeedback={handleEditFeedback}
          onDeleteFeedback={handleDeleteFeedback}
          onUpdateStatus={handleUpdateStatus}
          onUpdatePriority={handleUpdatePriority}
          onBulkStatusUpdate={handleBulkStatusUpdate}
          onBulkAssign={handleBulkAssign}
          onBulkArchive={handleBulkArchive}
          onBulkExport={handleBulkExport}
          statusOptions={statusOptions}
          assigneeOptions={assigneeOptions}
          enableUrlState={true} // Enable URL state management
          externalUrlState={{
            search: '',
            status: [],
            category: [],
            assignedTo: [],
            sortBy: 'createdAt',
            sortOrder: 'DESC',
            page: 1,
            limit: 25,
            onStateChange: handleUrlStateChange
          }}
        />
      </div>
      
      <FeedbackModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        onSubmit={handleFeedbackSubmit}
        editingFeedback={editingFeedback}
        loading={modalLoading}
      />
      
      <CSVImportModal
        isOpen={csvModalOpen}
        onClose={() => setCsvModalOpen(false)}
        onCsvImport={handleCsvImport}
        moduleFields={feedbackFields}
      />
    </DashboardLayout>
  );
}