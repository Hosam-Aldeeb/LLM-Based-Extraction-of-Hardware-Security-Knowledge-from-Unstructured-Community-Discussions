# Hardware Security Knowledge Extraction Pipeline

An automated system for extracting structured security insights from Discord community discussions using semantic embeddings and LLM-based analysis.

## Overview

This pipeline processes raw Discord message exports and extracts structured hardware security knowledge including:
- **Vulnerabilities** (CVEs, failure modes, security flaws)
- **Techniques** (debugging methods, exploitation approaches)
- **Hardware** (components, devices, chips)
- **Protocols** (JTAG, SPI, I2C, USB, etc.)

### Pipeline Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Discord   │ -> │  Embedding  │ -> │  Semantic   │ -> │   Thread    │ -> │  GPT-4o-mini│
│   Export    │    │  Generation │    │  Filtering  │    │   Recon.    │    │  Extraction │
│   (Step 1)  │    │  + Filter   │    │             │    │  (Step 3)   │    │  (Step 4)   │
│             │    │  (Step 2)   │    │             │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
   EXTERNAL            LOCAL              LOCAL              LOCAL              CLOUD
                       (free)             (free)             (free)            (~$1.50)
```

---

## Prerequisites

### Required Software

| Software | Version | Purpose | Installation |
|----------|---------|---------|--------------|
| **Node.js** | 18+ | Runtime for all scripts | https://nodejs.org/ |
| **Ollama** | Latest | Local LLM for embeddings | https://ollama.ai/ |
| **DiscordChatExporter** | Latest | Export Discord messages | https://github.com/Tyrrrz/DiscordChatExporter |

### Setup

1. Install Node.js and Ollama
2. Download the embedding model:
   ```bash
   ollama pull nomic-embed-text
   ```
3. Get an OpenAI API key from https://platform.openai.com/api-keys

---

## Quick Start: Processing New Channels

Follow these 4 steps to analyze new Discord channels:

### Step 1: Export Discord Messages

Use DiscordChatExporter to export each channel:

```bash
DiscordChatExporter.Cli export -t "YOUR_DISCORD_TOKEN" -c CHANNEL_ID -f Json -o discord-exports/
```

**Optional: Filter by date range:**
```bash
# Export only messages after a specific date
DiscordChatExporter.Cli export -t "TOKEN" -c CHANNEL_ID -f Json -o ./ --after 2025-01-01

# Export messages between two dates
DiscordChatExporter.Cli export -t "TOKEN" -c CHANNEL_ID -f Json -o ./ --after 2025-01-01 --before 2025-02-01
```

**Important:** After export, rename the file to match this pattern:
```
{ChannelName}_Jan2025_export.json
```
Example: `TryHackMe_research_Jan2025_export.json`

**Getting your Discord token:**
1. Open Discord in browser (discord.com/app)
2. Press F12 → Network tab
3. Send a message in any channel
4. Find a request to `discord.com/api`
5. Look for `Authorization` header → copy the token

**Output:** `discord-exports/YourChannel_export.json`

---

### Step 2: Generate Embeddings + Filter

**Edit `process-all-remaining.js`:**

Find the `CHANNELS` array at the top and add your channel names:

```javascript
// 🔧 USER CONFIGURATION - EDIT THIS SECTION
const CHANNELS = [
    'YourChannel1',    // ← Add your channel names
    'YourChannel2',
    'YourChannel3'
];
```

**Run:**
```bash
node process-all-remaining.js
```

**Output:** `YourChannel1_filtered_messages.json`, etc.

---

### Step 3: Thread Conversations (⚠️ Per-Channel)

**⚠️ IMPORTANT:** You must run this script ONCE FOR EACH CHANNEL.

**Edit `thread-conversations.js`:**

```javascript
// 🔧 USER CONFIGURATION - EDIT THESE FOR EACH CHANNEL
const FILTERED_MESSAGES_FILE = './YourChannel1_filtered_messages.json';  // ← CHANGE THIS
const ORIGINAL_EXPORT_FILE = './discord-exports/YourChannel1_export.json';  // ← CHANGE THIS
const OUTPUT_FILE = 'YourChannel1_threaded_conversations.json';  // ← CHANGE THIS
const OUTPUT_TXT = 'YourChannel1_threaded_conversations.txt';  // ← CHANGE THIS
```

**Run:**
```bash
node thread-conversations.js
```

**Repeat for each channel** (edit the 4 file paths, run again).

**Output:** `YourChannel1_threaded_conversations.json`, etc.

---

### Step 4: Extract with OpenAI

**Edit `analyze-all-with-openai.js`:**

Find the `CHANNELS` array and add your channel names:

```javascript
// 🔧 USER CONFIGURATION - EDIT THIS SECTION
const CHANNELS = [
    'YourChannel1',
    'YourChannel2',
    'YourChannel3'
];
```

Also set your OpenAI API key (line 32):
```javascript
const OPENAI_API_KEY = 'your-api-key-here';
```

**Run:**
```bash
node analyze-all-with-openai.js
```

**Output:** `YourChannel1_openai_analysis.json`, etc.

---

## Complete Workflow Summary

```
For 3 new channels (ChannelA, ChannelB, ChannelC):

