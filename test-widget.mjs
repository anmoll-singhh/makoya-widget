import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";

const coreJs = readFileSync("./makoya/packages/widget/dist/core.js", "utf8");

// Simulate a real page that includes core.js with a data-site attribute (auto-init path)
const dom = new JSDOM(
  `<!doctype html><html><body><h1>Test site</h1>
   <script data-site="demo-123" data-color="#e11d48"></script>
   </body></html>`,
  { runScripts: "dangerously", pretendToBeVisual: true, url: "https://example.com" }
);

const { window } = dom;
// inject core.js into the page context
const s = window.document.createElement("script");
s.textContent = coreJs;
// place it as currentScript-like: append after the data-site script
window.document.body.appendChild(s);

// give microtasks a tick
await new Promise((r) => setTimeout(r, 50));

const root = window.document.getElementById("makoya-widget-root");
console.log("1. widget root mounted:", !!root);
const shadow = root && root.shadowRoot;
console.log("2. shadow root attached:", !!shadow);
const btn = shadow && shadow.querySelector(".mky-btn");
console.log("3. launcher button exists:", !!btn);
console.log("4. button aria-label:", btn && btn.getAttribute("aria-label"));
const panel = shadow && shadow.querySelector(".mky-panel");
console.log("5. panel exists:", !!panel);
const toggles = shadow ? shadow.querySelectorAll(".mky-toggle, .mky-step, .mky-row").length : 0;
console.log("6. feature controls rendered:", toggles);

// simulate click to open
if (btn) {
  btn.dispatchEvent(new window.Event("click"));
  console.log("7. panel open after click:", panel.classList.contains("open"));
  console.log("8. aria-expanded:", btn.getAttribute("aria-expanded"));
}

// double-init guard test: inject core.js again
const s2 = window.document.createElement("script");
s2.textContent = coreJs;
window.document.body.appendChild(s2);
await new Promise((r) => setTimeout(r, 20));
const roots = window.document.querySelectorAll("#makoya-widget-root").length;
console.log("9. double-init guard (should stay 1):", roots);

const pass = root && shadow && btn && panel && roots === 1;
console.log("\n" + (pass ? "✅ WIDGET RENDERS CORRECTLY" : "❌ SOMETHING FAILED"));
