// Undo for frontmatter changes: remember exactly what a write overwrote, put
// it back later. Pure.

export interface FieldSnapshot {
	/** Previous values of keys that existed. */
	values: Record<string, unknown>;
	/** Keys that didn't exist before (removed on undo). */
	absent: string[];
}

/** Record the current state of `keys` (call inside processFrontMatter, before changing anything). */
export function snapshotFields(fm: Record<string, unknown>, keys: readonly string[]): FieldSnapshot {
	const snap: FieldSnapshot = { values: {}, absent: [] };
	for (const k of keys) {
		if (!k) continue;
		if (Object.prototype.hasOwnProperty.call(fm, k)) snap.values[k] = structuredClone(fm[k]);
		else snap.absent.push(k);
	}
	return snap;
}

/** Put the recorded state back (inside processFrontMatter). */
export function restoreFields(fm: Record<string, unknown>, snap: FieldSnapshot): void {
	for (const [k, v] of Object.entries(snap.values)) fm[k] = structuredClone(v);
	for (const k of snap.absent) delete fm[k];
}

/** Remove the last `- line` entry (the one the undone action appended). */
export function removeLastLogLine(content: string, line: string): string {
	const lines = content.split("\n");
	for (let i = lines.length - 1; i >= 0; i--) {
		if (lines[i] === `- ${line}`) {
			lines.splice(i, 1);
			return lines.join("\n");
		}
	}
	return content;
}