Step 1: Export
        └── DiscordChatExporter → 3 JSON files in discord-exports/

Step 2: Embed + Filter (ONE run)
        └── Edit process-all-remaining.js → Add 3 channel names
        └── Run: node process-all-remaining.js
        └── Creates: 3 *_filtered_messages.json files

Step 3: Thread (THREE runs - once per channel)
        └── Edit thread-conversations.js → Set ChannelA paths → Run
        └── Edit thread-conversations.js → Set ChannelB paths → Run
        └── Edit thread-conversations.js → Set ChannelC paths → Run
        └── Creates: 3 *_threaded_conversations.json files

Step 4: Extract (ONE run)
        └── Edit analyze-all-with-openai.js → Add 3 channel names + API key
        └── Run: node analyze-all-with-openai.js
        └── Creates: 3 *_openai_analysis.json files

Done! View results with: node view-top-findings.js
```

---

## Concrete Example: 2 Channels

**Scenario:** You want to analyze two Discord channels:
- `HackerSpace_general`
- `HackerSpace_hardware`

### Step 1: Export

```bash
# Export channel 1 (ID: 123456789)
DiscordChatExporter.Cli export -t "YOUR_TOKEN" -c 123456789 -f Json -o discord-exports/

# Export channel 2 (ID: 987654321)
DiscordChatExporter.Cli export -t "YOUR_TOKEN" -c 987654321 -f Json -o discord-exports/
```

**Result:**
```
discord-exports/
├── HackerSpace_general_Jan2025_export.json
└── HackerSpace_hardware_Jan2025_export.json
```

### Step 2: Embed + Filter

**Edit `process-all-remaining.js`:**
```javascript
const CHANNELS = [
    'HackerSpace_general',
    'HackerSpace_hardware'
];
```

**Run:**
```bash
node process-all-remaining.js
```

**Result:** Creates `HackerSpace_general_filtered_messages.json` and `HackerSpace_hardware_filtered_messages.json`

### Step 3: Thread (Run TWICE)

**First run - Edit `thread-conversations.js`:**
```javascript
const FILTERED_MESSAGES_FILE = './HackerSpace_general_filtered_messages.json';
const ORIGINAL_EXPORT_FILE = './discord-exports/HackerSpace_general_Jan2025_export.json';
const OUTPUT_FILE = 'HackerSpace_general_threaded_conversations.json';
const OUTPUT_TXT = 'HackerSpace_general_threaded_conversations.txt';
```

```bash
node thread-conversations.js
```

**Second run - Edit `thread-conversations.js` again:**
```javascript
const FILTERED_MESSAGES_FILE = './HackerSpace_hardware_filtered_messages.json';
const ORIGINAL_EXPORT_FILE = './discord-exports/HackerSpace_hardware_Jan2025_export.json';
const OUTPUT_FILE = 'HackerSpace_hardware_threaded_conversations.json';
const OUTPUT_TXT = 'HackerSpace_hardware_threaded_conversations.txt';
```

```bash
node thread-conversations.js
```

**Result:** Creates both `*_threaded_conversations.json` files

### Step 4: Extract with OpenAI

**Edit `analyze-all-with-openai.js`:**
```javascript
const CHANNELS = [
    'HackerSpace_general',
    'HackerSpace_hardware'
];

