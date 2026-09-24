import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { formatLogLine, insertLogLine } from "../src/logic/logSection.ts";

// Shape of a real book note (The Traitor's Hand.md), trimmed.
const REAL = `# 📖 The Traitor's Hand

**Author:** Sandy Mitchell
**Series:** Ciaphas Cain

## Reading log
<!-- dated progress entries, newest last: \`- (pages:: N) [date:: YYYY-MM-DD]\`. -->
- Started [date:: 2026-09-23]
- (pages:: 25) [date:: 2026-09-23]
`;

describe("insertLogLine", () => {
	test("appends after the last entry of a real note", () => {
		const out = insertLogLine(REAL, "Reading log", "(pages:: 50) [date:: 2026-09-24]");
		assert.ok(out.endsWith("- (pages:: 25) [date:: 2026-09-23]\n- (pages:: 50) [date:: 2026-09-24]\n"));
	});

	test("first entry goes after the usage comment, not above it", () => {
		const fresh = "## Reading log\n<!-- hint -->\n";
		assert.equal(insertLogLine(fresh, "Reading log", "Started"), "## Reading log\n<!-- hint -->\n- Started\n");
	});

	test("multi-line comment is skipped", () => {
		const c = "## Reading log\n<!-- line one\n## not a heading\n-->\n- a\n";
		assert.equal(insertLogLine(c, "Reading log", "b"), "## Reading log\n<!-- line one\n## not a heading\n-->\n- a\n- b\n");
	});

	test("stops at the next ## heading and keeps the blank line before it", () => {
		const c = "## Reading log\n- a\n\n## Notes\ntext\n";
		assert.equal(insertLogLine(c, "Reading log", "b"), "## Reading log\n- a\n- b\n\n## Notes\ntext\n");
	});

	test("empty section directly followed by another heading", () => {
		const c = "## Reading log\n## Notes\n";
		assert.equal(insertLogLine(c, "Reading log", "a"), "## Reading log\n- a\n## Notes\n");
	});

	test("### subheadings stay inside the section", () => {
		const c = "## Reading log\n### Part 1\n- a\n## Notes\n";
		assert.equal(insertLogLine(c, "Reading log", "b"), "## Reading log\n### Part 1\n- a\n- b\n## Notes\n");
	});

	test("matches the heading exactly (### Reading log is not it)", () => {
		const c = "### Reading log\n- x\n";
		assert.equal(insertLogLine(c, "Reading log", "a"), "### Reading log\n- x\n\n## Reading log\n- a\n");
	});

	test("creates the section when missing", () => {
		assert.equal(insertLogLine("# Title\n\nBody\n", "Reading log", "a"), "# Title\n\nBody\n\n## Reading log\n- a\n");
	});

	test("empty note", () => {
		assert.equal(insertLogLine("", "Reading log", "a"), "## Reading log\n- a\n");
	});

	test("section at end of file without trailing newline", () => {
		assert.equal(insertLogLine("## Reading log\n- a", "Reading log", "b"), "## Reading log\n- a\n- b");
	});

	test("heading text with regex characters", () => {
		const c = "## Log (2026)\n- a\n";
		assert.equal(insertLogLine(c, "Log (2026)", "b"), "## Log (2026)\n- a\n- b\n");
	});
});

describe("formatLogLine", () => {
	test("fills placeholders", () => {
		assert.equal(
			formatLogLine("(pages:: {value}) [date:: {date}]", { value: 50, date: "2026-09-24" }),
			"(pages:: 50) [date:: 2026-09-24]",
		);
	});
	test("leaves unknown placeholders alone", () => {
		assert.equal(formatLogLine("{value} {unit}", { value: 3 }), "3 {unit}");
	});
});
