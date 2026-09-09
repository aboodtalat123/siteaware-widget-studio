// Build-time injected information. Popped by scripts/build-extension.mjs
export const BUILD_INFO = {
  branch: process.env.BUILD_BRANCH || 'unknown',
  sha: process.env.BUILD_SHA || 'unknown',
  id: process.env.BUILD_ID || 'dev',
};