// Minimal stand-in for the `obsidian` module + the DOM helpers Obsidian adds.
type Opts = { cls?: string | string[]; text?: string; value?: string; type?: string; title?: string; placeholder?: string; href?: string; attr?: Record<string, string | number | boolean | null> } | string;
function apply(el: HTMLElement, o?: Opts) {
	if (!o) return;
	if (typeof o === "string") { el.className = o; return; }
	if (o.cls) el.className = Array.isArray(o.cls) ? o.cls.join(" ") : o.cls;
	if (o.text !== undefined) el.textContent = o.text;
	for (const k of ["value", "type", "title", "placeholder", "href"] as const) if ((o as any)[k] !== undefined) (el as any)[k] = (o as any)[k];
	if (o.attr) for (const [k, v] of Object.entries(o.attr)) if (v !== null) el.setAttribute(k, String(v));
}
const P = Node.prototype as any;
P.createEl = function (tag: string, o?: Opts) { const el = document.createElement(tag); apply(el, o); this.appendChild(el); return el; };
P.createDiv = function (o?: Opts) { return this.createEl("div", o); };
P.createSpan = function (o?: Opts) { return this.createEl("span", o); };
P.empty = function () { while (this.firstChild) this.removeChild(this.firstChild); };
const E = HTMLElement.prototype as any;
E.addClass = function (...c: string[]) { this.classList.add(...c.flatMap((x) => x.split(" ")).filter(Boolean)); };
E.removeClass = function (...c: string[]) { this.classList.remove(...c); };
E.toggleClass = function (c: string, v: boolean) { this.classList.toggle(c, v); };
E.hide = function () { this.style.display = "none"; };
E.show = function () { this.style.display = ""; };
E.setText = function (t: string) { this.textContent = t; };
E.setAttr = function (k: string, v: unknown) { if (v === null) this.removeAttribute(k); else this.setAttribute(k, String(v)); };
export class Component { load() { (this as any).onload?.(); } onload() {} registerEvent() {} addChild(c: any) { c.load(); return c; } removeChild() {} }
export class MarkdownRenderChild extends Component { containerEl: HTMLElement; constructor(el: HTMLElement) { super(); this.containerEl = el; } }
export const Keymap = { isModEvent: () => false };
export class Menu { addItem() { return this; } addSeparator() { return this; } showAtMouseEvent() {} }
const ICONS: Record<string, string> = { library: "▥", kanban: "▦", list: "☰", bookmark: "🔖" };
export function setIcon(el: HTMLElement, name: string) { el.textContent = ICONS[name] ?? "•"; }
export class Notice { constructor(m: any) { console.log("NOTICE", typeof m === "string" ? m : m.textContent); } hide() {} }

// --- quick-add / cover-picker support (harness only) ---
export function debounce<T extends unknown[]>(fn: (...a: T) => void, ms = 0) { let t: any; return (...a: T) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
export function normalizePath(p: string) { return p.replace(/\/+/g, "/").replace(/\/$/, ""); }
(window as any).createFragment = (cb: (f: DocumentFragment) => void) => { const f = document.createDocumentFragment(); cb(f); return f; };
export async function requestUrl(o: { url: string; headers?: Record<string, string> }) {
	const r = await fetch(o.url, { headers: o.headers });
	const buf = await r.arrayBuffer();
	const headers: Record<string, string> = {}; r.headers.forEach((v, k) => (headers[k] = v));
	let json: unknown = null; try { json = JSON.parse(new TextDecoder().decode(buf)); } catch {}
	return { status: r.status, headers, arrayBuffer: buf, json };
}
export class Modal {
	app: any; modalEl: HTMLElement; titleEl: HTMLElement; contentEl: HTMLElement; containerEl: HTMLElement;
	constructor(app: any) {
		this.app = app;
		this.containerEl = document.createElement("div"); this.containerEl.className = "modal-container";
		this.modalEl = this.containerEl.createDiv({ cls: "modal" });
		this.titleEl = this.modalEl.createDiv({ cls: "modal-title" });
		this.contentEl = this.modalEl.createDiv({ cls: "modal-content" });
	}
	open() { document.body.appendChild(this.containerEl); (this as any).onOpen?.(); }
	close() { (this as any).onClose?.(); this.containerEl.remove(); }
}
export class FuzzySuggestModal<T> extends Modal { setPlaceholder() {} }
