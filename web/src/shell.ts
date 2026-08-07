/**
 * The AI-Chat shell interactions (from the claude.ai/design "QuranKu AI Chat"):
 * the collapsible sidebar and the "Obrolan baru" reset. Presentation only — routing,
 * threading, and answering stay in main.ts and its modules. Self-initialises on import
 * because the module script runs after the shell markup is in the DOM.
 */
import { clearThread } from "./thread.ts";

const shell = document.getElementById("shell");
const MOBILE = "(max-width: 820px)";

/** Toggle the sidebar. On phones it starts closed (the panel is full-bleed). */
function setNav(open: boolean): void {
  shell?.setAttribute("data-nav", open ? "open" : "closed");
}
function toggleNav(): void {
  setNav(shell?.getAttribute("data-nav") !== "open");
}

document.getElementById("side-toggle")?.addEventListener("click", toggleNav);
document.getElementById("panel-toggle")?.addEventListener("click", toggleNav);

// "Obrolan baru" — a genuinely fresh chat: clear the stored thread, return to the empty
// landing. Reload keeps this correct against main.ts's thread-restore without re-implementing it.
document.getElementById("newchat")?.addEventListener("click", () => {
  clearThread();
  if (location.hash === "#/" || location.hash === "") location.reload();
  else location.hash = "#/";
});

// On phones, choosing a destination closes the overlay sidebar.
if (window.matchMedia(MOBILE).matches) {
  setNav(false);
  for (const a of document.querySelectorAll("#sidebar .qk-nav a, #newchat")) {
    a.addEventListener("click", () => setNav(false));
  }
}

// ⌘K / Ctrl-K → new chat, matching the sidebar hint.
window.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    document.getElementById("newchat")?.dispatchEvent(new MouseEvent("click"));
  }
});
