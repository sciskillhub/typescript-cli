# sciskillhub

> **One-command install for AI agent skills** - Install skills to Claude, Cursor, Codex, and 10+ more agents instantly

[![npm version](https://img.shields.io/npm/v/sciskillhub.svg)](https://www.npmjs.com/package/sciskillhub)
[![npm downloads](https://img.shields.io/npm/dm/sciskillhub.svg)](https://www.npmjs.com/package/sciskillhub)

## Quick Example: Single Cell Analysis

```bash
# 1. Search for single cell skills
npx sciskillhub search "single cell"

# 2. Or browse by subject
npx sciskillhub list skill --subject life-science

# 3. Install AnnData to Claude
npx sciskillhub install anndata --agent claude -y

# 4. Now Claude can help you analyze .h5ad files!
```

## Installation

### Option 1: Using npx (Recommended) ⭐

```bash
npx sciskillhub install <skill-slug> --agent claude
```

**Pros:** No installation, always latest version, works immediately

### Option 2: Global Installation

```bash
npm install -g sciskillhub

# Use shorter command
sciskillhub install <skill-slug> --agent claude
```

**Pros:** Faster, works offline, shorter command

## Usage Guide

### Example: Complete Single Cell Workflow

```bash
# Step 1: Browse Life Science category
npx sciskillhub list skill --subject life-science --limit 20

# Step 2: Filter by tags
npx sciskillhub list skill --subject life-science --tag "single cell"

# Step 3: Search by keywords
npx sciskillhub list skill --subject life-science --query "embedding"

# Step 4: Install core tools (use short names!)
npx sciskillhub install anndata --agent claude -y
npx sciskillhub install scanpy --agent claude -y
npx sciskillhub install scvi-tools --agent claude -y

# Step 5: Use the skills in Claude
# Prompt: "Help me analyze this h5ad file with scanpy"
# Prompt: "Perform batch correction on my single-cell data using scvi-tools"
```

### Popular Single Cell Skills

| Skill | Description | Slug |
|-------|-------------|------|
| **anndata** | Data structure for .h5ad files, scverse ecosystem | `anndata` |
| **scanpy** | scRNA-seq pipeline: QC, clustering, markers | `scanpy` |
| **scvi-tools** | Deep learning: batch correction, integration | `scvi-tools` |
| **cellxgene-census** | Query 61M+ cells from CELLxGENE | `cellxgene-census` |
| **scvelo** | RNA velocity for trajectory inference | `scvelo` |
| **arboreto** | Gene regulatory networks (GRNBoost2) | `arboreto` |

## All Commands

### Discovery & Search

| Command | Description |
|---------|-------------|
| `search <query>` | Search skills by keywords `(s, find)` |
| `trending` | Show trending skills `(hot, popular)` |
| `latest` | Show recently added skills `(new, recent)` |
| `recommend` | Get personalized recommendations `(rec, suggest)` |
| `top` | Show all-time leaderboard `(leaderboard, rank)` |
| `list skill --subject <name>` | Browse skills by subject |
| `list skill --tag <tag>` | Filter by tag |
| `list tag --subject <name>` | Show tags in a subject |
| `list subject` | List all subjects |

### Install

| Command | Description |
|---------|-------------|
| `install <skill> --agent <name>` | Install skill to AI agent |

**Smart Search:** Use short names like `anndata`, `scanpy`, `scvi-tools`. If multiple skills match, you'll be prompted to choose.

**Supported Agents:** `claude`, `cursor`, `codex`, `gemini`, `copilot`, `windsurf`, `cline`, `roo`, `opencode`, `openclaw`, `junie`, `kiro`, `augment`, `warp`, `goose`

### Management

| Command | Description |
|---------|-------------|
| `login` | Log in to SciSkillHub |
| `init` | Create a new skill project |
| `push` | Push local files to remote |
| `publish` | Publish skill to public |
| `status` | Check local vs remote status |
| `list` | List your skills |

## Examples

### Discovery Examples

```bash
# Search by keywords
npx sciskillhub search "single cell"
npx sciskillhub search "protein structure"

# Browse by category
npx sciskillhub list skill --subject life-science
npx sciskillhub list skill --tag "genomics"

# Discover popular skills
npx sciskillhub trending --limit 10
npx sciskillhub top --limit 20
npx sciskillhub latest --limit 10

# Get personalized recommendations
npx sciskillhub recommend
```

### Install Examples

```bash
# Install to Claude (personal)
npx sciskillhub install <skill-slug> --agent claude -y

# Install to Cursor (project-specific)
npx sciskillhub install <skill-slug> --agent cursor --project

# Install with custom directory
npx sciskillhub install <skill-slug> --agent claude -d /path/to/skills
```

## Why SciSkillHub CLI?

- **One Command, Any Agent** - Install to 10+ AI agents with the same command
- **Smart Filtering** - Browse by subject (学科) and tag (标签)
- **Science-Focused** - Curated tools for Life Science, Chemistry, Physics
- **Works Offline** - Install once, use anywhere
- **Open Source** - MIT license, community driven

## Configuration

Config stored in `~/.skillhub/`:
- `config.json` - API URL, default settings
- `auth.json` - Secure authentication tokens

## Development

```bash
# Clone
git clone https://github.com/sciskillhub/typescript-cli.git
cd typescript-cli

# Install
npm install

# Build
npm run build

# Test
npm run typecheck
```

## Links

- **Website**: https://sciskillhub.org
- **npm**: https://www.npmjs.com/package/sciskillhub
- **GitHub**: https://github.com/sciskillhub/typescript-cli

## License

MIT © [SciSkillHub](https://sciskillhub.org)
