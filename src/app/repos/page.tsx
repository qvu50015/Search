'use client';

import { useQuery } from "@tanstack/react-query";

type Repo = {
  id: string;
  name: string;
  owner: string;
  private: boolean;
  language: string | null;
};

export default function ReposPage(){
    //fetch repos
    const {data, isLoading, error} = useQuery({
        queryKey: ['repos'],
        queryFn: async () => {
            //response
            const res = await fetch('api/repos');
            if(!res.ok){
                throw new Error('Failed to load repos');
            }
            return res.json() as Promise <{repos: Repo[]}>;
        },
    });

    if(isLoading) return <div>Returning repos...</div>
    if(error) return <div>Something went wrong.</div>


    return(
        <main>
            <h1>Your repositories</h1>
            <ul>
                {data?.repos.map((repo) => (
                    <li key={repo.id}>
                        {repo.id} {repo.private && '(private)'} - {repo.language ?? 'unknown'}
                    </li>
                ))}
            </ul>
        </main>
    )
}
