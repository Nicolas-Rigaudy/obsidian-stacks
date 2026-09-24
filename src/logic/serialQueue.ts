// Per-key serialization: writes to the same note run one after another, in
// click order. Two quick +10 clicks give +20, each against the value the
// previous write left. Pure.

export class SerialQueue {
	private readonly tails = new Map<string, Promise<unknown>>();

	run<T>(key: string, task: () => Promise<T>): Promise<T> {
		const previous = this.tails.get(key) ?? Promise.resolve();
		const result = previous.then(task, task);
		const tail = result.then(
			() => undefined,
			() => undefined,
		);
		this.tails.set(key, tail);
		void tail.then(() => {
			if (this.tails.get(key) === tail) this.tails.delete(key);
		});
		return result;
	}

	/** Keys with work queued or running. */
	get size(): number {
		return this.tails.size;
	}
}
