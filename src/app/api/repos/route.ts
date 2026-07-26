import { auth } from "@/lib/auth";
import { db } from "@/db";
import { account, repos } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { Octokit } from 'octokit';

export async function GET(){
    const session = await auth.api.getSession({
         headers: await headers()
        });
    if (!session) return Response.json({error: 'Unauthorized'}, {status: 401});
    //fetches row from acc table to get github oauth token
    const [gh] = await db
    .select()
    .from(account)
    .where(and(eq(account.userId, session.user.id), eq(account.providerId, 'github')))
    .limit(1)

    //check if gh access token present

    if(!gh?.accessToken){
        return Response.json({ error: 'No GitHub token' }, { status: 401 });
    }

    const octokit = new Octokit({auth: gh.accessToken});
    //sort data by latest updated, and the amount per page to show
    const {data} = await octokit.rest.repos.listForAuthenticatedUser({
        sort: "updated",
        per_page: 100,
    });

    const repoList = data.map((r) => ({
        id: r.full_name,
        name: r.name,
        owner: r.owner.login,
        private: r.private,
        defaultBranch: r.default_branch,
        language: r.language,
        updatedAt: r.updated_at,
    }))

    // track which repos are brand new (not already in Neon) — only those
    // need indexing kicked off; repos we've seen before keep their status
    const newlyAddedIds: string[] = [];

    // upsert each repo into Neon
    for (const repo of repoList) {
        const [existing] = await db
            .select({ id: repos.id })
            .from(repos)
            .where(eq(repos.id, repo.id));

        await db
            .insert(repos)
            .values({
                id: repo.id,
                userId: session.user.id,
                defaultBranch: repo.defaultBranch ?? 'main',
            })
            .onConflictDoUpdate({
                target: repos.id,
                set: { defaultBranch: repo.defaultBranch ?? 'main' },
            });

        if (!existing) newlyAddedIds.push(repo.id);
    }

    // fire off indexing for new repos in the background — don't await,
    // so this response doesn't hang on however long indexing takes
    const cookie = (await headers()).get('cookie') ?? '';
    for (const id of newlyAddedIds) {
        const repo = repoList.find((r) => r.id === id);
        fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/index`, {
            method: 'POST',
            headers: { cookie, 'Content-Type': 'application/json' },
            body: JSON.stringify({ repoId: id, defaultBranch: repo?.defaultBranch ?? 'main' }),
        }).catch((err) => console.error(`Failed to trigger index for ${id}:`, err));
    }

    // pull status + chunksCount back from Neon so the frontend can show
    // indexing progress, then merge with the GitHub metadata (language etc.)
    const dbRepos = await db
        .select()
        .from(repos)
        .where(eq(repos.userId, session.user.id));

    const dbById = new Map(dbRepos.map((r) => [r.id, r]));

    return Response.json({
        repos: repoList.map((repo) => ({
            id: repo.id,
            name: repo.name,
            owner: repo.owner,
            private: repo.private,
            language: repo.language,
            status: dbById.get(repo.id)?.status ?? 'pending',
            chunksCount: dbById.get(repo.id)?.chunksCount ?? 0,
        })),
    });
}
