# Lenny's Podcast archive · espresso

**Repository:** [github.com/somthebuilder/espresso](https://github.com/somthebuilder/espresso)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

<p align="center">
  <img src="assets/espresso-logo.png" alt="espresso" width="120" />
</p>

**espresso** is a knowledge app that distills [Lenny's Podcast](https://www.youtube.com/@LennysPodcast) conversations into editorial-quality concepts, search, and chat—built on a large open transcript archive. Product context: [Updated_Final_PRD.md](Updated_Final_PRD.md).

This repository is **public on purpose**: fork it, run it locally, break things, and learn. Application code is [MIT-licensed](LICENSE); episode text remains third-party material—see [Disclaimer](#disclaimer) below.

## About Lenny's Podcast

Lenny's Podcast features interviews with world-class product leaders and growth experts, providing concrete, actionable, and tactical advice to help you build, launch, and grow your own product.

The markdown archive below is organized for AI assistants, research, and experimentation.

## What's in this repo

- **espresso app** (`frontend/`) — Next.js UI: Knowledge Base (Concepts), Ask the Collective (Chat), and related flows
- **Ingestion pipeline** (`scripts/`) — Gemini-powered extraction of guests, episodes, segments, books
- **Knowledge base** (`src/`) — Theme extraction, clustering, and RAG-oriented code
- **Database** — Supabase (PostgreSQL + pgvector); seed and migrations under `migrations/` (typical loaded data on the order of **303** episodes, **284** guests, **530** books—see [README_TRANSCRIPT_INGESTION.md](README_TRANSCRIPT_INGESTION.md) for table snapshots)

See [README_TRANSCRIPT_INGESTION.md](README_TRANSCRIPT_INGESTION.md) for pipeline setup and [CLAUDE.md](CLAUDE.md) for repository structure and working with transcripts.

## Quick start

**Browse by topic:** Start with [index/README.md](index/README.md) to explore episodes by topic.

**Search transcripts:**
```bash
grep -r "product-market fit" episodes/
```

**Run espresso locally:**
```bash
cd frontend && npm install && npm run dev
# Opens at http://localhost:3001
```

Configure Supabase and API keys as described in [README_TRANSCRIPT_INGESTION.md](README_TRANSCRIPT_INGESTION.md) if you run ingestion or the full stack.

## Repository structure

```
├── assets/                      # Shared media (e.g. espresso logo for docs)
├── episodes/                  # 303 episode transcripts
│   └── {guest-name}/
│       └── transcript.md
├── frontend/                  # espresso Next.js application
│   ├── app/                   # Pages and API routes
│   ├── components/            # React components
│   ├── public/                # Static assets (logo, etc.)
│   └── lib/                   # Utilities and Supabase client
├── src/                       # Python backend (knowledge base, RAG)
├── scripts/                   # Ingestion and extraction scripts
├── migrations/                # Supabase SQL migrations
├── index/                     # AI-generated topic index
│   ├── README.md              # Main entry point
│   ├── product-management.md
│   ├── leadership.md
│   └── ...                    # 50+ topic files
├── Updated_Final_PRD.md       # Product spec
└── README_TRANSCRIPT_INGESTION.md
```

## Episode format

Each episode has its own folder named after the guest(s), containing a `transcript.md` file with:

1. **YAML Frontmatter** - Structured metadata including:
   - `guest`: Name of the guest(s)
   - `title`: Full episode title
   - `youtube_url`: Link to the YouTube video
   - `video_id`: YouTube video ID
   - `publish_date`: Publication date (YYYY-MM-DD)
   - `description`: Episode description
   - `duration_seconds`: Episode length in seconds
   - `duration`: Human-readable duration
   - `view_count`: Number of views at time of archival
   - `channel`: Channel name

2. **Transcript Content** - Full text transcript of the episode

## Topic Index

The `index/` folder contains AI-generated keyword tags for each episode, organized by topic:

| Topic | Description |
|-------|-------------|
| [Product Management](index/product-management.md) | 57+ episodes on PM skills and practices |
| [Leadership](index/leadership.md) | Episodes on management and leadership |
| [Growth Strategy](index/growth-strategy.md) | Growth tactics and frameworks |
| [Product-Market Fit](index/product-market-fit.md) | Finding and measuring PMF |

See [index/README.md](index/README.md) for the complete list of 50 topics.

## Rebuilding the index

The index is generated using Claude CLI. To regenerate:

```bash
./scripts/build-index.sh
```

This processes transcripts through Claude to generate keyword tags. The script is idempotent - it skips episodes already present in keyword files, so it can be run multiple times safely.

## Usage with AI

### Loading Transcripts

Each transcript is a standalone markdown file that can be easily parsed by AI systems. The YAML frontmatter provides structured metadata that can be extracted programmatically.

### Example: reading a transcript

```python
import yaml

def read_transcript(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Split frontmatter and content
    parts = content.split('---')
    if len(parts) >= 3:
        frontmatter = yaml.safe_load(parts[1])
        transcript = '---'.join(parts[2:])
        return frontmatter, transcript
    return None, content

# Example usage
metadata, transcript = read_transcript('episodes/brian-chesky/transcript.md')
print(f"Guest: {metadata['guest']}")
print(f"Title: {metadata['title']}")
```

## Episode count

This archive contains **303** episode transcripts from Lenny's Podcast.

## Data sources

- **Transcripts**: Lenny's Podcast transcript archive (community / project sources as cited in history)
- **Metadata**: Aligned with the [Lenny's Podcast YouTube channel](https://www.youtube.com/@LennysPodcast)

## Disclaimer

This archive is for **education, research, and experimentation**. Episode audio and guest material belong to Lenny's Podcast and the respective guests. Please use the [official YouTube channel](https://www.youtube.com/@LennysPodcast) to support the show.

## License

- **Software** (app, scripts, and other original code in this repository): [MIT License](LICENSE).
- **Transcripts and quoted third-party text**: not licensed under the MIT; treat as archival reference material and respect creators’ rights. See the [LICENSE](LICENSE) file for the full split.
