import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const sourceDir = path.join(root, 'extension');
const distDir = path.join(root, 'dist');
const targetDir = path.join(distDir, 'extension');

await mkdir(distDir, { recursive: true });
await rm(targetDir, { recursive: true, force: true });
await cp(sourceDir, targetDir, { recursive: true });

console.log(`Copied extension to ${targetDir}`);
