// What the views' buttons, drags and menus do. Every write to a note goes
// through one queue per note, so rapid clicks apply in order against the value
// the previous click left (the stale-button bug can't come back from the UI side).
// Progress clicks write at once but are logged and offered for undo per burst:
// ten quick clicks give one log line and one Undo back to before the first.
// A typed correction is logged and offered for undo at once, with the same toast.

import { Notice, normalizePath, type App, type TFile } from "obsidian";
import { Bursts } from "../logic/bursts.ts";
import { removeLastLogLine, restoreFields, snapshotFields, type FieldSnapshot } from "../logic/undo.ts";
import { SerialQueue } from "../logic/serialQueue.ts";
import { bucketOf, firstStatusOf } from "../logic/upNext.ts";
import type { MediaTypeConfig, StatusBucket } from "../types/mediaConfig.ts";
import { appendLog } from "./activityLog.ts";
import { bumpProgress, setProgress, setStatus } from "./frontmatterWriter.ts";

interface UndoEntry {
	path: string;
	/** What the change overwrote. */
	snap: FieldSnapshot;
	/** The log line it appended, removed on undo. */
	line: string | null;
}

/** A progress burst: what the first click overwrote, and the library it belongs to. */
interface BurstStart {
	config: MediaTypeConfig;
	snap: FieldSnapshot;
	previous: number;
}

/** Toast text for a progress change, e.g. "Mistborn: 140 pages". */
function progressMessage(basename: string, config: MediaTypeConfig, value: number): string {
	const unit = config.progress?.unitLabel ?? "";
	return `${basename}: ${value}${unit ? ` ${unit}` : ""}`;
}

/** Quiet time after the last progress click before the burst is logged and Undo is offered. */
const BURST_QUIET_MS = 1200;

export class LibraryActions {
	private readonly app: App;
	private readonly queue = new SerialQueue();
	private readonly bursts = new Bursts<BurstStart, number>(BURST_QUIET_MS, (path, start, value) => void this.settleProgress(path, start, value));

	constructor(app: App) {
		this.app = app;
	}

	/**
	 * Move a note to `status`; logs "Started"/"Finished" when it enters an
	 * active/done bucket; offers Undo in a toast.
	 */
	async changeStatus(path: string, config: MediaTypeConfig, status: string): Promise<void> {
		const keys = [config.statusField, config.startedField, config.finishedField, config.progress?.currentField ?? ""];
		this.bursts.flush(path);
		await this.run(path, "change the status", async (file) => {
			let snap: FieldSnapshot | null = null;
			const previous = await setStatus(this.app, file, config, status, undefined, (fm) => (snap = snapshotFields(fm, keys)));
			if (previous === status || !snap) return;
			const was = bucketOf(previous, config);
			const now = bucketOf(status, config);
			let line: string | null = null;
			if (now === "active" && was !== "active") line = await appendLog(this.app, file, config, { kind: "started" });
			if (now === "done" && was !== "done") line = await appendLog(this.app, file, config, { kind: "finished" });
			const label = config.statuses.find((s) => s.value === status)?.label || status;
			this.offerUndo(`${file.basename} → ${label}`, { path, snap, line });
		});
	}

