import { getUser } from '@netlify/identity';
import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import { memberships, profiles, auditLogs } from '../db/schema';
import { isStaff } from './permissions';

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function requireUser() {
  const user = await getUser();
  if (!user) throw new HttpError(401, 'Please sign in to continue.');
  if (!user.confirmedAt) throw new HttpError(403, 'Confirm your email before continuing.');
  await db.insert(profiles).values({ id: user.id, name: (user.name || 'Campus member').slice(0, 100) }).onConflictDoNothing();
  return user;
}

export async function getMembership(userId: string) {
  const [member] = await db.select().from(memberships).where(eq(memberships.userId, userId)).limit(1);
  return member;
}

export async function requireMember(userId: string) {
  const member = await getMembership(userId);
  if (!member || member.status !== 'approved') throw new HttpError(403, 'College approval is required to enter your campus.');
  return member;
}

export function requireStaff(role: string) {
  if (!isStaff(role)) throw new HttpError(403, 'This action is available to verified teachers and administrators.');
}

export async function requireGroupMember(userId: string, groupId: string) {
  const { groups, groupMembers } = await import('../db/schema');
  const [group] = await db.select().from(groups).where(eq(groups.id, groupId)).limit(1);
  const member = await requireMember(userId);
  if (!group || group.collegeId !== member.collegeId) throw new HttpError(404, 'Group not found.');
  const [joined] = await db.select().from(groupMembers).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId), eq(groupMembers.status, 'approved'))).limit(1);
  if (group.ownerId !== userId && member.role !== 'college_admin' && !joined) throw new HttpError(403, 'Join this group before accessing its academic content.');
  return group;
}

export async function audit(actorId: string, action: string, targetId: string, collegeId?: string) {
  await db.insert(auditLogs).values({ actorId, action, targetId, collegeId });
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) throw new HttpError(403, 'Cross-site requests are not allowed.');
}
