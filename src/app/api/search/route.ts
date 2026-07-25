
  // src/app/api/search/route.ts
  import { auth } from '@/lib/auth';
  import { db } from '@/db';
  import { chunks, repos } from '@/db/schema';
  import { and, eq, inArray, sql } from 'drizzle-orm';
  import { cosineDistance } from 'drizzle-orm';
  import { headers } from 'next/headers';
  import { embed } from '@/lib/embed';

  export async function POST(req: Request){
    const session = await auth.api.getSession({headers: await headers()});
    if(!session) return Response.json({error:'unauthorized'}, {status: 401})

    const {query, repoId, limit} = await req.json()
    if (typeof query !=='string' || !query.trim()){
        return Response.json({error: 'Invalid body'}, {status: 400});

    }
    // scope search to repos the user owns

    const userRepos = await db
    .select({id: repos.id})
    .from(repos)
    .where(eq(repos.userId, session.user.id))

    let scopedIds = userRepos.map((r) => r.id)
    if (typeof repoId === 'string'){    
        scopedIds = scopedIds.filter((id) => id === repoId)
    }

    if (scopedIds.length === 0) return Response.json({results: []})

    const queryVectors = await embed(query)
    const distance = cosineDistance(chunks.embedding, queryVectors)

    const results = await db
    .select({
        repoId: chunks.repoId,
        filePath: chunks.filePath,
        startLine: chunks.startLine,
        endLine: chunks.endLine,
        code: chunks.code,
        similarity: sql<number>`1 - (${distance})`,
    })
    .from(chunks)
    .where(inArray(chunks.repoId, scopedIds))
    .orderBy(distance)
    .limit(typeof limit === 'number' ? Math.min(limit, 50) : 20)

    return Response.json({results});
    
  }