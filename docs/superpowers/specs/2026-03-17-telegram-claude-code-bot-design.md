# Telegram → Claude Code Bot Design Spec

## Overview

A locally-hosted Telegram bot that accepts all input types (text, voice, image, documents) and passes them to Claude Code CLI to update the system-design portfolio project. Changes are shown in Telegram for review before committing and creating a PR.

## User Flow

```
User sends input (text/voice/image/file) via Telegram
  → Bot processes input (voice→STT, image→temp file, etc.)
  → Bot asks Claude Code to analyze and list planned changes
  → Bot sends planned changes back to Telegram for confirmation
  → User confirms ✅
  → Claude Code executes changes on a new branch
  → Bot runs git diff, sends formatted diff to Telegram
  → User confirms ✅
  → Bot commits and creates PR via gh CLI
  → Bot sends PR URL back to Telegram
```

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Telegram    │────▶│  Node.js Bot      │────▶│ Claude Code │
│  (mobile)    │◀────│  (local Mac)      │◀────│   CLI       │
└─────────────┘     └──────────────────┘     └─────────────┘
                           │                        │
                           │                        ▼
                           │                 ┌─────────────┐
                           │                 │  Git Repo    │
                           └────────────────▶│  commit + PR │
                                             └─────────────┘
```

### Components

1. **Telegram Bot Server** — Node.js long-running process using `node-telegram-bot-api`
2. **Input Processor** — Handles all input types, converts to text/file paths
3. **Claude Code Runner** — Spawns `claude` CLI process with structured prompts
4. **Diff Reporter** — Formats `git diff` output for Telegram (respects 4096 char limit)
5. **Git Manager** — Handles branching, committing, PR creation

## Input Processing

| Input Type | Processing | Passed to Claude Code |
|-----------|-----------|----------------------|
| Text | Direct use | As prompt text |
| Voice | Telegram `.oga` (Opus/OGG) → OpenAI Whisper API → text | Transcribed text as prompt |
| Image | Download to `/tmp/telegram-bot-{jobId}/` | File path (Claude multimodal reads it) |
| Document | Download to `/tmp/telegram-bot-{jobId}/` | `.md`/`.json`/`.txt` content inlined; others as file path |
| Multiple attachments | Combined from same message | All passed together in one prompt |

### STT Configuration

- Provider: OpenAI Whisper API
- Supports: Cantonese + English
- Cost: ~$0.006/min

### Prompt Assembly

```
You are working in /Users/hillmanchan/Desktop/HillmanChan_portfolio.
The user sent the following instruction via Telegram:

[user text / transcribed voice content]

[if attachments: attachment content or file paths]

Phase 1: List what changes you plan to make. Do not execute yet.
Phase 2 (after confirm): Execute the changes.
```

## Claude Code Execution

### Two-Phase Execution

**Phase 1 — Understanding Confirmation:**
```bash
claude -p "Analyze user instruction, list planned changes, do not execute" \
  --allowedTools Read,Glob,Grep \
  --output-format stream-json
```
- Read-only tools only — prevents accidental modifications during planning
- Output sent to Telegram with inline keyboard: [✅ Execute] [❌ Cancel]
- User can reply with text to refine — bot appends refinement to original prompt and re-runs Phase 1

**Phase 2 — Actual Execution:**
```bash
claude -p "Execute the following changes: [change list]. \
  After making changes, suggest a git commit message." \
  --allowedTools Edit,Write,Bash,Read,Glob,Grep \
  --output-format stream-json
```
- Stream-json output used to detect completion — bot sends a single "⏳ 執行中..." message, then the final diff when done (no periodic progress updates)
- Runs in the worktree directory
- Claude Code's output includes a suggested commit message, extracted by the bot

### Concurrency

- Only one Claude Code operation at a time. If bot is busy, new messages get a "⏳ 而家有嘢做緊，等陣先" reply.
- A simple in-memory lock (boolean `isBusy`) guards the execution pipeline.

### Execution Timeout

- Hard timeout: 5 minutes per Claude Code invocation.
- If exceeded, kill the process, clean up the branch, notify user in Telegram.

### Pre-execution Safety

- Use `git worktree` instead of branch switching to avoid interfering with manual work in progress.
- Bot operations happen in a separate worktree at `/tmp/telegram-bot-worktree/`.
- Main working tree is never touched.

## Git Flow

```
0. git fetch origin main
1. git worktree add /tmp/telegram-bot-worktree/job-id -b telegram/YYYY-MM-DD-description origin/main
2. Claude Code executes changes in the worktree directory
3. git diff (in worktree) → format → send to Telegram
4. User confirms ✅ →
     git add [specific files] && git commit -m "feat: ..."
     git push origin telegram/YYYY-MM-DD-description
     gh pr create --title "[commit message]" --body "Triggered via Telegram.\n\nOriginal instruction: [user message]\n\nPlanned changes: [Phase 1 output]"
     Send PR URL to Telegram
     git worktree remove /tmp/telegram-bot-worktree/job-id
