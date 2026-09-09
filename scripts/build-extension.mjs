import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';

const root = process.cwd();
const sourceDir = path.join(root, 'extension');
const distDir = path.join(root, 'dist');
const targetDir = path.join(distDir, 'extension');

await mkdir(distDir, { recursive: true });
await rm(targetDir, { recursive: true, force: true });
await cp(sourceDir, targetDir, { recursive: true });

// Inject build version indicator into dist/extension/build-info.js
try {
  const sha = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
  const buildId = `b${Date.now()}`.slice(-6);
  await writeBuildInfo(targetDir, branch, sha, buildId);
} catch {
  // If git fails (e.g., not a repo), keep existing placeholder
}

async function writeBuildInfo(targetDir, branch, sha, buildId) {
  await mkdir(targetDir, { recursive: true });
  const content = `// Build-time injected information\\n\\nexport const BUILD_INFO = {\\n  branch: '${branch}',\\n  sha: '${sha}',\\n  id: '${buildId}',\\n};\\n`;
  await writeFile(path.join(targetDir, 'build-info.js'), content, 'utf8');
}

function writeFile(filePath, content, encoding) {
  return new Promise((resolve, reject) => {
    const fs = require('node:fs');
    fs.writeFile(filePath, content, encoding, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

console.log(`Copied extension to ${targetDir}`);
