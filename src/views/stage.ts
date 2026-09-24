// The in-progress "stage" at the top of the Shelf and Up next, per library look:
// books → the reading desk; games → the devices they're played on; films → a TV.

import { secondaryLine } from "../logic/cardText.ts";
import { compareShelfOrder } from "../logic/shelf.ts";
import { stageDevices, type DeviceSlot } from "../logic/stage.ts";
import { bucketOf, firstStatusOf } from "../logic/upNext.ts";
import type { MediaTypeConfig, StatusDef } from "../types/mediaConfig.ts";
import type { MediaNote } from "../types/mediaNote.ts";
import { renderDesk } from "./desk.ts";
import { acceptNoteDrops, makeInteractive, resolveCover, type StacksHost } from "./shared.ts";

export interface StageOptions {
	libraryId: string;
	/** Renderer root, for drag state. */
	root: HTMLElement;
	/** Accept dropped notes and start them. */
	droppable: boolean;
	/** Which item each screen features when several are in progress (kept across re-renders). */
	featured: Map<string, string>;
	/** Re-render after switching the featured item. */
	refresh: () => void;
}

export function renderStage(parent: HTMLElement, host: StacksHost, config: MediaTypeConfig, notes: readonly MediaNote[], opts: StageOptions): void {
	if (config.appearance === "books") {
		renderDesk(parent, host, config, notes, {
			libraryId: opts.libraryId,
			root: opts.root,
			emptyText: "Nothing in progress. Drag one onto the desk to start it.",
			droppable: opts.droppable,
		});
		return;
	}
	const activeStatus = config.statuses.find((s) => s.bucket === "active");
	if (!activeStatus) return;
	const section = parent.createDiv({ cls: `stacks-section stacks-stage is-${config.appearance}` });
	const active = notes.filter((n) => bucketOf(n.status, config) === "active");
	const h = section.createDiv({ cls: "stacks-heading" });
	h.createSpan({ text: `${activeStatus.label || activeStatus.value} now` });
	if (active.length > 0) h.createSpan({ cls: "stacks-heading-count", text: String(active.length) });

	if (config.appearance === "games") renderDevices(section, host, config, notes, opts);
	else renderTv(section, host, config, active.sort(compareShelfOrder), opts);

	if (opts.droppable) {
		const start = firstStatusOf(config, "active");
		acceptNoteDrops(section, (path) => {
			const note = host.index.get(opts.libraryId).find((n) => n.path === path);
			if (start && note && bucketOf(note.status, config) !== "active") void host.actions.changeStatus(path, config, start);
		});
	}
}

/**
 * A screen showing one item: its cover blurred behind as backlight, the art in
 * front, a title bar; tiles to switch when several are in progress; "off" when
 * nothing is.
 */
function renderScreen(parent: HTMLElement, host: StacksHost, config: MediaTypeConfig, items: MediaNote[], key: string, idleText: string, opts: StageOptions): MediaNote | null {
	const screen = parent.createDiv({ cls: "stacks-screen" });
	if (items.length === 0) {
		screen.addClass("is-off");
		screen.createDiv({ cls: "stacks-screen-idle", text: idleText });
		return null;
	}
	const featuredPath = opts.featured.get(key);
	const current = items.find((n) => n.path === featuredPath) ?? items[0];
	const src = resolveCover(host.app, current);
	if (src) {
		screen.createDiv({ cls: "stacks-screen-glow" }).style.setProperty("background-image", `url("${src.replace(/"/g, "%22")}")`);
		screen.createEl("img", { cls: "stacks-screen-art", attr: { src, alt: current.title, draggable: "false" } });
	} else {
		screen.addClass("is-blank");
	}
	const bar = screen.createDiv({ cls: "stacks-screen-bar" });
	bar.createDiv({ cls: "stacks-screen-title", text: current.title });
	const sub = secondaryLine(current, config);
	if (sub) bar.createDiv({ cls: "stacks-screen-sub", text: sub });
	makeInteractive(screen, host, config, current);

	if (items.length > 1) {
		const tiles = screen.createDiv({ cls: "stacks-screen-tiles" });
		for (const n of items) {
			const tile = tiles.createEl("button", { cls: "stacks-screen-tile", attr: { "aria-label": `Show ${n.title}` } });
			tile.toggleClass("is-current", n === current);
			const t = resolveCover(host.app, n);
			if (t) tile.createEl("img", { attr: { src: t, alt: "", draggable: "false" } });
			else tile.setText(n.title.slice(0, 1));
			tile.addEventListener("click", (evt) => {
				evt.stopPropagation();
				opts.featured.set(key, n.path);
				opts.refresh();
			});
		}
	}
	return current;
}

