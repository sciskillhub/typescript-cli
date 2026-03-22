# @sciskillhub/cli

> **One-command install for AI agent skills** - Install skills to Claude, Cursor, Codex, and 6+ more agents instantly

[![npm version](https://img.shields.io/npm/v/@sciskillhub/cli.svg)](https://www.npmjs.com/package/@sciskillhub/cli)
[![npm downloads](https://img.shields.io/npm/dm/@sciskillhub/cli.svg)](https://www.npmjs.com/package/@sciskillhub/cli)

## Core Features

### One-Command Install
Install any skill to your AI agent with a single command:

```bash
npx @sciskillhub/cli install frontend-design --agent claude
```

**Supports 9+ Agent Platforms:**
- Claude Code, Cursor, Codex, Gemini, GitHub Copilot
- Windsurf, Cline, Roo Code, OpenCode

### Smart Discovery
Find the perfect skill with semantic search, trending lists, and AI-powered recommendations:

```bash
# Semantic search
npx @sciskillhub/cli search "react best practices"

# Browse by subject
npx @sciskillhub/cli list subject

# List skills by subject/tag
npx @sciskillhub/cli list skill --subject life-science --tag "single cell"

# Trending skills (24h)
npx @sciskillhub/cli trending

# Latest additions
npx @sciskillhub/cli latest
```

### Skill Management
Create, publish, and manage your own skills:

```bash
# Create a new skill
npx @sciskillhub/cli init

# Publish to SkillHub
npx @sciskillhub/cli publish

# Sync with remote
npx @sciskillhub/cli push
```

## Installation

**Two ways to use:**

### Option 1: Using npx (Recommended) ⭐
No installation needed - always uses the latest version:

```bash
npx @sciskillhub/cli install frontend-design
npx @sciskillhub/cli search "react"
```

**Pros:**
- No installation required
- Always uses latest version
- No global package pollution
- Works immediately

### Option 2: Global Installation
Install once, use `sciskillhub` command directly:

```bash
npm install -g @sciskillhub/cli

# Then use shorter command
sciskillhub install frontend-design
sciskillhub search "react"
```

**Pros:**
- Shorter command (`sciskillhub` vs `npx @sciskillhub/cli`)
- Faster (no download on each run)
- Works offline after installation

**Note:** After global install, use `sciskillhub` instead of `npx @sciskillhub/cli`

## Quick Start

### 1. Discover Skills

```bash
# List all subjects
sciskillhub list subject

# List skills by subject
sciskillhub list skill --subject life-science

# Search with keywords
sciskillhub search "single cell"

# Browse trending (24h)
sciskillhub trending --limit 20

# See what's new
sciskillhub latest
```

### 2. Install a Skill

```bash
# Using npx (no install needed)
npx @sciskillhub/cli install frontend-design --agent claude

# Or if globally installed, use shorter command
sciskillhub install frontend-design --agent claude

# Install to project directory
sciskillhub install frontend-design --project
```

**Installation Locations:**
- **Personal (Global)**: `~/.claude/skills/` - Available for all projects
- **Project**: `./.claude/skills/` - Only for current project

### 3. Create & Publish

```bash
# Login first
sciskillhub login

# Initialize a skill project
sciskillhub init

# Edit SKILL.md, then push
sciskillhub push

# Make it public
sciskillhub publish
```

## All Commands

### Discover & Browse

| Command | Aliases | Description |
|---------|---------|-------------|
| `search <query>` | `s`, `find` | **Semantic search for skills** |
| `trending` | `hot`, `popular` | **Show trending skills (24h)** |
| `latest` | `new`, `recent` | **Show recently added skills** |
| `top` | `leaderboard`, `rank` | **Show all-time leaderboard** |
| `list` | `ls` | **List your skills or browse metadata** |
| `list subject [query]` | | List or search available subjects |
| `list tag [query]` | | List or search popular tags, supports `--subject` |
| `list skill` | | List or search skills, supports `--query`, `--subject`, and `--tag` |

### Install

| Command | Aliases | Description |
|---------|---------|-------------|
| `install <skill>` | `i`, `add` | **Install a skill to your agent** |

### Create & Manage

| Command | Description |
|---------|-------------|
| `login` | Log in to SkillHub |
| `init` | Initialize a new skill project |
| `push` | Push local files to remote |
| `pull` | Pull remote files to local |
| `status` | Show local vs remote status |
| `publish` | Publish skill to public directory |
| `whoami` | Show current logged in user |

## Install Command

### Basic Usage

```bash
# Using npx
npx @sciskillhub/cli install <skill-slug> [options]

# Or if globally installed
sciskillhub install <skill-slug> [options]
```

### Options

```bash
Options:
  -a, --agent <agent>    Target agent (claude, cursor, codex, gemini, copilot, windsurf, cline, roo, opencode)
  -p, --project          Install to project directory (default: personal)
  -d, --dir <path>       Custom install directory
  -y, --yes              Skip confirmation prompts
  --list-agents          List all supported agents
```

### Supported Agents

| Agent | Command | Install Path |
|-------|---------|--------------|
| **Claude Code** | `claude` | `~/.claude/skills/` |
| **Cursor** | `cursor` | `~/.cursor/skills/` |
| **Codex CLI** | `codex` | `~/.codex/skills/` |
| **Gemini CLI** | `gemini` | `~/.gemini/skills/` |
| **GitHub Copilot** | `copilot` | `~/.copilot/skills/` |
| **Windsurf** | `windsurf` | `~/.windsurf/skills/` |
| **Cline** | `cline` | `~/.cline/skills/` |
| **Roo Code** | `roo` | `~/.roo/skills/` |
| **OpenCode** | `opencode` | `~/.config/opencode/skills/` |

## Examples

### Discovery Examples

```bash
# List all available subjects
sciskillhub list subject

# Browse Life Science skills
sciskillhub list skill --subject life-science

# Search for single-cell related tools
sciskillhub search "single cell"

# Filter by subject and tag
sciskillhub list skill --subject life-science --tag "single cell"

# Browse trending
sciskillhub trending --limit 20

# List top tags
sciskillhub list tag --limit 10

# List tags under a subject
sciskillhub list tag --subject life-science
```

### Install Examples

```bash
# Quick install to Claude
sciskillhub install frontend-design --agent claude -y

# Install to Cursor project
sciskillhub install frontend-design --agent cursor --project

# Interactive install (choose agent & location)
sciskillhub install <skill-slug>
```

### Management Examples

```bash
# Create and publish a skill
sciskillhub login
sciskillhub init
# Edit SKILL.md...
sciskillhub push
sciskillhub publish

# Check status
sciskillhub status
sciskillhub list
```

## Why SciSkillHub CLI?

### **One Command, Any Agent**
Unlike other tools, install skills to **9+ different AI agents** with the same command.

### **Smart Discovery**
Semantic search powered by embeddings - find skills by what they do, not just keywords.

### **Browse by Subject & Tag**
Filter skills by学科 (subject) and 标签 (tag) to find exactly what you need.

### **Trending & Recommendations**
Discover what's popular and get personalized recommendations based on your needs.

### **Fast & Simple**
No complex setup - just `npx` and go. Works offline after installation.

### **Secure**
OAuth authentication, no API keys in code, credentials stored securely.

## Configuration

### User Config
Stored in `~/.skillhub/config.json`:
- API URL (default: `https://skillhub.club/api/v1`)
- Default visibility settings

### Auth Tokens
Stored securely in `~/.skillhub/auth.json` (mode 600):
- Access tokens
- Refresh tokens
- User info

### Local Project Config
Each skill project has `.skillhub.json`:
- Skill metadata
- Remote sync info
- Ignore patterns

## Development

```bash
# Clone
git clone https://github.com/sciskillhub/typescript-cli.git
cd typescript-cli

# Install
npm install

# Build
npm run build

# Dev mode (watch)
npm run dev

# Type check
npm run typecheck
```

## Links

- **Website**: https://sciskillhub.org
- **Documentation**: https://sciskillhub.org/docs
- **npm**: https://www.npmjs.com/package/@sciskillhub/cli
- **GitHub**: https://github.com/sciskillhub/typescript-cli
- **Issues**: https://github.com/sciskillhub/typescript-cli/issues

## License

MIT © [SciSkillHub](https://sciskillhub.org)
