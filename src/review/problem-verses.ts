/**
 * The verses people actually arrive with.
 *
 * This is the product's hot path — the "help me with my problem" surface from the spec's
 * mission. If the primary voice (Tarjamah Tafsiriyah) is going to lead the reading
 * experience, it has to earn that on THESE verses, not on average across all 6,236.
 *
 * Curated for pastoral reach, not for theological completeness. Grouped by what a person
 * is actually feeling when they open the app at 2am.
 */

export interface ProblemVerse {
  readonly ref: readonly [surah: number, ayah: number];
  readonly theme: Theme;
  /** Why a person in this state reaches for this verse. */
  readonly why: string;
}

export type Theme =
  | "Hardship & ease"
  | "Anxiety & fear"
  | "Grief & loss"
  | "Patience"
  | "Forgiveness & despair"
  | "Provision & debt"
  | "Trust in God"
  | "Gratitude"
  | "Prayer answered"
  | "Mercy"
  | "Self-worth & purpose"
  | "Family";

export const PROBLEM_VERSES: readonly ProblemVerse[] = [
  // ── Hardship & ease — the most-reached-for verses in the Qur'an ───────────
  { ref: [94, 5], theme: "Hardship & ease", why: "\"With hardship comes ease\" — the consolation verse" },
  { ref: [94, 6], theme: "Hardship & ease", why: "The repetition that makes it a promise, not a coincidence" },
  { ref: [65, 7], theme: "Hardship & ease", why: "Allah will bring ease after difficulty" },
  { ref: [2, 286], theme: "Hardship & ease", why: "\"Allah burdens no soul beyond what it can bear\"" },
  { ref: [65, 2], theme: "Hardship & ease", why: "A way out for the one who is conscious of God" },
  { ref: [2, 214], theme: "Hardship & ease", why: "\"When will Allah's help come?\" — the cry of the tested" },

  // ── Anxiety & fear ───────────────────────────────────────────────────────
  { ref: [13, 28], theme: "Anxiety & fear", why: "Hearts find rest in the remembrance of God" },
  { ref: [3, 139], theme: "Anxiety & fear", why: "\"Do not lose heart, do not grieve\"" },
  { ref: [9, 40], theme: "Anxiety & fear", why: "\"Do not grieve — Allah is with us\"" },
  { ref: [20, 46], theme: "Anxiety & fear", why: "\"Fear not. I am with you, hearing and seeing\"" },
  { ref: [41, 30], theme: "Anxiety & fear", why: "The angels: \"do not fear, and do not grieve\"" },
  { ref: [2, 112], theme: "Anxiety & fear", why: "No fear shall be upon them, nor shall they grieve" },

  // ── Grief & loss ─────────────────────────────────────────────────────────
  { ref: [2, 156], theme: "Grief & loss", why: "Inna lillahi wa inna ilayhi raji'un — said at every death" },
  { ref: [2, 155], theme: "Grief & loss", why: "\"We will surely test you… give glad tidings to the patient\"" },
  { ref: [2, 157], theme: "Grief & loss", why: "Blessings and mercy upon those who endure" },
  { ref: [12, 86], theme: "Grief & loss", why: "Ya'qub: \"I complain of my grief only to Allah\"" },
  { ref: [3, 185], theme: "Grief & loss", why: "Every soul will taste death" },
  { ref: [21, 35], theme: "Grief & loss", why: "Tested with evil and good, as a trial" },

  // ── Patience ─────────────────────────────────────────────────────────────
  { ref: [2, 153], theme: "Patience", why: "Seek help through patience and prayer" },
  { ref: [39, 10], theme: "Patience", why: "The patient are given their reward without measure" },
  { ref: [3, 200], theme: "Patience", why: "Be patient, persevere, remain steadfast" },
  { ref: [103, 3], theme: "Patience", why: "Al-Asr — those who counsel patience" },
  { ref: [8, 46], theme: "Patience", why: "Allah is with the patient" },

  // ── Forgiveness & despair ────────────────────────────────────────────────
  { ref: [39, 53], theme: "Forgiveness & despair", why: "\"Do not despair of the mercy of Allah\" — the verse for the ashamed" },
  { ref: [3, 135], theme: "Forgiveness & despair", why: "Who forgives sins but Allah?" },
  { ref: [66, 8], theme: "Forgiveness & despair", why: "Turn to Allah in sincere repentance" },
  { ref: [24, 22], theme: "Forgiveness & despair", why: "Let them pardon and overlook" },
  { ref: [4, 110], theme: "Forgiveness & despair", why: "Whoever does wrong then seeks forgiveness" },
  { ref: [42, 25], theme: "Forgiveness & despair", why: "He accepts repentance from His servants" },

  // ── Provision & debt (Erik's own context — and most users') ──────────────
  { ref: [65, 3], theme: "Provision & debt", why: "Provision from where he does not expect" },
  { ref: [11, 6], theme: "Provision & debt", why: "No creature but its provision is upon Allah" },
  { ref: [51, 22], theme: "Provision & debt", why: "In the heaven is your provision" },
  { ref: [29, 60], theme: "Provision & debt", why: "Allah provides for it and for you" },
  { ref: [2, 280], theme: "Provision & debt", why: "If the debtor is in hardship, grant him respite" },
  { ref: [94, 7], theme: "Provision & debt", why: "When you are free, labour on" },

  // ── Trust in God ─────────────────────────────────────────────────────────
  { ref: [3, 159], theme: "Trust in God", why: "When you have decided, put your trust in Allah" },
  { ref: [8, 2], theme: "Trust in God", why: "Hearts tremble, faith increases, they trust" },
  { ref: [3, 173], theme: "Trust in God", why: "\"Allah is sufficient for us\" — hasbunallah" },
  { ref: [64, 11], theme: "Trust in God", why: "No calamity strikes except by permission of Allah" },

  // ── Gratitude ────────────────────────────────────────────────────────────
  { ref: [14, 7], theme: "Gratitude", why: "\"If you are grateful, I will surely increase you\"" },
  { ref: [2, 152], theme: "Gratitude", why: "Remember Me, I will remember you" },
  { ref: [55, 13], theme: "Gratitude", why: "Which of the favours of your Lord will you deny?" },

  // ── Prayer answered ──────────────────────────────────────────────────────
  { ref: [2, 186], theme: "Prayer answered", why: "\"I am near — I respond to the call of the caller\"" },
  { ref: [40, 60], theme: "Prayer answered", why: "\"Call upon Me, I will respond to you\"" },
  { ref: [7, 55], theme: "Prayer answered", why: "Call upon your Lord humbly and in secret" },
  { ref: [21, 87], theme: "Prayer answered", why: "The du'a of Yunus, from inside the darkness" },

  // ── Mercy ────────────────────────────────────────────────────────────────
  { ref: [7, 156], theme: "Mercy", why: "\"My mercy encompasses all things\"" },
  { ref: [21, 107], theme: "Mercy", why: "Sent as a mercy to the worlds" },
  { ref: [6, 54], theme: "Mercy", why: "Your Lord has decreed mercy upon Himself" },

  // ── Self-worth & purpose ─────────────────────────────────────────────────
  { ref: [95, 4], theme: "Self-worth & purpose", why: "Created man in the best of forms" },
  { ref: [51, 56], theme: "Self-worth & purpose", why: "Created jinn and mankind only to worship" },
  { ref: [17, 70], theme: "Self-worth & purpose", why: "We have certainly honoured the children of Adam" },

  // ── Family ───────────────────────────────────────────────────────────────
  { ref: [30, 21], theme: "Family", why: "He placed between you affection and mercy" },
  { ref: [17, 23], theme: "Family", why: "Be good to parents" },
  { ref: [17, 24], theme: "Family", why: "\"My Lord, have mercy on them as they raised me\"" },
] as const;
