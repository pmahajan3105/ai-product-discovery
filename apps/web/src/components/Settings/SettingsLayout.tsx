/**
 * Settings Layout Component
 * Provides the main layout structure for settings pages with sidebar navigation
 * Based on Zeda's two-level settings architecture pattern
 */

import React from 'react';
import { SettingsSidebar } from './SettingsSidebar';

interface SettingsLayoutProps {
  children: React.ReactNode;
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

export function SettingsLayout({ 
  children, 
  user, 
  organization, 
  activeSection, 
  activeSubSection 
}: SettingsLayoutProps) {
  return (
    <div className="flex h-full bg-gray-50">
      {/* Settings Sidebar - Fixed 280px width like Zeda */}
      <div className="w-70 bg-white border-r border-gray-200 flex-shrink-0">
        <SettingsSidebar
          user={user}
          organization={organization}
          activeSection={activeSection}
          activeSubSection={activeSubSection}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto py-8 px-6">
          {children}
        </div>
      </div>
    </div>
  );
}