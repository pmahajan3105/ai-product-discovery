/**
 * Settings Sidebar Navigation
 * Provides hierarchical navigation for settings sections
 * Based on Zeda's permission-aware settings navigation pattern
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  Building2,
  Users,
  CreditCard,
  MessageSquare,
  Tags,
  Globe,
  Plug,
  Bell,
  Shield,
  User,
  Settings,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface SettingsSidebarProps {
  user: {
    id: string;
    name: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    domain?: string;
    plan?: string;
    status?: string;
  };
  activeSection: string;
  activeSubSection?: string;
}

interface SettingsSection {
  key: string;
  title: string;
  icon: React.ComponentType<any>;
  items: SettingsItem[];
  requiredPermission?: string;
}

interface SettingsItem {
  key: string;
  label: string;
  href: string;
  requiredPermission?: string;
  badge?: string;
}

const workspaceSettingsSections: SettingsSection[] = [
  {
    key: 'workspace',
    title: 'Workspace',
    icon: Building2,
    items: [
      { key: 'general', label: 'General', href: '/settings' },
      { key: 'preferences', label: 'Preferences', href: '/settings/workspace/preferences' },
      { key: 'members', label: 'Members', href: '/settings/workspace/members' },
      { key: 'teams', label: 'Teams', href: '/settings/workspace/teams' },
      { key: 'billing', label: 'Plan & Billing', href: '/settings/workspace/billing' }
    ]
  },
  {
    key: 'feedback',
    title: 'Feedback Management',
    icon: MessageSquare,
    items: [
      { key: 'custom-fields', label: 'Custom Fields', href: '/settings/custom-fields' },
      { key: 'statuses', label: 'Statuses & Workflows', href: '/settings/feedback/statuses' },
      { key: 'categories', label: 'Categories & Tags', href: '/settings/feedback/categories' },
      { key: 'sources', label: 'Sources & Channels', href: '/settings/feedback/sources' }
    ]
  },
  {
    key: 'portal',
    title: 'Customer Portal',
    icon: Globe,
    items: [
      { key: 'settings', label: 'Portal Settings', href: '/settings/portal/settings' },
      { key: 'theming', label: 'Theming & Branding', href: '/settings/portal/theming' },
      { key: 'access', label: 'Access Control', href: '/settings/portal/access' }
    ]
  },
  {
    key: 'integrations',
    title: 'Integrations',
    icon: Plug,
    items: [
      { key: 'email', label: 'Email Services', href: '/settings/integrations/email' },
      { key: 'slack', label: 'Slack & Teams', href: '/settings/integrations/slack' },
      { key: 'webhooks', label: 'Webhooks & API', href: '/settings/integrations/webhooks' },
      { key: 'analytics', label: 'Analytics Tools', href: '/settings/integrations/analytics' }
    ]
  },
  {
    key: 'notifications',
    title: 'Notifications',
    icon: Bell,
    items: [
      { key: 'email', label: 'Email Preferences', href: '/settings/notifications/email' },
      { key: 'in-app', label: 'In-app Notifications', href: '/settings/notifications/in-app' },
      { key: 'digest', label: 'Digest Settings', href: '/settings/notifications/digest' }
    ]
  },
  {
    key: 'security',
    title: 'Security & Privacy',
    icon: Shield,
    items: [
      { key: 'data-retention', label: 'Data Retention', href: '/settings/security/data-retention' },
      { key: 'privacy', label: 'Privacy Settings', href: '/settings/security/privacy' },
      { key: 'audit-logs', label: 'Audit Logs', href: '/settings/security/audit-logs' }
    ]
  }
];

const profileSettingsSection: SettingsSection = {
  key: 'profile',
  title: 'Profile Settings',
  icon: User,
  items: [
    { key: 'profile', label: 'Edit Profile', href: '/settings/profile' },
    { key: 'notifications', label: 'Notification Preferences', href: '/settings/profile/notifications' },
    { key: 'password', label: 'Change Password', href: '/settings/profile/password' },
    { key: 'account', label: 'Account Management', href: '/settings/profile/account' }
  ]
};

export function SettingsSidebar({ 
  user, 
  organization, 
  activeSection, 
  activeSubSection 
}: SettingsSidebarProps) {
  const router = useRouter();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set([activeSection])
  );

  const toggleSection = (sectionKey: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionKey)) {
      newExpanded.delete(sectionKey);
    } else {
      newExpanded.add(sectionKey);
    }
    setExpandedSections(newExpanded);
  };

  const isItemActive = (sectionKey: string, itemKey: string) => {
    return activeSection === sectionKey && (activeSubSection === itemKey || (!activeSubSection && itemKey === 'general'));
  };

  const renderSection = (section: SettingsSection) => {
    const isExpanded = expandedSections.has(section.key);
    const hasActiveItem = section.items.some(item => isItemActive(section.key, item.key));

    return (
      <div key={section.key} className="mb-1">
        {/* Section Header */}
        <button
          onClick={() => toggleSection(section.key)}
          className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
            ${hasActiveItem 
              ? 'bg-blue-50 text-blue-700' 
              : 'text-gray-700 hover:bg-gray-100'
            }`}
        >
          <section.icon className="w-4 h-4 mr-3 flex-shrink-0" />
          <span className="flex-1 text-left">{section.title}</span>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {/* Section Items */}
        {isExpanded && (
          <div className="ml-7 mt-1 space-y-1">
            {section.items.map((item) => {
              const isActive = isItemActive(section.key, item.key);
              
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`block px-3 py-2 text-sm rounded-md transition-colors
                    ${isActive 
                      ? 'bg-blue-100 text-blue-800 font-medium' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center">
          <Settings className="w-5 h-5 text-gray-400 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
        </div>
        <p className="text-sm text-gray-500 mt-1">{organization.name}</p>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-6">
          {/* Workspace Settings */}
          <div>
            <h3 className="px-3 mb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Workspace Settings
            </h3>
            <div className="space-y-1">
              {workspaceSettingsSections.map(renderSection)}
            </div>
          </div>

          {/* Profile Settings */}
          <div>
            <h3 className="px-3 mb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Personal Settings
            </h3>
            <div className="space-y-1">
              {renderSection(profileSettingsSection)}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
            <span className="text-sm font-medium text-blue-700">
              {user.firstName?.[0] || user.name[0] || user.email[0]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
}