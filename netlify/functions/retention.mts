import type { Config } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { and, eq, isNull, lt, or } from 'drizzle-orm';
import { db } from '../../db';
import { files, memberships } from '../../db/schema';
import { audit } from '../../server/access';

export default async () => {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const oldFiles = await db.select({ id: files.id, blobKey: files.blobKey, collegeId: files.collegeId }).from(files).leftJoin(memberships, and(eq(memberships.userId, files.ownerId), eq(memberships.proofId, files.id))).where(and(eq(files.purpose, 'proof'), isNull(files.deletedAt), lt(files.createdAt, cutoff), or(isNull(memberships.id), eq(memberships.status, 'approved'), eq(memberships.status, 'rejected')))).limit(500);
  const store = getStore('yuvann-private-files');
  for (const file of oldFiles) {
    await store.delete(file.blobKey);
    await db.update(files).set({ deletedAt: new Date() }).where(eq(files.id, file.id));
    await audit('system', 'proof_retention_deleted', file.id, file.collegeId);
  }
  return new Response(null, { status: 204 });
};

export const config: Config = { schedule: '0 3 * * *' };
