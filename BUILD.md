# EvaOS V0.6 build note

**When:** 2026-09-30  
**Ship class:** UI-only  
**Glen:** APPROVED the amended plan on 2026-09-30  
**Page:** https://evaisawesome2025.github.io/evaos-v06/  
**Fallback, untouched:** https://evaisawesome2025.github.io/evaos-v05/

Cost: $0. No spend. No secrets in git. No client-invented replies. This page does not claim Eva is always on.

## Ship class

**UI-only.** New Pages surface, conversation frame, and copy.

Not changed, in this repo or elsewhere:

- Cloudflare Worker (no deploy, no source edit)
- Worker secrets
- CORS / origin allowlist
- Process scripts
- `Evaisawesome2025/evaos-v05`

The page posts to the existing address `https://evaos-v05-ask.stump-lawyer-880.workers.dev` (`POST /intent`, `Authorization: Bearer`, body `{ "type": "ask", "body" }`). That URL is public. The bearer is typed once into this browser and stored only as `evaos_v06_owner_bearer`. It is not in git. Pending lines use `evaos_v06_pending`, so they do not collide with V0.5.

AUDITOR is not required solely for this static UI. AUDITOR **is** required before any write-path enable (below).

## Origin allowlist — Ask from this page is not enabled

The unchanged Worker allowlist is the V0.5 host list:

- `https://evaisawesome2025.github.io`
- `http://127.0.0.1:8765`
- `http://localhost:8765`

A browser Origin is the scheme + host + port. It does **not** include the path. The live V0.6 URL `https://evaisawesome2025.github.io/evaos-v06/` therefore sends Origin `https://evaisawesome2025.github.io`, which is already on that list because V0.5 uses the same host. This build does not add an origin and does not treat that shared host as a new allowlist decision.

`origin_denied` is the Worker’s response for any other Origin. This page shows that as **“This page can’t send yet.”** It does not invent a reply, and it does not change the Worker to “fix” it. If a send from the Pages URL (or from any host that is not on the list above) fails with `origin_denied`, that failure is expected for this UI-only ship. Leave the Worker alone.

Even when the host check passes, a reply still does not come back to **this** page:

- The Worker still writes into `Evaisawesome2025/evaos-v05` (unchanged).
- The V0.5 process publishes into the V0.5 outbox, not into this repo.
- This page polls only `outbox/threads.json` here, which ships as an empty `threads` array.

So a send the Worker accepts can show “Eva got it” and still never show “Eva replied” here. That is honest. It is not a finished V0.6 ask loop.

**Before Ask is enabled from V0.6** (a distinct origin, pointing the Worker at this repo, or teaching the process to publish `outbox/threads.json` here): write-path touch. Needs **AUDITOR PASS or PASS WITH WARNING** first. Eva cannot override a FAIL. Do not migrate the Worker for neatness.

## DOGFOOD (durable)

On the page, collapsed once saved, never the hero:

- **DOGFOOD** access code. Not a secure login.
- **DOGFOOD** browser storage. The code stays in this browser until Clear.
- **DOGFOOD** public replies. What comes back on this page is public.

## CORE

Carried from the working V0.5 ask loop, without its console:

- Real post, bearer only in browser storage, no fake reply text generated here
- Voice states: “Eva got it” / “Eva is working on this” / “Eva replied”
- Plain-language failures, including `origin_denied`
- Poll this repo’s `outbox/threads.json`; drop a pending line when that file has the answer; hide self-test rows; do not show intent or transport ids
- “Eva is working on this” only if the published thread says so — no timer that pretends she has started
- Quiet line, in her voice, not the status line: “I answer when I next work. I’m not waiting on this page.”
- Paper palette and the small upper-left analog clock (`clock.js`, local time only)
- Honest snapshot, corrected 2026-10-02: $0 stranger cash, 0 customers, ListingLift closed and archived (not a live offer, not for sale), no new cold email, searching for the next bet, nothing needs a yes or no on the online business. The 2026-09-30 sales line for ListingLift is withdrawn on this live page.

