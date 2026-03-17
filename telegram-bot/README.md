# Telegram Claude Code Bot

A locally-hosted Telegram bot that accepts text, voice, images, and documents, passes them to Claude Code CLI to update the system-design portfolio project, shows diffs for review, and creates PRs on confirmation.

## How It Works

### Architecture

```
Your Phone (Telegram)  →  Your Mac (Node.js Bot)  →  Claude Code CLI  →  Git Repo
```

The bot runs as a long-running Node.js process on your Mac, listening for Telegram messages.

### Complete Flow Example

Suppose you send in Telegram: `"Add a new topic: WebSocket, intermediate difficulty"`

#### Step 1 — Bot Receives Message

- Checks if the sender matches your Telegram User ID
- Ignores all messages from other users

#### Step 2 — Input Processing

| Input Type | How It's Processed |
|-----------|-------------------|
| Text | Used directly as the instruction |
| Voice | Downloaded as `.oga`, transcribed via OpenAI Whisper (supports Cantonese + English) |
| Image | Downloaded to `/tmp/`, passed to Claude Code (multimodal — it can read images) |
| Document | Downloaded to `/tmp/`. Text files (`.json`, `.md`, `.txt`, etc.) are inlined into the prompt. Other files are passed as file paths |
| Multiple inputs | Combined from the same message into a single prompt |

#### Step 3 — Phase 1: Planning (Read-Only)

```bash
claude -p "User wants to add WebSocket topic..." --allowedTools Read,Glob,Grep
```

- Claude Code can only **read** the project — no modifications allowed
- It analyzes the codebase and lists what changes it plans to make
- The bot sends the plan back to you in Telegram:

```
Bot reply:
"I plan to:
 1. Add WebSocket entry to topics.json
 2. Create WebSocket.jsx topic file
 3. Update roadmap.json

 Confirm execute?
 [✅ Execute]  [❌ Cancel]"
```

#### Step 4 — Your Options

- **✅ Execute** → Proceeds to Phase 2
- **❌ Cancel** → Cancels everything, nothing changes
- **Reply with text** → Refine the instruction (e.g., "Don't modify roadmap"), bot re-runs Phase 1 with the refinement

#### Step 5 — Phase 2: Execution (Isolated Worktree)

```bash
git fetch origin main
git worktree add /tmp/telegram-bot-worktree/abc123 \
  -b telegram/2026-03-17-add-websocket-abc123 origin/main
```

- Creates an **isolated git worktree** — your main working tree is never touched
- Runs Claude Code inside the worktree with full edit permissions:

```bash
claude -p "Execute the following changes..." --allowedTools Edit,Write,Bash,Read,Glob,Grep
```

#### Step 6 — Diff Review

The bot runs `git diff`, formats it, and sends it to you:

```
Bot reply:
"Changes summary:
 topics.json   | 8 ++++
 WebSocket.jsx | 250 ++++++

 Commit message: "feat: add WebSocket topic"

 Confirm commit + PR?
 [✅ Commit + PR]  [❌ Revert]"
```

#### Step 7 — Confirmation

- **✅ Commit + PR** → Bot automatically:
  1. `git add -A && git commit -m "feat: add WebSocket topic"`
  2. `git push origin telegram/2026-03-17-add-websocket-abc123`
  3. `gh pr create` — opens a Pull Request
  4. Sends you the PR URL in Telegram
- **❌ Revert** → Deletes the worktree and branch. Nothing happened.

---

## Safety Mechanisms

| Mechanism | How |
|-----------|-----|
| Only you can use it | Your Telegram User ID is hardcoded in config |
| Won't disrupt your work | Uses git worktree isolation — never touches your main working tree |
| Won't push to main directly | All changes go through PRs — you review before merging |
| Won't touch secrets | Prompt restricts Claude Code to system-design files only |
| Timeout protection | Claude Code auto-killed after 5 minutes |
| No concurrent jobs | `isBusy` lock ensures only one operation at a time |
| Confirmation timeout | Pending confirmations auto-cancel after 30 minutes |
| Auth on callbacks | Inline keyboard button presses are also verified against your user ID |

---

## Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message with usage instructions |
| `/status` | Show if the bot is busy, current job phase and branch name |
| `/cancel` | Abort current operation and clean up (worktree, branch, temp files) |
| `/help` | List available commands |

---

## Setup

### Prerequisites

