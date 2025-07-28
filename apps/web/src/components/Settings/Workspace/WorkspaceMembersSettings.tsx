/**
 * Workspace Members Settings Component
 * Member management with invitation system and role assignment
 * Based on Zeda's member management patterns
 */

import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Mail, 
  Shield, 
  MoreHorizontal,
  CheckCircle,
  Clock,
  X,
  Crown,
  User
} from 'lucide-react';

interface WorkspaceMembersSettingsProps {
  organization: {
    id: string;
    name: string;
    slug: string;
    domain?: string;
    plan?: string;
    status?: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface Member {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  status: 'active' | 'invited' | 'suspended';
  joinedAt: Date;
  lastActive?: Date;
  avatar?: string;
}

interface Invitation {
  id: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  invitedBy: string;
  invitedAt: Date;
  expiresAt: Date;
  status: 'pending' | 'expired';
}

const roleLabels = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer'
};

const roleDescriptions = {
  owner: 'Full access to everything including billing and member management',
  admin: 'Can manage members, settings, and all content',
  member: 'Can create and manage feedback, access most features',
  viewer: 'Read-only access to feedback and basic features'
};

export function WorkspaceMembersSettings({ organization, user }: WorkspaceMembersSettingsProps) {
  const [activeTab, setActiveTab] = useState<'active' | 'invited'>('active');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');
  const [isInviting, setIsInviting] = useState(false);

  // Mock data - in real app, this would come from API
  const [members] = useState<Member[]>([
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: 'owner',
      status: 'active',
      joinedAt: new Date('2023-01-15'),
      lastActive: new Date()
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      email: 'sarah@company.com',
      role: 'admin',
      status: 'active',
      joinedAt: new Date('2023-02-20'),
      lastActive: new Date(Date.now() - 1000 * 60 * 30) // 30 minutes ago
    },
    {
      id: '3',
      name: 'Mike Chen',
      email: 'mike@company.com',
      role: 'member',
      status: 'active',
      joinedAt: new Date('2023-03-10'),
      lastActive: new Date(Date.now() - 1000 * 60 * 60 * 2) // 2 hours ago
    },
    {
      id: '4',
      name: 'Lisa Rodriguez',
      email: 'lisa@company.com',
      role: 'viewer',
      status: 'active',
      joinedAt: new Date('2023-03-15'),
      lastActive: new Date(Date.now() - 1000 * 60 * 60 * 24) // 1 day ago
    }
  ]);

  const [invitations] = useState<Invitation[]>([
    {
      id: '1',
      email: 'john@company.com',
      role: 'member',
      invitedBy: user.name,
      invitedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5), // 5 days from now
      status: 'pending'
    }
  ]);

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteEmail.trim()) return;

    setIsInviting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Inviting member:', { email: inviteEmail, role: inviteRole });
      
      // Reset form and close modal
      setInviteEmail('');
      setInviteRole('member');
      setShowInviteModal(false);
      
      // In real app, would refresh member/invitation lists
    } catch (error) {
      console.error('Error inviting member:', error);
    } finally {
      setIsInviting(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-600" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-blue-600" />;
      default:
        return <User className="w-4 h-4 text-gray-600" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-yellow-100 text-yellow-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      case 'member':
        return 'bg-green-100 text-green-800';
      case 'viewer':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatLastActive = (date?: Date) => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 1000 * 60 * 60) { // Less than 1 hour
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes} minutes ago`;
    } else if (diff < 1000 * 60 * 60 * 24) { // Less than 1 day
      const hours = Math.floor(diff / (1000 * 60 * 60));
      return `${hours} hours ago`;
    } else {
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      return `${days} days ago`;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <Users className="w-6 h-6 text-gray-400 mr-2" />
            <h1 className="text-2xl font-bold text-gray-900">Members</h1>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Invite Member
          </button>
        </div>
        <p className="text-gray-600">
          Manage team members and their access levels. You can invite new members and adjust existing member permissions.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Members</p>
              <p className="text-2xl font-bold text-gray-900">{members.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Active Members</p>
              <p className="text-2xl font-bold text-gray-900">
                {members.filter(m => m.status === 'active').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Invites</p>
              <p className="text-2xl font-bold text-gray-900">{invitations.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
              <Shield className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Admins</p>
              <p className="text-2xl font-bold text-gray-900">
                {members.filter(m => m.role === 'admin' || m.role === 'owner').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('active')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'active'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Active Members ({members.filter(m => m.status === 'active').length})
            </button>
            <button
              onClick={() => setActiveTab('invited')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'invited'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Pending Invitations ({invitations.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'active' ? (
            /* Active Members List */
            <div className="space-y-4">
              {members.filter(m => m.status === 'active').map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-700">
                        {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-gray-900">{member.name}</h4>
                        {member.id === user.id && (
                          <span className="text-xs text-gray-500">(You)</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{member.email}</p>
                      <p className="text-xs text-gray-500">
                        Last active: {formatLastActive(member.lastActive)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {getRoleIcon(member.role)}
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(member.role)}`}>
                        {roleLabels[member.role]}
                      </span>
                    </div>
                    
                    {member.id !== user.id && (
                      <button className="p-1 text-gray-400 hover:text-gray-600">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Pending Invitations List */
            <div className="space-y-4">
              {invitations.map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                      <Mail className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{invitation.email}</h4>
                      <p className="text-sm text-gray-600">
                        Invited by {invitation.invitedBy} • 
                        Expires {invitation.expiresAt.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(invitation.role)}`}>
                      {roleLabels[invitation.role]}
                    </span>
                    <button className="p-1 text-gray-400 hover:text-red-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              
              {invitations.length === 0 && (
                <div className="text-center py-8">
                  <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-sm font-medium text-gray-900 mb-2">No pending invitations</h3>
                  <p className="text-sm text-gray-500">
                    Invite team members to collaborate on feedback management.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Invite Team Member</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInviteMember} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="colleague@company.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  id="role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="viewer">Viewer</option>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {roleDescriptions[inviteRole]}
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isInviting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isInviting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Send Invitation
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}