5. User rejects ❌ →
     git worktree remove --force /tmp/telegram-bot-worktree/job-id
     git branch -D telegram/YYYY-MM-DD-description
```

### Diff Display in Telegram

Diffs split into chunks respecting the 4096 character Telegram message limit. Format:

```
📄 src/data/topics.json
+ { "slug": "websocket", "title": "WebSocket", ... }

📄 src/topics/WebSocket.jsx (new file)
+ 250 lines
```

## Security

### Access Control

- Bot responds only to one hardcoded Telegram User ID
- All other messages ignored silently

### File Protection

- Prompt instructs Claude Code to only modify files within `portfolio/src/game/system-design/` and related data files
- Sensitive files (`.env`, `*serviceAccount*`, `*credentials*`) excluded via prompt scope restriction
- The worktree isolation further limits blast radius

### Branch Isolation

- Every execution on a new branch
- PR required for merge to main
- No direct commits to main

## Dependencies

| Layer | Technology |
|-------|-----------|
| Interface | Telegram Bot API (`node-telegram-bot-api`) |
| STT | OpenAI Whisper API (`openai` npm package) |
| Core | Claude Code CLI (`claude -p`) |
| Git | `child_process` for git + `gh` CLI |
| Runtime | Node.js long-running process (local Mac) |

## Prerequisites

1. **Telegram Bot Token** — create via @BotFather
2. **Telegram User ID** — check via @userinfobot
3. **OpenAI API Key** — for Whisper STT
4. **Claude Code CLI** — already installed
5. **gh CLI** — already installed (for PR creation)

## Limitations

- Mac must be running and connected to internet
- Large operations (e.g., 10 topics at once) may take several minutes
- Telegram file upload limit: 20MB
- Telegram message limit: 4096 characters (diffs split across messages)

## State Management

### Session State (in-memory)

```
{
  isBusy: boolean,
  currentJob: {
    id: string,              // unique job ID
    userMessage: string,     // original user input
    phase: "planning" | "confirming" | "executing" | "reviewing",
    plannedChanges: string,  // Claude Code Phase 1 output
    worktreePath: string,    // /tmp/telegram-bot-worktree/job-id
    branchName: string,      // telegram/YYYY-MM-DD-{first-3-words-of-input-slugified}
    startedAt: Date
  } | null
}
```

- State is in-memory only — bot restart clears pending jobs (acceptable for single-user local tool).
- Pending confirmation times out after 30 minutes. On timeout, worktree is cleaned up and user is notified.

## Error Handling

| Error | Response |
|-------|----------|
| Claude Code CLI crashes | Kill process, clean up worktree/branch, notify user with error message |
| Whisper API unreachable | Reply "語音轉文字失敗，請再試或者打字" |
| Git worktree creation fails | Reply with error, suggest checking for stale worktrees |
| Execution timeout (>5 min) | Kill process, clean up, notify "操作超時，已取消" |
| Telegram callback timeout | `answerCallbackQuery` immediately on button press, send progress as separate messages |
| Temp file cleanup | `/tmp/telegram-bot-{jobId}/` directory cleaned up after each job completes or fails |

## Bot Commands

| Command | Description |
|---------|-------------|
| `/status` | Show if bot is busy, current job phase, branch name |
| `/cancel` | Abort current operation. During planning: kill claude process. During confirming: clean up worktree. During executing: kill process + clean up worktree/branch. During reviewing: clean up worktree/branch. |
| `/help` | List available commands |

## Commit Messages

- Generated by Claude Code based on the changes made
- Included in the diff review message sent to Telegram
- User can see the proposed commit message before confirming

## Process Lifecycle

- Run with `pm2` for auto-restart on crash and Mac reboot
- Logs: `pm2 logs telegram-bot`
- Start: `pm2 start telegram-bot/index.js --name telegram-bot`
- Auto-start on boot: `pm2 startup && pm2 save`
- On startup: clean up any stale worktrees in `/tmp/telegram-bot-worktree/` from previous crashed runs

### Startup Cleanup

```
1. List /tmp/telegram-bot-worktree/* directories
2. For each: git worktree remove --force <path>
3. Delete orphaned telegram/* branches with no worktree
4. Clear /tmp/telegram-bot-*/ temp file directories
```

## Project Location

Bot code will live in: `/Users/hillmanchan/Desktop/HillmanChan_portfolio/telegram-bot/`

Runtime: Node.js 18+

Config file: `telegram-bot/.env` containing:
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_USER_ID`
- `OPENAI_API_KEY`
