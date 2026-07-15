import type { Config } from "@react-router/dev/config";

/** Determine the base path for GitHub Pages */
function getBasePath(): string | undefined {
  const repo = process.env.GITHUB_REPOSITORY?.split("/").pop();
  return repo ? `/${repo}/` : undefined;
}

// The 404.html SPA fallback for GitHub Pages is created by
// scripts/copy-404.mjs as a post-build step (see the build npm script).
export default {
  ssr: false,
  basename: getBasePath() ?? "/",
  splitRouteModules: true,
} satisfies Config;
