// Fails unless the release tag, package.json, manifest.json and versions.json
// agree. Usage: node scripts/check-release.mjs [tag]. Also used by the tests.

import { readFileSync } from "node:fs";

/** The files a release carries; the workflow attaches exactly these. */
export const RELEASE_ASSETS = ["main.js", "manifest.json", "styles.css"];

/**
 * Problems with how the release files line up (empty list = consistent).
 * @param {{ tag?: string, pkg: any, manifest: any, versions: Record<string, string> }} files
 */
export function releaseProblems({ tag, pkg, manifest, versions }) {
	const problems = [];
	if (manifest.version !== pkg.version) problems.push(`manifest.json is ${manifest.version} but package.json is ${pkg.version}`);
	if (tag !== undefined && tag !== manifest.version) problems.push(`tag ${tag} is not the manifest version ${manifest.version}`);
	if (versions[manifest.version] !== manifest.minAppVersion) {
		problems.push(`versions.json has ${versions[manifest.version] ?? "no entry"} for ${manifest.version}, manifest minAppVersion is ${manifest.minAppVersion}`);
	}
	const keys = Object.keys(versions);
	if (keys.length > 0 && keys[keys.length - 1] !== manifest.version) problems.push(`the last versions.json entry is ${keys[keys.length - 1]}, not ${manifest.version}`);
	return problems;
}

const read = (file) => JSON.parse(readFileSync(new URL(`../${file}`, import.meta.url), "utf8"));

if (import.meta.url === `file://${process.argv[1]}`) {
	const problems = releaseProblems({ tag: process.argv[2], pkg: read("package.json"), manifest: read("manifest.json"), versions: read("versions.json") });
	for (const p of problems) console.error(`release check: ${p}`);
	process.exit(problems.length > 0 ? 1 : 0);
}
