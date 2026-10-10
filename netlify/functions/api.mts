import type { Config } from '@netlify/functions';
import { getUser } from '@netlify/identity';
import { getStore } from '@netlify/blobs';
import { and, or, eq, desc, inArray, count, isNull, sql, getTableColumns } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import * as tables from '../../db/schema';
import { audit, getMembership, HttpError, requireUser, requireMember, requireStaff, requireGroupMember, sameOrigin } from '../../server/access';
import { canJoinGroup, canReviewMembership, validFileType } from '../../server/permissions';

const text = z.string().trim().min(1).max(200);
const bodyText = z.string().trim().min(1).max(6000);
const optionalText = z.string().trim().max(200).default('');
const uuid = z.string().uuid();
const dateTime = z.string().datetime({ offset: true }).transform((value) => new Date(value));
const actions = z.discriminatedUnion('action', [
  z.object({ action: z.literal('profile'), name: text, bio: z.string().max(1000), skills: z.array(text).max(30), portfolioPublic: z.boolean() }),
  z.object({ action: z.literal('apply'), collegeId: uuid, role: z.enum(['student', 'teacher']), department: text, branch: text, semester: optionalText, section: optionalText, proofId: uuid }),
  z.object({ action: z.literal('review'), memberId: uuid, decision: z.enum(['approved', 'rejected']), reason: z.string().max(1000).default('') }),
  z.object({ action: z.literal('college'), name: text, city: text, kind: text, about: bodyText }),
  z.object({ action: z.literal('appoint'), memberId: uuid, role: z.enum(['student', 'teacher', 'hod', 'college_admin']) }),
  z.object({ action: z.literal('unit'), parentId: uuid.nullable(), kind: z.enum(['campus', 'department', 'program', 'branch', 'academic_year', 'semester', 'section']), name: text }),
  z.object({ action: z.literal('group'), name: text, description: z.string().max(2000), kind: z.enum(['college', 'department', 'branch', 'semester', 'class', 'teacher', 'club', 'project']), policy: z.enum(['open', 'college_verified', 'branch_restricted', 'semester_restricted', 'teacher_approval', 'invite_only']), department: optionalText, branch: optionalText, semester: optionalText, section: optionalText }),
  z.object({ action: z.literal('join'), groupId: uuid }),
  z.object({ action: z.literal('group-review'), groupMemberId: uuid, decision: z.enum(['approved', 'rejected']) }),
  z.object({ action: z.literal('invite'), groupId: uuid, userId: text }),
  z.object({ action: z.literal('post'), title: text, body: bodyText, category: z.enum(['discussion', 'official', 'opportunities', 'achievements', 'questions']), pinned: z.boolean(), priority: z.enum(['normal', 'important']), expiresAt: dateTime.nullable() }),
  z.object({ action: z.literal('react'), postId: uuid, kind: z.enum(['like', 'read']) }),
  z.object({ action: z.literal('comment'), postId: uuid, body: bodyText }),
  z.object({ action: z.literal('note'), title: text, subject: text, fileId: uuid, branch: optionalText, semester: optionalText, unit: optionalText, chapter: optionalText, description: z.string().max(2000), tags: z.array(text).max(20) }),
  z.object({ action: z.literal('event'), title: text, description: bodyText, category: text, startsAt: dateTime, deadline: dateTime, venue: text, visibility: z.enum(['campus', 'public']), capacity: z.coerce.number().int().min(1).max(10000) }),
  z.object({ action: z.literal('register'), eventId: uuid }),
  z.object({ action: z.literal('assignment'), groupId: uuid, title: text, description: bodyText, subject: text, dueAt: dateTime, maxMarks: z.coerce.number().int().min(1).max(1000) }),
  z.object({ action: z.literal('submit'), assignmentId: uuid, fileId: uuid }),
  z.object({ action: z.literal('grade'), submissionId: uuid, marks: z.coerce.number().int().min(0).max(1000), feedback: z.string().max(2000) }),
  z.object({ action: z.literal('attendance'), groupId: uuid, studentId: text, date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), present: z.boolean() }),
  z.object({ action: z.literal('message'), recipientId: text, body: z.string().trim().min(1).max(3000) }),
  z.object({ action: z.literal('notification-read'), id: uuid }),
  z.object({ action: z.literal('project'), title: text, description: bodyText, url: z.union([z.literal(''), z.string().url().max(1000).refine((value) => /^https?:\/\//.test(value))]) }),
  z.object({ action: z.literal('follow'), collegeId: uuid }),
  z.object({ action: z.literal('delete-proof'), fileId: uuid }),
]);

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });

async function notify(userId: string, title: string, body: string) {
  await db.insert(tables.notifications).values({ userId, title, body });
}

async function ownedFile(fileId: string, userId: string, collegeId: string, purpose: string) {
  const [file] = await db.select().from(tables.files).where(and(eq(tables.files.id, fileId), eq(tables.files.ownerId, userId), eq(tables.files.collegeId, collegeId), eq(tables.files.purpose, purpose), isNull(tables.files.deletedAt))).limit(1);
  if (!file) throw new HttpError(400, 'Upload a valid file for this action first.');
  return file;
}

async function campusData(userId: string) {
  const member = await requireMember(userId);
  const collegeId = member.collegeId;
  const [college] = await db.select().from(tables.colleges).where(eq(tables.colleges.id, collegeId));
  const groupData = await db.select().from(tables.groups).where(eq(tables.groups.collegeId, collegeId)).limit(200);
  const ownJoins = await db.select().from(tables.groupMembers).where(eq(tables.groupMembers.userId, userId));
  const allowedGroups = groupData.filter((group) => group.ownerId === userId || member.role === 'college_admin' || ownJoins.some((joined) => joined.groupId === group.id && joined.status === 'approved')).map((group) => group.id);
  const managedGroups = groupData.filter((group) => group.ownerId === userId || member.role === 'college_admin').map((group) => group.id);
  const groupJoinData = managedGroups.length ? await db.select().from(tables.groupMembers).where(inArray(tables.groupMembers.groupId, managedGroups)).limit(1000) : [];
  const postData = await db.select({ ...getTableColumns(tables.posts), authorName: tables.profiles.name }).from(tables.posts).innerJoin(tables.profiles, eq(tables.posts.authorId, tables.profiles.id)).where(and(eq(tables.posts.collegeId, collegeId), or(isNull(tables.posts.expiresAt), sql`${tables.posts.expiresAt} > now()`))).orderBy(desc(tables.posts.pinned), desc(tables.posts.createdAt)).limit(100);
  const postIds = postData.map((post) => post.id);
  const reactionData = postIds.length ? await db.select().from(tables.reactions).where(inArray(tables.reactions.postId, postIds)).limit(5000) : [];
  const commentData = postIds.length ? await db.select({ id: tables.comments.id, postId: tables.comments.postId, body: tables.comments.body, createdAt: tables.comments.createdAt, authorName: tables.profiles.name }).from(tables.comments).innerJoin(tables.profiles, eq(tables.comments.authorId, tables.profiles.id)).where(inArray(tables.comments.postId, postIds)).orderBy(desc(tables.comments.createdAt)).limit(300) : [];
  const noteData = await db.select({ id: tables.notes.id, title: tables.notes.title, subject: tables.notes.subject, branch: tables.notes.branch, semester: tables.notes.semester, unit: tables.notes.unit, chapter: tables.notes.chapter, description: tables.notes.description, tags: tables.notes.tags, fileId: tables.notes.fileId, createdAt: tables.notes.createdAt, authorName: tables.profiles.name }).from(tables.notes).innerJoin(tables.profiles, eq(tables.notes.authorId, tables.profiles.id)).where(eq(tables.notes.collegeId, collegeId)).orderBy(desc(tables.notes.createdAt)).limit(200);
  const eventData = await db.select().from(tables.events).where(eq(tables.events.collegeId, collegeId)).orderBy(tables.events.startsAt).limit(100);
  const assignmentData = allowedGroups.length ? await db.select().from(tables.assignments).where(and(eq(tables.assignments.collegeId, collegeId), inArray(tables.assignments.groupId, allowedGroups))).orderBy(tables.assignments.dueAt).limit(200) : [];
  const ownAssignments = assignmentData.filter((assignment) => assignment.teacherId === userId || member.role === 'college_admin').map((assignment) => assignment.id);
  const submissionData = await db.select().from(tables.submissions).where(ownAssignments.length ? or(eq(tables.submissions.studentId, userId), inArray(tables.submissions.assignmentId, ownAssignments)) : eq(tables.submissions.studentId, userId)).limit(1000);
  const attendanceData = await db.select().from(tables.attendance).where(and(eq(tables.attendance.collegeId, collegeId), managedGroups.length ? or(eq(tables.attendance.studentId, userId), inArray(tables.attendance.groupId, managedGroups)) : eq(tables.attendance.studentId, userId))).limit(2000);
  const people = await db.select({ id: tables.profiles.id, name: tables.profiles.name, role: tables.memberships.role, department: tables.memberships.department, branch: tables.memberships.branch, semester: tables.memberships.semester, section: tables.memberships.section }).from(tables.memberships).innerJoin(tables.profiles, eq(tables.memberships.userId, tables.profiles.id)).where(and(eq(tables.memberships.collegeId, collegeId), eq(tables.memberships.status, 'approved'))).limit(500);
  const memberRequests = ['college_admin', 'hod'].includes(member.role) ? await db.select({ ...getTableColumns(tables.memberships), name: tables.profiles.name }).from(tables.memberships).innerJoin(tables.profiles, eq(tables.memberships.userId, tables.profiles.id)).where(and(eq(tables.memberships.collegeId, collegeId), member.role === 'hod' ? eq(tables.memberships.department, member.department) : undefined)).limit(500) : [];
  const messageData = await db.select().from(tables.messages).where(and(eq(tables.messages.collegeId, collegeId), or(eq(tables.messages.senderId, userId), eq(tables.messages.recipientId, userId)))).orderBy(desc(tables.messages.createdAt)).limit(300);
  const units = await db.select().from(tables.academicUnits).where(eq(tables.academicUnits.collegeId, collegeId)).limit(500);
  const ownRegistrations = await db.select().from(tables.registrations).where(eq(tables.registrations.userId, userId)).limit(500);
  const logs = member.role === 'college_admin' ? await db.select().from(tables.auditLogs).where(eq(tables.auditLogs.collegeId, collegeId)).orderBy(desc(tables.auditLogs.createdAt)).limit(100) : [];
  return { college, groups: groupData, joins: ownJoins, groupRequests: groupJoinData, posts: postData.map((post) => ({ ...post, likes: reactionData.filter((reaction) => reaction.postId === post.id && reaction.kind === 'like').length, liked: reactionData.some((reaction) => reaction.postId === post.id && reaction.kind === 'like' && reaction.userId === userId), readCount: reactionData.filter((reaction) => reaction.postId === post.id && reaction.kind === 'read').length, read: reactionData.some((reaction) => reaction.postId === post.id && reaction.kind === 'read' && reaction.userId === userId), comments: commentData.filter((comment) => comment.postId === post.id) })), notes: noteData, events: eventData, assignments: assignmentData, submissions: submissionData, attendance: attendanceData, people, memberRequests, messages: messageData, units, registrations: ownRegistrations, logs };
}

async function act(request: Request) {
  sameOrigin(request);
  const user = await requireUser();
  const platformAdmin = user.roles?.includes('platform_admin') ?? false;
  const parsed = actions.safeParse(await request.json());
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message || 'Invalid input.');
  const data = parsed.data;
  if (data.action === 'profile') {
    await db.update(tables.profiles).set({ name: data.name, bio: data.bio, skills: data.skills, portfolioPublic: data.portfolioPublic }).where(eq(tables.profiles.id, user.id));
    return { message: 'Your profile has been saved.' };
  }
  if (data.action === 'apply') {
    const [college] = await db.select().from(tables.colleges).where(and(eq(tables.colleges.id, data.collegeId), eq(tables.colleges.verified, true)));
    if (!college) throw new HttpError(400, 'Select an officially verified college.');
    const existing = await getMembership(user.id);
    if (existing && ['approved', 'pending'].includes(existing.status)) throw new HttpError(409, 'Your membership is already approved or under review.');
    await ownedFile(data.proofId, user.id, data.collegeId, 'proof');
    const mapping = { userId: user.id, collegeId: data.collegeId, role: data.role, department: data.department, branch: data.branch, semester: data.semester, section: data.section, proofId: data.proofId, status: 'pending', reason: '', reviewedBy: null };
    await db.insert(tables.memberships).values(mapping).onConflictDoUpdate({ target: tables.memberships.userId, set: mapping });
    await audit(user.id, 'verification_submitted', user.id, data.collegeId);
    return { message: 'Submitted. Your college administrator will review your proof and academic mapping.' };
  }
  if (data.action === 'college') {
    if (!platformAdmin) throw new HttpError(403, 'Platform administrator access is required.');
    const [college] = await db.insert(tables.colleges).values({ name: data.name, city: data.city, kind: data.kind, about: data.about, verified: true }).returning();
    await audit(user.id, 'college_verified', college.id, college.id);
    return { message: 'Verified college added to the network.' };
  }
  if (data.action === 'appoint' || data.action === 'review') {
    const [applicant] = await db.select().from(tables.memberships).where(eq(tables.memberships.id, data.memberId));
    if (!applicant) throw new HttpError(404, 'Membership not found.');
    const reviewer = await getMembership(user.id);
    if (data.action === 'appoint') {
      if (!platformAdmin && !(reviewer?.role === 'college_admin' && reviewer.status === 'approved' && reviewer.collegeId === applicant.collegeId && applicant.role !== 'college_admin' && data.role !== 'college_admin' && applicant.userId !== user.id)) throw new HttpError(403, 'Only authorized administrators can appoint this role.');
      if (applicant.status !== 'approved') throw new HttpError(400, 'Approve the identity before assigning a staff role.');
      await db.update(tables.memberships).set({ role: data.role }).where(eq(tables.memberships.id, applicant.id));
      await audit(user.id, `role_assigned_${data.role}`, applicant.userId, applicant.collegeId);
      return { message: 'Role updated.' };
    }
    if (!platformAdmin && (!reviewer || !canReviewMembership(reviewer, applicant))) throw new HttpError(403, 'You cannot verify this membership.');
    if (applicant.status !== 'pending') throw new HttpError(409, 'This request has already been reviewed.');
    if (data.decision === 'approved' && !applicant.proofId) throw new HttpError(400, 'Verification proof is required.');
    if (data.decision === 'rejected' && !data.reason.trim()) throw new HttpError(400, 'Include a reason so the applicant can correct their application.');
    await db.update(tables.memberships).set({ status: data.decision, reason: data.reason, reviewedBy: user.id }).where(and(eq(tables.memberships.id, applicant.id), eq(tables.memberships.status, 'pending')));
    await audit(user.id, `verification_${data.decision}`, applicant.userId, applicant.collegeId);
    await notify(applicant.userId, `College verification ${data.decision}`, data.reason || 'Your campus access is ready. Welcome to Yuvann.');
    return { message: `Membership ${data.decision}.` };
  }
  if (data.action === 'project') {
    await db.insert(tables.projects).values({ userId: user.id, title: data.title, description: data.description, url: data.url });
    return { message: 'Project added to your portfolio.' };
  }
  if (data.action === 'notification-read') {
    await db.update(tables.notifications).set({ read: true }).where(and(eq(tables.notifications.id, data.id), eq(tables.notifications.userId, user.id)));
    return { message: 'Notification marked as read.' };
  }
  if (data.action === 'follow') {
    const [college] = await db.select().from(tables.colleges).where(and(eq(tables.colleges.id, data.collegeId), eq(tables.colleges.verified, true)));
    if (!college) throw new HttpError(404, 'College not found.');
    const [existing] = await db.select().from(tables.follows).where(and(eq(tables.follows.userId, user.id), eq(tables.follows.collegeId, data.collegeId)));
    if (existing) await db.delete(tables.follows).where(eq(tables.follows.id, existing.id));
    else await db.insert(tables.follows).values({ userId: user.id, collegeId: data.collegeId }).onConflictDoNothing();
    return { message: existing ? 'College unfollowed.' : 'Following this college.' };
  }
  if (data.action === 'delete-proof') {
    const [file] = await db.select().from(tables.files).where(and(eq(tables.files.id, data.fileId), eq(tables.files.ownerId, user.id), eq(tables.files.purpose, 'proof')));
    if (!file) throw new HttpError(404, 'Proof not found.');
    const member = await getMembership(user.id);
    if (member?.status === 'pending' && member.proofId === file.id) throw new HttpError(409, 'Proof cannot be deleted while its verification is pending.');
    await getStore('yuvann-private-files').delete(file.blobKey);
    await db.update(tables.files).set({ deletedAt: new Date() }).where(eq(tables.files.id, file.id));
    await audit(user.id, 'proof_deleted', file.id, file.collegeId);
    return { message: 'Verification document deleted.' };
  }
  const member = await requireMember(user.id);
  const collegeId = member.collegeId;
  if (data.action === 'unit') {
    if (member.role !== 'college_admin') throw new HttpError(403, 'College administrator access is required.');
    if (data.parentId) {
      const [parent] = await db.select().from(tables.academicUnits).where(and(eq(tables.academicUnits.id, data.parentId), eq(tables.academicUnits.collegeId, collegeId)));
      if (!parent) throw new HttpError(400, 'Choose a parent in your college.');
    }
    await db.insert(tables.academicUnits).values({ collegeId, parentId: data.parentId, kind: data.kind, name: data.name });
    return { message: 'Academic structure updated.' };
  }
  if (data.action === 'group') {
    requireStaff(member.role);
    if (member.role === 'hod' && data.department !== member.department) throw new HttpError(403, 'Create groups only in your department.');
    if (data.policy === 'branch_restricted' && !data.branch) throw new HttpError(400, 'A branch is required for a restricted group.');
    if (data.policy === 'semester_restricted' && (!data.branch || !data.semester)) throw new HttpError(400, 'Branch and semester are required.');
    const [group] = await db.insert(tables.groups).values({ ...data, collegeId, ownerId: user.id }).returning();
    await db.insert(tables.groupMembers).values({ groupId: group.id, userId: user.id, status: 'approved' });
    return { message: 'Group created.' };
  }
  if (data.action === 'join') {
    const [group] = await db.select().from(tables.groups).where(eq(tables.groups.id, data.groupId));
    if (!group || !canJoinGroup(member, group)) throw new HttpError(403, 'Your verified college, branch, semester, or section does not match this group.');
    if (group.policy === 'invite_only') throw new HttpError(403, 'This group requires an invitation from its owner.');
    const status = group.policy === 'teacher_approval' ? 'pending' : 'approved';
    await db.insert(tables.groupMembers).values({ groupId: group.id, userId: user.id, status }).onConflictDoUpdate({ target: [tables.groupMembers.groupId, tables.groupMembers.userId], set: { status } });
    return { message: status === 'pending' ? 'Join request sent to the group owner.' : 'You joined the group.' };
  }
  if (data.action === 'group-review' || data.action === 'invite') {
    requireStaff(member.role);
    let groupId: string;
    if (data.action === 'group-review') {
      const [requestRow] = await db.select().from(tables.groupMembers).where(eq(tables.groupMembers.id, data.groupMemberId));
      if (!requestRow) throw new HttpError(404, 'Request not found.');
      groupId = requestRow.groupId;
      const group = await requireGroupMember(user.id, groupId);
      if (group.ownerId !== user.id && member.role !== 'college_admin') throw new HttpError(403, 'Only the group owner can review requests.');
      const applicant = await requireMember(requestRow.userId);
      if (!canJoinGroup(applicant, group)) throw new HttpError(403, 'The member does not match this group.');
      await db.update(tables.groupMembers).set({ status: data.decision }).where(eq(tables.groupMembers.id, requestRow.id));
      await notify(requestRow.userId, `Group request ${data.decision}`, group.name);
    } else {
      groupId = data.groupId;
      const group = await requireGroupMember(user.id, groupId);
      if (group.ownerId !== user.id && member.role !== 'college_admin') throw new HttpError(403, 'Only the group owner can send invitations.');
      const applicant = await requireMember(data.userId);
      if (!canJoinGroup(applicant, group)) throw new HttpError(403, 'The member does not match this group.');
      await db.insert(tables.groupMembers).values({ groupId, userId: data.userId, status: 'approved' }).onConflictDoUpdate({ target: [tables.groupMembers.groupId, tables.groupMembers.userId], set: { status: 'approved' } });
      await notify(data.userId, 'Group invitation', `You have been added to ${group.name}.`);
    }
    await audit(user.id, data.action, groupId, collegeId);
    return { message: 'Group membership updated.' };
  }
  if (data.action === 'post') {
    if (data.category === 'official' || data.pinned || data.priority === 'important') requireStaff(member.role);
    await db.insert(tables.posts).values({ collegeId, authorId: user.id, title: data.title, body: data.body, category: data.category, pinned: data.pinned, priority: data.priority, expiresAt: data.expiresAt });
    return { message: 'Published to your college.' };
  }
  if (data.action === 'react' || data.action === 'comment') {
    const [post] = await db.select().from(tables.posts).where(and(eq(tables.posts.id, data.postId), eq(tables.posts.collegeId, collegeId)));
    if (!post) throw new HttpError(404, 'Post not found.');
    if (data.action === 'comment') {
      await db.insert(tables.comments).values({ postId: post.id, authorId: user.id, body: data.body });
      if (post.authorId !== user.id) await notify(post.authorId, 'New comment', post.title);
    } else {
      const [reaction] = await db.select().from(tables.reactions).where(and(eq(tables.reactions.postId, post.id), eq(tables.reactions.userId, user.id), eq(tables.reactions.kind, data.kind)));
      if (reaction && data.kind === 'like') await db.delete(tables.reactions).where(eq(tables.reactions.id, reaction.id));
      else if (!reaction) await db.insert(tables.reactions).values({ postId: post.id, userId: user.id, kind: data.kind }).onConflictDoNothing();
    }
    return { message: data.action === 'comment' ? 'Comment added.' : 'Updated.' };
  }
  if (data.action === 'note') {
    await ownedFile(data.fileId, user.id, collegeId, 'note');
    await db.insert(tables.notes).values({ ...data, collegeId, authorId: user.id });
    return { message: 'Note shared with your college.' };
  }
  if (data.action === 'event') {
    requireStaff(member.role);
    if (data.startsAt <= new Date() || data.deadline > data.startsAt || data.deadline <= new Date()) throw new HttpError(400, 'Use future dates with registration closing before the event.');
    await db.insert(tables.events).values({ ...data, collegeId, organizerId: user.id });
    return { message: 'Event published.' };
  }
  if (data.action === 'register') {
    await db.transaction(async (transaction) => {
      const [event] = await transaction.select().from(tables.events).where(eq(tables.events.id, data.eventId)).for('update');
      if (!event || (event.visibility !== 'public' && event.collegeId !== collegeId)) throw new HttpError(404, 'Event not found.');
      if (event.deadline < new Date()) throw new HttpError(400, 'Registration is closed.');
      const [existing] = await transaction.select().from(tables.registrations).where(and(eq(tables.registrations.eventId, event.id), eq(tables.registrations.userId, user.id)));
      if (existing) throw new HttpError(409, 'You are already registered.');
      const [total] = await transaction.select({ total: count() }).from(tables.registrations).where(eq(tables.registrations.eventId, event.id));
      if (total.total >= event.capacity) throw new HttpError(409, 'This event is full.');
      await transaction.insert(tables.registrations).values({ eventId: event.id, userId: user.id });
      await transaction.insert(tables.notifications).values({ userId: user.id, title: 'Registration confirmed', body: `${event.title} · ${event.venue}` });
    });
    return { message: 'You are registered. Confirmation is in your notifications.' };
  }
  if (data.action === 'assignment') {
    requireStaff(member.role);
    const group = await requireGroupMember(user.id, data.groupId);
    if (group.ownerId !== user.id && member.role !== 'college_admin') throw new HttpError(403, 'Create assignments only in groups you manage.');
    if (data.dueAt <= new Date()) throw new HttpError(400, 'Choose a future due date.');
    await db.insert(tables.assignments).values({ ...data, collegeId, teacherId: user.id });
    const joined = await db.select().from(tables.groupMembers).where(and(eq(tables.groupMembers.groupId, group.id), eq(tables.groupMembers.status, 'approved'))).limit(1000);
    if (joined.length) await db.insert(tables.notifications).values(joined.map((person) => ({ userId: person.userId, title: 'New assignment', body: `${data.title} · Due ${data.dueAt.toLocaleDateString('en-IN')}` })));
    return { message: 'Assignment created and group members notified.' };
  }
  if (data.action === 'submit') {
    if (member.role !== 'student') throw new HttpError(403, 'Only students can submit assignments.');
    const [assignment] = await db.select().from(tables.assignments).where(and(eq(tables.assignments.id, data.assignmentId), eq(tables.assignments.collegeId, collegeId)));
    if (!assignment) throw new HttpError(404, 'Assignment not found.');
    await requireGroupMember(user.id, assignment.groupId);
    await ownedFile(data.fileId, user.id, collegeId, 'submission');
    await db.insert(tables.submissions).values({ assignmentId: assignment.id, studentId: user.id, fileId: data.fileId }).onConflictDoUpdate({ target: [tables.submissions.assignmentId, tables.submissions.studentId], set: { fileId: data.fileId, submittedAt: new Date(), marks: null, feedback: '' } });
    await notify(assignment.teacherId, 'Assignment submitted', assignment.title);
    return { message: new Date() > assignment.dueAt ? 'Submitted after the deadline; recorded as late.' : 'Assignment submitted.' };
  }
  if (data.action === 'grade') {
    requireStaff(member.role);
    const [submission] = await db.select().from(tables.submissions).where(eq(tables.submissions.id, data.submissionId));
    if (!submission) throw new HttpError(404, 'Submission not found.');
    const [assignment] = await db.select().from(tables.assignments).where(and(eq(tables.assignments.id, submission.assignmentId), eq(tables.assignments.collegeId, collegeId)));
    if (!assignment || (assignment.teacherId !== user.id && member.role !== 'college_admin')) throw new HttpError(403, 'Only the assigned teacher can grade this work.');
    if (data.marks > assignment.maxMarks) throw new HttpError(400, 'Marks cannot exceed the assignment maximum.');
    await db.update(tables.submissions).set({ marks: data.marks, feedback: data.feedback }).where(eq(tables.submissions.id, submission.id));
    await notify(submission.studentId, 'Assignment reviewed', `${assignment.title}: ${data.marks}/${assignment.maxMarks}. ${data.feedback}`);
    await audit(user.id, 'submission_graded', submission.id, collegeId);
    return { message: 'Marks and feedback saved.' };
  }
  if (data.action === 'attendance') {
    requireStaff(member.role);
    const group = await requireGroupMember(user.id, data.groupId);
    if (group.ownerId !== user.id && member.role !== 'college_admin') throw new HttpError(403, 'Record attendance only for your classes.');
    const student = await requireMember(data.studentId);
    if (student.collegeId !== collegeId || student.role !== 'student') throw new HttpError(400, 'Choose a verified student in this college.');
    await requireGroupMember(data.studentId, group.id);
    if (data.date > new Date().toISOString().slice(0, 10) || Number.isNaN(Date.parse(data.date))) throw new HttpError(400, 'Attendance cannot be recorded for a future or invalid date.');
    await db.insert(tables.attendance).values({ ...data, collegeId, teacherId: user.id }).onConflictDoUpdate({ target: [tables.attendance.groupId, tables.attendance.studentId, tables.attendance.date], set: { present: data.present, teacherId: user.id } });
    await audit(user.id, 'attendance_recorded', data.studentId, collegeId);
    return { message: 'Attendance saved.' };
  }
  if (data.action === 'message') {
    const recipient = await requireMember(data.recipientId);
    if (recipient.collegeId !== collegeId || recipient.userId === user.id) throw new HttpError(403, 'Messages are limited to other verified members of your college.');
    await db.insert(tables.messages).values({ collegeId, senderId: user.id, recipientId: data.recipientId, body: data.body });
    await notify(data.recipientId, 'New campus message', 'Open Messages to read it.');
    return { message: 'Message sent.' };
  }
  throw new HttpError(400, 'Unknown action.');
}

async function upload(request: Request) {
  sameOrigin(request);
  const user = await requireUser();
  const form = await request.formData();
  const file = form.get('file');
  const collegeId = z.string().uuid().parse(form.get('collegeId'));
  const purpose = z.enum(['proof', 'note', 'submission']).parse(form.get('purpose'));
  if (!(file instanceof File) || !file.size || file.size > 4 * 1024 * 1024) throw new HttpError(400, 'Choose a PDF, PNG or JPEG file smaller than 4 MB.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = validFileType(bytes);
  if (!mime || file.type !== mime) throw new HttpError(400, 'The file content must match its PDF, PNG or JPEG type.');
  const [college] = await db.select().from(tables.colleges).where(and(eq(tables.colleges.id, collegeId), eq(tables.colleges.verified, true)));
  if (!college) throw new HttpError(400, 'Select a verified college.');
  if (purpose !== 'proof') {
    const member = await requireMember(user.id);
    if (member.collegeId !== collegeId) throw new HttpError(403, 'Files must belong to your approved college.');
  }
  const [quota] = await db.select({ total: count() }).from(tables.files).where(and(eq(tables.files.ownerId, user.id), isNull(tables.files.deletedAt)));
  if (quota.total >= 100) throw new HttpError(429, 'Your file limit has been reached. Contact your college administrator.');
  const blobKey = `${purpose}/${crypto.randomUUID()}`;
  const store = getStore('yuvann-private-files');
  await store.set(blobKey, bytes.buffer);
  try {
    const [record] = await db.insert(tables.files).values({ ownerId: user.id, collegeId, purpose, blobKey, name: file.name.replace(/[^\p{L}\p{N}._ -]/gu, '_').slice(0, 150), mime, size: file.size }).returning({ id: tables.files.id });
    await audit(user.id, `file_uploaded_${purpose}`, record.id, collegeId);
    return json(record, 201);
  } catch (error) {
    await store.delete(blobKey);
    throw error;
  }
}

async function download(fileId: string) {
  const user = await requireUser();
  z.string().uuid().parse(fileId);
  const [file] = await db.select().from(tables.files).where(and(eq(tables.files.id, fileId), isNull(tables.files.deletedAt)));
  if (!file) throw new HttpError(404, 'File not found or deleted under the retention policy.');
  let allowed = file.ownerId === user.id;
  if (!allowed && file.purpose === 'proof') {
    const reviewer = await getMembership(user.id);
    const applicant = await getMembership(file.ownerId);
    allowed = Boolean(applicant && applicant.proofId === file.id && (user.roles?.includes('platform_admin') || (reviewer && canReviewMembership(reviewer, applicant))));
  }
  if (!allowed && file.purpose === 'note') {
    const member = await requireMember(user.id);
    const [note] = await db.select({ id: tables.notes.id }).from(tables.notes).where(eq(tables.notes.fileId, file.id)).limit(1);
    allowed = Boolean(note && member.collegeId === file.collegeId);
  }
  if (!allowed && file.purpose === 'submission') {
    const member = await requireMember(user.id);
    const [submission] = await db.select({ teacherId: tables.assignments.teacherId, collegeId: tables.assignments.collegeId }).from(tables.submissions).innerJoin(tables.assignments, eq(tables.submissions.assignmentId, tables.assignments.id)).where(eq(tables.submissions.fileId, file.id)).limit(1);
    allowed = Boolean(submission && submission.collegeId === member.collegeId && (submission.teacherId === user.id || member.role === 'college_admin'));
  }
  if (!allowed) throw new HttpError(403, 'You do not have permission to download this document.');
  const buffer = await getStore('yuvann-private-files').get(file.blobKey, { type: 'arrayBuffer' });
  if (!buffer) throw new HttpError(404, 'Document is no longer available.');
  await audit(user.id, 'file_downloaded', file.id, file.collegeId);
  return new Response(buffer, { headers: { 'Content-Type': file.mime, 'Content-Disposition': `attachment; filename="document.${file.mime === 'application/pdf' ? 'pdf' : file.mime === 'image/png' ? 'png' : 'jpg'}"`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "sandbox; default-src 'none'" } });
}

export default async (request: Request) => {
  try {
    const path = new URL(request.url).pathname;
    if (Number(request.headers.get('content-length') || 0) > 5 * 1024 * 1024) throw new HttpError(413, 'Request is too large.');
    if (request.method === 'GET' && path === '/api/network') {
      const colleges = await db.select().from(tables.colleges).where(eq(tables.colleges.verified, true)).orderBy(tables.colleges.name).limit(200);
      const events = await db.select({ id: tables.events.id, collegeId: tables.events.collegeId, title: tables.events.title, description: tables.events.description, category: tables.events.category, startsAt: tables.events.startsAt, deadline: tables.events.deadline, venue: tables.events.venue, capacity: tables.events.capacity, collegeName: tables.colleges.name }).from(tables.events).innerJoin(tables.colleges, eq(tables.events.collegeId, tables.colleges.id)).where(and(eq(tables.events.visibility, 'public'), eq(tables.colleges.verified, true), sql`${tables.events.startsAt} > now()`)).orderBy(tables.events.startsAt).limit(100);
      return json({ colleges, events });
    }
    if (request.method === 'GET' && path === '/api/session') {
      const user = await getUser();
      if (!user) return json({ user: null });
      await requireUser();
      const [profile] = await db.select().from(tables.profiles).where(eq(tables.profiles.id, user.id));
      const member = await getMembership(user.id);
      const notifications = await db.select().from(tables.notifications).where(eq(tables.notifications.userId, user.id)).orderBy(desc(tables.notifications.createdAt)).limit(100);
      const projects = await db.select().from(tables.projects).where(eq(tables.projects.userId, user.id)).limit(100);
      const follows = await db.select().from(tables.follows).where(eq(tables.follows.userId, user.id)).limit(200);
      return json({ user: { id: user.id, name: user.name, email: user.email, platformAdmin: user.roles?.includes('platform_admin') ?? false }, profile, member: member || null, notifications, projects, follows });
    }
    if (request.method === 'GET' && path === '/api/campus') {
      const user = await requireUser();
      return json(await campusData(user.id));
    }
    if (request.method === 'GET' && path === '/api/platform') {
      const user = await requireUser();
      if (!user.roles?.includes('platform_admin')) throw new HttpError(403, 'Platform administrator access is required.');
      const colleges = await db.select().from(tables.colleges).limit(200);
      const requests = await db.select({ ...getTableColumns(tables.memberships), name: tables.profiles.name }).from(tables.memberships).innerJoin(tables.profiles, eq(tables.memberships.userId, tables.profiles.id)).limit(500);
      const logs = await db.select().from(tables.auditLogs).orderBy(desc(tables.auditLogs.createdAt)).limit(100);
      return json({ colleges, requests, logs });
    }
    if (request.method === 'GET' && path.startsWith('/api/files/')) return await download(path.slice('/api/files/'.length));
    if (request.method === 'GET' && path.startsWith('/api/portfolio/')) {
      const userId = decodeURIComponent(path.slice('/api/portfolio/'.length));
      const [profile] = await db.select({ name: tables.profiles.name, bio: tables.profiles.bio, skills: tables.profiles.skills }).from(tables.profiles).where(and(eq(tables.profiles.id, userId), eq(tables.profiles.portfolioPublic, true)));
      if (!profile) throw new HttpError(404, 'This portfolio is private or unavailable.');
      const projects = await db.select({ title: tables.projects.title, description: tables.projects.description, url: tables.projects.url }).from(tables.projects).where(eq(tables.projects.userId, userId)).limit(100);
      return json({ profile, projects });
    }
    if (request.method === 'POST' && path === '/api/actions') return json(await act(request));
    if (request.method === 'POST' && path === '/api/upload') return await upload(request);
    return json({ error: 'Endpoint not found.' }, 404);
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    if (error instanceof z.ZodError || error instanceof SyntaxError) return json({ error: 'Invalid request. Check the form fields and try again.' }, 400);
    return json({ error: 'The service is temporarily unavailable. Please retry after deployment finishes.' }, 503);
  }
};

export const config: Config = { path: '/api/*' };
