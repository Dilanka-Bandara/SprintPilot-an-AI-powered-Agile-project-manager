import { z } from 'zod';
export const statuses = [
  'BACKLOG',
  'TODO',
  'IN_PROGRESS',
  'IN_REVIEW',
  'DONE',
] as const;
export const issueInput = z.object({
  title: z.string().trim().min(1).max(180),
  description: z.string().max(5000).default(''),
  type: z.enum(['STORY', 'TASK', 'BUG']).default('STORY'),
  status: z.enum(statuses).default('BACKLOG'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  points: z
    .union([
      z.literal(0),
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(5),
      z.literal(8),
      z.literal(13),
    ])
    .default(3),
  assignee: z
    .enum(['Unassigned', 'Dilanka', 'Maya', 'Alex', 'Sam'])
    .default('Unassigned'),
  label: z
    .enum(['Platform', 'Experience', 'AI & automation'])
    .default('Platform'),
});
export const issueSchema = issueInput.extend({
  id: z.string().uuid(),
  key: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Issue = z.infer<typeof issueSchema>;
// PATCH must not apply creation defaults to fields the client did not send.
export const issuePatch = z.object({
  title: issueInput.shape.title.optional(),
  description: issueInput.shape.description.removeDefault().optional(),
  type: issueInput.shape.type.removeDefault().optional(),
  status: issueInput.shape.status.removeDefault().optional(),
  priority: issueInput.shape.priority.removeDefault().optional(),
  points: issueInput.shape.points.removeDefault().optional(),
  assignee: issueInput.shape.assignee.removeDefault().optional(),
  label: issueInput.shape.label.removeDefault().optional(),
});
export type IssueInput = z.infer<typeof issueInput>;
export const standupInput = z.object({
  yesterday: z.string().trim().min(1).max(2000),
  today: z.string().trim().min(1).max(2000),
  blockers: z.string().max(2000).default(''),
});
export const standupSchema = standupInput.extend({
  date: z.string(),
  author: z.string(),
});
export const stateSchema = z.object({
  counter: z.number().int().nonnegative(),
  issues: z.array(issueSchema),
  standups: z.array(standupSchema),
});
export type State = z.infer<typeof stateSchema>;
