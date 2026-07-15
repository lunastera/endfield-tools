import { fileURLToPath } from "node:url";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

/** Determine the base path for GitHub Pages */
function getBasePath(): string | undefined {
  const repo = process.env.GITHUB_REPOSITORY?.split("/").pop();
  return repo ? `/${repo}/` : undefined;
}

export default defineConfig(() => {
  return {
    base: getBasePath(),
    // Mirror the tsconfig "~/*" path alias for the dev server resolver.
    resolve: {
      alias: { "~": fileURLToPath(new URL("./app", import.meta.url)) },
    },
    plugins: [tailwindcss(), reactRouter()],
    test: {
      environment: "node",
      include: ["app/**/*.test.ts"],
    },
  };
});
