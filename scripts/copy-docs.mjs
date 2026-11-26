import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(root, 'public', 'docs');
fs.mkdirSync(target, { recursive: true });
for (const name of ['README.md', 'WORKFLOW.md', 'MODEL_CARD.md', 'SECURITY.md', 'COMPARISON.md', 'EVALUATION.md']) {
  fs.copyFileSync(path.join(root, name), path.join(target, name));
}
console.log('Documentation copied to public/docs');
