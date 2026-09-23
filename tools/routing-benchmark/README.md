# Routing benchmark

These tests check that the Power Platform plugins route requests correctly when several of them are active at once.
The two questions are:

- Does Claude reach for the right plugin when Microsoft's `copilot-studio` plugin is active next to `canvas-apps`,
  `dataverse`, `power-automate` and pp-devteam?
- Does `/pp-orchestrator` ask the build track first?

Re-run them after any change to `plugins/pp-devteam/hooks/`, the orchestrator, or the pinned `copilot-studio` sha in
the marketplace.

## How it works

Every run is a real `claude -p` session in a small copy of a mixed project (`fixture/`). The fixture holds a canvas
screen, a solution with a flow, and a Copilot Studio agent workspace. A `PreToolUse` hook (`log_block.py`) does two
things:
- it logs every tool call;
- it lets reads and read-only shell commands through, and blocks everything else.

Nothing is written, imported or published. The first blocked call is the **routing decision**:

| Call | Counted as |
|---|---|
| a `copilot-studio:*` or `eval-guide:*` skill, or a Copilot Studio sub-agent | Copilot Studio |
| anything else | not Copilot Studio |

A request that isn't about an agent passes if it didn't go to Copilot Studio. An agent request passes if it did.

## Run

```bash
python setup.py                              # once; clones the pinned upstream plugin and makes the fixture copies
python runner.py run --reps 2 --jobs 5       # routing: every configuration x every eval
python runner.py grade --iteration 1
OT_DIR=ot python ot_runner.py run --reps 2   # orchestrator: asks the build track first?
```

You need the `claude` CLI signed in (`claude auth login`). The CLI's login is separate from the Desktop app's. You
also need `copilot-studio@my-power-platform-skills` installed at user scope.

| Configuration | What it loads |
|---|---|
| v0 | Microsoft's plugin as shipped (its routing prompt) + pp-devteam 1.3.1 |
| v1 | The scoped re-listing + pp-devteam 1.3.1 |
| v2 | The installed setup, as it is on this machine |
| v3 | The scoped re-listing + this working copy of pp-devteam, with a profile marked **Both** |
| v4 | This working copy, with a profile marked **Traditional** (no agent) |
| c | Control: no Copilot Studio plugin |

## Results

**23 September 2026: Claude Code 2.1.273, Opus 5.5.** Each setup ran 7 ordinary Power Platform requests and 4
Copilot Studio agent requests, twice each:

| Setup | Ordinary requests routed correctly | Agent requests routed to Copilot Studio |
|---|---|---|
| v0 | 14/14 | 7/8 |
| v1 | 14/14 | 8/8 |
| v2 | 14/14 | 8/8 |
| c | 14/14 | 0/8 (no plugin to route to) |

The scoped re-listing never pulled ordinary requests into Copilot Studio. It sent every agent request to the matching
sub-agent: Author for knowledge, Advisor for troubleshooting, Test for evals, and Manage for push and publish. It
also saves about 10 KB of session-start context.

**Build track (pp-devteam 1.5.0, same date).** With a profile marked **Both** (v3), 25 of 26 requests routed
correctly:
- All 16 ordinary requests were right, including "build an agent that emails the site manager when a ticket is
  created". It went to `power-automate`, not Copilot Studio.
- Agent requests went to the matching sub-agent.
- The one miss asked for the HR SharePoint site's URL before handing a new agent to Author. That is reasonable
  behaviour that the scorer counts as "no route".

With a profile marked **Traditional** (v4):
- The disguised flow went to `power-automate`.
- A request for a new conversational agent was not routed silently. Claude named it as Copilot Studio work and
  offered to add the track with `/pp-orchestrator`. That is the intended behaviour; the scorer counts it as "no
  route".

**Orchestrator: does it ask the build track first?** Each case ran twice:

| Case | pp-devteam 1.4.0 (installed) | 1.5.0 first draft | 1.5.0 final |
|---|---|---|---|
| New mixed repo: asks, recommends Both | 0/2 | 1/2 | 2/2 |
| New traditional repo: asks, recommends Traditional | 0/2 | 2/2 | 1/2, then 4/4 after "ask even when obvious" |
| Profile without a track: asks the track only | 0/2 | 2/2 | 2/2 |
| Track given in the arguments: doesn't ask | 2/2 | 2/2 | 2/2 |
| Traditional profile + "add a Copilot Studio agent": moves to Both and asks the agent questions | n/a | n/a | 2/2 |
| Empty repo: asks, no recommendation | n/a | n/a | 2/2 |

`claude -p` has no question tool, so the orchestrator asks in text. In the Desktop app it uses the question tool.
