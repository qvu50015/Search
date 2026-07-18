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
        chunk.push({
            filePath,
            startLine: i + 1,
            endLine: end,
            code: lines.slice(i, end).join('\n')
        })
        if (end === lines.length) break;
    }
    return chunk;
}