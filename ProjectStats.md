# Project Statistics

## Dataset Overview
| Metric | Value |
|--------|-------|
| Total Raw Messages | 249,740 |
| Discord Channels | 26 |
| Channels Analyzed | 22 |
| Time Period | January 2025 |

---

## Filtering Results by Channel Category
| Channel Category | Raw Messages | After Filtering | Retention |
|------------------|--------------|-----------------|-----------|
| Electronic Repair | ~65,000 | ~1,600 | ~2.5% |
| Meshtastic (all) | ~60,000 | ~400 | ~0.7% |
| Amulius (all) | ~55,000 | ~350 | ~0.6% |
| Hardway Hacking | ~45,000 | ~380 | ~0.8% |
| Arduino | 40,647 | 317 | 0.78% |
| Others | ~25,000 | ~200 | ~0.8% |

---

## Extraction Results by Channel
| Channel | Threads | Vuln. | Tech. | HW | Proto. |
|---------|---------|-------|-------|-----|--------|
| ElectronicRepair_laptops | 379 | 620 | 794 | 823 | 88 |
| HardwayHacking_general | 344 | 341 | 532 | 87 | 43 |
| Meshtastic_firmware | 180 | 195 | 357 | 266 | 79 |
| meshatastic_firmware | 178 | 195 | 351 | 263 | 76 |
| Amulius_arm | 164 | 140 | 387 | 283 | 63 |
| Amulius_linux | 86 | 80 | 199 | 119 | 40 |
| ElectronicRepair_pc-repair | 41 | 77 | 104 | 105 | 16 |
| Amulius_esp32 | 40 | 39 | 86 | 58 | 21 |
| Other channels (14) | 112 | 86 | 208 | 251 | 58 |
| **TOTAL** | **1,524** | **1,773** | **3,018** | **2,255** | **484** |

---

## Pipeline Results Summary
| Stage | Output |
|-------|--------|
| Raw Messages | 249,740 |
| After Semantic Filtering | 3,200 |
| Conversation Threads | 1,524 |
| Structured Findings | 7,530 |

---

## Detailed Pipeline Stages

### Stage 1: Discord Export
| Metric | Value |
|--------|-------|
| Tool | DiscordChatExporter |
| Output Format | JSON |
| Data Captured | Message ID, author, timestamp, content, reply references |
| Total Servers | 12+ |
| Total Channels | 26 |
| Total Messages | 249,740 |

### Stage 2: Embedding Generation
| Metric | Value |
|--------|-------|
| Model | nomic-embed-text |
| Provider | Ollama (local) |
| Embedding Dimensions | 768 |
| Batch Size | 5,000 messages |
| Output | Vector representation per message |
| Cost | FREE (local processing) |

### Stage 3: Semantic Filtering
| Metric | Value |
|--------|-------|
| Method | Cosine similarity |
| Threshold | 0.55 |
| Query Concepts | hardware hacking, reverse engineering, firmware vulnerabilities, debugging, exploitation |
| Input | 249,740 messages |
| Output | 3,200 messages |
| Reduction | 98.7% |
| Retention Rate | 1.3% |

**What Gets Filtered OUT:**
- Greetings ("hi", "thanks", "lol")
- Off-topic chat
- Empty or very short messages
- General questions without security context

**What Gets KEPT:**
- Vulnerability discussions
- Debugging workflows
- Hardware specifications
- Protocol analysis
- Exploitation techniques

### Stage 4: Conversation Threading
| Metric | Value |
|--------|-------|
| Method | Reply chains + temporal clustering |
| Time Window | 5 minutes (300 seconds) |
| Input | 3,200 filtered messages |
| Output | 1,524 conversation threads |
| Avg Messages/Thread | ~2.1 |

**Threading Logic:**
1. Follow Discord reply chains (`reference.messageId`)
2. Group consecutive messages from same author within 5-min window
3. Expand context with surrounding messages
4. Merge overlapping clusters

### Stage 5: Structured Extraction
| Metric | Value |
|--------|-------|
| Model | GPT-4o-mini |
| Provider | OpenAI API |
| Temperature | 0.3 (deterministic) |
| Max Tokens | 1,500 per request |
| Input | 1,524 threads |
| Output | 7,530 structured findings |
| Cost per Thread | ~$0.001 |
| Total Cost | < $2 |

**Extraction Categories:**
| Category | Description | Count |
|----------|-------------|-------|
| Vulnerabilities | Security flaws, CVEs, exploits | 1,773 |
| Techniques | Methods, tools, approaches | 3,018 |
| Hardware | Chips, boards, devices | 2,255 |
| Protocols | Communication standards | 484 |

**Output Format:** JSON with fields:
- `summary` - Brief description of conversation
- `vulnerabilities[]` - Security issues found
- `techniques[]` - Methods discussed
- `hardware[]` - Devices mentioned
- `protocols[]` - Protocols referenced

## Findings Breakdown
| Category | Count |
|----------|-------|
| Techniques | 3,018 |
| Hardware | 2,255 |
| Vulnerabilities | 1,773 |
| Protocols | 484 |
| **Total** | **7,530** |

---

## Processing Metrics
| Metric | Value |
|--------|-------|
| Data Reduction | 98.7% |
| Similarity Threshold | 0.55 |
| Threading Time Window | 5 minutes |
| Embedding Model | nomic-embed-text (768 dimensions) |
| Extraction Model | GPT-4o-mini |
| Total Processing Time | ~30 minutes |
| OpenAI Cost | < $2 |

---

## Top Findings Across Channels
| Category | Item | Channels Found In |
|----------|------|-------------------|
| Protocol | SPI | 12 |
| Protocol | USB | 11 |
| Protocol | I2C | 10 |
| Protocol | JTAG | 10 |
| Hardware | ESP32 | 7 |
| Hardware | Raspberry Pi | 7 |
| Hardware | RP2040 | 6 |
| Hardware | STM32 | 6 |
| Technique | Reverse engineering | 5 |
| Technique | JTAG debugging | 4 |

---

## All 22 Analyzed Channels
1. Adafruit_fpga
2. Adafruit_helpwithhwdesign
3. Amulius_arm
4. Amulius_esp32
5. Amulius_linux
6. Amulius_risc-v
7. CutFreedom_hwinfo
8. CutFreedom_swinfo
9. Defcon_hw-hacks
10. ElectronicRepair_laptops
11. ElectronicRepair_pc-repair
12. HardwayHacking_general-hacking
13. HardwayHacking_hardware
14. KiCad_general
15. KiCad_pcb
16. meshatastic_firmware
17. meshatastic_flashingfw
18. Meshtastic_firmware
19. MisterFPGA_controllers
20. MisterFPGA_mister-debug
21. Rinkhals_HardwareHacking
22. SDRplusplus_dsp
23. SDRplusplus_programming
24. STM32World_general
25. STM32World_hardware

---

## Technology Stack
| Component | Technology |
|-----------|------------|
| Embeddings | Ollama + nomic-embed-text (local, free) |
| Extraction | OpenAI GPT-4o-mini (cloud, ~$0.001/thread) |
| Runtime | Node.js |
| Export Tool | DiscordChatExporter |
| Vector Similarity | Cosine similarity |