const OPENAI_API_KEY = 'sk-your-api-key-here';
```

**Run:**
```bash
node analyze-all-with-openai.js
```

**Result:** Creates `HackerSpace_general_openai_analysis.json` and `HackerSpace_hardware_openai_analysis.json`

### Step 5: View Results

```bash
node view-top-findings.js
```

### Final Files Created

```
MCP/
├── discord-exports/
│   ├── HackerSpace_general_Jan2025_export.json
│   └── HackerSpace_hardware_Jan2025_export.json
├── HackerSpace_general_filtered_messages.json
├── HackerSpace_general_threaded_conversations.json
├── HackerSpace_general_openai_analysis.json
├── HackerSpace_hardware_filtered_messages.json
├── HackerSpace_hardware_threaded_conversations.json
├── HackerSpace_hardware_openai_analysis.json
└── TOP_FINDINGS_SUMMARY.json
```

---

## Core Scripts

### Scripts → Stages Mapping

| Script | Stage 1 | Stage 2 | Stage 3 | Stage 4 | Stage 5 |
|--------|:-------:|:-------:|:-------:|:-------:|:-------:|
| DiscordChatExporter (external) | ✅ | | | | |
| `process-all-remaining.js` | | ✅ | ✅ | | |
| `thread-conversations.js` | | | | ✅ | |
| `analyze-all-with-openai.js` | | | | | ✅ |
| `view-top-findings.js` | | | | | (results) |

**Stage Legend:**
- **Stage 1:** Export Discord messages to JSON
- **Stage 2:** Generate embeddings (Ollama + nomic-embed-text)
- **Stage 3:** Filter by cosine similarity (threshold 0.55)
- **Stage 4:** Group into conversation threads
- **Stage 5:** Extract findings with GPT-4o-mini

### What Each Script Does

| Script | What It Does | What to Edit | Runs |
|--------|--------------|--------------|------|
| `process-all-remaining.js` | Generates embeddings + filters messages | `CHANNELS` array | Once |
| `thread-conversations.js` | Groups messages into conversation threads | 4 file paths | Per channel |
| `analyze-all-with-openai.js` | Extracts vulnerabilities, techniques, etc. | `CHANNELS` array + API key | Once |
| `view-top-findings.js` | Displays aggregated results | Nothing | Once |

### Alternative Scripts (Optional)

| Script | Stages | Notes |
|--------|--------|-------|
| `filter-cybersecurity-messages.js` | 3 only | Standalone filtering for single channel |
| `analyze-with-openai.js` | 5 only | Single channel extraction |

---

## Configuration Options

### Similarity Threshold

In `process-all-remaining.js` (line 44):

```javascript
const SIMILARITY_THRESHOLD = 0.55;  // 0.5 = loose, 0.6 = strict
```

### Time Window for Threading

In `thread-conversations.js` (line 17):

```javascript
const TIME_WINDOW_MS = 5 * 60 * 1000;  // 5 minutes
```

---

## Customizing Prompts

### Semantic Filtering Query

In `process-all-remaining.js` (line 47):

```javascript
const CYBER_QUERY = `
cybersecurity hardware hacking vulnerabilities exploits 
JTAG UART SPI I2C firmware reverse engineering 
debugging bootloader flash memory encryption 
security vulnerabilities penetration testing 
exploit development buffer overflow 
hardware security embedded systems IoT security
`;
```

**To customize:** Add/remove keywords to change what messages get filtered in. Messages with embeddings similar to this query will pass through.

---

### OpenAI Extraction Prompt

In `analyze-all-with-openai.js` (line 108):

```javascript
const prompt = `Analyze this Discord conversation about hardware/cybersecurity and extract:

1. **Vulnerabilities**: Any security issues, exploits, or weaknesses discussed
2. **Techniques**: Methods, tools, or approaches mentioned
3. **Hardware**: Specific hardware, chips, or devices discussed
4. **Protocols**: Communication protocols or interfaces mentioned (UART, SPI, JTAG, etc.)

Conversation:
${conversationText}

Respond in JSON format:
{
  "vulnerabilities": ["list of vulnerabilities"],
  "techniques": ["list of techniques"],
  "hardware": ["list of hardware"],
  "protocols": ["list of protocols"],
  "summary": "brief summary of the conversation"
}`;
```

**System prompt** (line 130):
```javascript
content: 'You are a hardware security expert analyzing Discord discussions. Extract structured information and respond only with valid JSON.'
```

**To customize:** 
- Add new extraction categories (e.g., `"tools"`, `"CVEs"`)
- Change the focus (e.g., from hardware security to software security)
- Adjust the system prompt personality/expertise

---

### Alternative Detailed Prompt

In `analyze-with-openai.js` (line 23) there's a more detailed prompt with structured output:

```javascript
const SYSTEM_PROMPT = `You are an expert cybersecurity researcher analyzing hardware hacking and embedded systems discussions.

Your task is to extract structured information from conversation threads about:
- Hardware vulnerabilities and exploits
- Debugging and reverse engineering techniques
- Security risks and mitigations
- Hardware components and tools mentioned
- Protocols (JTAG, UART, SPI, I2C, etc.)

Return your analysis as a JSON object with this structure:
{
  "summary": "Brief 1-2 sentence summary of the conversation",
  "topic": "Main topic",
  "relevance_score": 0-10,
  "vulnerabilities": [
    {
      "type": "vulnerability type",
      "description": "what it is",
      "severity": "Low/Medium/High/Critical",
      "hardware_affected": "specific hardware if mentioned"
    }
  ],
  "techniques": [...],
  ...
}`;
```

---

## Output Files

| File Pattern | Description |
|--------------|-------------|
| `{Channel}_filtered_messages.json` | Messages that passed semantic filtering |
| `{Channel}_filtered_messages.txt` | Human-readable version |
| `{Channel}_threaded_conversations.json` | Grouped conversation threads |
| `{Channel}_openai_analysis.json` | Structured extraction results |
| `TOP_FINDINGS_SUMMARY.json` | Aggregated findings across all channels |

---

## Troubleshooting

### Ollama Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:11434
```
**Fix:** Start Ollama: `ollama serve`

