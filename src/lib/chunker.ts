// src/lib/chunker.ts

export type Chunk = {
  filePath: string;
  startLine: number;
  endLine: number;
  code: string;
};

//size = 40(how many lines per chunk)
//overlap = 10, how many lines each chunk shares with previous one.

export function chunkFile(
    source: string,
    filePath: string,
    size = 40,
    overlap = 10,
): Chunk[] {
    const lines = source.split('\n');
    const chunk: Chunk[] = [];
    const step = size - overlap;

    for (let i = 0; i < lines.length; i += step){
        const end = Math.min(i + size, lines.length);
        const code = lines.slice(i, end).join('\n');
        // Skip empty / whitespace-only chunks — the embeddings API rejects
        // empty strings (common with 0-byte files like Python's __init__.py).
        if (code.trim()) {
            chunk.push({ filePath, startLine: i + 1, endLine: end, code });
        }
        if (end === lines.length) break;
    }
    return chunk;
}