/**
 * React Query hooks for organization data management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationApi } from '../lib/api/organizationApi';
import { useAuth } from './useAuth';

// Query Keys
export const organizationKeys = {
  all: ['organizations'] as const,
  lists: () => [...organizationKeys.all, 'list'] as const,
  list: (userId: string) => [...organizationKeys.lists(), userId] as const,
  details: () => [...organizationKeys.all, 'detail'] as const,
  detail: (id: string) => [...organizationKeys.details(), id] as const,
  members: (organizationId: string) => [...organizationKeys.all, 'members', organizationId] as const,
};

/**
 * Get user's organizations
 */
export function useUserOrganizations(userId: string) {
  return useQuery({
    queryKey: organizationKeys.list(userId),
    queryFn: () => organizationApi.getUserOrganizations(),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Get organization details
 */
export function useOrganizationDetail(organizationId: string) {
  return useQuery({
    queryKey: organizationKeys.detail(organizationId),
    queryFn: () => organizationApi.getOrganization(organizationId),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get organization members
 */
export function useOrganizationMembers(organizationId: string) {
  return useQuery({
    queryKey: organizationKeys.members(organizationId),
    queryFn: () => organizationApi.getOrganizationMembers(organizationId),
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Update organization
 */
export function useUpdateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ organizationId, data }: { organizationId: string; data: any }) =>
      organizationApi.updateOrganization(organizationId, data),
    onSuccess: (result, { organizationId }) => {
      // Update the detail cache
      queryClient.setQueryData(organizationKeys.detail(organizationId), result.data);
      // Invalidate lists to refresh
      queryClient.invalidateQueries({ queryKey: organizationKeys.lists() });
    },
  });
}

/**
 * Invite user to organization
 */
export function useInviteUser(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { email: string; role: string }) =>
      organizationApi.inviteUser(organizationId, data),
    onSuccess: () => {
      // Invalidate members list to show pending invitations
      queryClient.invalidateQueries({ queryKey: organizationKeys.members(organizationId) });
    },
  });
}

/**
 * Get current organization from auth context
 * This is a simple hook that combines auth state with organization details
 */
export function useOrganization() {
  const { organizationId } = useAuth();
  
  const { data: currentOrganization, isLoading, error } = useQuery({
    queryKey: organizationKeys.detail(organizationId!),
    queryFn: () => organizationApi.getOrganization(organizationId!),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    currentOrganization: currentOrganization?.data || null,
    isLoading,
    error
  };
}