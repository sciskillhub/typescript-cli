# sciskillhub

> **Discover and install AI agent skills for science** — Install skills to Claude, Cursor, Codex, and 40+ more agents instantly

[![npm version](https://img.shields.io/npm/v/sciskillhub.svg)](https://www.npmjs.com/package/sciskillhub)
[![npm downloads](https://img.shields.io/npm/dm/sciskillhub.svg)](https://www.npmjs.com/package/sciskillhub)

**Package:** `sciskillhub` · **Command:** `sciskill`

## Quick Example

```bash
# 1. Browse skills by taxonomy
sciskill tax                                            # View object / stage / domain options
sciskill tax --tasks --object "Methods and Techniques" --stage "Data Analysis and Modeling" --domain "Life Sciences"
sciskill browse skills --domain "Life Sciences" --task "Quality Control" "Clustering"

# 2. Install a skill
sciskill install scanpy --agent claude-code -y

# 3. Install a skill suite
sciskill install open-source/Boom5426/Nature-Paper-Skills --suite --agent codex -y

# 4. Now your agent can use it!
```

## Installation

### Option 1: Using npx (Recommended)

```bash
npx sciskillhub install <skill> --agent claude-code
npx sciskillhub install <suite> --suite --agent codex
```

No installation needed, always latest version.

### Option 2: Global Install

```bash
npm install -g sciskillhub
sciskill install <skill> --agent claude-code
sciskill install <suite> --suite --agent codex
```

## Recommended Workflow

SciSkillHub uses a 4-level taxonomy (object → stage → domain → task) to organize skills. Follow this order to narrow down results:

```
1. Judge 2-3 possible objects (e.g. Methods and Techniques + Software and Tools)
2. Judge 1-2 possible stages (e.g. Data Analysis and Modeling)
3. Judge domains (e.g. Life Sciences)
4. Query tasks for each object+stage combination
5. Query skills with selected tasks
6. Install the best match
```

**Try multiple object combinations** — many tasks span multiple dimensions. For example, "nanopore data analysis" involves both `Methods and Techniques` and `Software and Tools`.

## Commands

### Discover & Install

| Command | Description |
|---------|-------------|
| `sciskill tax` | View taxonomy values (object, stage, domain) |
| `sciskill tax --tasks --object X --stage Y --domain Z` | Query tasks by filters |
| `sciskill tax --task-list` | View all task values |
| `sciskill browse skills [options]` | Browse & filter skills by taxonomy |
| `sciskill search <query>` | Search skills by keywords `(s, find)` |
| `sciskill recommend` | Get personalized recommendations `(rec)` |
| `sciskill install <skill> --agent <name>` | Install a single skill to an agent `(i, add)` |
| `sciskill install <suite> --suite --agent <name>` | Install a full skill suite to an agent |

## Skill Suite Installation

Use `--suite` when the target is a skill suite rather than a single skill.

```bash
# Install a suite and link all bundled skills into Codex
sciskill install open-source/Boom5426/Nature-Paper-Skills --suite --agent codex

# Download the suite only, without linking to an agent
sciskill install open-source/Boom5426/Nature-Paper-Skills --suite
```

Current suite install behavior:

- Downloads the suite as one zip archive from SciSkillHub
- Extracts it into `~/sciskillhub/skill-suites/<suite-name>`
- Creates per-skill symlinks into the selected agent's skill directory

### Local Management

| Command | Description |
|---------|-------------|
| `sciskill list` | List locally installed skills `(ls)` |
| `sciskill remove <skill>` | Remove an installed skill `(rm, uninstall)` |
| `sciskill inspect` | Inspect skill in current directory |
| `sciskill init` | Initialize a new skill project |

### Account

| Command | Description |
|---------|-------------|
| `sciskill login` | Log in to SciSkillHub |
| `sciskill logout` | Log out |
| `sciskill whoami` | Show current user |

## Browse Skills Options

```bash
sciskill browse skills \
  --object "Methods and Techniques" \
  --stage "Data Analysis and Modeling" \
  --task "Quality Control" "Alignment" \
  --domain "Life Sciences" \
  --sort name \
  --limit 20
```

| Option | Description |
|--------|-------------|
| `--object <values...>` | Filter by object |
| `--stage <values...>` | Filter by stage |
| `--task <values...>` | Filter by tasks |
| `--domain <values...>` | Filter by domains |
| `-q, --query <text>` | Additional keyword filter |
| `--sort <field>` | Sort by: name, stars, recent, score |
| `--order <dir>` | Sort order: asc, desc |
| `-l, --limit <n>` | Number of results (default: 20) |
| `--json` | JSON output |

## Supported Agents (45)

| `--agent` | Agent | Global Path |
|-----------|-------|-------------|
| `claude-code` | Claude Code | `~/.claude/skills/` |
| `cursor` | Cursor | `~/.cursor/skills/` |
| `codex` | Codex | `~/.codex/skills/` |
| `gemini-cli` | Gemini CLI | `~/.gemini/skills/` |
| `github-copilot` | GitHub Copilot | `~/.copilot/skills/` |
| `windsurf` | Windsurf | `~/.codeium/windsurf/skills/` |
| `cline` | Cline | `~/.agents/skills/` |
| `warp` | Warp | `~/.agents/skills/` |
| `roo` | Roo Code | `~/.roo/skills/` |
| `augment` | Augment | `~/.augment/skills/` |
| `junie` | Junie | `~/.junie/skills/` |
| `opencode` | OpenCode | `~/.config/opencode/skills/` |
| `openclaw` | OpenClaw | `~/.openclaw/skills/` |
| `goose` | Goose | `~/.config/goose/skills/` |
| `amp` | Amp | `~/.config/agents/skills/` |
| `kimi-cli` | Kimi Code CLI | `~/.config/agents/skills/` |
| `replit` | Replit | `~/.config/agents/skills/` |
| `antigravity` | Antigravity | `~/.gemini/antigravity/skills/` |
| `bob` | IBM Bob | `~/.bob/skills/` |
| `codebuddy` | CodeBuddy | `~/.codebuddy/skills/` |
| `continue` | Continue | `~/.continue/skills/` |
| `cortex` | Cortex Code | `~/.snowflake/cortex/skills/` |
| `crush` | Crush | `~/.config/crush/skills/` |
| `deepagents` | Deep Agents | `~/.deepagents/agent/skills/` |
| `droid` | Droid | `~/.factory/skills/` |
| `firebender` | Firebender | `~/.firebender/skills/` |
| `iflow-cli` | iFlow CLI | `~/.iflow/skills/` |
| `kilo` | Kilo Code | `~/.kilocode/skills/` |
| `kiro-cli` | Kiro CLI | `~/.kiro/skills/` |
| `kode` | Kode | `~/.kode/skills/` |
| `mcpjam` | MCPJam | `~/.mcpjam/skills/` |
| `mistral-vibe` | Mistral Vibe | `~/.vibe/skills/` |
| `mux` | Mux | `~/.mux/skills/` |
| `openhands` | OpenHands | `~/.openhands/skills/` |
| `pi` | Pi | `~/.pi/agent/skills/` |
| `qoder` | Qoder | `~/.qoder/skills/` |
| `qwen-code` | Qwen Code | `~/.qwen/skills/` |
| `trae` | Trae | `~/.trae/skills/` |
| `trae-cn` | Trae CN | `~/.trae-cn/skills/` |
| `zencoder` | Zencoder | `~/.zencoder/skills/` |
| `neovate` | Neovate | `~/.neovate/skills/` |
| `pochi` | Pochi | `~/.pochi/skills/` |
| `adal` | AdaL | `~/.adal/skills/` |
| `universal` | Universal | `~/.config/agents/skills/` |
| `command-code` | Command Code | `~/.commandcode/skills/` |

**Backward-compatible aliases:** `claude` → `claude-code`, `gemini` → `gemini-cli`, `copilot` → `github-copilot`, `kiro` → `kiro-cli`

## Development

```bash
git clone https://github.com/sciskillhub/typescript-cli.git
cd typescript-cli
npm install
npm run build
npm link   # makes 'sciskill' available globally
```

## Links

- **Website:** https://sciskillhub.org
- **npm:** https://www.npmjs.com/package/sciskillhub
- **GitHub:** https://github.com/sciskillhub/typescript-cli

## License

MIT
