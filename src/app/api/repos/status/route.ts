// src/app/api/repos/status/route.ts
// optimizing the indexing button to show status quicker

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { repos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const dbRepos = await db
    .select({
      id: repos.id,
      status: repos.status,
      chunksCount: repos.chunksCount,
    })
    .from(repos)
    .where(eq(repos.userId, session.user.id));

  return Response.json({ repos: dbRepos });
}
