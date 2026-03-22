# @sciskillhub/cli

> **One-command install for AI agent skills** - Install skills to Claude, Cursor, Codex, and 6+ more agents instantly

[![npm version](https://img.shields.io/npm/v/@sciskillhub/cli.svg)](https://www.npmjs.com/package/@sciskillhub/cli)
[![npm downloads](https://img.shields.io/npm/dm/@sciskillhub/cli.svg)](https://www.npmjs.com/package/@sciskillhub/cli)

## Quick Example: Single Cell Analysis

```bash
# 1. Browse Life Science skills
npx @sciskillhub/cli list skill --subject life-science

# 2. Filter by tag
npx @sciskillhub/cli list skill --subject life-science --tag "single cell"

# 3. Install AnnData to Claude (use short name!)
npx @sciskillhub/cli install anndata --platform claude -y

# 4. Now Claude can help you analyze .h5ad files!
```

## Installation

### Option 1: Using npx (Recommended) ⭐

```bash
npx @sciskillhub/cli install <skill-slug> --platform claude
```

**Pros:** No installation, always latest version, works immediately

### Option 2: Global Installation

```bash
npm install -g @sciskillhub/cli

# Use shorter command
sciskillhub install <skill-slug> --platform claude
```

**Pros:** Faster, works offline, shorter command

## Usage Guide

### Example: Complete Single Cell Workflow

```bash
# Step 1: Browse Life Science category
npx @sciskillhub/cli list skill --subject life-science --limit 20

# Step 2: Filter by tags
npx @sciskillhub/cli list skill --subject life-science --tag "single cell"

# Step 3: Search by keywords
npx @sciskillhub/cli list skill --subject life-science --query "embedding"

# Step 4: Install core tools (use short names!)
npx @sciskillhub/cli install anndata --platform claude -y
npx @sciskillhub/cli install scanpy --platform claude -y
npx @sciskillhub/cli install scvi-tools --platform claude -y

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

### Discovery & Browse

| Command | Description |
|---------|-------------|
| `list subject` | List all subjects (学科) |
| `list skill --subject <name>` | Browse skills by subject |
| `list skill --tag <tag>` | Filter by tag |
| `list skill --query <text>` | Search by keywords |
| `list tag --subject <name>` | Show tags in a subject |

### Install

| Command | Description |
|---------|-------------|
| `install <skill> --platform <name>` | Install skill to AI agent |

**Smart Search:** Use short names like `anndata`, `scanpy`, `scvi-tools`. If multiple skills match, you'll be prompted to choose.

**Supported Platforms:** `claude`, `cursor`, `codex`, `gemini`, `copilot`, `windsurf`, `cline`, `roo`, `opencode`

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
# Browse Life Science skills
npx @sciskillhub/cli list skill --subject life-science

# Filter by single cell tag
npx @sciskillhub/cli list skill --subject life-science --tag "single cell"

# Search for embedding tools
npx @sciskillhub/cli list skill --subject life-science --query "embedding"

# List popular tags
npx @sciskillhub/cli list tag --subject life-science --limit 10
```

### Install Examples

```bash
# Install to Claude (personal)
npx @sciskillhub/cli install <skill-slug> --platform claude -y

# Install to Cursor (project-specific)
npx @sciskillhub/cli install <skill-slug> --platform cursor --project

# Install with custom directory
npx @sciskillhub/cli install <skill-slug> --platform claude -d /path/to/skills
```

## Why SciSkillHub CLI?

- **One Command, Any Agent** - Install to 9+ AI platforms with the same command
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
- **npm**: https://www.npmjs.com/package/@sciskillhub/cli
- **GitHub**: https://github.com/sciskillhub/typescript-cli

## License

MIT © [SciSkillHub](https://sciskillhub.org)
