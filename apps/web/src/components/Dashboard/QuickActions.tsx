/**
 * Quick Actions Component
 * Provides shortcuts to common actions from the dashboard
 * Based on Zeda's quick navigation patterns
 */

import React from 'react';
import Link from 'next/link';
import { 
  Plus, 
  MessageSquare, 
  Users, 
  Settings, 
  BarChart3,
  Upload,
  Download,
  Search,
  Filter
} from 'lucide-react';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  href?: string;
  onClick?: () => void;
  color: string;
  disabled?: boolean;
}

interface QuickActionsProps {
  onAction?: (actionId: string) => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ onAction }) => {
  const actions: QuickAction[] = [
    {
      id: 'new-feedback',
      title: 'Add Feedback',
      description: 'Create new feedback item',
      icon: Plus,
      href: '/feedback?new=true',
      color: 'blue'
    },
    {
      id: 'view-feedback',
      title: 'View Feedback',
      description: 'Browse all feedback items',
      icon: MessageSquare,
      href: '/feedback',
      color: 'green'
    },
    {
      id: 'manage-customers',
      title: 'Customers',
      description: 'View customer profiles',
      icon: Users,
      href: '/customers',
      color: 'purple'
    },
    {
      id: 'view-insights',
      title: 'Insights',
      description: 'Analytics and reports',
      icon: BarChart3,
      href: '/insights',
      color: 'yellow'
    },
    {
      id: 'import-data',
      title: 'Import Data',
      description: 'Upload CSV or connect apps',
      icon: Upload,
      onClick: () => onAction?.('import-data'),
      color: 'indigo'
    },
    {
      id: 'export-data',
      title: 'Export Data',
      description: 'Download reports and data',
      icon: Download,
      onClick: () => onAction?.('export-data'),
      color: 'pink'
    },
    {
      id: 'settings',
      title: 'Settings',
      description: 'Configure workspace',
      icon: Settings,
      href: '/settings',
      color: 'gray'
    },
    {
      id: 'search',
      title: 'Search',
      description: 'Find anything quickly',
      icon: Search,
      onClick: () => onAction?.('search'),
      color: 'teal'
    }
  ];

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: {
        bg: 'bg-blue-50 hover:bg-blue-100',
        border: 'border-blue-200',
        icon: 'text-blue-600',
        title: 'text-blue-900'
      },
      green: {
        bg: 'bg-green-50 hover:bg-green-100',
        border: 'border-green-200',
        icon: 'text-green-600',
        title: 'text-green-900'
      },
      purple: {
        bg: 'bg-purple-50 hover:bg-purple-100',
        border: 'border-purple-200',
        icon: 'text-purple-600',
        title: 'text-purple-900'
      },
      yellow: {
        bg: 'bg-yellow-50 hover:bg-yellow-100',
        border: 'border-yellow-200',
        icon: 'text-yellow-600',
        title: 'text-yellow-900'
      },
      indigo: {
        bg: 'bg-indigo-50 hover:bg-indigo-100',
        border: 'border-indigo-200',
        icon: 'text-indigo-600',
        title: 'text-indigo-900'
      },
      pink: {
        bg: 'bg-pink-50 hover:bg-pink-100',
        border: 'border-pink-200',
        icon: 'text-pink-600',
        title: 'text-pink-900'
      },
      gray: {
        bg: 'bg-gray-50 hover:bg-gray-100',
        border: 'border-gray-200',
        icon: 'text-gray-600',
        title: 'text-gray-900'
      },
      teal: {
        bg: 'bg-teal-50 hover:bg-teal-100',
        border: 'border-teal-200',
        icon: 'text-teal-600',
        title: 'text-teal-900'
      }
    };

    return colorMap[color as keyof typeof colorMap] || colorMap.gray;
  };

  const ActionCard: React.FC<{ action: QuickAction }> = ({ action }) => {
    const colors = getColorClasses(action.color);
    const Icon = action.icon;

    const cardContent = (
      <div 
        className={`
          relative p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer
          ${colors.bg} ${colors.border}
          ${action.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md hover:scale-105'}
        `}
        onClick={action.onClick && !action.disabled ? action.onClick : undefined}
      >
        <div className="flex items-start space-x-3">
          <div className={`w-10 h-10 rounded-lg bg-white flex items-center justify-center border ${colors.border}`}>
            <Icon className={`w-5 h-5 ${colors.icon}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className={`text-sm font-semibold ${colors.title} mb-1`}>
              {action.title}
            </h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              {action.description}
            </p>
          </div>
        </div>

        {action.disabled && (
          <div className="absolute inset-0 bg-white bg-opacity-50 rounded-lg flex items-center justify-center">
            <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded">
              Coming Soon
            </span>
          </div>
        )}
      </div>
    );

    if (action.href && !action.disabled) {
      return (
        <Link href={action.href} className="block">
          {cardContent}
        </Link>
      );
    }

    return cardContent;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        <p className="text-sm text-gray-600 mt-1">
          Common tasks and shortcuts to get things done faster
        </p>
      </div>

      {/* Actions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((action) => (
          <ActionCard key={action.id} action={action} />
        ))}
      </div>

      {/* Additional Actions Row */}
      <div className="flex flex-wrap gap-3">
        <button 
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onClick={() => onAction?.('bulk-actions')}
        >
          <Filter className="w-4 h-4 mr-2" />
          Bulk Actions
        </button>
        
        <button 
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onClick={() => onAction?.('advanced-search')}
        >
          <Search className="w-4 h-4 mr-2" />
          Advanced Search
        </button>
        
        <button 
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onClick={() => onAction?.('keyboard-shortcuts')}
        >
          ⌘K
          <span className="ml-2">Shortcuts</span>
        </button>
      </div>
    </div>
  );
};