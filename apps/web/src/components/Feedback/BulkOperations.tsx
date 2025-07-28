import React, { useState } from 'react';
import styled from '@emotion/styled';
import { Colors } from '../../theme/colors';
import { 
  CheckSquare, 
  Square, 
  Minus, 
  MoreHorizontal, 
  Archive, 
  UserPlus, 
  Tag, 
  Download,
  Trash2
} from 'lucide-react';
import Button from '../Button/Button';
import Select from '../Zeda/Select/Select';
import Modal from '../Zeda/Modal/Modal';

interface BulkOperationsProps {
  selectedItems: string[];
  totalItems: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkStatusUpdate: (status: string) => void;
  onBulkAssign: (assigneeId: string | null) => void;
  onBulkArchive: () => void;
  onBulkDelete: () => void;
  onBulkExport: (format: 'csv' | 'json' | 'xlsx') => void;
  assigneeOptions?: Array<{ value: string; label: string }>;
  statusOptions?: Array<{ value: string; label: string }>;
  isLoading?: boolean;
}

const BulkBar = styled.div<{ isVisible: boolean }>`
  position: fixed;
  bottom: ${props => props.isVisible ? '20px' : '-80px'};
  left: 50%;
  transform: translateX(-50%);
  background: ${Colors.white};
  border: 1px solid ${Colors.grey200};
  border-radius: 8px;
  padding: 16px 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  display: flex;
  align-items: center;
  gap: 16px;
  z-index: 1000;
  transition: bottom 0.3s ease;
  min-width: 600px;
`;

const SelectionInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const SelectionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  color: ${Colors.primary600};
  font-weight: 500;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  
  &:hover {
    background: ${Colors.primary50};
  }
`;

const SelectionText = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: ${Colors.grey700};
`;

const Divider = styled.div`
  width: 1px;
  height: 24px;
  background: ${Colors.grey200};
`;

const BulkActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ActionButton = styled(Button)`
  font-size: 13px;
  padding: 6px 12px;
  height: auto;
`;

const ConfirmModal = styled.div`
  padding: 24px;
  text-align: center;
`;

const ModalTitle = styled.h3`
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: ${Colors.grey900};
`;

const ModalText = styled.p`
  margin: 0 0 24px 0;
  color: ${Colors.grey600};
  line-height: 1.5;
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: center;
  gap: 12px;
`;

const BulkOperations: React.FC<BulkOperationsProps> = ({
  selectedItems,
  totalItems,
  onSelectAll,
  onDeselectAll,
  onBulkStatusUpdate,
  onBulkAssign,
  onBulkArchive,
  onBulkDelete,
  onBulkExport,
  assigneeOptions = [],
  statusOptions = [],
  isLoading = false
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  const isVisible = selectedItems.length > 0;
  const isAllSelected = selectedItems.length === totalItems;
  const isPartialSelected = selectedItems.length > 0 && selectedItems.length < totalItems;

  const handleSelectToggle = () => {
    if (isAllSelected) {
      onDeselectAll();
    } else {
      onSelectAll();
    }
  };

  const handleStatusChange = (status: string) => {
    onBulkStatusUpdate(status);
  };

  const handleAssigneeChange = (assigneeId: string) => {
    onBulkAssign(assigneeId === 'unassigned' ? null : assigneeId);
  };

  const handleArchive = () => {
    setShowArchiveConfirm(false);
    onBulkArchive();
  };

  const handleDelete = () => {
    setShowDeleteConfirm(false);
    onBulkDelete();
  };

  const getSelectionIcon = () => {
    if (isAllSelected) {
      return <CheckSquare size={16} />;
    } else if (isPartialSelected) {
      return <Minus size={16} />;
    } else {
      return <Square size={16} />;
    }
  };

  return (
    <>
      <BulkBar isVisible={isVisible}>
        <SelectionInfo>
          <SelectionButton onClick={handleSelectToggle}>
            {getSelectionIcon()}
          </SelectionButton>
          <SelectionText>
            {selectedItems.length} of {totalItems} selected
          </SelectionText>
          {isPartialSelected && (
            <SelectionButton onClick={onSelectAll}>
              Select all {totalItems}
            </SelectionButton>
          )}
        </SelectionInfo>

        <Divider />

        <BulkActions>
          {/* Status Update */}
          <Select
            value=""
            onChange={(e) => handleStatusChange(e.target.value)}
            options={[
              { value: '', label: 'Change Status', disabled: true },
              ...statusOptions
            ]}
            size="sm"
            width={120}
            disabled={isLoading}
          />

          {/* Assign */}
          <Select
            value=""
            onChange={(e) => handleAssigneeChange(e.target.value)}
            options={[
              { value: '', label: 'Assign To', disabled: true },
              { value: 'unassigned', label: 'Unassigned' },
              ...assigneeOptions
            ]}
            size="sm"
            width={120}
            disabled={isLoading}
          />

          {/* Export */}
          <Select
            value=""
            onChange={(e) => onBulkExport(e.target.value as 'csv' | 'json' | 'xlsx')}
            options={[
              { value: '', label: 'Export', disabled: true },
              { value: 'csv', label: 'Export as CSV' },
              { value: 'json', label: 'Export as JSON' },
              { value: 'xlsx', label: 'Export as Excel' }
            ]}
            size="sm"
            width={100}
            disabled={isLoading}
          />

          {/* Archive */}
          <ActionButton
            onClick={() => setShowArchiveConfirm(true)}
            variant="secondary"
            disabled={isLoading}
          >
            <Archive size={14} />
            Archive
          </ActionButton>

          {/* Delete */}
          <ActionButton
            onClick={() => setShowDeleteConfirm(true)}
            variant="secondary"
            disabled={isLoading}
          >
            <Trash2 size={14} />
            Delete
          </ActionButton>
        </BulkActions>
      </BulkBar>

      {/* Archive Confirmation Modal */}
      <Modal
        isOpen={showArchiveConfirm}
        toggle={() => setShowArchiveConfirm(false)}
        width={400}
      >
        <ConfirmModal>
          <ModalTitle>Archive Feedback</ModalTitle>
          <ModalText>
            Are you sure you want to archive {selectedItems.length} feedback item
            {selectedItems.length !== 1 ? 's' : ''}? 
            Archived items can be restored later.
          </ModalText>
          <ModalActions>
            <Button
              onClick={() => setShowArchiveConfirm(false)}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              onClick={handleArchive}
              variant="primary"
            >
              Archive Items
            </Button>
          </ModalActions>
        </ConfirmModal>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        toggle={() => setShowDeleteConfirm(false)}
        width={400}
      >
        <ConfirmModal>
          <ModalTitle>Delete Feedback</ModalTitle>
          <ModalText>
            Are you sure you want to permanently delete {selectedItems.length} feedback item
            {selectedItems.length !== 1 ? 's' : ''}? 
            <br />
            <strong>This action cannot be undone.</strong>
          </ModalText>
          <ModalActions>
            <Button
              onClick={() => setShowDeleteConfirm(false)}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              variant="danger"
            >
              Delete Items
            </Button>
          </ModalActions>
        </ConfirmModal>
      </Modal>
    </>
  );
};

export default BulkOperations;