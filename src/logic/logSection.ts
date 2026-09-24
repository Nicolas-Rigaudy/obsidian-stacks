// Activity-log lines in a note body. Port of Reading.md's appendLog/insertLine,
// rewritten line-based. Pure: zero `obsidian` imports.

/** Fill `{name}` placeholders. Unknown placeholders are left as-is. */
export function formatLogLine(template: string, vars: Record<string, string | number>): string {
	return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));
}

function escapeRegExp(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const isBlank = (line: string) => line.trim() === "";
const endsSection = (line: string) => /^#{1,2}\s/.test(line);

/**
 * Append `- line` as the last entry of the `## heading` section.
 * - Skips an HTML comment directly under the heading (the template's usage hint).
 * - The section ends at the next `#`/`##` heading; `###` subheadings stay inside it.
 * - Inserts after the section's last non-blank line, so blank lines before the
 *   next heading are kept.
 * - If the heading is missing, appends a new section at the end of the note.
 */
export function insertLogLine(content: string, heading: string, line: string): string {
	const entry = `- ${line}`;
	const lines = content.split("\n");
	const headingRe = new RegExp(`^##\\s+${escapeRegExp(heading.trim())}\\s*$`);
	const h = lines.findIndex((l) => headingRe.test(l));

	if (h === -1) {
		const trimmed = content.replace(/\n+$/, "");
		return `${trimmed === "" ? "" : `${trimmed}\n\n`}## ${heading.trim()}\n${entry}\n`;
	}

	let start = h + 1;
	if (start < lines.length && lines[start].trimStart().startsWith("<!--")) {
		let c = start;
		while (c < lines.length && !lines[c].includes("-->")) c++;
		start = Math.min(c + 1, lines.length);
	}

	let end = start;
	while (end < lines.length && !endsSection(lines[end])) end++;

	let at = end;
	while (at > start && isBlank(lines[at - 1])) at--;

	lines.splice(at, 0, entry);
	return lines.join("\n");
}
