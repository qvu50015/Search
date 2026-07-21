import { Octokit } from "octokit";

const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

export async function fetchRepoFiles(
    token: string,
    repoId: string,
    branch: string,
): Promise<{path: string; content: string}[]>{
    const [owner, repo] = repoId.split('/')
    const octokit = new Octokit({auth: token})

    const {data: tree} = await octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: branch,
        recursive: 'true',
    })

    const paths = tree.tree
    .filter((n) => n.type === 'blob')
    .filter((n) => EXTENSIONS.some((ext) => n.path?.endsWith(ext)))
    .filter((n) => !n.path?.includes('node_modules'))
    .filter((n) => !n.path?.endsWith('.d.ts'))
    .filter((n) => (n.size ?? 0) < 300_000)
    .map((n) => n.path!);

    const files: {path: string; content: string}[] = [];
    const CONCURRENCY = 15;

    for(let i = 0; i < paths.length; i += CONCURRENCY){
        const batch = paths.slice(i, i + CONCURRENCY);
        const results = await Promise.all(batch.map(async (path) => {
            const { data } = await octokit.rest.repos.getContent({owner, repo, path})
            if ('content' in data){
                return{
                    path,
                    content: Buffer.from(data.content, 'base64').toString("utf-8")
                }
            }
            return null;
        })
    )
    files.push(...(results.filter(Boolean) as {path: string; content: string}[]))
    }
    return files;

}