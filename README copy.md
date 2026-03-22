# @sciskillhub/cli

> **One-command install for AI agent skills** - Install skills to Claude, Cursor, Codex, and 6+ more agents instantly

[![npm version](https://img.shields.io/npm/v/@sciskillhub/cli.svg)](https://www.npmjs.com/package/@sciskillhub/cli)
[![npm downloads](https://img.shields.io/npm/dm/@sciskillhub/cli.svg)](https://www.npmjs.com/package/@sciskillhub/cli)

## Quick Example: Single Cell Analysis with AnnData

```bash
# 1. Search for AnnData (single-cell data format)
npx @sciskillhub/cli search anndata

# 2. Browse Life Science skills
npx @sciskillhub/cli list skill --subject life-science

# 3. Install AnnData to Claude
npx @sciskillhub/cli install open-source/K-Dense-AI/claude-scientific-skills/scientific-skills/anndata --agent claude -y

# 4. Now Claude can help you analyze .h5ad files!
```

## Core Features

### One-Command Install
Install any skill to your AI agent with a single command:

```bash
npx @sciskillhub/cli install <skill-slug> --agent claude
```

**Supports 9+ Agent Platforms:**
- Claude Code, Cursor, Codex, Gemini, GitHub Copilot
- Windsurf, Cline, Roo Code, OpenCode

### Smart Discovery
Find the perfect skill with semantic search and filters:

```bash
# Semantic search
npx @sciskillhub/cli search "single cell rna sequencing"

# Browse by subject
npx @sciskillhub/cli list subject
npx @sciskillhub/cli list skill --subject life-science

# Filter by tag
npx @sciskillhub/cli list skill --tag "single cell"

# Combined filters
npx @sciskillhub/cli list skill --subject life-science --tag "data analysis"
```

## Installation

### Option 1: Using npx (Recommended) ⭐

```bash
npx @sciskillhub/cli install <skill-slug> --agent claude
```

**Pros:** No installation, always latest version, works immediately

### Option 2: Global Installation

```bash
npm install -g @sciskillhub/cli

# Use shorter command
sciskillhub install <skill-slug> --agent claude
```

**Pros:** Faster, works offline, shorter command

## Usage Guide

### Example: Complete Single Cell Workflow

```bash
# Step 1: Discover available single-cell tools
npx @sciskillhub/cli search "anndata"
npx @sciskillhub/cli search "scanpy"
npx @sciskillhub/cli search "scvi-tools"

# Step 2: Browse all Life Science skills
npx @sciskillhub/cli list skill --subject life-science --limit 20

# Step 3: Install core tools for your workflow
npx @sciskillhub/cli install open-source/K-Dense-AI/claude-scientific-skills/scientific-skills/anndata --agent claude -y
npx @sciskillhub/cli install open-source/K-Dense-AI/claude-scientific-skills/scientific-skills/scanpy --agent claude -y
npx @sciskillhub/cli install open-source/K-Dense-AI/claude-scientific-skills/scientific-skills/scvi-tools --agent claude -y

# Step 4: Use the skills in Claude
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
| `search <query>` | Semantic search for skills |
| `list subject` | List all subjects (学科) |
| `list skill --subject <name>` | Browse skills by subject |
| `list skill --tag <tag>` | Filter by tag |
| `list tag --subject <name>` | Show tags in a subject |
| `trending` | Show trending skills (24h) |
| `latest` | Show recently added skills |

### Install

| Command | Description |
|---------|-------------|
| `install <skill> --agent <name>` | Install skill to AI agent |

**Supported Agents:** `claude`, `cursor`, `codex`, `gemini`, `copilot`, `windsurf`, `cline`, `roo`, `opencode`

### Management

| Command | Description |
|---------|-------------|
| `login` | Log in to SciSkillHub |
| `init` | Create a new skill project |
| `push` | Push local files to remote |
| `publish` | Publish skill to public |
| `status` | Check local vs remote status |

## More Examples

### Discovery Examples

```bash
# Find single-cell analysis tools
npx @sciskillhub/cli search "single cell"

# Browse Life Science category
npx @sciskillhub/cli list skill --subject life-science

# Filter by multiple tags
npx @sciskillhub/cli list skill --subject life-science --tag "single cell" --tag "python"

# List popular tags
npx @sciskillhub/cli list tag --subject life-science
```

### Install Examples

```bash
# Install to Claude (personal)
npx @sciskillhub/cli install <skill-slug> --agent claude -y

# Install to Cursor (project-specific)
npx @sciskillhub/cli install <skill-slug> --agent cursor --project

# Install with custom directory
npx @sciskillhub/cli install <skill-slug> --agent claude -d /path/to/skills
```

### Skill Management Examples

```bash
# Create and publish a skill
npx @sciskillhub/cli login
npx @sciskillhub/cli init
# Edit your skill...
npx @sciskillhub/cli push
npx @sciskillhub/cli publish

# Check your skills
npx @sciskillhub/cli list
npx @sciskillhub/cli status
```

## Why SciSkillHub CLI?

- **One Command, Any Agent** - Install to 9+ AI platforms with the same command
- **Smart Discovery** - Semantic search + subject/tag filtering
- **Curated for Science** - Specialized tools for Life Science, Chemistry, Physics
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
- **npm**: https://www.npmjs.com/package/@sciskillhub/cli
- **GitHub**: https://github.com/sciskillhub/typescript-cli

## License

MIT © [SciSkillHub](https://sciskillhub.org)
