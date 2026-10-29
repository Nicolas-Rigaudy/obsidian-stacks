import "./obsidian-shim.ts";
import { QuickAddModal } from "../../src/views/quickAdd.ts";
import { settings } from "./harness.ts";
const q = new URLSearchParams(location.search);
document.body.classList.add("theme-dark");
const created: string[] = [];
const host: any = {
	settings,
	app: { vault: { getFileByPath: () => null } },
	actions: { createNote: async (folder: string, name: string, content: string) => { created.push(folder + "/" + name + ".md\n" + content); return { basename: name }; } },
};
const m = new QuickAddModal(host.app, host, q.get("lib") ?? "book", q.get("cat") ?? undefined) as any;
m.open();
m.query = q.get("q") ?? "";
(async () => {
	await m.search();
	await new Promise((r) => setTimeout(r, 2500));
	if (q.get("pick")) {
		const first = m.contentEl.querySelector(".stacks-result") as HTMLElement;
		const list = [...m.contentEl.querySelectorAll(".stacks-result-title")].map((e: any) => e.textContent);
		console.log("RESULTS", JSON.stringify(list.slice(0, 5)));
		first.click();
		for (let i = 0; i < 40 && created.length === 0; i++) await new Promise((r) => setTimeout(r, 500));
		console.log("CREATED\n" + (created[0] ?? "(nothing)"));
	}
	(window as any).__ready = true;
})();
