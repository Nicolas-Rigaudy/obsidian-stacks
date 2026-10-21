import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { RELEASE_ASSETS, releaseProblems } from "../scripts/check-release.mjs";

const read = (file: string) => JSON.parse(readFileSync(new URL(`../${file}`, import.meta.url), "utf8"));
const ok = { tag: "0.2.0", pkg: { version: "0.2.0" }, manifest: { version: "0.2.0", minAppVersion: "1.13.0" }, versions: { "0.1.0": "1.13.0", "0.2.0": "1.13.0" } };

describe("release consistency", () => {
	test("the repo's own files line up", () => {
		assert.deepEqual(releaseProblems({ pkg: read("package.json"), manifest: read("manifest.json"), versions: read("versions.json") }), []);
	});
	test("consistent files, no problems", () => {
		assert.deepEqual(releaseProblems(ok), []);
	});
	test("a tag with a v prefix, or another version, is refused", () => {
		assert.equal(releaseProblems({ ...ok, tag: "v0.2.0" }).length, 1);
		assert.equal(releaseProblems({ ...ok, tag: "0.3.0" }).length, 1);
	});
	test("manifest and package must agree", () => {
		assert.ok(releaseProblems({ ...ok, pkg: { version: "0.1.9" } }).some((p: string) => /package\.json/.test(p)));
	});
	test("versions.json must carry the manifest version with its minAppVersion, last", () => {
		assert.equal(releaseProblems({ ...ok, versions: { "0.1.0": "1.13.0" } }).length >= 1, true);
		assert.equal(releaseProblems({ ...ok, versions: { "0.1.0": "1.13.0", "0.2.0": "1.0.0" } }).length, 1);
		assert.equal(releaseProblems({ ...ok, versions: { "0.2.0": "1.13.0", "0.1.0": "1.13.0" } }).length, 1);
	});
});

describe("release workflow", () => {
	const workflow = readFileSync(new URL("../.github/workflows/release.yml", import.meta.url), "utf8");
	const ci = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");

	test("triggers on bare x.y.z tags only", () => {
		assert.match(workflow, /tags:\s*\n\s*- "\[0-9\]\+\.\[0-9\]\+\.\[0-9\]\+"/);
		assert.doesNotMatch(workflow, /v\[0-9\]/);
	});
	test("drafts a release with exactly the three assets", () => {
		assert.deepEqual(RELEASE_ASSETS, ["main.js", "manifest.json", "styles.css"]);
		assert.ok(workflow.includes(`${RELEASE_ASSETS.join(" ")} --draft`));
	});
	test("checks consistency, tests and builds before releasing", () => {
		const order = ["check-release.mjs", "npm test", "npm run build", "gh release create"].map((s) => workflow.indexOf(s));
		assert.ok(order.every((i) => i >= 0));
		assert.deepEqual([...order].sort((a, b) => a - b), order);
	});
	test("CI runs lint, tests and build on pull requests", () => {
		assert.match(ci, /pull_request:/);
		for (const step of ["npm run lint", "npm test", "npm run build"]) assert.ok(ci.includes(step), step);
	});
});
