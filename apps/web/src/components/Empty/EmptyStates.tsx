/**
 * Empty State Components
 * Comprehensive empty states with custom illustrations and helpful actions
 */

import React from 'react';
import styled from '@emotion/styled';
import { cssVar, typography, component } from '../../theme/utils';
import { 
  MessageSquare, 
  Plus, 
  Search, 
  Filter, 
  Upload,
  Mail,
  Users,
  BarChart3,
  Settings,
  Zap,
  FileText,
  Database,
  Globe,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

const EmptyContainer = styled.div<{ size?: 'sm' | 'md' | 'lg' }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: ${props => {
    switch (props.size) {
      case 'sm': return `${cssVar.spacing('8')} ${cssVar.spacing('4')}`;
      case 'lg': return `${cssVar.spacing('16')} ${cssVar.spacing('6')}`;
      default: return `${cssVar.spacing('12')} ${cssVar.spacing('6')}`;
    }
  }};
  min-height: ${props => {
    switch (props.size) {
      case 'sm': return '200px';
      case 'lg': return '500px';
      default: return '350px';
    }
  }};
`;

const IllustrationContainer = styled.div<{ variant?: 'default' | 'success' | 'warning' | 'info' }>`
  position: relative;
  margin-bottom: ${cssVar.spacing('6')};
  
  .illustration-bg {
    width: 120px;
    height: 120px;
    border-radius: ${cssVar.radius('full')};
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto ${cssVar.spacing('4')};
    
    ${props => {
      switch (props.variant) {
        case 'success':
          return `background: ${cssVar.color('status-successBackground')}; border: 2px solid ${cssVar.color('status-successBorder')};`;
        case 'warning':
          return `background: ${cssVar.color('status-warningBackground')}; border: 2px solid ${cssVar.color('status-warningBorder')};`;
        case 'info':
          return `background: ${cssVar.color('status-infoBackground')}; border: 2px solid ${cssVar.color('status-infoBorder')};`;
        default:
          return `background: ${cssVar.color('surface-secondary')}; border: 2px solid ${cssVar.color('border-primary')};`;
      }
    }}
    
    svg {
      width: 48px;
      height: 48px;
      ${props => {
        switch (props.variant) {
          case 'success': return `color: ${cssVar.color('status-success')};`;
          case 'warning': return `color: ${cssVar.color('status-warning')};`;
          case 'info': return `color: ${cssVar.color('status-info')};`;
          default: return `color: ${cssVar.color('text-tertiary')};`;
        }
      }}
    }
  }
  
  .illustration-dots {
    position: absolute;
    top: -10px;
    right: -10px;
    width: 32px;
    height: 32px;
    background: ${cssVar.color('interactive-primary')};
    border-radius: ${cssVar.radius('full')};
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.8;
    
    &::before {
      content: '';
      width: 4px;
      height: 4px;
      background: white;
      border-radius: 50%;
      box-shadow: 8px 0 0 white, 16px 0 0 white;
    }
  }
`;

const EmptyTitle = styled.h3<{ size?: 'sm' | 'md' | 'lg' }>`
  margin: 0 0 ${cssVar.spacing('3')} 0;
  color: ${cssVar.color('text-primary')};
  font-weight: 600;
  
  ${props => {
    switch (props.size) {
      case 'sm': return 'font-size: 16px;';
      case 'lg': return 'font-size: 24px;';
      default: return 'font-size: 20px;';
    }
  }}
`;

const EmptyDescription = styled.p<{ size?: 'sm' | 'md' | 'lg' }>`
  margin: 0 0 ${cssVar.spacing('6')} 0;
  color: ${cssVar.color('text-secondary')};
  line-height: 1.6;
  max-width: ${props => {
    switch (props.size) {
      case 'sm': return '300px';
      case 'lg': return '600px';
      default: return '450px';
    }
  }};
  
  ${props => {
    switch (props.size) {
      case 'sm': return 'font-size: 14px;';
      case 'lg': return 'font-size: 16px;';
      default: return 'font-size: 15px;';
    }
  }}
`;

const EmptyActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${cssVar.spacing('3')};
  align-items: center;
  
  @media (min-width: 640px) {
    flex-direction: row;
    justify-content: center;
  }
`;

const PrimaryAction = styled.button`
  ${component.button.base}
  ${component.button.primary}
  padding: ${cssVar.spacing('3')} ${cssVar.spacing('6')};
  font-size: 14px;
  font-weight: 500;
  border-radius: ${cssVar.radius('lg')};
  min-width: 140px;
`;

const SecondaryAction = styled.button`
  ${component.button.base}
  ${component.button.secondary}
  padding: ${cssVar.spacing('3')} ${cssVar.spacing('6')};
  font-size: 14px;
  font-weight: 500;
  border-radius: ${cssVar.radius('lg')};
  min-width: 140px;
`;

const TertiaryAction = styled.button`
  ${component.button.base}
  background: ${cssVar.color('interactive-ghost')};
  color: ${cssVar.color('text-secondary')};
  padding: ${cssVar.spacing('2')} ${cssVar.spacing('4')};
  font-size: 13px;
  border-radius: ${cssVar.radius('md')};
  
  &:hover:not(:disabled) {
    background: ${cssVar.color('interactive-ghostHover')};
    color: ${cssVar.color('text-primary')};
  }
`;

const HelpText = styled.div`
  margin-top: ${cssVar.spacing('6')};
  padding: ${cssVar.spacing('4')};
  background: ${cssVar.color('surface-secondary')};
  border: 1px solid ${cssVar.color('border-primary')};
  border-radius: ${cssVar.radius('lg')};
  max-width: 400px;
  
  h4 {
    margin: 0 0 ${cssVar.spacing('2')} 0;
    font-size: 14px;
    font-weight: 600;
    color: ${cssVar.color('text-primary')};
  }
  
  ul {
    margin: 0;
    padding-left: ${cssVar.spacing('4')};
    color: ${cssVar.color('text-secondary')};
    font-size: 13px;
    line-height: 1.5;
  }
  
  li {
    margin-bottom: ${cssVar.spacing('1')};
  }
`;

interface EmptyStateProps {
  icon?: React.ComponentType<any>;
  title: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'info';
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ComponentType<any>;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ComponentType<any>;
  };
  tertiaryAction?: {
    label: string;
    onClick: () => void;
  };
  helpText?: {
    title: string;
    items: string[];
  };
  className?: string;
}

