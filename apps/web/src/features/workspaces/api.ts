import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Issue, IssueInput } from '@sprintpilot/shared';
import { authenticatedApi } from '../../lib/api';
import { useAuth } from '../auth/AuthProvider';
export type Workspace = {
  id: string;
  name: string;
  key: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
};
export type WorkspaceDetail = Workspace & {
  members: {
    role: string;
    user: { id: string; name: string; email: string };
  }[];
};
export function useWorkspaces() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['account', user?.uid, 'workspaces'],
    queryFn: ({ signal }) =>
      authenticatedApi<Workspace[]>('/workspaces', { signal }),
    enabled: !!user,
    retry: false,
  });
}
export function useCreateWorkspace() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; key: string }) =>
      authenticatedApi<Workspace>('/workspaces', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['account'] }),
  });
}
export function useRealWorkspace(id: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['account', user?.uid, 'workspace', id],
    queryFn: ({ signal }) =>
      authenticatedApi<WorkspaceDetail>(`/workspaces/${id}`, { signal }),
    enabled: !!user && !!id,
    retry: false,
  });
}
export function useRealIssues(id: string) {
  const { user } = useAuth();
  const client = useQueryClient();
  const key = ['account', user?.uid, 'issues', id];
  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) =>
      authenticatedApi<Issue[]>(`/workspaces/${id}/issues`, { signal }),
    enabled: !!user && !!id,
    retry: false,
  });
  const refresh = () => client.invalidateQueries({ queryKey: key });
  const create = useMutation({
    mutationFn: (input: IssueInput) =>
      authenticatedApi(`/workspaces/${id}/issues`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: refresh,
  });
  const update = useMutation({
    mutationFn: ({
      issueId,
      ...input
    }: Partial<IssueInput> & { issueId: string }) =>
      authenticatedApi(`/workspaces/${id}/issues/${issueId}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (issueId: string) =>
      authenticatedApi(`/workspaces/${id}/issues/${issueId}`, {
        method: 'DELETE',
      }),
    onSuccess: refresh,
  });
  return { ...query, create, update, remove };
}
