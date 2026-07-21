import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const BATCH = 100;
  const out: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH) {
    const res = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts.slice(i, i + BATCH).map((t) => t.slice(0, 25_000)),
    });
    out.push(...res.data.map((d) => d.embedding));
  }

  return out;
}

export async function embed(text: string): Promise<number[]> {
  const [vector] = await embedBatch([text]);
  return vector;
}   