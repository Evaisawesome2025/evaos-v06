# Helm / EvaOS v0.7 build note

**When:** 2026-10-02  
**Ship class:** UI + owner-dogfood objective send. Not a clean ship. Not stranger-ready.  
**Glen:** APPROVED folding Objective Bay into Helm v0.7 as **owner dogfood only** (Atlas CC-MVP).  
**Page:** https://evaisawesome2025.github.io/evaos-v06/v07/  
**Intended repo, not created:** `Evaisawesome2025/evaos-v07`  
**Left intact:** https://evaisawesome2025.github.io/evaos-v06/ (root stays the v0.6 sheet; ListingLift sentences corrected 2026-10-02) and https://evaisawesome2025.github.io/evaos-v05/

Cost: $0. No spend. No secrets in git. No client-invented replies. This page does not claim Eva is always on, and it does not claim a clean ship.

## Ship class

Public reading of Helm, plus **Objective Bay** as the dogfood home.

Not changed:

- Cloudflare Worker source, secrets, and CORS allowlist
- `Evaisawesome2025/evaos-v05`
- `Evaisawesome2025/evaos-v06`
- Joinermill guest DEMO (still only at https://joinermill.com/app/guest/)

The dogfood compose posts to the **live** ask ingress `https://evaos-v05-ask.joinermill-ask.workers.dev` (`POST /intent`, `Authorization: Bearer`, body `{ "type": "ask", "body": "OBJECTIVE: …" }`). That host is the one Joinermill v1.5 already uses. Checked 2026-10-02:

- `GET /health` → 200, `{"ok":true,"service":"evaos-v05-ask","write_enabled":true}`
- `POST /intent` from Origin `https://evaisawesome2025.github.io` with no bearer → 401 `unauthorized` (no issue is written)
- `POST /intent` from an unknown Origin → 403 `origin_denied`

v0.6’s host `evaos-v05-ask.stump-lawyer-880.workers.dev` does not connect (DNS is a blackhole). v0.7 does not use it. The bearer is typed into this browser and stored only as `evaos_v07_owner_bearer`. It is not in git. Pending lines use `evaos_v07_pending`.

A send the Worker accepts can show “Eva got it” and still never show evidence here. The Worker still writes into `Evaisawesome2025/evaos-v05`. This page reads only `outbox/threads.json` in **this** repo, which ships with an empty `threads` array and idle presence. Publishing replies into this repo is a write-path. It was not enabled.

## Objective Bay (Atlas CC-MVP)

Signed-in Helm home, for this ship, means the dogfood access code — not Clerk, not a stranger session.

- Header: org heartbeat, then Eva compose. The ring spins only when published presence is `working`/`active`, or a non-selftest thread is `PROCESSING`. A sent objective does not spin it. Idle looks idle.
- One objective strip. The compose is the only objective field.
- Stage rail: Received, Working, Evidence, Needs you. Each state comes from a real event (browser pending + this repo’s outbox). No timer. No canned plan.
- Evidence links render only from published thread fields (`answer_text` / `answer_html` / `evidence`). `https:` and same-site paths only.
- Needs you renders only `approves[]` packets that are still open. Approve / Decline is a tab-local mark. It is not sent. Durable Approve write-back is not connected. With no packet, there is no button.
- Guest DEMO stays on Joinermill, outside this account, forever. This page links to it and does not host it.
- Game is a `LATER` chip. No game mode, no cosplay.
- No Mill-floor seats, no busy office, no fake activity.

## CORE

Carried from the working ask loop, narrowed to one objective:

- Real post, bearer only in browser storage, no fake reply text generated here
- Voice: “Eva got it” / “Eva is working on this” / “Eva replied”
- “Eva is working on this” only from published status — not from a timer, and not from the mere fact of a send
- Plain-language failures, including `origin_denied` and a missing access code (“Nothing was sent.”)
- Poll this repo’s `outbox/threads.json`; drop a pending line when that file has the answer; hide self-test rows
- Quiet line, in her voice: “I answer when I next work. I’m not waiting on this page.”
- Local clock (`clock.js`), labeled local time, not an org signal
- Honest business snapshot, owner lock 2026-10-02: stranger cash $0, zero customers. ListingLift is a closed archived experiment (closed 2026-10-02). Not a live offer. Nobody paid. It is not evidence of an objective on this page, and this page does not link to it. Nothing needs a yes or no on the online business. Cash and customer zeros remain the 2026-09-30 brief. That brief’s ListingLift sales line is withdrawn.

## CHANGED

Compared with v0.6’s one conversation sheet:

- The home is Objective Bay, not Eva’s brief as the whole page.
- A stranger can read what Helm is, what is real, and what is blocked, before any dogfood code.
- Header control is the heartbeat plus Eva compose. A Search field was not added; CC-MVP replaced that header idea.
- Dogfood body is `OBJECTIVE: ` plus the owner’s words (same `/intent` shape Joinermill dogfood already uses), max 220 characters so the prefixed body stays under the Worker’s 240 cap.
- Ask host is the live `joinermill-ask` worker, not the dead v0.6 host.
- Storage keys are `evaos_v07_*`.
- Non-claims strip is on every load.

## REMOVED

Not the home, and not built:

- Mill floor, teammate-seat theater, coffee, or any fake busy room
- Guest DEMO embedded in this account
- Game mode
- v0.6’s second “quick message” bar (one objective strip)
- Canned tour, scripted plan, or auto-advancing stages
- Empty Approve button
- Waitlist form, email capture, checkout

## ADDED

- This folder as the v0.7 Pages surface: `index.html`, `style.css`, `app.js`, `bay.js`, `clock.js`, `outbox/threads.json`, `favicon.svg`, `.nojekyll`
- Objective Bay rail, evidence list, Needs you
- Heartbeat wired to published work, still when idle
- Public trust, try, return, and the blocked onboard / pay sections
- `test/bay.test.js` for the rail and the non-claims
- This build note and `SHIP.md`

## DEFERRED

| Item | Why it waits |
| --- | --- |
| Publishing replies into this repo | Write-path. Needs AUDITOR before enable. Until then, evidence on this page stays empty even after a real send. |
| Durable Approve write-back | Buttons, when a packet exists, mark this tab only. They do not execute. |
| Clerk, magic-link, any stranger account | BLOCKED. Dogfood code stays the only gate. |
| Waitlist arm | BLOCKED. No form. |
| Checkout / charging the founding seat | BLOCKED. $49/mo or $490/yr is Joinermill’s published intent, not a price here. |
| Unrestricted public write | BLOCKED. Compose does not `fetch` without the access code. |
| Guest DEMO inside Helm | Stays on Joinermill forever. |
| Game mode | Chip only. LATER. Do not build cosplay. |
| Mill floor / rainbow spin without a published working event | The ring cannot spin from a timer. |
| Always-on Eva | Say it only when it is real. |
| Header search | Superseded by Eva compose. |
| Worker migrate | Not this ship. |
| Idempotent double-send / global rate limit | Existing Worker window only. |

## BLOCKED for stranger pay and onboard

These are not “coming soon” forms. They are absent:

1. **Onboard without Glen.** No signup, no magic link, no Clerk, no account that is not the dogfood code.
2. **Waitlist arm.** No email field, no interest POST.
3. **Stranger write.** An objective is not sent unless the dogfood access code is in this browser. A wrong code is rejected by the Worker before it writes.
4. **Pay.** No checkout, no cart, no charge. The founding-seat number on Joinermill is intent, not a sale on this page.
5. **Guest path as an account.** The Joinermill Guest DEMO is a different page. It is not unlocked here and it is not Objective Bay.

## Pages

Intended host: a new repo `Evaisawesome2025/evaos-v07`, Pages from `main` `/`.

That repo was not created. `POST /user/repos` returns 403. The response header asks for `repository_creation=write` (or `administration=write`). The core rate limit was not exhausted (thousands remaining). The install token’s repository list is only `Evaisawesome2025/evaos-v06`.

This folder is therefore published inside that existing Pages site, which already deploys from `main` and already has a root `.nojekyll`. The v0.6 URL still serves the v0.6 sheet. Helm is at `/v07/`. The only root edit in the 2026-10-02 ListingLift lock is the brief’s sales sentences.

When a credential can create the repo: move this folder to `Evaisawesome2025/evaos-v07`, enable Pages on `main` `/`, and leave both older URLs up. Do not point v0.5 Pages at this folder.

## Falsifiers checked here

- Non-claims strip is in the first paint, including “not a clean ship”
- Heartbeat `data-state` starts at `idle`; spin CSS applies only for `working`, and reduced motion turns the animation off
- Empty outbox does not mark Working, Evidence, or Needs you
- A SENT objective does not spin the ring and does not invent evidence
- Self-test threads are ignored
- No email input, no checkout control, no game surface
- Public name on the page is Glen only
