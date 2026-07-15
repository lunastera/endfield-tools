// SPA fallback for GitHub Pages: it serves 404.html for unknown paths, so a
// direct visit / reload on a sub-route (e.g. /weapon-essence) still loads the app.
// This runs as a separate build step because react-router < 8.2 generates
// index.html after the buildEnd hook, so the copy cannot happen there.
import { copyFileSync } from "node:fs";

copyFileSync("build/client/index.html", "build/client/404.html");
console.log("Copied build/client/index.html -> build/client/404.html");
