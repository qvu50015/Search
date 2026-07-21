import { chunkFile } from '@/lib/chunker';

const fake = Array.from({ length: 100 }, (_, i) => `line ${i + 1}`).join('\n');
console.log(chunkFile(fake, 'test.ts').map(c => `${c.startLine}-${c.endLine}`));