export function EmptyState({
  icon: Icon = MessageSquare,
  title,
  description,
  size = 'md',
  variant = 'default',
  primaryAction,
  secondaryAction,
  tertiaryAction,
  helpText,
  className
}: EmptyStateProps) {
  return (
    <EmptyContainer size={size} className={className}>
      <IllustrationContainer variant={variant}>
        <div className="illustration-bg">
          <Icon />
        </div>
        {variant !== 'default' && <div className="illustration-dots" />}
      </IllustrationContainer>

      <EmptyTitle size={size}>{title}</EmptyTitle>
      
      {description && (
        <EmptyDescription size={size}>{description}</EmptyDescription>
      )}

      {(primaryAction || secondaryAction || tertiaryAction) && (
        <EmptyActions>
          {primaryAction && (
            <PrimaryAction onClick={primaryAction.onClick}>
              {primaryAction.icon && <primaryAction.icon size={16} />}
              {primaryAction.label}
            </PrimaryAction>
          )}
          
          {secondaryAction && (
            <SecondaryAction onClick={secondaryAction.onClick}>
              {secondaryAction.icon && <secondaryAction.icon size={16} />}
              {secondaryAction.label}
            </SecondaryAction>
          )}
          
          {tertiaryAction && (
            <TertiaryAction onClick={tertiaryAction.onClick}>
              {tertiaryAction.label}
            </TertiaryAction>
          )}
        </EmptyActions>
      )}

      {helpText && (
        <HelpText>
          <h4>{helpText.title}</h4>
          <ul>
            {helpText.items.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </HelpText>
      )}
    </EmptyContainer>
  );
}

// Pre-configured empty state components for common scenarios

export function NoFeedbackEmpty({ onCreateFeedback, onImportData }: {
  onCreateFeedback?: () => void;
  onImportData?: () => void;
}) {
  return (
    <EmptyState
      icon={MessageSquare}
      title="No feedback yet"
      description="Start collecting customer feedback to see insights and trends. You can create feedback manually or import from various sources."
      primaryAction={onCreateFeedback ? {
        label: 'Create Feedback',
        onClick: onCreateFeedback,
        icon: Plus
      } : undefined}
      secondaryAction={onImportData ? {
        label: 'Import Data',
        onClick: onImportData,
        icon: Upload
      } : undefined}
      helpText={{
        title: 'Ways to add feedback:',
        items: [
          'Create individual feedback items manually',
          'Import from CSV files or spreadsheets',
          'Connect integrations like Slack or email',
          'Use the feedback widget on your website'
        ]
      }}
    />
  );
}

export function NoSearchResultsEmpty({ searchQuery, onClearSearch }: {
  searchQuery: string;
  onClearSearch?: () => void;
}) {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description={`We couldn't find any feedback matching "${searchQuery}". Try adjusting your search terms or filters.`}
      size="sm"
      primaryAction={onClearSearch ? {
        label: 'Clear Search',
        onClick: onClearSearch
      } : undefined}
      helpText={{
        title: 'Search tips:',
        items: [
          'Check for typos in your search terms',
          'Try using different keywords',
          'Remove filters to see more results',
          'Use broader search terms'
        ]
      }}
    />
  );
}

