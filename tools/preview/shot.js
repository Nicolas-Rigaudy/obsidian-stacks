const { app, BrowserWindow } = require("electron");
const fs = require("fs");
const path = require("path");
const shots = JSON.parse(process.env.SHOTS);
app.whenReady().then(async () => {
	for (const s of shots) {
		const win = new BrowserWindow({ width: s.w, height: s.h, show: false, webPreferences: { offscreen: true, webSecurity: false } });
		win.webContents.on("console-message", (_e, _l, msg) => { if (/^(RESULTS|CREATED|NOTICE)/.test(msg)) console.log(msg); });
		await win.loadFile(path.join(__dirname, s.page || "index.html"), { query: s.query }).catch((e) => console.log("load:", e.message));
		for (let i = 0; i < 80; i++) {
			if (await win.webContents.executeJavaScript("window.__ready === true")) break;
			await new Promise((r) => setTimeout(r, 250));
		}
		await new Promise((r) => setTimeout(r, s.wait || 0));
		const img = await win.webContents.capturePage();
		fs.writeFileSync(path.join(__dirname, s.out), img.toPNG());
		console.log("wrote", s.out);
		win.destroy();
	}
	app.quit();
});
