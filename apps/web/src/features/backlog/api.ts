import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Issue, IssueInput, State } from '@sprintpilot/shared';
import { api } from '../../lib/api';
export function useWorkspace() {
  return useQuery({ queryKey: ['workspace'], queryFn: () => api<State>('') });
}
export function useIssueActions() {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: ['workspace'] });
  const create = useMutation({
    mutationFn: (input: IssueInput) =>
      api<Issue>('/issues', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: refresh,
  });
  const update = useMutation({
    mutationFn: ({ id, ...input }: Partial<IssueInput> & { id: string }) =>
      api<Issue>(`/issues/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/issues/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
  });
  const standup = useMutation({
    mutationFn: (input: {
      yesterday: string;
      today: string;
      blockers: string;
    }) =>
      api('/standups/today', { method: 'PUT', body: JSON.stringify(input) }),
    onSuccess: refresh,
  });
  return { create, update, remove, standup };
}
