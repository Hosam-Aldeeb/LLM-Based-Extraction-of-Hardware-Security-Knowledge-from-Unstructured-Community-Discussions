const fs = require('fs');

// Read both exports
const lab4Data = JSON.parse(fs.readFileSync('discord-exports/ece722_lab4_Nov24-29_export.json', 'utf8'));
const homeworkData = JSON.parse(fs.readFileSync('discord-exports/ece722_homework_Nov27-29_export.json', 'utf8'));

// Combine and sort messages by timestamp
const allMessages = [...lab4Data.messages, ...homeworkData.messages].sort((a, b) => 
    new Date(a.timestamp) - new Date(b.timestamp)
);

console.log(`\nProcessing ${allMessages.length} total messages for Lab 4...\n`);

// Extract text content
let fullText = '=== ECE722 LAB 4: 2048-BIT ADDER ===\n';
fullText += '=== Messages from Nov 24-29, 2025 ===\n';
fullText += '=== Channels: homework-logistics + homework-help ===\n\n';

allMessages.forEach(msg => {
    const timestamp = new Date(msg.timestamp).toLocaleString();
    const author = msg.author.name;
    const content = msg.content;
    
    if (content && content.trim().length > 0) {
        fullText += `[${timestamp}] ${author}:\n${content}\n\n`;
    }
});

// Save full text
fs.writeFileSync('discord-exports/ece722_lab4_ALL_MESSAGES.txt', fullText, 'utf8');
console.log('✅ Saved full text to: ece722_lab4_ALL_MESSAGES.txt');
console.log(`   Total characters: ${fullText.length.toLocaleString()}`);

// Create focused summary prompt
const summaryPrompt = `You are analyzing Discord messages from an ECE722 (Digital Systems Design) course about Lab 4.

LAB 4 CONTEXT:
- Implementation of a 2048-bit adder using two approaches
- Naive approach: pipelined adder (any technique from Lab 3)
- Clever approach: Type-2 prefix adder from "Monster Adders" paper
- Focus on achieving high frequency (Fmax) with low ALM utilization
- Must implement prefix_tree.sv (Kogge-Stone, Sklansky, or Brent-Kung)
- Parameters: M (chunk size for RCA), P (prefix tree size = W/M)
- Goal: Optimize for Fmax, ALM count, Quartus runtime

ANALYZE THE FOLLOWING MESSAGES AND EXTRACT:

1. COMMON ISSUES & DEBUGGING
   - What problems are students encountering?
   - Error messages and their solutions
   - Compilation/synthesis issues

2. DESIGN DECISIONS & OPTIMIZATIONS
   - What values of M (chunk size) are being discussed?
   - Pipelining strategies
   - Prefix tree choices (Kogge-Stone vs. Sklansky vs. Brent-Kung)
   - Retiming and hyperflex usage

3. TECHNICAL TIPS & INSIGHTS
   - Best practices mentioned
   - Performance optimization techniques
   - Quartus-specific tips
   - Fmax improvement strategies

4. QUESTIONS & ANSWERS
   - Key clarifications from TAs/Prof
   - Common misunderstandings resolved
   - Important implementation details

5. RESULTS & BENCHMARKS
   - Any Fmax values mentioned
   - ALM utilization numbers
   - Comparisons between approaches

Provide a comprehensive summary organized by these categories.

MESSAGES:
${fullText}`;

// Save prompt
fs.writeFileSync('discord-exports/ece722_lab4_PROMPT.txt', summaryPrompt, 'utf8');
console.log('✅ Created summary prompt: ece722_lab4_PROMPT.txt');
console.log('\n📝 Now run Ollama to generate summary:');
console.log('   ollama run llama3.1 < discord-exports/ece722_lab4_PROMPT.txt > discord-exports/ece722_lab4_SUMMARY.txt\n');