/** Buttons that end the session: every done/other status except the wishlist-like ones before active. */
function endStatuses(config: MediaTypeConfig): StatusDef[] {
	const activeAt = config.statuses.findIndex((s) => s.bucket === "active");
	return config.statuses.filter((s, i) => i > activeAt && (s.bucket === "done" || s.bucket === "other"));
}

function renderEndButtons(parent: HTMLElement, host: StacksHost, config: MediaTypeConfig, note: MediaNote, cls: string): void {
	for (const s of endStatuses(config)) {
		const b = parent.createEl("button", { cls: `${cls} is-${s.bucket}`, text: s.label || s.value });
		b.setAttr("aria-label", `${note.title}: mark ${(s.label || s.value).toLowerCase()}`);
		b.addEventListener("click", () => void host.actions.changeStatus(note.path, config, s.value));
	}
}

function renderDevices(section: HTMLElement, host: StacksHost, config: MediaTypeConfig, notes: readonly MediaNote[], opts: StageOptions): void {
	const row = section.createDiv({ cls: "stacks-devices" });
	for (const slot of stageDevices(notes, config)) renderDevice(row, host, config, slot, opts);
}

function renderDevice(row: HTMLElement, host: StacksHost, config: MediaTypeConfig, slot: DeviceSlot, opts: StageOptions): void {
	const wrap = row.createDiv({ cls: `stacks-device-wrap is-${slot.kind}` });
	const device = wrap.createDiv({ cls: `stacks-device is-${slot.kind}` });
	const key = `device:${slot.platform}`;
	const idle = "Drag a game here to play";

	let current: MediaNote | null = null;
	if (slot.kind === "switch") {
		device.createDiv({ cls: "stacks-joycon is-left" }).createDiv({ cls: "stacks-joycon-stick" });
		const body = device.createDiv({ cls: "stacks-switch-body" });
		current = renderScreen(body, host, config, slot.playing, key, idle, opts);
		device.createDiv({ cls: "stacks-joycon is-right" }).createDiv({ cls: "stacks-joycon-stick" });
	} else if (slot.kind === "handheld") {
		current = renderScreen(device.createDiv({ cls: "stacks-handheld-bezel" }), host, config, slot.playing, key, idle, opts);
		const pad = device.createDiv({ cls: "stacks-handheld-pad" });
		pad.createDiv({ cls: "stacks-dpad" });
		const ab = pad.createDiv({ cls: "stacks-ab" });
		ab.createDiv({ cls: "stacks-ab-btn" });
		ab.createDiv({ cls: "stacks-ab-btn" });
	} else {
		current = renderScreen(device.createDiv({ cls: "stacks-monitor" }), host, config, slot.playing, key, idle, opts);
		device.createDiv({ cls: "stacks-monitor-neck" });
		device.createDiv({ cls: "stacks-monitor-base" });
	}

	const caption = wrap.createDiv({ cls: "stacks-device-caption" });
	caption.createDiv({ cls: "stacks-device-name", text: slot.platform });
	if (current) renderEndButtons(caption.createDiv({ cls: "stacks-device-buttons" }), host, config, current, "stacks-pad-btn");
}

function renderTv(section: HTMLElement, host: StacksHost, config: MediaTypeConfig, active: MediaNote[], opts: StageOptions): void {
	const room = section.createDiv({ cls: "stacks-tv-room" });
	const tv = room.createDiv({ cls: "stacks-tv" });
	const current = renderScreen(tv.createDiv({ cls: "stacks-tv-bezel" }), host, config, active, "tv", "No signal · drag something here to watch it", opts);
	tv.createDiv({ cls: "stacks-tv-led" }).toggleClass("is-on", current !== null);
	room.createDiv({ cls: "stacks-tv-console" });
	if (current) {
		const remote = room.createDiv({ cls: "stacks-remote" });
		remote.createDiv({ cls: "stacks-remote-dot" });
		renderEndButtons(remote, host, config, current, "stacks-remote-btn");
	}
}
