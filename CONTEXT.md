# CONTEXT — QuranKu / New-Quranku

The ubiquitous language for this repo. **Glossary only** — no implementation
detail, no spec, no decisions. Decisions live in `docs/adr/`.

When a term here conflicts with a term in code, the conflict is the finding.
Say so rather than quietly using both.

## People and access

**Visitor** — anyone who loads the app. Every Visitor has an Identity from the
first request. There is no state in which someone is using QuranKu unidentified.

**Identity** — the opaque, per-browser handle a Visitor carries. It is minted
automatically, is not a login, and says nothing about who the person is. Its
whole job is to let the app remember what *this browser* did.

**Anonymous Visitor** — a Visitor with an Identity and no Account.
> ⚠️ Not "unregistered user". "Unregistered" implies no state; an Anonymous
> Visitor has persistent state — bookmarks, notes, reading position, question
> history — and can lose all of it by clearing a cookie. That loss is the
> entire argument for becoming a Member, so the word must not hide it.

**Account** — the association between an email address and a Visitor's
accumulated memory. Email is the only personal information QuranKu holds.

**Member** — a Visitor with an Account.
> ⚠️ Deliberately NOT "user". `user_id` in the database belongs to Anonymous
> Visitors too, so "user" already means "anyone at all" in this codebase.
> A tier named "user" would read as a synonym for Visitor and quietly invert
> every permission sentence written about it.

**Reviewer** — a Member trusted to judge whether an Authored Answer is
religiously sound. The role exists for Ustadz Ahmad. A Reviewer sees what the
app has said; a Reviewer never sees who asked.

**Administrator** — a Member who operates the service: health, curation,
accounts. Distinct from Reviewer because the two jobs need opposite things —
an Administrator needs to see users, and a Reviewer must not.

## What the app produces

**Authored Answer** — prose QuranKu composes itself in response to a question.
It is not scholarship, is not a fatwa, and is labelled as such wherever it
appears. It is regenerated for every asking and is never the same twice.
> ⚠️ Consequence worth stating in the glossary because it keeps being
> forgotten: you cannot retract an Authored Answer. There is no stored
> artefact to withdraw. Anything that acts on a bad answer must act on the
> *question* it answered, never on the answer itself.

**Answer Record** — a stored copy of one question and the Authored Answer it
produced, kept so a Reviewer has something to read. Holds no Identity: what
was said is retained, who asked is not.

**Review Verdict** — a Reviewer's judgement on an Answer Record. Sound, or
not sound.

**Block Rule** — a written condition that marks a question as one QuranKu must
not answer on its own. Authored by a person, not inferred. When a Block Rule
matches, the app says plainly that the question needs a live ustadz.
> ⚠️ A Block Rule constrains QuranKu, not the reader. It never refuses the
> person; it declines to speak for a scholar.

**Scholar-Blocked** — the state of a question that matches a Block Rule.

## Reading and memory

**Bookmark** — a Visitor's saved reference to an ayah. Available to every
Visitor including Anonymous ones.
> Indonesian reader-facing wording is **not yet decided**. The code says
> `bookmark`; do not assume a translation until someone picks one.

**Memory** — the collective term for a Visitor's Bookmarks, notes, reading
position and question history.

**Adoption** — moving an Anonymous Visitor's Memory into an Account. Always the
result of an explicit choice by the person, never automatic, because a browser
can be shared and Memory can be intimate.

## Kajian tooling

**Kajian Briefing** — a summary QuranKu's own tooling derives from a recorded
lecture. Our writing about someone's talk; never their words, never a
transcript, and never presented as a quotation.

**Ustadz Roster** — the hand-maintained list of speakers we are prepared to
name, each with the title that person actually uses, credentials we wrote, and
a photo we are entitled to use. A speaker absent from the Roster is not named.

**Unrostered** — a video whose speaker has no Roster entry. Its slide carries
the source link and no identity at all.

**Draft Slide** — a slide derived from auto-generated captions whose flagged
citations have not yet been checked against the video. A Draft Slide is not
postable.