### Ollama Memory Error
```
Error: model requires more system memory
```
**Fix:** Close other applications or use a smaller model.

### OpenAI Rate Limit
```
Error: 429 Too Many Requests
```
**Fix:** Wait a few minutes and try again.

### Discord Token Invalid
```
Error: Authentication token is invalid
```
**Fix:** Get a fresh token from browser DevTools.

---

## Project Structure

```
MCP/
├── Core Scripts
│   ├── process-all-remaining.js    ← Stage 2: Embed + Filter (all channels)
│   ├── thread-conversations.js     ← Stage 3: Threading (per channel)
│   ├── analyze-all-with-openai.js  ← Stage 4: Extraction (all channels)
│   ├── analyze-with-openai.js      ← Stage 4: Extraction (single channel)
│   ├── filter-cybersecurity-messages.js  ← Stage 2-3 standalone
│   └── view-top-findings.js        ← View aggregated results
│
├── archive/                    ← Old/experimental scripts
├── discord-exports/            ← Raw Discord JSON exports
├── vector-db/                  ← Pre-computed embeddings
├── *_filtered_messages.json    ← Filtering output
├── *_threaded_conversations.json ← Threading output
├── *_openai_analysis.json      ← Extraction results
└── TOP_FINDINGS_SUMMARY.json   ← Aggregated findings
```

---

## Results from Original Analysis

From analyzing 249,740 messages across 26 channels:

| Metric | Value |
|--------|-------|
| Raw messages | 249,740 |
| After filtering | 3,200 (~1.3%) |
| Conversation threads | 1,524 |
| Total findings | 7,530 |
| Vulnerabilities | 1,773 |
| Techniques | 3,018 |
| Hardware mentions | 2,255 |
| Protocols | 484 |
| Total OpenAI cost | < $2.00 |

---

## Author

Hosam Aldeeb  
University of Waterloo  
ECE 699 - December 2025
