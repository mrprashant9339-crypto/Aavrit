import { pgTable, text, timestamp, uuid, integer, boolean, uniqueIndex, index, jsonb } from 'drizzle-orm/pg-core';

export const colleges = pgTable('colleges', {
  id: uuid().defaultRandom().primaryKey(),
  name: text().notNull(),
  city: text().notNull(),
  kind: text().notNull().default('College'),
  about: text().notNull().default(''),
  verified: boolean().notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const profiles = pgTable('profiles', {
  id: text().primaryKey(),
  name: text().notNull(),
  bio: text().notNull().default(''),
  skills: text().array().notNull().default([]),
  portfolioPublic: boolean('portfolio_public').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const academicUnits = pgTable('academic_units', {
  id: uuid().defaultRandom().primaryKey(),
  collegeId: uuid('college_id').notNull().references(() => colleges.id, { onDelete: 'cascade' }),
  parentId: uuid('parent_id'),
  kind: text().notNull(),
  name: text().notNull(),
});

export const files = pgTable('files', {
  id: uuid().defaultRandom().primaryKey(),
  ownerId: text('owner_id').notNull().references(() => profiles.id),
  collegeId: uuid('college_id').notNull().references(() => colleges.id),
  purpose: text().notNull(),
  blobKey: text('blob_key').notNull().unique(),
  name: text().notNull(),
  mime: text().notNull(),
  size: integer().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const memberships = pgTable('memberships', {
  id: uuid().defaultRandom().primaryKey(),
  userId: text('user_id').notNull().references(() => profiles.id),
  collegeId: uuid('college_id').notNull().references(() => colleges.id),
  role: text().notNull().default('student'),
  status: text().notNull().default('pending'),
  department: text().notNull().default(''),
  branch: text().notNull().default(''),
  semester: text().notNull().default(''),
  section: text().notNull().default(''),
  unitId: uuid('unit_id').references(() => academicUnits.id),
  proofId: uuid('proof_id').references(() => files.id),
  reason: text().notNull().default(''),
  reviewedBy: text('reviewed_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex('membership_user_unique').on(table.userId), index('membership_college_index').on(table.collegeId)]);

export const groups = pgTable('groups', {
  id: uuid().defaultRandom().primaryKey(),
  collegeId: uuid('college_id').notNull().references(() => colleges.id),
  ownerId: text('owner_id').notNull().references(() => profiles.id),
  name: text().notNull(),
  description: text().notNull().default(''),
  kind: text().notNull().default('class'),
  policy: text().notNull().default('college_verified'),
  department: text().notNull().default(''),
  branch: text().notNull().default(''),
  semester: text().notNull().default(''),
  section: text().notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const groupMembers = pgTable('group_members', {
  id: uuid().defaultRandom().primaryKey(),
  groupId: uuid('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => profiles.id),
  status: text().notNull().default('pending'),
}, (table) => [uniqueIndex('group_member_unique').on(table.groupId, table.userId)]);

export const posts = pgTable('posts', {
  id: uuid().defaultRandom().primaryKey(),
  collegeId: uuid('college_id').notNull().references(() => colleges.id),
  authorId: text('author_id').notNull().references(() => profiles.id),
  category: text().notNull().default('discussion'),
  title: text().notNull(),
  body: text().notNull(),
  pinned: boolean().notNull().default(false),
  priority: text().notNull().default('normal'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index('posts_college_index').on(table.collegeId)]);

export const reactions = pgTable('reactions', {
  id: uuid().defaultRandom().primaryKey(),
  postId: uuid('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => profiles.id),
  kind: text().notNull(),
}, (table) => [uniqueIndex('reaction_unique').on(table.postId, table.userId, table.kind)]);

export const comments = pgTable('comments', {
  id: uuid().defaultRandom().primaryKey(),
  postId: uuid('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  authorId: text('author_id').notNull().references(() => profiles.id),
  body: text().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const notes = pgTable('notes', {
  id: uuid().defaultRandom().primaryKey(),
  collegeId: uuid('college_id').notNull().references(() => colleges.id),
  authorId: text('author_id').notNull().references(() => profiles.id),
  fileId: uuid('file_id').notNull().references(() => files.id),
  title: text().notNull(),
  subject: text().notNull(),
  branch: text().notNull().default(''),
  semester: text().notNull().default(''),
  unit: text().notNull().default(''),
  chapter: text().notNull().default(''),
  description: text().notNull().default(''),
  tags: text().array().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const events = pgTable('events', {
  id: uuid().defaultRandom().primaryKey(),
  collegeId: uuid('college_id').notNull().references(() => colleges.id),
  organizerId: text('organizer_id').notNull().references(() => profiles.id),
  title: text().notNull(),
  description: text().notNull(),
  category: text().notNull().default('Workshop'),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  deadline: timestamp({ withTimezone: true }).notNull(),
  venue: text().notNull(),
  visibility: text().notNull().default('campus'),
  capacity: integer().notNull().default(100),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const registrations = pgTable('registrations', {
  id: uuid().defaultRandom().primaryKey(),
  eventId: uuid('event_id').notNull().references(() => events.id),
  userId: text('user_id').notNull().references(() => profiles.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex('registration_unique').on(table.eventId, table.userId)]);

export const assignments = pgTable('assignments', {
  id: uuid().defaultRandom().primaryKey(),
  collegeId: uuid('college_id').notNull().references(() => colleges.id),
  teacherId: text('teacher_id').notNull().references(() => profiles.id),
  groupId: uuid('group_id').notNull().references(() => groups.id),
  title: text().notNull(),
  description: text().notNull(),
  subject: text().notNull(),
  dueAt: timestamp('due_at', { withTimezone: true }).notNull(),
  maxMarks: integer('max_marks').notNull().default(100),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const submissions = pgTable('submissions', {
  id: uuid().defaultRandom().primaryKey(),
  assignmentId: uuid('assignment_id').notNull().references(() => assignments.id),
  studentId: text('student_id').notNull().references(() => profiles.id),
  fileId: uuid('file_id').notNull().references(() => files.id),
  marks: integer(),
  feedback: text().notNull().default(''),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex('submission_unique').on(table.assignmentId, table.studentId)]);

export const attendance = pgTable('attendance', {
  id: uuid().defaultRandom().primaryKey(),
  collegeId: uuid('college_id').notNull().references(() => colleges.id),
  groupId: uuid('group_id').notNull().references(() => groups.id),
  teacherId: text('teacher_id').notNull().references(() => profiles.id),
  studentId: text('student_id').notNull().references(() => profiles.id),
  date: text().notNull(),
  present: boolean().notNull(),
}, (table) => [uniqueIndex('attendance_unique').on(table.groupId, table.studentId, table.date)]);

export const messages = pgTable('messages', {
  id: uuid().defaultRandom().primaryKey(),
  collegeId: uuid('college_id').notNull().references(() => colleges.id),
  senderId: text('sender_id').notNull().references(() => profiles.id),
  recipientId: text('recipient_id').notNull().references(() => profiles.id),
  body: text().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const notifications = pgTable('notifications', {
  id: uuid().defaultRandom().primaryKey(),
  userId: text('user_id').notNull().references(() => profiles.id),
  title: text().notNull(),
  body: text().notNull(),
  read: boolean().notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const projects = pgTable('projects', {
  id: uuid().defaultRandom().primaryKey(),
  userId: text('user_id').notNull().references(() => profiles.id),
  title: text().notNull(),
  description: text().notNull(),
  url: text().notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const follows = pgTable('follows', {
  id: uuid().defaultRandom().primaryKey(),
  userId: text('user_id').notNull().references(() => profiles.id),
  collegeId: uuid('college_id').notNull().references(() => colleges.id),
}, (table) => [uniqueIndex('follow_unique').on(table.userId, table.collegeId)]);

export const auditLogs = pgTable('audit_logs', {
  id: uuid().defaultRandom().primaryKey(),
  actorId: text('actor_id').notNull(),
  collegeId: uuid('college_id').references(() => colleges.id),
  action: text().notNull(),
  targetId: text('target_id').notNull(),
  details: jsonb().$type<Record<string, string>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
