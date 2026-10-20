// Groups rapid changes to the same key into one burst that settles after a
// quiet period: ten quick +10 clicks on a note give one log line and one Undo
// back to where the first click started. Pure: the caller supplies the timers.

export interface Timers {
	set(fn: () => void, ms: number): unknown;
	clear(handle: unknown): void;
}

interface Open<F, L> {
	first: F;
	last: L;
	timer: unknown;
}

export class Bursts<F, L> {
	private readonly open = new Map<string, Open<F, L>>();
	private readonly quietMs: number;
	private readonly onSettle: (key: string, first: F, last: L) => void;
	private readonly timers: Timers;

	constructor(quietMs: number, onSettle: (key: string, first: F, last: L) => void, timers: Timers) {
		this.quietMs = quietMs;
		this.onSettle = onSettle;
		this.timers = timers;
	}

	/** Record one change. `first` is kept only when this starts a burst; `last` always replaces the previous one. */
	add(key: string, first: F, last: L): void {
		const current = this.open.get(key);
		if (current) this.timers.clear(current.timer);
		const timer = this.timers.set(() => this.flush(key), this.quietMs);
		this.open.set(key, { first: current ? current.first : first, last, timer });
	}

	/** Is a burst open for this key (would `add` continue it)? */
	has(key: string): boolean {
		return this.open.has(key);
	}

	/** Settle this key's burst now, if one is open. */
	flush(key: string): void {
		const b = this.open.get(key);
		if (!b) return;
		this.timers.clear(b.timer);
		this.open.delete(key);
		this.onSettle(key, b.first, b.last);
	}

	/** Settle every open burst now (unload). */
	flushAll(): void {
		for (const key of [...this.open.keys()]) this.flush(key);
	}
}
