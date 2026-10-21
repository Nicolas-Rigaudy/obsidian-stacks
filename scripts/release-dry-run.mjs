// Local rehearsal of the release workflow, without a tag or a release:
// consistency check, build, then the three assets must exist and be non-empty.
// Usage: node scripts/release-dry-run.mjs  (or: npm run release:dry-run)

import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { RELEASE_ASSETS } from "./check-release.mjs";

const root = new URL("../", import.meta.url).pathname;
const read = (file) => JSON.parse(readFileSync(`${root}${file}`, "utf8"));
const manifest = read("manifest.json");

execFileSync("node", ["scripts/check-release.mjs", manifest.version], { cwd: root, stdio: "inherit" });
execFileSync("npm", ["run", "build"], { cwd: root, stdio: "inherit" });

const missing = RELEASE_ASSETS.filter((f) => {
	try {
		return statSync(`${root}${f}`).size === 0;
	} catch {
		return true;
	}
});
if (missing.length > 0) {
	console.error(`release dry run: missing or empty: ${missing.join(", ")}`);
	process.exit(1);
}
console.log(`release dry run: ${manifest.version} ok, assets ${RELEASE_ASSETS.join(", ")}`);
