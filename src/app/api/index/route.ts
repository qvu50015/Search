// app/api/index/route.ts
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { account, repos, chunks } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { fetchRepoFiles } from '@/lib/github';
import { chunkFile } from '@/lib/chunker';
import { embedBatch } from '@/lib/embed';

export async function POST(req: Request) {
  //auth for the index req bih 
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  //validate input
  const { repoId, defaultBranch } = await req.json();
  if (typeof repoId !== 'string' || typeof defaultBranch !== 'string') {
    return Response.json({ error: 'Invalid body' }, { status: 400 });
  }

  // get gihhub token
  const [gh] = await db
    .select()
    .from(account)
    .where(and(eq(account.userId, session.user.id), eq(account.providerId, 'github')))
    .limit(1);

  if (!gh?.accessToken) {
    return Response.json({ error: 'No GitHub token' }, { status: 401 });
  }

  // 4. reset previous indexes if reindex
  await db.delete(repos).where(eq(repos.id, repoId));
  await db.insert(repos).values({
    id: repoId,
    userId: session.user.id,
    defaultBranch,
    status: 'running',
  });

  try {
    // fetch chunk
    const files = await fetchRepoFiles(gh.accessToken, repoId, defaultBranch);
    const allChunks = files.flatMap((f) => chunkFile(f.content, f.path));

    if (allChunks.length === 0) {
      await db.update(repos)
        .set({ status: 'complete', chunksCount: 0 })
        .where(eq(repos.id, repoId));
      return Response.json({ ok: true, chunks: 0 });
    }

    //embed
    const vectors = await embedBatch(allChunks.map((c) => c.code));

    // store (use batches to stay in postgres limits.)
    const INSERT_BATCH = 500;
    for (let i = 0; i < allChunks.length; i += INSERT_BATCH) {
      await db.insert(chunks).values(
        allChunks.slice(i, i + INSERT_BATCH).map((c, j) => ({
          repoId,
          filePath: c.filePath,
          startLine: c.startLine,
          endLine: c.endLine,
          code: c.code,
          embedding: vectors[i + j],
        })),
      );
    }

    // mark it complete.
    await db.update(repos)
      .set({ status: 'complete', chunksCount: allChunks.length })
      .where(eq(repos.id, repoId));

    return Response.json({ ok: true, chunks: allChunks.length });
  } catch (err) {
    //if error, marked failed.
    await db.update(repos)
      .set({ status: 'failed', error: err instanceof Error ? err.message : String(err) })
      .where(eq(repos.id, repoId));
    return Response.json({ error: 'Indexing failed' }, { status: 500 });
  }
}