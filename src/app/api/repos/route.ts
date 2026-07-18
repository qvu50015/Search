import { auth } from "@/lib/auth";
import { db } from "@/db";
import { account } from "@/db/schema";
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
    
    const repos = data.map((r) => ({
        id: r.full_name,
        name: r.name,
        owner: r.owner.login,
        private: r.private,
        defaultBranch: r.default_branch,
        language: r.language,
        updatedAt: r.updated_at,
    }))

    return Response.json({ repos })
}