const fs = require('fs');

/**
 * Quick RAG Query (Skip Embeddings, Use Direct Keyword Search + OpenAI)
 * 
 * Faster alternative that doesn't require embeddings
 */

const OPENAI_API_KEY = 'YOUR_OPENAI_API_KEY_HERE';

console.log('⚡ Quick RAG Query (No Embeddings Required)\n');
console.log('=' .repeat(70));

const CHUNKS_FILE = './vector-db/chunks.json';
const RESULTS_FILE = './vector-db/quick-results.json';

// Load chunks
console.log('\n📖 Loading chunks...');
const chunks = JSON.parse(fs.readFileSync(CHUNKS_FILE, 'utf8'));
console.log(`  ✅ Loaded ${chunks.length} chunks`);

// Keyword-based search
console.log('\n🔍 Performing keyword search...');

function searchByKeywords(keywords, topK = 50) {
  const keywordList = keywords.toLowerCase().split(' ');
  
  const scored = chunks.map(chunk => {
    const text = chunk.text.toLowerCase();
    let score = 0;
    
    // Count keyword matches
    keywordList.forEach(keyword => {
      const matches = (text.match(new RegExp(keyword, 'g')) || []).length;
      score += matches * 10;
    });
    
    // Bonus for longer, more detailed messages
    if (chunk.text.length > 200) score += 2;
    if (chunk.text.length > 500) score += 3;
    
    return { ...chunk, score };
  });
  
  return scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

// Search for vulnerabilities
console.log('  🔎 Searching for vulnerabilities...');
const vulnResults = searchByKeywords(
  'vulnerability vulnerabilities security exploit attack bug flaw issue problem risk danger bypass overflow injection hack',
  50
);
console.log(`    ✅ Found ${vulnResults.length} relevant chunks`);

// Search for debugging techniques
console.log('  🔎 Searching for debugging techniques...');
const debugResults = searchByKeywords(
  'debug debugging debugger technique method tool probe test troubleshoot jtag swd uart serial gdb openocd',
  50
);
console.log(`    ✅ Found ${debugResults.length} relevant chunks`);

// Call OpenAI
console.log('\n🤖 Analyzing with OpenAI GPT-4...\n');

async function callOpenAI(prompt) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a hardware security expert analyzing Discord discussions from hardware hacking communities (DEF CON, Adafruit, STM32World). Extract specific, actionable information with sources. Be concise and technical.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2500
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
}

function formatContext(results, maxChunks = 40) {
  return results.slice(0, maxChunks).map((r, i) => {
    const preview = r.text.length > 400 ? r.text.slice(0, 400) + '...' : r.text;
    return `[Chunk ${i+1}] Channel: ${r.metadata.channel} | Author: ${r.metadata.author}\n${preview}\n`;
  }).join('\n---\n');
}

(async () => {
  try {
    // Query 1: 10 Hardware Vulnerabilities
    console.log('  📝 Query 1: Extracting 10 hardware vulnerabilities...');
    const vulnContext = formatContext(vulnResults, 40);
    const vulnPrompt = `Analyze these Discord discussions from hardware hacking communities (DEF CON, Adafruit, STM32World) and identify EXACTLY 10 hardware vulnerabilities, security issues, or exploits.

For each vulnerability, provide:
1. **Vulnerability Name** (clear, specific)
2. **Affected Hardware** (specific chip/board/component if mentioned)
3. **Description** (2-3 sentences explaining the issue)
4. **Severity** (Critical/High/Medium/Low)
5. **Source** (which channel: Defcon_hw-hacks, Adafruit_helpwithhwdesign, or STM32World_hardware)

Format as:
### 1. [Vulnerability Name]
- **Hardware:** [specific hardware]
- **Description:** [2-3 sentences]
- **Severity:** [level]
- **Source:** [channel]

(Repeat for all 10)

Discord Context:
${vulnContext}

If there aren't 10 explicit vulnerabilities, include common hardware security risks, design flaws, or attack vectors discussed.`;

    const vulnReport = await callOpenAI(vulnPrompt);
    console.log('    ✅ Vulnerability report generated\n');
    
    // Query 2: 5 Debugging Techniques
    console.log('  📝 Query 2: Extracting 5 debugging techniques...');
    const debugContext = formatContext(debugResults, 40);
    const debugPrompt = `Analyze these Discord discussions from hardware hacking communities and identify EXACTLY 5 common hardware debugging techniques or methods.

For each technique, provide:
1. **Technique Name**
2. **Use Case** (when/why to use it)
3. **Tools/Equipment** (what's needed)
4. **Description** (2-3 sentences with practical details)
5. **Source** (which channel)

Format as:
### 1. [Technique Name]
- **Use Case:** [when to use]
- **Tools:** [equipment needed]
- **Description:** [2-3 sentences]
- **Source:** [channel]

(Repeat for all 5)

Discord Context:
${debugContext}`;

    const debugReport = await callOpenAI(debugPrompt);
    console.log('    ✅ Debugging techniques report generated\n');
    
    // Save results
    console.log('💾 Saving results...');
    const results = {
      generated_at: new Date().toISOString(),
      method: 'keyword_search + gpt-4o-mini',
      queries: {
        vulnerabilities: {
          query: '10 hardware vulnerabilities',
          chunks_analyzed: vulnResults.length,
          report: vulnReport
        },
        debugging_techniques: {
          query: '5 common debugging techniques',
          chunks_analyzed: debugResults.length,
          report: debugReport
        }
      }
    };
    
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
    console.log(`  ✅ Saved to: ${RESULTS_FILE}\n`);
    
    // Display results
    console.log('=' .repeat(70));
    console.log('✅ RAG QUERY COMPLETE!\n');
    
    console.log('🔴 10 HARDWARE VULNERABILITIES:\n');
    console.log(vulnReport);
    console.log('\n' + '='.repeat(70) + '\n');
    console.log('🔧 5 COMMON DEBUGGING TECHNIQUES:\n');
    console.log(debugReport);
    
    console.log('\n' + '='.repeat(70));
    console.log('\n📁 Full results saved to: ./vector-db/quick-results.json');
    console.log('💡 Use this for your presentation slides!');
    console.log('\n💰 Estimated cost: ~$0.50-1.00');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('  - Check your OpenAI API key is valid');
    console.error('  - Check you have credits ($1-2 needed)');
    console.error('  - Check your internet connection');
    process.exit(1);
  }
})();

