import React, { useState } from 'react';
import styled from '@emotion/styled';
import { Colors } from '../../theme/colors';
import { FeedbackPriority } from '@feedback-hub/types';
import { ChevronDown, AlertCircle, Circle, Minus } from 'lucide-react';

const priorityColors = {
  [FeedbackPriority.LOW]: {
    bg: Colors.grey100,
    text: Colors.grey600,
    border: Colors.grey300
  },
  [FeedbackPriority.MEDIUM]: {
    bg: Colors.primary100,
    text: Colors.primary700,
    border: Colors.primary300
  },
  [FeedbackPriority.HIGH]: {
    bg: Colors.warning100,
    text: Colors.warning700,
    border: Colors.warning300
  },
  [FeedbackPriority.URGENT]: {
    bg: Colors.error100,
    text: Colors.error700,
    border: Colors.error300
  }
};

const priorityLabels = {
  [FeedbackPriority.LOW]: 'Low',
  [FeedbackPriority.MEDIUM]: 'Medium',
  [FeedbackPriority.HIGH]: 'High',
  [FeedbackPriority.URGENT]: 'Urgent'
};

const priorityIcons = {
  [FeedbackPriority.LOW]: Minus,
  [FeedbackPriority.MEDIUM]: Circle,
  [FeedbackPriority.HIGH]: AlertCircle,
  [FeedbackPriority.URGENT]: AlertCircle
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
  min-width: 100px;
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

interface PriorityBadgeProps {
  priority: FeedbackPriority;
  onClick?: (priority: FeedbackPriority) => void;
}

export function PriorityBadge({ priority, onClick }: PriorityBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const colors = priorityColors[priority];
  const IconComponent = priorityIcons[priority];
  const isClickable = !!onClick;

  const handlePriorityChange = (newPriority: FeedbackPriority) => {
    onClick?.(newPriority);
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
        <IconComponent size={12} />
        {priorityLabels[priority]}
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
        <IconComponent size={12} />
        {priorityLabels[priority]}
        <ChevronDown size={12} />
      </Badge>
      
      <DropdownMenu isOpen={isOpen}>
        {Object.values(FeedbackPriority).map((prio) => {
          const prioColors = priorityColors[prio];
          const PrioIcon = priorityIcons[prio];
          return (
            <DropdownItem
              key={prio}
              colors={prioColors}
              onClick={() => handlePriorityChange(prio)}
            >
              <PrioIcon size={12} />
              {priorityLabels[prio]}
            </DropdownItem>
          );
        })}
      </DropdownMenu>
    </Dropdown>
  );
}