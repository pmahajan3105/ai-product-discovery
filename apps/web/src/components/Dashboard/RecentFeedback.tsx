/**
 * Recent Feedback Component
 * Displays recent feedback items with quick actions
 * Based on Zeda's table and list patterns
 */

import React from 'react';
import Link from 'next/link';
import { 
  MessageSquare, 
  User, 
  Clock,
  ExternalLink,
  MoreHorizontal,
  ArrowUpRight
} from 'lucide-react';

interface FeedbackItem {
  id: string;
  title: string;
  description: string;
  customer: {
    name: string;
    email: string;
    avatar?: string;
    initials: string;
  };
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  source: string;
  createdAt: string;
  updatedAt: string;
  category?: string;
}

interface RecentFeedbackProps {
  items?: FeedbackItem[];
  loading?: boolean;
  showHeader?: boolean;
  maxItems?: number;
  onViewAll?: () => void;
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const statusConfig = {
    open: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Open' },
    'in-progress': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'In Progress' },
    resolved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Resolved' },
    closed: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Closed' }
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.open;

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
  const priorityConfig = {
    low: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Low' },
    medium: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Medium' },
    high: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'High' },
    urgent: { bg: 'bg-red-100', text: 'text-red-800', label: 'Urgent' }
  };

  const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium;

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

const FeedbackRow: React.FC<{ item: FeedbackItem }> = ({ item }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 24) {
      return diffHours < 1 ? 'Just now' : `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors">
      <div className="flex items-start space-x-3 flex-1 min-w-0">
        {/* Feedback Icon */}
        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <MessageSquare className="w-4 h-4 text-blue-600" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <Link 
              href={`/feedback/${item.id}`}
              className="font-medium text-gray-900 hover:text-blue-600 truncate"
            >
              {item.title}
            </Link>
            <StatusBadge status={item.status} />
            <PriorityBadge priority={item.priority} />
          </div>

          <p className="text-sm text-gray-600 truncate mb-2">
            {item.description}
          </p>

          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium">
                  {item.customer.initials}
                </span>
              </div>
              <span>{item.customer.name}</span>
            </div>

            <div className="flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>{formatDate(item.createdAt)}</span>
            </div>

            <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
              {item.source}
            </span>

            {item.category && (
              <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs">
                {item.category}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-2 ml-4">
        <Link 
          href={`/feedback/${item.id}`}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          title="View details"
        >
          <ExternalLink className="w-4 h-4" />
        </Link>
        <button 
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          title="More actions"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const FeedbackSkeleton: React.FC = () => (
  <div className="space-y-0">
    {[...Array(5)].map((_, index) => (
      <div key={index} className="flex items-center space-x-3 p-4 border-b border-gray-100 animate-pulse">
        <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center space-x-2">
            <div className="w-48 h-4 bg-gray-200 rounded"></div>
            <div className="w-16 h-5 bg-gray-200 rounded-full"></div>
            <div className="w-14 h-5 bg-gray-200 rounded-full"></div>
          </div>
          <div className="w-64 h-3 bg-gray-200 rounded"></div>
          <div className="flex items-center space-x-4">
            <div className="w-20 h-3 bg-gray-200 rounded"></div>
            <div className="w-16 h-3 bg-gray-200 rounded"></div>
            <div className="w-12 h-3 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const RecentFeedback: React.FC<RecentFeedbackProps> = ({
  items = [],
  loading = false,
  showHeader = true,
  maxItems = 5,
  onViewAll
}) => {
  // Mock data - in real app, this would come from API
  const mockItems: FeedbackItem[] = [
    {
      id: '1',
      title: 'Mobile app navigation is confusing',
      description: 'Users are having trouble finding the settings page on mobile devices. The hamburger menu is not intuitive.',
      customer: {
        name: 'Alice Johnson',
        email: 'alice@company.com',
        initials: 'AJ'
      },
      status: 'open',
      priority: 'high',
      source: 'App Store',
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
      updatedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      category: 'UI/UX'
    },
    {
      id: '2',
      title: 'Add dark mode support',
      description: 'Many users have requested a dark mode option for better usability in low-light environments.',
      customer: {
        name: 'Bob Smith',
        email: 'bob@example.com',
        initials: 'BS'
      },
      status: 'in-progress',
      priority: 'medium',
      source: 'Web Portal',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
      updatedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      category: 'Feature Request'
    },
    {
      id: '3',
      title: 'Search functionality is slow',
      description: 'Search results take too long to load, especially when searching through large datasets.',
      customer: {
        name: 'Carol Davis',
        email: 'carol@business.com',
        initials: 'CD'
      },
      status: 'resolved',
      priority: 'high',
      source: 'Email',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), // 6 hours ago
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      category: 'Performance'
    },
    {
      id: '4',
      title: 'Export functionality missing filters',
      description: 'When exporting data, the current filters are not applied to the exported file.',
      customer: {
        name: 'David Wilson',
        email: 'david@startup.com',
        initials: 'DW'
      },
      status: 'open',
      priority: 'medium',
      source: 'Slack',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), // 12 hours ago
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
      category: 'Bug Fix'
    },
    {
      id: '5',
      title: 'Integration with Zapier needed',
      description: 'Would like to connect our feedback system with Zapier for automated workflows.',
      customer: {
        name: 'Eva Martinez',
        email: 'eva@agency.com',
        initials: 'EM'
      },
      status: 'open',
      priority: 'low',
      source: 'Web Portal',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
      category: 'Integration'
    }
  ];

  const displayItems = items.length > 0 ? items : mockItems;
  const limitedItems = displayItems.slice(0, maxItems);

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {showHeader && (
        <div className="border-b border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Recent Feedback</h3>
              <p className="text-sm text-gray-600 mt-1">
                Latest feedback from your customers and users
              </p>
            </div>
            <button 
              onClick={onViewAll}
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View all
              <ArrowUpRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      )}

      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <FeedbackSkeleton />
        ) : limitedItems.length > 0 ? (
          limitedItems.map((item) => (
            <FeedbackRow key={item.id} item={item} />
          ))
        ) : (
          <div className="p-8 text-center">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h4 className="text-sm font-medium text-gray-900 mb-2">No feedback yet</h4>
            <p className="text-sm text-gray-500">
              Feedback from your customers will appear here as it comes in.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};