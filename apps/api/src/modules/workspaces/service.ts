import type { PrismaClient } from '../../generated/prisma/client.js';
import type { Identity } from '../auth/firebase.js';
import { ApiError } from '../../lib/errors.js';
import { issueSchema, type IssueInput } from '@sprintpilot/shared';
export type WorkspaceIssueInput = Omit<IssueInput, 'assignee'>;
export class WorkspaceService {
  constructor(private db: PrismaClient) {}
  async user(identity: Identity) {
    return this.db.user.upsert({
      where: { firebaseUid: identity.uid },
      create: {
        firebaseUid: identity.uid,
        email: identity.email,
        name: identity.name ?? identity.email.split('@')[0],
      },
      update: {
        email: identity.email,
        ...(identity.name ? { name: identity.name } : {}),
      },
    });
  }
  async membership(userId: string, workspaceId: string) {
    const membership = await this.db.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
      include: { workspace: true },
    });
    if (!membership)
      throw new ApiError(
        403,
        'WORKSPACE_FORBIDDEN',
        'You are not a member of this workspace.',
      );
    return membership;
  }
  async list(userId: string) {
    const memberships = await this.db.membership.findMany({
      where: { userId },
      include: { workspace: true },
      orderBy: { createdAt: 'asc' },
    });
    return memberships.map(({ workspace, role }) => ({ ...workspace, role }));
  }
  async create(userId: string, input: { name: string; key: string }) {
    // Nested writes atomically create the workspace and its owner membership.
    const workspace = await this.db.workspace.create({
      data: { ...input, memberships: { create: { userId, role: 'OWNER' } } },
    });
    return { ...workspace, role: 'OWNER' as const };
  }
  async detail(userId: string, workspaceId: string) {
    const { workspace, role } = await this.membership(userId, workspaceId);
    const members = await this.db.membership.findMany({
      where: { workspaceId },
      select: {
        role: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });
    return { ...workspace, role, members };
  }
  async issues(userId: string, workspaceId: string) {
    const { workspace } = await this.membership(userId, workspaceId);
    const issues = await this.db.issue.findMany({
      where: { workspaceId },
      orderBy: { number: 'asc' },
    });
    return issues.map((issue) =>
      issueSchema.parse({
        ...issue,
        key: `${workspace.key}-${issue.number}`,
        assignee: 'Unassigned' as const,
        createdAt: issue.createdAt.toISOString(),
        updatedAt: issue.updatedAt.toISOString(),
      }),
    );
  }
  async createIssue(
    userId: string,
    workspaceId: string,
    input: WorkspaceIssueInput,
  ) {
    await this.membership(userId, workspaceId);
    return this.db.$transaction(async (tx) => {
      // UPDATE locks the workspace row; concurrent requests get distinct numbers.
      const workspace = await tx.workspace.update({
        where: { id: workspaceId },
        data: { issueCounter: { increment: 1 } },
      });
      const issue = await tx.issue.create({
        data: { ...input, workspaceId, number: workspace.issueCounter },
      });
      return issueSchema.parse({
        ...issue,
        key: `${workspace.key}-${issue.number}`,
        assignee: 'Unassigned' as const,
        createdAt: issue.createdAt.toISOString(),
        updatedAt: issue.updatedAt.toISOString(),
      });
    });
  }
  async updateIssue(
    userId: string,
    workspaceId: string,
    id: string,
    input: Partial<WorkspaceIssueInput>,
  ) {
    await this.membership(userId, workspaceId);
    const result = await this.db.issue.updateMany({
      where: { id, workspaceId },
      data: input,
    });
    if (!result.count)
      throw new ApiError(
        404,
        'ISSUE_NOT_FOUND',
        'Issue not found in this workspace.',
      );
    return { updated: true };
  }
  async deleteIssue(userId: string, workspaceId: string, id: string) {
    await this.membership(userId, workspaceId);
    const result = await this.db.issue.deleteMany({
      where: { id, workspaceId },
    });
    if (!result.count)
      throw new ApiError(
        404,
        'ISSUE_NOT_FOUND',
        'Issue not found in this workspace.',
      );
    return { deleted: true };
  }
}
