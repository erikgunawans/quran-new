# 6. Narrated kajian artifacts: the frame is spoken, and it is spoken first

Date: 2026-08-22
Status: Accepted

## Context

Two additions to the kajian tool: narration of its own content, and a QR code
carrying the source video URL.

**The QR turns ADR 5 from a formality into a mechanism.** ADR 5 requires every
slide to link its source. On the platforms these are posted to, a link in an
image is not clickable and nobody retypes a URL from a picture, so that rule
bought nothing. A QR makes checking the original a two-second action. It is
attribution infrastructure, not decoration.

**Narration raises the same hazard as ADR 5, one step worse.** A still image
cannot carry audio, so narration means video. On a video showing a scholar's
face and name, a voice reading summary points is heard as that scholar
speaking. Text is visibly written *about* someone; audio is heard as spoken
*by* someone. A caption disclaimer does not reach an autoplaying feed.

## Decision

**The attribution is spoken, and spoken before any content** — an opening line
naming the source as an automatic summary of a named scholar's lecture, not a
quotation. An audio frame only works if it is heard first.

**One narrator voice across every video**, deliberately consistent so viewers
learn it as this channel's narrator rather than as whoever appears on screen.
The safety property and the brand asset are the same thing.

**Two artifacts**: a short video for social, and a long-form audio of the full
briefing. Both carry the spoken attribution at the open and a closing line
pointing back at the source.

**The QR encodes the canonical video URL**, pointing at the lecture itself
rather than at a page of ours. Interposing our own page between a viewer and
the scholar's talk would weaken the attribution the QR exists to provide.

## Consequences

The long-form carries a substitution risk the short form does not: a detailed
narrated briefing of a long lecture can become what people consume instead of
the lecture. This was chosen knowingly, and the spoken frame at both ends is
the mitigation rather than a fix — it does not remove the risk, it keeps the
source audible.

Two artifacts mean two reviews. Neither is postable until checked, and the
draft gate from ADR 5 applies to both.

Long-form narration exceeds the TTS input cap per request, so it must be
chunked and concatenated. Chunking that splits mid-sentence, or drops a chunk,
produces a file that plays cleanly and is missing content — a failure with no
error and no obvious symptom. It needs a length assertion against the source
text, not a successful exit code.

The consistent narrator voice becomes load-bearing once viewers have learned
it. Changing it later re-opens the inference this decision closes.
