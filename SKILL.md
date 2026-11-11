---
name: myoffice
description: View live coding agent status in MyOffice (/myoffice, "我的 agent 在幹嘛", "show my agents"), or add and verify embedded companion apps and native companion views.
---

# myoffice

Supported agents: Claude Code, Codex, Gemini CLI, Antigravity CLI, Copilot CLI,
OMP, Pi, Kimi Code, DeepSeek Harness, Grok Build, OpenCode, and Hermes.

Start the dashboard. It serves a local page and opens it in the browser.
Run it **in the background** so it keeps running and doesn't block the chat
(this skill's base directory is shown above as "Base directory for this skill"):

```bash
node "<base directory>/bin/cli.js"
```

If it is already running, the same command just reopens the browser tab.

To **update** it — `/myoffice update`, or the user asks to update / upgrade —
run `node "<base directory>/bin/cli.js" --update` (not in the background),
report the version it printed, then start it again as above. The page also
shows the version in the corner and an "Update" button when a new one is out.

To **close** it — `/myoffice stop`, or the user asks to stop / close / shut the
office down — run (not in the background):

```bash
node "<base directory>/bin/cli.js" --stop
```

and say it's stopped.
Then tell the user, in one line, that the office is open at the printed URL.
For a requested view, provide a clickable link to the exact served URL verified
in the browser, preserving its path, query, and hash. Label source-file links
separately as source.
If the output also says **"Update available: vA → vB"**, tell the user a new
version is out and offer to update it (`/myoffice update`, below).
Requires Node.js 18+; if `node` is missing, say so and stop.

## Scenes (3D)

Besides the built-in office there are downloadable 3D scenes (e.g. a pirate
cove). When the user asks for another scene, a different look, "DLC", or names
one ("海盜船", "pirate"):

1. `node "<base directory>/bin/cli.js" --scenes` — lists every scene, whether
   it's installed, and its download size. Use the ids it prints; don't guess.
2. `node "<base directory>/bin/cli.js" --scene <id>` (in the background) —
   downloads it if needed (checksum-verified, data only) and opens the office
   in that scene. `--scene office` goes back to the office.

Scenes are only downloaded when asked for. `--remove-scene <id>` deletes one.

Options the user may ask for:

- `--private` — hide prompts/replies, show status only (for screen sharing)
- `--hours 4` — only sessions active in the last 4 hours (default 24)
- `--port 5000` — different port (default 4545)
- `--stop` — stop the running dashboard
- `--json` — produce a one-off snapshot instead of opening a page. For an
  activity summary, use `--json --hours 2` and filter the result before it
  reaches tool output.

For status queries and dashboards that only need session metadata, prefer a
metadata index or API. Bound the lookup to relevant sessions and times. If the
source includes messages, extract only the needed fields locally (session ID
or link, existing title, last activity time, status) before emitting output
or writing logs, caches, or UI data. Debug with field names or synthetic
records; never grep or dump raw history or prompt previews for these views.
Verify that the tool or API output contains only the selected fields. Hiding
message text in the UI does not verify filtering at the source.

If the user wants Claude Code permission prompts to show as "Waiting for you"
(Claude Code doesn't log them), offer `node "<base directory>/bin/cli.js" --install-hook`.
It adds one Notification hook to their Claude Code settings; `--uninstall-hook` removes it.
Ask before running it, since it changes their settings.

Local agent sessions are read from their own session folders (`~/.claude/projects`,
`~/.codex/sessions`, `~/.gemini/tmp`, `~/.gemini/antigravity-cli`, `~/.copilot/session-state`, `~/.omp`, `~/.pi`, `~/.kimi-code`,
`~/.dsh`, `~/.grok`) and databases (`~/.local/share/opencode/opencode.db`, `%LOCALAPPDATA%\hermes\state.db`).
The server listens on 127.0.0.1 only. Loopback listening does not prevent outbound
requests: the app checks GitHub for updates and fetches scene packs when requested.

## Embedded companion apps

Deny framing of companion pages by default with CSP `frame-ancestors 'none'`.
In the explicit embed mode, allow only approved office origins (exact scheme,
host, and port). Keep server-side write-origin checks independent of framing.

- Open the companion from the office toolbar. Verify on-demand startup and
  in-frame rendering, exercise a representative action, then close and reopen.
- Check framing headers for standalone, valid embed, and unknown embed requests,
  and verify that cross-origin writes are rejected. In private and demo modes,
  hide the entry and verify direct discovery and launch requests are denied.
  Verify the standalone fallback at an unlisted office origin in normal mode.

## Native companion views

For native integration, default to a toolbar scope in the existing office and
show details in its sidebar. In the running office, open the
scope, verify the old iframe is absent when replacing an embed, and exercise
selection from the scene and list plus any changed filters and media controls
in each affected scene mode.

When the user asks for an entry point inside the existing office scene, keep
the layout and use an existing prop or a small addition anchored to the scene.
Open the requested view directly. On the served dashboard, verify placement
and activation in each affected renderer and at narrow widths. Check nearby
controls and confirm that closing the view returns focus to its opener.

When moving an existing dashboard into the sidebar, inventory its drill-downs
and exact values before changing the layout. Verify that the office keeps
rendering in 2D and 3D and that closing the sidebar view restores the same
selected agent. At narrow widths, test each chart metric and time grain with
fixture values that produce long formatted labels. Size the axis gutter from
the rendered labels and verify that each label fits. Open the breakdown and
check that each category's exact value is still available and matches the
fixture.

Reconcile the displayed records with the source or a known fixture. For
content-addressed media, compare the served bytes with the expected digest.
Keep the standalone companion's default framing policy and verify that
same-origin write requests work and cross-origin writes are rejected.

## Revocable public submissions

For submission integration tests, run isolated local office and hall instances
with temporary data stores and synthetic sessions and usage. Inject a transport
that asserts the expected remote origin before forwarding requests only to the
local hall. Record non-GET requests and compare their methods and submitted
profiles with the exercised actions.

When a dashboard lets users publish and withdraw entries, test delayed writes as
well as the normal publish flow. Use the same expiry rule for withdrawal lookups
and active quota counts. Check request expiry against server time inside the
transaction that accepts the write.

Seed enough expired withdrawal records to fill the quota if counted, and verify
that a fresh submission succeeds before cleanup runs. Verify separately that an
expired request is rejected and an unexpired request for a withdrawn entry
cannot recreate it after a restart.

## Skill library changes
When changing book covers or desk layout, test with the actual skill catalog at narrow
widths and around affected breakpoints. If covers must show full titles, check
rendered text for clipping across the catalog, including the longest titles.

For drag changes, exercise mouse and touch drops near the target edge, release
outside the target, and Escape cancellation. Verify that click and keyboard still open
the intended skill. Record whether touch was simulated.

## Installing dashboard changes

Re-read the live dashboard files immediately before installation. Apply the
reviewed change as a scoped patch and inspect its diff against that live
baseline to catch overwritten controls or concurrent edits. If the live files
change again, reconcile against the new baseline before writing.

Rerun the key checks against the served dashboard. Exercise the changed entry
point and adjacent controls in the shared markup. Capture uncaught browser
errors from page load through those interactions. For a browser handoff,
reload the correct MyOffice instance, open the requested view, and confirm
the updated controls are visible.

Before stopping temporary preview servers, verify each listener against its
recorded launch command and actual working directory. A nested preview script
can inherit its parent's working directory; resolve the script path from that
launch context instead of assuming both directories match. Stop only verified
preview processes, then confirm their listeners are gone and the live dashboard
still responds.

When the live data source is disconnected, label fixture data visibly in the
preview and report preview checks separately from live integration. For a
scene control tied to a specific record, use known records to verify that
opening the list selects the matching row. Exercise that path on the served
dashboard at desktop and narrow widths.
