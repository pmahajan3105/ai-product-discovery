import React from 'react';
import styled from '@emotion/styled';
import { Colors } from '../../theme/colors';
import { FeedbackSource } from '@feedback-hub/types';
import { 
  MessageSquare, 
  Globe, 
  Mail, 
  Upload,
  Code,
  Slack,
  Headphones
} from 'lucide-react';

const sourceConfig = {
  [FeedbackSource.DASHBOARD]: {
    icon: MessageSquare,
    color: Colors.primary600,
    label: 'Dashboard'
  },
  [FeedbackSource.WIDGET]: {
    icon: Globe,
    color: Colors.info600,
    label: 'Widget'
  },
  [FeedbackSource.EMAIL]: {
    icon: Mail,
    color: Colors.success600,
    label: 'Email'
  },
  [FeedbackSource.SLACK]: {
    icon: Slack,
    color: '#4A154B',
    label: 'Slack'
  },
  [FeedbackSource.ZENDESK]: {
    icon: Headphones,
    color: '#03363D',
    label: 'Zendesk'
  },
  [FeedbackSource.INTERCOM]: {
    icon: MessageSquare,
    color: '#1F8DED',
    label: 'Intercom'
  },
  [FeedbackSource.CSV_IMPORT]: {
    icon: Upload,
    color: Colors.warning600,
    label: 'CSV Import'
  },
  [FeedbackSource.API]: {
    icon: Code,
    color: Colors.purple600,
    label: 'API'
  }
};

const IconContainer = styled.div<{ color: string }>`
  width: 24px;
  height: 24px;
  border-radius: 4px;
  background-color: ${({ color }) => color}15;
  display: flex;
  align-items: center;
  justify-content: center;
  
  svg {
    width: 14px;
    height: 14px;
    color: ${({ color }) => color};
  }
`;

const TooltipContainer = styled.div`
  position: relative;
  display: inline-block;
  
  &:hover .tooltip {
    opacity: 1;
    visibility: visible;
  }
`;

const Tooltip = styled.div`
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background-color: ${Colors.grey800};
  color: ${Colors.white};
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 1000;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s;
  margin-bottom: 4px;

  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    border: 4px solid transparent;
    border-top-color: ${Colors.grey800};
    transform: translateX(-50%);
  }
`;

interface SourceIconProps {
  source: FeedbackSource;
  showTooltip?: boolean;
}

export function SourceIcon({ source, showTooltip = true }: SourceIconProps) {
  const config = sourceConfig[source];
  const IconComponent = config.icon;

  const iconElement = (
    <IconContainer color={config.color}>
      <IconComponent />
    </IconContainer>
  );

  if (!showTooltip) {
    return iconElement;
  }

  return (
    <TooltipContainer>
      {iconElement}
      <Tooltip className="tooltip">
        {config.label}
      </Tooltip>
    </TooltipContainer>
  );
}