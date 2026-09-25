// What the views' buttons, drags and menus do. Every write to a note goes
// through one queue per note, so rapid clicks apply in order against the value
// the previous click left (the stale-button bug can't come back from the UI side).

import { Notice, normalizePath, type App, type TFile } from "obsidian";
import { removeLastLogLine, restoreFields, snapshotFields, type FieldSnapshot } from "../logic/undo.ts";
import { SerialQueue } from "../logic/serialQueue.ts";
import { bucketOf, firstStatusOf } from "../logic/upNext.ts";
import type { MediaTypeConfig, StatusBucket } from "../types/mediaConfig.ts";
import { appendLog } from "./activityLog.ts";
import { bumpProgress, setProgress, setStatus, type ProgressChange } from "./frontmatterWriter.ts";

interface UndoEntry {
	path: string;
	/** What the change overwrote. */
	snap: FieldSnapshot;
	/** The log line it appended, removed on undo. */
	line: string | null;
}

export class LibraryActions {
	private readonly app: App;
	private readonly queue = new SerialQueue();

	constructor(app: App) {
		this.app = app;
	}

	/**
	 * Move a note to `status`; logs "Started"/"Finished" when it enters an
	 * active/done bucket; offers Undo in a toast.
	 */
	async changeStatus(path: string, config: MediaTypeConfig, status: string): Promise<void> {
		const keys = [config.statusField, config.startedField, config.finishedField, config.progress?.currentField ?? ""];
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
		await this.run(path, "update the star", async (file) => {
			await this.app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
				if (on) fm[config.starField] = true;
				else delete fm[config.starField];
			});
		});
	}

	/** Set the cover (a verified URL or vault path); offers Undo. */
	async setCover(path: string, config: MediaTypeConfig, cover: string): Promise<void> {
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
		return this.run(path, "update progress", async (file) =>
			this.logProgress(file, config, await bumpProgress(this.app, file, config, delta)),
		);
	}

	/** Set an exact value (the typed correction). */
	correct(path: string, config: MediaTypeConfig, value: number): Promise<number | null> {
		return this.run(path, "update progress", async (file) =>
			this.logProgress(file, config, await setProgress(this.app, file, config, value), "corrected"),
		);
	}

	private async logProgress(
		file: TFile,
		config: MediaTypeConfig,
		change: ProgressChange | null,
		note?: string,
	): Promise<number | null> {
		if (!change) return null;
		if (change.value !== change.previous) {
			await appendLog(this.app, file, config, { kind: "progress", value: change.value, note });
		}
		return change.value;
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
