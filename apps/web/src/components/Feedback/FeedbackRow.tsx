import React from 'react';
import { useRouter } from 'next/router';
import styled from '@emotion/styled';
import { Colors } from '../../theme/colors';
import { Feedback, FeedbackState, FeedbackPriority } from '@feedback-hub/types';
import FlexContainer from '../Container/FlexContainer';
import IconButton from '../Button/IconButton';
import { MoreHorizontal, ArrowUp, ExternalLink } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { SourceIcon } from './SourceIcon';

const TableRow = styled.tr<{ selected?: boolean }>`
  background-color: ${({ selected }) => selected ? Colors.primary50 : Colors.white};
  border-bottom: 1px solid ${Colors.grey200};
  cursor: pointer;
  transition: background-color 0.15s ease;

  &:hover {
    background-color: ${({ selected }) => selected ? Colors.primary100 : Colors.grey50};
  }
`;

const TableCell = styled.td`
  padding: 12px 16px;
  font-size: 14px;
  vertical-align: middle;
  max-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const TitleCell = styled(TableCell)`
  max-width: 300px;
  white-space: normal;
  line-height: 1.4;
  
  .title {
    font-weight: 500;
    color: ${Colors.grey900};
    margin-bottom: 4px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  .description {
    font-size: 12px;
    color: ${Colors.grey500};
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`;

const CustomerCell = styled(TableCell)`
  .name {
    font-weight: 500;
    color: ${Colors.grey900};
    margin-bottom: 2px;
  }
  
  .email {
    font-size: 12px;
    color: ${Colors.grey500};
  }
`;

const UpvoteCell = styled(TableCell)`
  text-align: center;
`;

const UpvoteCount = styled(FlexContainer)`
  align-items: center;
  gap: 4px;
  color: ${Colors.grey600};
  font-weight: 500;
`;

const DateCell = styled(TableCell)`
  color: ${Colors.grey600};
  font-size: 12px;
`;

const ActionCell = styled(TableCell)`
  width: 60px;
  text-align: center;
`;

interface FeedbackRowProps {
  feedback: Feedback;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onEdit?: () => void;
  onUpdateStatus?: (status: FeedbackState) => void;
  onUpdatePriority?: (priority: FeedbackPriority) => void;
}

export function FeedbackRow({
  feedback,
  selected,
  onSelect,
  onEdit,
  onUpdateStatus,
  onUpdatePriority
}: FeedbackRowProps) {
  const router = useRouter();
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const handleRowClick = (e: React.MouseEvent) => {
    // Don't trigger row click if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.closest('button')) {
      return;
    }
    // Navigate to feedback detail page
    router.push(`/feedback/${feedback.id}`);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.();
  };

  return (
    <TableRow selected={selected} onClick={handleRowClick}>
      {/* Selection checkbox */}
      <TableCell>
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => {
            e.stopPropagation();
            onSelect(e.target.checked);
          }}
        />
      </TableCell>

      {/* Source icon */}
      <TableCell>
        <SourceIcon source={feedback.source} />
      </TableCell>

      {/* Title and description */}
      <TitleCell>
        <div className="title">{feedback.title}</div>
        {feedback.description && (
          <div className="description">
            {truncateText(feedback.description, 100)}
          </div>
        )}
      </TitleCell>

      {/* Status */}
      <TableCell>
        <StatusBadge 
          status={feedback.state}
          onClick={onUpdateStatus ? (status) => onUpdateStatus(status) : undefined}
        />
      </TableCell>

      {/* Priority */}
      <TableCell>
        {feedback.priority ? (
          <PriorityBadge 
            priority={feedback.priority}
            onClick={onUpdatePriority ? (priority) => onUpdatePriority(priority) : undefined}
          />
        ) : (
          <span style={{ color: Colors.grey400, fontSize: '12px' }}>—</span>
        )}
      </TableCell>

      {/* Customer */}
      <CustomerCell>
        {feedback.customerName || feedback.customerEmail ? (
          <>
            {feedback.customerName && (
              <div className="name">{truncateText(feedback.customerName, 20)}</div>
            )}
            {feedback.customerEmail && (
              <div className="email">{truncateText(feedback.customerEmail, 25)}</div>
            )}
          </>
        ) : (
          <span style={{ color: Colors.grey400, fontSize: '12px' }}>Unknown</span>
        )}
      </CustomerCell>

      {/* Upvotes */}
      <UpvoteCell>
        <UpvoteCount>
          <ArrowUp size={14} />
          {feedback.upvoteCount}
        </UpvoteCount>
      </UpvoteCell>

      {/* Created date */}
      <DateCell>
        {formatDate(feedback.createdAt)}
      </DateCell>

      {/* Actions */}
      <ActionCell>
        <FlexContainer gap={4}>
          <IconButton
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/feedback/${feedback.id}`);
            }}
            title="View details"
          >
            <ExternalLink size={14} />
          </IconButton>
          <IconButton
            variant="ghost"
            size="sm"
            onClick={handleEditClick}
            title="Quick edit"
          >
            <MoreHorizontal size={16} />
          </IconButton>
        </FlexContainer>
      </ActionCell>
    </TableRow>
  );
}