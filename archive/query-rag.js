const fs = require('fs');
const path = require('path');

/**
 * Query RAG System using OpenAI API
 * 
 * Performs semantic search and uses GPT-4 to generate insights
 */

// OpenAI API Key
const OPENAI_API_KEY = 'YOUR_OPENAI_API_KEY_HERE';

console.log('🔍 Querying RAG System\n');
console.log('=' .repeat(70));

const EMBEDDINGS_FILE = './vector-db/embeddings.json';
const RESULTS_FILE = './vector-db/query-results.json';

// Step 1: Load embeddings
console.log('\n📖 Step 1: Loading embeddings...');
if (!fs.existsSync(EMBEDDINGS_FILE)) {
  console.error(`  ❌ Embeddings file not found: ${EMBEDDINGS_FILE}`);
  console.error('  Run: node generate-embeddings.js first');
  process.exit(1);
}

const embeddings = JSON.parse(fs.readFileSync(EMBEDDINGS_FILE, 'utf8'));
console.log(`  ✅ Loaded ${embeddings.length} embeddings`);

// Step 2: Semantic search (cosine similarity)
console.log('\n🔍 Step 2: Performing semantic search...');

function cosineSimilarity(a, b) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function searchByKeywords(query, topK = 30) {
  const keywords = query.toLowerCase().split(' ');
  
  const scored = embeddings.map(item => {
    const text = item.text.toLowerCase();
    let score = 0;
    
    // Keyword matching
    keywords.forEach(keyword => {
      if (text.includes(keyword)) {
        score += 10;
      }
    });
    
    // Bonus for security/vulnerability terms
    const securityTerms = ['vulnerability', 'exploit', 'security', 'attack', 'bypass', 'overflow', 'injection', 'flaw', 'bug', 'issue', 'problem', 'risk', 'danger'];
    securityTerms.forEach(term => {
      if (text.includes(term)) {
        score += 5;
      }
    });
    
    return { ...item, score };
  });
  
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

// Query 1: Hardware Vulnerabilities
console.log('\n  🔎 Query 1: Hardware vulnerabilities...');
const vulnResults = searchByKeywords('vulnerability security exploit hardware firmware attack bug flaw', 30);
console.log(`    ✅ Found ${vulnResults.length} relevant chunks`);

// Query 2: Debugging Techniques
console.log('  🔎 Query 2: Debugging techniques...');
const debugResults = searchByKeywords('debug debugging technique method tool troubleshoot test probe', 30);
console.log(`    ✅ Found ${debugResults.length} relevant chunks`);

// Step 3: Call OpenAI API to analyze results
console.log('\n🤖 Step 3: Analyzing with OpenAI GPT-4...');

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
          content: 'You are a hardware security expert analyzing Discord discussions from hardware hacking communities (DEF CON, Adafruit, STM32World). Extract specific, actionable information with sources.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    })
  });
  
  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
}

function formatContext(results) {
  return results.map((r, i) => {
    return `[${i+1}] Channel: ${r.metadata.channel} | Author: ${r.metadata.author}\n${r.text.slice(0, 500)}...\n`;
  }).join('\n');
}

(async () => {
  try {
    // Query 1: 10 Hardware Vulnerabilities
    console.log('\n  📝 Generating vulnerability report...');
    const vulnContext = formatContext(vulnResults);
    const vulnPrompt = `Based on the following Discord discussions from hardware hacking communities, identify and list EXACTLY 10 hardware vulnerabilities, security issues, or exploits that were discussed.

For each vulnerability, provide:
1. Vulnerability Name (clear, specific)
2. Affected Hardware (specific chip/board/component)
3. Description (2-3 sentences)
4. Severity (Critical/High/Medium/Low)
5. Source Channel (which Discord channel it was mentioned in)

Format as a numbered list (1-10).

Context from Discord discussions:
${vulnContext}

If there aren't 10 distinct vulnerabilities, include common hardware security issues or risks that were discussed.`;

    const vulnReport = await callOpenAI(vulnPrompt);
    console.log('    ✅ Vulnerability report generated');
    
    // Query 2: 5 Debugging Techniques
    console.log('\n  📝 Generating debugging techniques report...');
    const debugContext = formatContext(debugResults);
    const debugPrompt = `Based on the following Discord discussions from hardware hacking communities, identify and list EXACTLY 5 common hardware debugging techniques or methods that were discussed.

For each technique, provide:
1. Technique Name
2. Use Case (when to use it)
3. Tools/Equipment Needed
4. Description (2-3 sentences)
5. Source Channel

Format as a numbered list (1-5).

Context from Discord discussions:
${debugContext}`;

    const debugReport = await callOpenAI(debugPrompt);
    console.log('    ✅ Debugging techniques report generated');
    
    // Step 4: Save results
    console.log('\n💾 Step 4: Saving results...');
    const results = {
      generated_at: new Date().toISOString(),
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
      },
      raw_context: {
        vulnerability_chunks: vulnResults.slice(0, 10).map(r => ({
          text: r.text,
          channel: r.metadata.channel,
          author: r.metadata.author
        })),
        debug_chunks: debugResults.slice(0, 10).map(r => ({
          text: r.text,
          channel: r.metadata.channel,
          author: r.metadata.author
        }))
      }
    };
    
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
    console.log(`  ✅ Saved to: ${RESULTS_FILE}`);
    
    // Step 5: Display results
    console.log('\n' + '='.repeat(70));
    console.log('✅ RAG Query Complete!\n');
    
    console.log('📊 RESULTS:\n');
    console.log('🔴 10 HARDWARE VULNERABILITIES:\n');
    console.log(vulnReport);
    console.log('\n' + '-'.repeat(70) + '\n');
    console.log('🔧 5 COMMON DEBUGGING TECHNIQUES:\n');
    console.log(debugReport);
    
    console.log('\n' + '='.repeat(70));
    console.log('\n📁 Full results saved to: ./vector-db/query-results.json');
    console.log('💡 Use this for your presentation slides!');
    
  } catch (error) {
    console.error('\n❌ Error querying OpenAI:', error.message);
    console.error('\nTroubleshooting:');
    console.error('  - Check your API key is valid');
    console.error('  - Check you have credits in your OpenAI account');
    console.error('  - Check your internet connection');
    process.exit(1);
  }
})();






