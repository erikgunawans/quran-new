# 2. An account proves itself with its own signed cookie, not with canonical_user_id

Date: 2026-08-22
Status: Accepted

## Context

Roles attach to an Account (an email). Requests carry only the anonymous
`qk_uid` Identity cookie. Something has to bridge the two.

The obvious bridge is the `accounts` table, which already maps
`email -> canonical_user_id`; a request could resolve its role with
`SELECT role FROM accounts WHERE canonical_user_id = ?`.

Reading the schema ruled that out. `canonical_user_id` carries no UNIQUE
constraint and no index:

```sql
CREATE TABLE IF NOT EXISTS accounts (
  email             TEXT    PRIMARY KEY,
  canonical_user_id TEXT    NOT NULL,
  created_at        INTEGER NOT NULL
);
```

Two Accounts can therefore share one `canonical_user_id`, and not only in
theory. `handleAuthVerify` re-points the device cookie at the account's
canonical id on login. So: person A logs in on a shared phone and the account
adopts that device's id `D`. Person B then logs in on the same phone, where the
cookie now reads `D`, and `linkAccount` records `D` as B's canonical id too.
Two Accounts, one id, permanently entangled.

Resolving a role through that column would mean a Reviewer's privilege leaking
to whoever else signed in on the same family tablet. The reverse lookup is also
an unindexed table scan.

## Decision

On successful magic-link verification, issue a second HMAC-signed cookie
carrying the authenticated email and an expiry — the same primitive `auth.ts`
already uses for magic tokens.

Role resolution reads the email from that cookie. It never reads
`canonical_user_id`.

The Identity cookie keeps its existing job — addressing Memory — and is
untouched.

## Consequences

Privilege cannot leak between Accounts that share a canonical id, because
privilege no longer travels that path.

We gain two things the app does not have today: a real logout (clear the auth
cookie) and a real session expiry.

Two cookies now exist with genuinely different jobs, and the difference has to
stay legible: one addresses Memory, one proves an Account. Conflating them
later would reintroduce exactly this bug.

The shared-`canonical_user_id` defect is **not fixed by this ADR**. It still
entangles the Memory of two people who log in on one browser. This decision
only ensures roles are not carried through it. The Memory defect is separate,
predates this work, and deserves its own fix.