	/** Star or unstar for "buy next". */
	async setStar(path: string, config: MediaTypeConfig, on: boolean): Promise<void> {
		if (!config.starField) return;
		this.bursts.flush(path);
		await this.run(path, "update the star", async (file) => {
			await this.app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
				if (on) fm[config.starField] = true;
				else delete fm[config.starField];
			});
		});
	}

	/** Set the cover (a verified URL or vault path); offers Undo. */
	async setCover(path: string, config: MediaTypeConfig, cover: string): Promise<void> {
		this.bursts.flush(path);
		await this.run(path, "change the cover", async (file) => {
			let snap: FieldSnapshot | null = null;
			await this.app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
				snap = snapshotFields(fm, [config.coverField]);
				fm[config.coverField] = cover;
			});
			if (snap) this.offerUndo(`Cover changed: ${file.basename}`, { path, snap, line: null });
		});
	}

	/** Create a note (quick add). Resolves to the file, or null. Offers Open and Undo. */
	async createNote(folder: string, fileName: string, content: string): Promise<TFile | null> {
		try {
			const dir = normalizePath(folder || "/");
			if (dir !== "/" && !this.app.vault.getFolderByPath(dir)) await this.app.vault.createFolder(dir);
			const file = await this.app.vault.create(normalizePath(`${dir === "/" ? "" : `${dir}/`}${fileName}.md`), content);
			const frag = createFragment((f) => {
				f.appendText(`Added ${file.basename}  `);
				const open = f.createEl("button", { cls: "stacks-toast-btn", text: "Open" });
				open.addEventListener("click", () => void this.app.workspace.getLeaf("tab").openFile(file));
				const undo = f.createEl("button", { cls: "stacks-toast-btn", text: "Undo" });
				undo.addEventListener("click", () => {
					void this.app.fileManager.trashFile(file);
					notice.hide();
				});
			});
			const notice = new Notice(frag, 8000);
			return file;
		} catch (err) {
			console.error("Stacks:", err);
			new Notice(`Stacks: couldn't create the note. ${err instanceof Error ? err.message : String(err)}`);
			return null;
		}
	}

	private offerUndo(message: string, entry: UndoEntry): void {
		const frag = createFragment((f) => {
			f.appendText(`${message}  `);
			const b = f.createEl("button", { cls: "stacks-toast-btn", text: "Undo" });
			b.addEventListener("click", () => {
				notice.hide();
				void this.undo(entry);
			});
		});
		const notice = new Notice(frag, 6000);
	}

	private async undo(entry: UndoEntry): Promise<void> {
		this.bursts.flush(entry.path);
		await this.run(entry.path, "undo", async (file) => {
			await this.app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => restoreFields(fm, entry.snap));
			if (entry.line) {
				const line = entry.line;
				await this.app.vault.process(file, (c) => removeLastLogLine(c, line));
			}
		});
	}

	start(path: string, config: MediaTypeConfig): Promise<void> {
		return this.toBucket(path, config, "active");
	}

	finish(path: string, config: MediaTypeConfig): Promise<void> {
		return this.toBucket(path, config, "done");
	}

	/** Add pages (negative to go back). Resolves to the new value, or null on failure. */
	bump(path: string, config: MediaTypeConfig, delta: number): Promise<number | null> {
		const field = config.progress?.currentField ?? "";
		return this.run(path, "update progress", async (file) => {
			let snap: FieldSnapshot | null = null;
			const change = await bumpProgress(this.app, file, config, delta, (fm) => (snap = snapshotFields(fm, [field])));
			if (!change || !snap) return null;
			// Logged and offered for undo once the clicks stop (see settleProgress).
			this.bursts.add(path, { config, snap, previous: change.previous }, change.value);
			return change.value;
		});
	}

	/** Write the log line and offer Undo for a finished burst of progress clicks. */
	private async settleProgress(path: string, start: BurstStart, value: number): Promise<void> {
		if (value === start.previous) return; // +10 then −10: nothing to log or undo
		await this.run(path, "log progress", async (file) => {
			const line = await appendLog(this.app, file, start.config, { kind: "progress", value });
			this.offerUndo(progressMessage(file.basename, start.config, value), { path, snap: start.snap, line });
		});
	}

	/** Log pending progress bursts now (plugin unload). */
	flushProgress(): void {
		this.bursts.flushAll();
	}

	/** Set an exact value (the typed correction); logs it and offers Undo like a burst of clicks. */
	correct(path: string, config: MediaTypeConfig, value: number): Promise<number | null> {
		const field = config.progress?.currentField ?? "";
		this.bursts.flush(path);
		return this.run(path, "update progress", async (file) => {
			let snap: FieldSnapshot | null = null;
			const change = await setProgress(this.app, file, config, value, (fm) => (snap = snapshotFields(fm, [field])));
			if (!change || !snap) return null;
			if (change.value !== change.previous) {
				const line = await appendLog(this.app, file, config, { kind: "progress", value: change.value, note: "corrected" });
				this.offerUndo(progressMessage(file.basename, config, change.value), { path, snap, line });
			}
			return change.value;
		});
	}

	private toBucket(path: string, config: MediaTypeConfig, bucket: StatusBucket): Promise<void> {
		const status = firstStatusOf(config, bucket);
		if (status === null) {
			new Notice(`Stacks: ${config.label} has no "${bucket}" status. Add one in Settings → Stacks.`);
			return Promise.resolve();
		}
		return this.changeStatus(path, config, status);
	}

	private async run<T>(path: string, what: string, task: (file: TFile) => Promise<T>): Promise<T | null> {
		try {
			return await this.queue.run(path, async () => {
				const file = this.app.vault.getFileByPath(path);
				if (!file) throw new Error(`${path} no longer exists.`);
				return task(file);
			});
		} catch (err) {
			console.error("Stacks:", err);
			new Notice(`Stacks: couldn't ${what}. ${err instanceof Error ? err.message : String(err)}`);
			return null;
		}
	}
}
