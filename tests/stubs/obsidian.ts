// Runtime stand-ins for the few `obsidian` exports LiveIndex uses (tests only).

type Callback = (...data: unknown[]) => unknown;
export interface EventRef { name: string; callback: Callback }

export class Events {
	private handlers = new Map<string, Callback[]>();
	on(name: string, callback: Callback): EventRef {
		this.handlers.set(name, [...(this.handlers.get(name) ?? []), callback]);
		return { name, callback };
	}
	offref(ref: EventRef): void {
		this.handlers.set(ref.name, (this.handlers.get(ref.name) ?? []).filter((c) => c !== ref.callback));
	}
	trigger(name: string, ...data: unknown[]): void {
		for (const c of this.handlers.get(name) ?? []) c(...data);
	}
}

export function debounce(fn: () => void, ms: number): () => void {
	let timer: ReturnType<typeof setTimeout> | undefined;
	return () => {
		clearTimeout(timer);
		timer = setTimeout(fn, ms);
	};
}