export function NoFilterResultsEmpty({ onClearFilters }: {
  onClearFilters?: () => void;
}) {
  return (
    <EmptyState
      icon={Filter}
      title="No items match your filters"
      description="Try adjusting your filters to see more results, or clear all filters to view everything."
      size="sm"
      primaryAction={onClearFilters ? {
        label: 'Clear Filters',
        onClick: onClearFilters
      } : undefined}
    />
  );
}

export function NoIntegrationsEmpty({ onSetupIntegration, onViewGuide }: {
  onSetupIntegration?: () => void;
  onViewGuide?: () => void;
}) {
  return (
    <EmptyState
      icon={Zap}
      title="Connect your tools"
      description="Integrate with your existing workflow tools to automatically collect feedback from multiple sources."
      primaryAction={onSetupIntegration ? {
        label: 'Setup Integration',
        onClick: onSetupIntegration,
        icon: Plus
      } : undefined}
      secondaryAction={onViewGuide ? {
        label: 'View Guide',
        onClick: onViewGuide,
        icon: FileText
      } : undefined}
      helpText={{
        title: 'Popular integrations:',
        items: [
          'Slack - Capture feedback from team channels',
          'Email - Monitor support email addresses',
          'Zendesk - Sync with existing tickets',
          'Intercom - Import customer conversations'
        ]
      }}
    />
  );
}

export function LoadingFailedEmpty({ onRetry, onReportIssue }: {
  onRetry?: () => void;
  onReportIssue?: () => void;
}) {
  return (
    <EmptyState
      icon={AlertCircle}
      title="Failed to load"
      description="We encountered an error while loading your data. This might be a temporary issue."
      variant="warning"
      primaryAction={onRetry ? {
        label: 'Try Again',
        onClick: onRetry,
        icon: RefreshCw
      } : undefined}
      tertiaryAction={onReportIssue ? {
        label: 'Report Issue',
        onClick: onReportIssue
      } : undefined}
    />
  );
}

export function SuccessEmpty({ title, description, onContinue }: {
  title: string;
  description?: string;
  onContinue?: () => void;
}) {
  return (
    <EmptyState
      icon={CheckCircle}
      title={title}
      description={description}
      variant="success"
      primaryAction={onContinue ? {
        label: 'Continue',
        onClick: onContinue
      } : undefined}
    />
  );
}

