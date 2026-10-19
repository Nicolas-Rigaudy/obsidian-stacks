// Opens once: the first of several signals (cache resolved, startup fallback,
// manual rescan) wins, later ones are no-ops. Pure.

export class ReadyGate {
	private opened = false;
	private readonly onOpen: () => void;

	constructor(onOpen: () => void) {
		this.onOpen = onOpen;
	}

	get isOpen(): boolean {
		return this.opened;
	}

	/** Open the gate. True if this call opened it. */
	open(): boolean {
		if (this.opened) return false;
		this.opened = true;
		this.onOpen();
		return true;
	}
}
