/**
 * Organization API Service  
 * Frontend service for organization management operations
 */

import { apiClient, ApiResponse } from './apiClient';

export interface Organization {
  id: string;
  name: string;
  description?: string;
  uniqueName: string;
  image?: string;
  createdAt: string;
  users?: Array<{
    id: string;
    email: string; 
    firstName: string;
    lastName: string;
    profileImage?: string;
    lastActivityTime?: string;
    membership?: {
      role: string;
      joinedAt: string;
    };
  }>;
  creator?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface CreateOrganizationRequest {
  name: string;
  description?: string;
  uniqueName: string;
  image?: string;
}

export interface UpdateOrganizationRequest {
  name?: string;
  description?: string;
  image?: string;
}

export interface AddMemberRequest {
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
}

export interface UpdateMemberRoleRequest {
  role: 'owner' | 'admin' | 'member' | 'viewer';
}

export interface OrganizationStats {
  members: number;
  feedback: number;
  customers: number;
  integrations: number;
  feedbackByStatus: Record<string, number>;
}

export interface UserRole {
  userId: string;
  organizationId: string;
  role: string | null;
}

export class OrganizationApiService {
  /**
   * Create new organization
   */
  async createOrganization(data: CreateOrganizationRequest): Promise<ApiResponse<Organization>> {
    return apiClient.post('/organizations', data);
  }

  /**
   * Get organization by ID
   */
  async getOrganizationById(organizationId: string): Promise<ApiResponse<Organization>> {
    return apiClient.get(`/organizations/${organizationId}`);
  }

  /**
   * Get user's organizations
   */
  async getUserOrganizations(): Promise<ApiResponse<Organization[]>> {
    return apiClient.get('/organizations');
  }

  /**
   * Update organization
   */
  async updateOrganization(organizationId: string, data: UpdateOrganizationRequest): Promise<ApiResponse<Organization>> {
    return apiClient.put(`/organizations/${organizationId}`, data);
  }

  /**
   * Delete organization
   */
  async deleteOrganization(organizationId: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/organizations/${organizationId}`);
  }

  /**
   * Add member to organization
   */
  async addMember(organizationId: string, data: AddMemberRequest): Promise<ApiResponse<Organization>> {
    return apiClient.post(`/organizations/${organizationId}/members`, data);
  }

  /**
   * Update member role
   */
  async updateMemberRole(organizationId: string, userId: string, data: UpdateMemberRoleRequest): Promise<ApiResponse<Organization>> {
    return apiClient.put(`/organizations/${organizationId}/members/${userId}`, data);
  }

  /**
   * Remove member from organization
   */
  async removeMember(organizationId: string, userId: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/organizations/${organizationId}/members/${userId}`);
  }

  /**
   * Get organization statistics
   */
  async getOrganizationStats(organizationId: string): Promise<ApiResponse<OrganizationStats>> {
    return apiClient.get(`/organizations/${organizationId}/stats`);
  }

  /**
   * Check if unique name is available
   */
  async checkUniqueName(uniqueName: string): Promise<ApiResponse<{ uniqueName: string; available: boolean }>> {
    return apiClient.get('/organizations/check-unique-name', { uniqueName });
  }

  /**
   * Get user's role in organization
   */
  async getUserRole(organizationId: string): Promise<ApiResponse<UserRole>> {
    return apiClient.get(`/organizations/${organizationId}/role`);
  }
}

// Export singleton instance
export const organizationApi = new OrganizationApiService();