export function ComingSoonEmpty({ feature, onNotifyMe }: {
  feature: string;
  onNotifyMe?: () => void;
}) {
  return (
    <EmptyState
      icon={Settings}
      title={`${feature} coming soon`}
      description="We're working hard to bring you this feature. Get notified when it's ready!"
      variant="info"
      primaryAction={onNotifyMe ? {
        label: 'Notify Me',
        onClick: onNotifyMe,
        icon: Mail
      } : undefined}
    />
  );
}

export function UnauthorizedEmpty({ onSignIn, onGoHome }: {
  onSignIn?: () => void;
  onGoHome?: () => void;
}) {
  return (
    <EmptyState
      icon={Users}
      title="Access restricted"
      description="You don't have permission to view this content. Please sign in with the appropriate account."
      variant="warning"
      primaryAction={onSignIn ? {
        label: 'Sign In',
        onClick: onSignIn
      } : undefined}
      secondaryAction={onGoHome ? {
        label: 'Go Home',
        onClick: onGoHome
      } : undefined}
    />
  );
}

export function OfflineEmpty({ onRetry }: {
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      icon={Globe}
      title="You're offline"
      description="Check your internet connection and try again. Some features may not be available while offline."
      variant="warning"
      primaryAction={onRetry ? {
        label: 'Try Again',
        onClick: onRetry,
        icon: RefreshCw
      } : undefined}
    />
  );
}

export function AIChatWelcomeEmpty({ onSampleQuestion }: {
  onSampleQuestion?: (question: string) => void;
}) {
  const sampleQuestions = [
    "What are the most common feedback themes?",
    "Show me recent negative feedback",
    "What issues are customers reporting about our product?",
    "Summarize feedback from this month"
  ];

  return (
    <EmptyState
      icon={MessageSquare}
      title="Welcome to AI Assistant"
      description="I can help you analyze your feedback data, identify trends, and answer questions about customer insights. Ask me anything!"
      variant="info"
      size="lg"
      primaryAction={onSampleQuestion ? {
        label: sampleQuestions[0],
        onClick: () => onSampleQuestion(sampleQuestions[0])
      } : undefined}
      secondaryAction={onSampleQuestion ? {
        label: sampleQuestions[1], 
        onClick: () => onSampleQuestion(sampleQuestions[1])
      } : undefined}
      helpText={{
        title: 'Try asking about:',
        items: [
          'Customer satisfaction trends and patterns',
          'Common issues and pain points',
          'Feature requests and suggestions',
          'Feedback from specific time periods or sources'
        ]
      }}
    />
  );
}

export function AIServiceUnavailableEmpty({ onRetry, onContactSupport }: {
  onRetry?: () => void;
  onContactSupport?: () => void;
}) {
  return (
    <EmptyState
      icon={AlertCircle}
      title="AI service unavailable"
      description="The AI assistant is temporarily unavailable. This may be due to maintenance or high demand."
      variant="warning"
      primaryAction={onRetry ? {
        label: 'Try Again',
        onClick: onRetry,
        icon: RefreshCw
      } : undefined}
      secondaryAction={onContactSupport ? {
        label: 'Contact Support',
        onClick: onContactSupport,
        icon: Mail
      } : undefined}
    />
  );
}

// Grouped exports for easier usage
export const EmptyStates = {
  // Existing exports...
  noFeedback: NoFeedbackEmpty,
  noSearchResults: NoSearchResultsEmpty,
  filteredResults: FilteredResultsEmpty,
  noCustomers: NoCustomersEmpty,
  noIntegrations: NoIntegrationsEmpty,
  loadingFailed: LoadingFailedEmpty,
  success: SuccessEmpty,
  comingSoon: ComingSoonEmpty,
  unauthorized: UnauthorizedEmpty,
  offline: OfflineEmpty,
  
  // New AI-related empty states
  aiChatWelcome: AIChatWelcomeEmpty,
  aiServiceUnavailable: AIServiceUnavailableEmpty
};

export default EmptyState;