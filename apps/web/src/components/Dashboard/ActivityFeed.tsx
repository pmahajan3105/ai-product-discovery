/**
 * Activity Feed Component
 * Displays recent activities and updates
 * Based on Zeda's ActivityCentre patterns
 */

import React from 'react';
import { 
  MessageSquare, 
  User, 
  Settings, 
  CheckCircle, 
  AlertCircle,
  Users,
  Zap,
  Clock
} from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'feedback' | 'user' | 'system' | 'achievement' | 'integration';
  user: {
    name: string;
    avatar?: string;
    initials: string;
  };
  action: string;
  target?: string;
  timestamp: string;
  metadata?: {
    status?: string;
    priority?: string;
    category?: string;
    [key: string]: any;
  };
}

interface ActivityFeedProps {
  activities?: ActivityItem[];
  loading?: boolean;
  showHeader?: boolean;
  maxItems?: number;
}

const ActivityFeedItem: React.FC<{ activity: ActivityItem }> = ({ activity }) => {
  const getActivityIcon = () => {
    switch (activity.type) {
      case 'feedback':
        return <MessageSquare className="w-4 h-4 text-blue-600" />;
      case 'user':
        return <User className="w-4 h-4 text-green-600" />;
      case 'system':
        return <Settings className="w-4 h-4 text-gray-600" />;
      case 'achievement':
        return <CheckCircle className="w-4 h-4 text-purple-600" />;
      case 'integration':
        return <Zap className="w-4 h-4 text-yellow-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActivityColor = () => {
    switch (activity.type) {
      case 'feedback':
        return 'bg-blue-100';
      case 'user':
        return 'bg-green-100';
      case 'system':
        return 'bg-gray-100';
      case 'achievement':
        return 'bg-purple-100';
      case 'integration':
        return 'bg-yellow-100';
      default:
        return 'bg-gray-100';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes < 1 ? 'Just now' : `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderMetadata = () => {
    if (!activity.metadata) return null;

    const { status, priority, category } = activity.metadata;
    const badges = [];

    if (status) {
      const statusColors = {
        open: 'bg-blue-100 text-blue-800',
        closed: 'bg-green-100 text-green-800',
        pending: 'bg-yellow-100 text-yellow-800',
        resolved: 'bg-purple-100 text-purple-800'
      };
      badges.push(
        <span 
          key="status" 
          className={`px-2 py-0.5 text-xs font-medium rounded-full ${
            statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
          }`}
        >
          {status}
        </span>
      );
    }

    if (priority) {
      const priorityColors = {
        high: 'bg-red-100 text-red-800',
        medium: 'bg-yellow-100 text-yellow-800',
        low: 'bg-green-100 text-green-800'
      };
      badges.push(
        <span 
          key="priority" 
          className={`px-2 py-0.5 text-xs font-medium rounded-full ${
            priorityColors[priority as keyof typeof priorityColors] || 'bg-gray-100 text-gray-800'
          }`}
        >
          {priority} priority
        </span>
      );
    }

    if (category) {
      badges.push(
        <span 
          key="category" 
          className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-800"
        >
          {category}
        </span>
      );
    }

    return badges.length > 0 ? (
      <div className="flex flex-wrap gap-1 mt-2">
        {badges}
      </div>
    ) : null;
  };

  return (
    <div className="flex items-start space-x-3 p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors">
      {/* Icon */}
      <div className={`w-8 h-8 ${getActivityColor()} rounded-full flex items-center justify-center flex-shrink-0`}>
        {getActivityIcon()}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          {/* User Avatar */}
          <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-medium text-gray-600">
              {activity.user.initials}
            </span>
          </div>

          {/* Activity Text */}
          <p className="text-sm text-gray-900">
            <span className="font-medium">{activity.user.name}</span>
            {' '}
            <span dangerouslySetInnerHTML={{ __html: activity.action }} />
            {activity.target && (
              <>
                {' '}
                <span className="font-medium text-blue-600">{activity.target}</span>
              </>
            )}
          </p>
        </div>

        {/* Metadata Badges */}
        {renderMetadata()}

        {/* Timestamp */}
        <div className="flex items-center mt-2 text-xs text-gray-500">
          <Clock className="w-3 h-3 mr-1" />
          {formatTimestamp(activity.timestamp)}
        </div>
      </div>
    </div>
  );
};

const ActivityFeedSkeleton: React.FC = () => (
  <div className="space-y-4">
    {[...Array(5)].map((_, index) => (
      <div key={index} className="flex items-start space-x-3 p-4 animate-pulse">
        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
            <div className="w-48 h-4 bg-gray-200 rounded"></div>
          </div>
          <div className="w-20 h-3 bg-gray-200 rounded"></div>
        </div>
      </div>
    ))}
  </div>
);

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ 
  activities = [],
  loading = false,
  showHeader = true,
  maxItems = 10
}) => {
  // Mock data - in real app, this would come from API
  const mockActivities: ActivityItem[] = [
    {
      id: '1',
      type: 'feedback',
      user: { name: 'Alice Johnson', initials: 'AJ' },
      action: 'submitted new feedback',
      target: '"Improve mobile app navigation"',
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
      metadata: { status: 'open', priority: 'high', category: 'UI/UX' }
    },
    {
      id: '2',
      type: 'user',
      user: { name: 'Bob Smith', initials: 'BS' },
      action: 'joined the workspace',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    },
    {
      id: '3',
      type: 'achievement',
      user: { name: 'Sarah Wilson', initials: 'SW' },
      action: 'resolved feedback',
      target: '"Fix login button alignment"',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
      metadata: { status: 'resolved', category: 'Bug Fix' }
    },
    {
      id: '4',
      type: 'integration',
      user: { name: 'System', initials: 'SY' },
      action: 'synchronized data from',
      target: 'Slack integration',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), // 6 hours ago
    },
    {
      id: '5',
      type: 'feedback',
      user: { name: 'Mike Chen', initials: 'MC' },
      action: 'updated priority for',
      target: '"Add dark mode support"',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), // 8 hours ago
      metadata: { status: 'open', priority: 'medium', category: 'Feature Request' }
    },
    {
      id: '6',
      type: 'user',
      user: { name: 'Lisa Rodriguez', initials: 'LR' },
      action: 'added comment to',
      target: '"Improve search functionality"',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), // 12 hours ago
      metadata: { status: 'open', category: 'Enhancement' }
    },
    {
      id: '7',
      type: 'system',
      user: { name: 'System', initials: 'SY' },
      action: 'sent weekly digest to',
      target: '24 team members',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    },
    {
      id: '8',
      type: 'achievement',
      user: { name: 'Tom Davis', initials: 'TD' },
      action: 'completed milestone',
      target: '"Q4 Feedback Goals"',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    }
  ];

  const displayActivities = activities.length > 0 ? activities : mockActivities;
  const limitedActivities = displayActivities.slice(0, maxItems);

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {showHeader && (
        <div className="border-b border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              View all
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Latest updates from your team and integrations
          </p>
        </div>
      )}

      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <ActivityFeedSkeleton />
        ) : limitedActivities.length > 0 ? (
          limitedActivities.map((activity) => (
            <ActivityFeedItem key={activity.id} activity={activity} />
          ))
        ) : (
          <div className="p-8 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h4 className="text-sm font-medium text-gray-900 mb-2">No recent activity</h4>
            <p className="text-sm text-gray-500">
              Activity from your team and integrations will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};