- **Node.js 18+** (you have v22)
- **Claude Code CLI** installed and authenticated
- **gh CLI** installed and authenticated (for PR creation)
- **Telegram Bot Token** — create via [@BotFather](https://t.me/BotFather)
- **Telegram User ID** — check via [@userinfobot](https://t.me/userinfobot)
- **OpenAI API Key** — for Whisper voice transcription

### Installation

```bash
cd telegram-bot
npm install
cp .env.example .env
# Edit .env with your real credentials
```

### .env Configuration

```
TELEGRAM_BOT_TOKEN=your-bot-token-from-botfather
TELEGRAM_USER_ID=your-telegram-user-id
OPENAI_API_KEY=your-openai-api-key
```

### Running

```bash
# Direct
node index.js

# With auto-restart (recommended)
pm2 start index.js --name telegram-bot
pm2 startup   # Auto-start on Mac reboot
pm2 save
```

### Verify pm2

```bash
pm2 status telegram-bot   # Should show "online"
pm2 logs telegram-bot     # View logs
pm2 restart telegram-bot  # Restart if needed
```

---

## Project Structure

```
telegram-bot/
├── index.js              # Entry point — bot startup, cleanup, message routing
├── lib/
│   ├── config.js         # Load .env, validate required vars, export constants
│   ├── state.js          # In-memory job state management (isBusy, currentJob)
│   ├── auth.js           # Telegram user ID check — reject unauthorized users
│   ├── input.js          # Process text/voice/image/document inputs
│   ├── claude.js         # Spawn claude CLI, parse stream-json output
│   ├── git.js            # Worktree create/remove, diff, commit, push, PR
│   └── telegram.js       # Message formatting, diff chunking, inline keyboards
├── package.json
├── .env                  # Credentials (gitignored)
├── .env.example          # Template for .env
└── .gitignore
```

### Module Responsibilities

| Module | What It Does |
|--------|-------------|
| `config.js` | Loads and validates environment variables. Exits if any required var is missing. |
| `state.js` | Manages in-memory job state. Tracks current phase (`planning` → `confirming` → `executing` → `reviewing`), branch name, worktree path, and Claude process reference for cancellation. |
| `auth.js` | Single function `isAuthorized(msg)` — compares `msg.from.id` against configured user ID. |
| `input.js` | Downloads Telegram files to `/tmp/telegram-bot-{jobId}/`. Transcribes voice via Whisper. Inlines text file contents. Returns `{ text, filePaths, tempDir }`. |
| `claude.js` | Spawns `claude -p` with `--output-format stream-json`. Returns `{ promise, process }` — caller stores process on the job for cancellation. Buffers partial JSON lines. Extracts `result` event from stream. |
| `git.js` | Manages git worktrees (create, cleanup), diffs, commits, pushes, and PR creation via `gh`. Includes startup cleanup of stale worktrees and orphaned `telegram/*` branches. |
| `telegram.js` | Splits diffs into chunks under 4000 chars. HTML-escapes content. Provides inline keyboard definitions for confirm/cancel buttons. |

---

## Two-Phase Execution Detail

### Phase 1 — Planning

```bash
claude -p "..." --allowedTools Read,Glob,Grep --output-format stream-json
```

- **Read-only tools only** — prevents accidental modifications
- Runs in the main repo directory (no worktree needed yet)
- Output: a description of planned changes

### Phase 2 — Execution

```bash
claude -p "..." --allowedTools Edit,Write,Bash,Read,Glob,Grep --output-format stream-json
```

- **Full tool access** — can create and modify files
- Runs inside an isolated git worktree based on `origin/main`
- Prompt includes instruction to suggest a commit message (prefixed with `COMMIT_MSG:`)

---

## State Machine

```
idle → planning → confirming → executing → reviewing → idle
                     ↑    |
                     |    ↓
                   (text refinement re-runs planning)

Any phase → idle (via /cancel or ❌ button)
```

### In-Memory State

```js
{
  isBusy: boolean,
  currentJob: {
    id: string,                // unique job ID (8-char UUID prefix)
    userMessage: string,       // original user input
    phase: string,             // planning | confirming | executing | reviewing
    plannedChanges: string,    // Claude Code Phase 1 output
    worktreePath: string,      // /tmp/telegram-bot-worktree/{id}
    branchName: string,        // telegram/YYYY-MM-DD-{slug}-{id}
    startedAt: Date,
    claudeProcess: ChildProcess, // for cancellation
    commitMessage: string,     // extracted from Phase 2 output
    confirmationTimer: Timeout // 30-min auto-cancel
  }
}
```

State is in-memory only. Bot restart clears any pending job (acceptable for a single-user local tool).

---

## Error Handling

| Error | Bot Response |
|-------|-------------|
| Claude Code CLI crashes | Kills process, cleans up worktree/branch, notifies you |
| Whisper API unreachable | "語音轉文字失敗，請再試或者打字" |
| Git worktree creation fails | Sends error, suggests checking for stale worktrees |
| Execution timeout (>5 min) | Kills process, cleans up, notifies you |
| Commit/PR creation fails | Preserves branch for manual recovery, notifies you |
| Confirmation timeout (30 min) | Auto-cancels and cleans up |

### Startup Cleanup

On every bot startup, it automatically:

1. Removes stale worktrees from `/tmp/telegram-bot-worktree/`
2. Deletes orphaned `telegram/*` local branches
3. Clears temp file directories from `/tmp/telegram-bot-*/`

---

## Cost

| Service | Cost |
|---------|------|
| OpenAI Whisper | ~$0.006/min of audio |
| Claude Code | Uses your existing Claude subscription |
| Telegram Bot API | Free |
| Everything runs locally | No server costs |

---

## Limitations

- Mac must be running and connected to internet
- Large operations (e.g., generating 10 topics at once) may take several minutes
- Telegram file upload limit: 20MB
- Telegram message limit: 4096 characters (diffs are automatically split)
- Media groups (multiple photos sent at once) are treated as separate messages by Telegram API
- Bot restart clears any pending job state
