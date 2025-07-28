import React from 'react';
import { 
  Home,
  MessageSquare,
  Users,
  Settings,
  BarChart3,
  Search,
  Cog,
  Bot
} from 'lucide-react';

export interface NavbarItem {
  key: string;
  icon: React.ComponentType<any>;
  label: string;
  route?: string;
  shortcut?: string;
}

export interface NavbarSection {
  items: NavbarItem[];
  title?: string;
}

export const NavbarConfig: NavbarSection[] = [
  {
    items: [
      { 
        key: 'home', 
        icon: Home, 
        label: 'Dashboard', 
        route: '/dashboard' 
      },
      { 
        key: 'search', 
        icon: Search, 
        label: 'Search', 
        shortcut: '⌘K' 
      },
    ],
  },
  {
    title: 'Feedback Management',
    items: [
      {
        key: 'feedback',
        icon: MessageSquare,
        label: 'Feedback',
        route: '/feedback',
      },
      {
        key: 'customers',
        icon: Users,
        label: 'Customers',
        route: '/customers',
      },
      {
        key: 'insights',
        icon: BarChart3,
        label: 'Insights',
        route: '/insights',
      },
      {
        key: 'ai-insights',
        icon: Bot,
        label: 'AI Assistant',
        route: '/ai-insights',
      },
    ],
  },
  {
    title: 'Configuration',
    items: [
      {
        key: 'integrations',
        icon: Settings,
        label: 'Integrations',
        route: '/integrations',
      },
      {
        key: 'settings',
        icon: Cog,
        label: 'Settings',
        route: '/settings',
      },
    ],
  },
];