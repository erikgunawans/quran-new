/**
 * The time-aware greeting under the salam.
 *
 * The app notices what time it is for the reader — and at 2am it says so, because someone
 * opening a Qur'an app at 2am is not browsing. That is the whole product in one line.
 *
 * The name is optional and lives ONLY on this device (see ISA § Out of Scope: no user accounts,
 * no sync, no server-side session). A greeting is not worth an identity.
 */

const NAME_KEY = "newquranku:nama";

export interface Greeting {
  /** the line as rendered */
  text: string;
  /** which band of the day produced it — the unit of test, since text is a formatting detail */
  band: "dini-hari" | "pagi" | "siang" | "sore" | "malam";
}

/** Reads the on-device name. Storage can throw (Safari private mode); a greeting must never break boot. */
export function readName(): string | null {
  try {
    const n = localStorage.getItem(NAME_KEY)?.trim();
    return n ? n : null;
  } catch {
    return null;
  }
}

export function saveName(name: string): void {
  try {
    const n = name.trim();
    if (n) localStorage.setItem(NAME_KEY, n);
    else localStorage.removeItem(NAME_KEY);
  } catch {
    /* a name that will not persist is not a reason to fail */
  }
}

/**
 * Indonesian greeting bands. Note `dini-hari` is not "selamat pagi" — nobody says that at 2am,
 * and saying it to someone who cannot sleep would be tone-deaf. It asks instead.
 */
export function greeting(now: Date, name: string | null = readName()): Greeting {
  const h = now.getHours();
  const suffix = name ? `, ${name}` : "";

  if (h >= 0 && h < 4) {
    return { band: "dini-hari", text: name ? `Belum bisa tidur${suffix}?` : "Belum bisa tidur?" };
  }
  if (h >= 4 && h < 11) return { band: "pagi", text: `Selamat pagi${suffix}` };
  if (h >= 11 && h < 15) return { band: "siang", text: `Selamat siang${suffix}` };
  if (h >= 15 && h < 18) return { band: "sore", text: `Selamat sore${suffix}` };
  return { band: "malam", text: `Selamat malam${suffix}` };
}

/** Paints the greeting and keeps it honest across a midnight rollover or a backgrounded tab. */
export function mountGreeting(el: HTMLElement, clock: () => Date = () => new Date()): () => void {
  const paint = () => {
    el.textContent = greeting(clock()).text;
  };
  paint();

  // A phone left open overnight must not still say "Selamat malam" at 6am.
  const id = setInterval(paint, 60_000);
  const onVisible = () => {
    if (document.visibilityState === "visible") paint();
  };
  document.addEventListener("visibilitychange", onVisible);

  return () => {
    clearInterval(id);
    document.removeEventListener("visibilitychange", onVisible);
  };
}