## CHANGED

- One sheet. Eva’s brief is the open. The message bar is the only second chrome, directly under her words.
- Brief is 5 short lines (cap 6 lines / 80 words). Order: nothing to authorize → $0 / ListingLift closed and archived / nobody paid → experiment closed, no new cold email → searching → what moved (closed 2026-10-02, archived, not for sale).
- “Needs you” when clear lives only in her first line. No line above the bar, because nothing consequential is waiting.
- Replies render in that same sheet, answer body first.
- Storage keys are `evaos_v06_*`.

## REMOVED

Not brought onto the owner page:

- Attention panel, Pulse grid, letter sections, More detail, System, diagnostics
- Ticket words as the status the owner reads (SENT / PROCESSING / ANSWERED)
- FIND / IDEA / GAME / GROW, office sim, approval buttons, empty approval theater
- Offline snapshot chips (those were canned answers, not Eva)
- Worker, GitHub, Issues, Cloudflare, and outbox as words on the owner page
- Prototype-version links

## ADDED

- This repo as the V0.6 Pages surface: `index.html`, `style.css`, `app.js`, `clock.js`, `outbox/threads.json`, `.nojekyll`
- Collapsed DOGFOOD access-code disclosure
- This build note

## DEFERRED

Do not build these in V0.6:

| Item | Why it waits |
| --- | --- |
| Office / visual org | Direction is dormant |
| FIND / IDEA / GAME / GROW | Conversation, not a wizard |
| Permanent home / domain | After a name and evidence |
| Always-on Eva | Say it only when it is real |
| Approve-execute | Nothing to approve; no theater |
| GAME BUILDER | Idle; no game project |
| Real login | Access code stays dogfood |
| Worker migrate or a new account | Not blocked; no migrate-for-neatness |
| Publishing replies into this repo | Write-path. AUDITOR before enable |
| Idempotent double-send / global rate limit | Not this coherence pass |
| Open-domain model chat | Would fake a capability |
| A second intelligence surface | Out of V0.6 |

## Pages

GitHub Pages was **not** on for this repo at build time (`has_pages: false`). This ship does not change repository settings from the agent (no settings write).

After this branch is on `main`, enable Pages to match V0.5:

1. Repo **Evaisawesome2025/evaos-v06** → **Settings** → **Pages**
2. **Build and deployment** → **Deploy from a branch**
3. Branch **main**, folder **/ (root)**, Save

`.nojekyll` is in the root so `outbox/threads.json` is served as a file.

The URL is https://evaisawesome2025.github.io/evaos-v06/

Do not point Pages at `evaos-v05`, and do not edit that repo.

## User Zero (plan §4)

Glen, without coaching:

1. **10 seconds.** From the brief and the bar only: nothing needs you; $0 / ListingLift closed and archived / searching; what moved is the 2026-10-02 close, archived, not for sale; message her in the bar. No manual, no second panel.
2. **One relationship.** Talking to Eva, not operating a console.
3. **Real message.** Not met until a write-path enable. The bar posts at the existing ask address and will show “Eva got it” only if that address accepts the send. A reply shows in this sheet only after it is published in this repo’s `outbox/threads.json`. That publisher was not changed. `origin_denied` stays an expected failure off the allowlist, and must not be patched in the Worker for this ship.
4. **Truth.** No fake always-on line, no canned Eva reply, no invented dollars, no busywork counts. “Eva is working on this” is not shown on a timer.
5. **Leave and return.** A pending line stays in this browser. The access code stays until Clear. A published reply is still in the same sheet.
6. **V0.5.** https://evaisawesome2025.github.io/evaos-v05/ was not edited.
7. **Ownership.** The open is the business, in her voice, not a ticket queue.

## Falsifiers checked here

- One sheet, not a stack of panels
- Brief 72 words, 5 lines
- Message bar is the control under the brief
- Owner page text has no Worker, GitHub, Issues, Cloudflare, or outbox
- DOGFOOD is on the access code, including when it is collapsed
