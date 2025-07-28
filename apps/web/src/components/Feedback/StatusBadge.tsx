import React, { useState } from 'react';
import styled from '@emotion/styled';
import { Colors } from '../../theme/colors';
import { FeedbackState } from '@feedback-hub/types';
import { ChevronDown } from 'lucide-react';

const statusColors = {
  [FeedbackState.BACKLOG]: {
    bg: Colors.grey100,
    text: Colors.grey700,
    border: Colors.grey300
  },
  [FeedbackState.OPEN]: {
    bg: Colors.primary100,
    text: Colors.primary700,
    border: Colors.primary300
  },
  [FeedbackState.IN_PROGRESS]: {
    bg: Colors.warning100,
    text: Colors.warning700,
    border: Colors.warning300
  },
  [FeedbackState.RESOLVED]: {
    bg: Colors.success100,
    text: Colors.success700,
    border: Colors.success300
  },
  [FeedbackState.ARCHIVED]: {
    bg: Colors.grey100,
    text: Colors.grey500,
    border: Colors.grey200
  }
};

const statusLabels = {
  [FeedbackState.BACKLOG]: 'Backlog',
  [FeedbackState.OPEN]: 'Open',
  [FeedbackState.IN_PROGRESS]: 'In Progress',
  [FeedbackState.RESOLVED]: 'Resolved',
  [FeedbackState.ARCHIVED]: 'Archived'
};

const Badge = styled.div<{ clickable?: boolean; colors: any }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  background-color: ${({ colors }) => colors.bg};
  color: ${({ colors }) => colors.text};
  border: 1px solid ${({ colors }) => colors.border};
  cursor: ${({ clickable }) => clickable ? 'pointer' : 'default'};
  transition: all 0.15s ease;

  &:hover {
    ${({ clickable, colors }) => clickable && `
      background-color: ${colors.border};
    `}
  }
`;

const Dropdown = styled.div`
  position: relative;
  display: inline-block;
`;

const DropdownMenu = styled.div<{ isOpen: boolean }>`
  position: absolute;
  top: 100%;
  left: 0;
  background-color: ${Colors.white};
  border: 1px solid ${Colors.grey200};
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  min-width: 120px;
  opacity: ${({ isOpen }) => isOpen ? 1 : 0};
  visibility: ${({ isOpen }) => isOpen ? 'visible' : 'hidden'};
  transform: translateY(${({ isOpen }) => isOpen ? 0 : -4}px);
  transition: all 0.15s ease;
`;

const DropdownItem = styled.div<{ colors: any }>`
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease;
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover {
    background-color: ${Colors.grey50};
  }

  &:first-of-type {
    border-radius: 6px 6px 0 0;
  }

  &:last-of-type {
    border-radius: 0 0 6px 6px;
  }
`;

const StatusDot = styled.div<{ colors: any }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${({ colors }) => colors.text};
`;

interface StatusBadgeProps {
  status: FeedbackState;
  onClick?: (status: FeedbackState) => void;
}

export function StatusBadge({ status, onClick }: StatusBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const colors = statusColors[status];
  const isClickable = !!onClick;

  const handleStatusChange = (newStatus: FeedbackState) => {
    onClick?.(newStatus);
    setIsOpen(false);
  };

  const handleBadgeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isClickable) {
      setIsOpen(!isOpen);
    }
  };

  const handleOutsideClick = () => {
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    if (isOpen) {
      document.addEventListener('click', handleOutsideClick);
      return () => document.removeEventListener('click', handleOutsideClick);
    }
  }, [isOpen]);

  if (!isClickable) {
    return (
      <Badge colors={colors}>
        <StatusDot colors={colors} />
        {statusLabels[status]}
      </Badge>
    );
  }

  return (
    <Dropdown>
      <Badge 
        colors={colors} 
        clickable={isClickable}
        onClick={handleBadgeClick}
      >
        <StatusDot colors={colors} />
        {statusLabels[status]}
        <ChevronDown size={12} />
      </Badge>
      
      <DropdownMenu isOpen={isOpen}>
        {Object.values(FeedbackState).map((state) => {
          const stateColors = statusColors[state];
          return (
            <DropdownItem
              key={state}
              colors={stateColors}
              onClick={() => handleStatusChange(state)}
            >
              <StatusDot colors={stateColors} />
              {statusLabels[state]}
            </DropdownItem>
          );
        })}
      </DropdownMenu>
    </Dropdown>
  );
}