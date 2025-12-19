const fs = require('fs');

/**
 * OPENAI ANALYSIS - Extract Research Insights from Threaded Conversations
 * Uses GPT-4o-mini to analyze conversation threads and extract structured data
 */

const THREADED_CONVERSATIONS_FILE = './threaded_conversations.json';
// Set your OpenAI API key as environment variable: $env:OPENAI_API_KEY = "sk-..."
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'YOUR_API_KEY_HERE';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OUTPUT_FILE = 'openai_analysis_results.json';
const OUTPUT_TXT = 'openai_analysis_report.txt';

// Analysis settings
const BATCH_SIZE = 5; // Process 5 threads at a time
const MIN_MESSAGES_FOR_ANALYSIS = 3; // Skip threads with < 3 messages

console.log('🤖 OPENAI ANALYSIS SYSTEM\n');
console.log('='.repeat(70));

// System prompt for OpenAI
const SYSTEM_PROMPT = `You are an expert cybersecurity researcher analyzing hardware hacking and embedded systems discussions from a Discord server.

Your task is to extract structured information from conversation threads about:
- Hardware vulnerabilities and exploits
- Debugging and reverse engineering techniques
- Security risks and mitigations
- Hardware components and tools mentioned
- Protocols (JTAG, UART, SPI, I2C, etc.)

Return your analysis as a JSON object with this structure:
{
  "summary": "Brief 1-2 sentence summary of the conversation",
  "topic": "Main topic (e.g., 'JTAG Debugging', 'Firmware Extraction', 'I2C Communication')",
  "relevance_score": 0-10 (how relevant to hardware hacking/cybersecurity),
  "vulnerabilities": [
    {
      "type": "vulnerability type",
      "description": "what it is",
      "severity": "Low/Medium/High/Critical",
      "hardware_affected": "specific hardware if mentioned"
    }
  ],
  "techniques": [
    {
      "name": "technique name",
      "description": "how it's used",
      "tools_mentioned": ["tool1", "tool2"]
    }
  ],
  "hardware_mentioned": [
    {
      "name": "hardware name",
      "purpose": "what it's used for",
      "cost": "if mentioned, otherwise null"
    }
  ],
  "protocols": ["UART", "SPI", etc.],
  "security_risks": ["risk1", "risk2"],
  "actionable_insights": ["insight1", "insight2"],
  "key_participants": ["username1", "username2"]
}

If a field has no relevant information, return an empty array or null.`;

async function analyzeThread(thread) {
    try {
        // Build conversation text
        const conversationText = thread.messages.map((msg, idx) => 
            `[${idx + 1}] ${msg.author} (${new Date(msg.timestamp).toLocaleString()}): ${msg.content}`
        ).join('\n\n');
        
        const userPrompt = `Analyze this hardware/embedded systems discussion thread:

Thread ID: ${thread.id}
Channel: ${thread.channel}
Participants: ${thread.participants.join(', ')}
Duration: ${Math.round((new Date(thread.endTime) - new Date(thread.startTime)) / 1000 / 60)} minutes
Messages: ${thread.messages.length}

CONVERSATION:
${conversationText}

Extract structured cybersecurity and hardware hacking insights from this conversation.`;

        const response = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: userPrompt }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.3,
                max_tokens: 1500
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        const analysis = JSON.parse(data.choices[0].message.content);
        
        return {
            thread_id: thread.id,
            thread_info: {
                channel: thread.channel,
                participants: thread.participants,
                message_count: thread.messages.length,
                duration_minutes: Math.round((new Date(thread.endTime) - new Date(thread.startTime)) / 1000 / 60),
                start_time: thread.startTime
            },
            analysis: analysis,
            tokens_used: {
                prompt: data.usage.prompt_tokens,
                completion: data.usage.completion_tokens,
                total: data.usage.total_tokens
            }
        };
        
    } catch (error) {
        console.error(`\n❌ Error analyzing thread ${thread.id}:`, error.message);
        return null;
    }
}

async function analyzeAllThreads() {
    try {
        // 1. Load threaded conversations
        console.log('📖 Loading threaded conversations...');
        const data = JSON.parse(fs.readFileSync(THREADED_CONVERSATIONS_FILE, 'utf8'));
        const allThreads = data.threads;
        console.log(`  ✅ Loaded ${allThreads.length} threads\n`);
        
        // 2. Filter threads worth analyzing
        console.log(`🔍 Filtering threads (min ${MIN_MESSAGES_FOR_ANALYSIS} messages)...`);
        const threadsToAnalyze = allThreads.filter(t => t.messages.length >= MIN_MESSAGES_FOR_ANALYSIS);
        console.log(`  ✅ Selected ${threadsToAnalyze.length} threads for analysis\n`);
        
        // 3. Analyze threads in batches
        console.log('🤖 Starting OpenAI analysis...');
        console.log(`  Processing ${BATCH_SIZE} threads at a time\n`);
        
        const results = [];
        let totalTokens = 0;
        let successCount = 0;
        let failCount = 0;
        
        for (let i = 0; i < threadsToAnalyze.length; i += BATCH_SIZE) {
            const batch = threadsToAnalyze.slice(i, i + BATCH_SIZE);
            const batchNum = Math.floor(i / BATCH_SIZE) + 1;
            const totalBatches = Math.ceil(threadsToAnalyze.length / BATCH_SIZE);
            
            console.log(`📊 Batch ${batchNum}/${totalBatches} (Threads ${i + 1}-${Math.min(i + BATCH_SIZE, threadsToAnalyze.length)})`);
            
            // Process batch in parallel
            const batchPromises = batch.map(thread => analyzeThread(thread));
            const batchResults = await Promise.all(batchPromises);
            
            // Collect results
            for (const result of batchResults) {
                if (result) {
                    results.push(result);
                    totalTokens += result.tokens_used.total;
                    successCount++;
                    process.stdout.write('  ✅');
                } else {
                    failCount++;
                    process.stdout.write('  ❌');
                }
            }
            console.log(`\n  Progress: ${successCount}/${threadsToAnalyze.length} | Tokens: ${totalTokens.toLocaleString()}\n`);
            
            // Small delay between batches to avoid rate limits
            if (i + BATCH_SIZE < threadsToAnalyze.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        console.log('✅ Analysis complete!\n');
        
        // 4. Aggregate insights
        console.log('📊 Aggregating insights...');
        const aggregated = aggregateInsights(results);
        
        // 5. Calculate costs
        const inputCost = (totalTokens * 0.6) * 0.150 / 1000000; // Rough estimate
        const outputCost = (totalTokens * 0.4) * 0.600 / 1000000;
        const totalCost = inputCost + outputCost;
        
        // 6. Save results
        console.log('💾 Saving results...');
        
        const output = {
            metadata: {
                created: new Date().toISOString(),
                threads_analyzed: successCount,
                threads_failed: failCount,
                total_tokens: totalTokens,
                estimated_cost_usd: totalCost.toFixed(4)
            },
            aggregated_insights: aggregated,
            individual_analyses: results
        };
        
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
        console.log(`  ✅ Saved to: ${OUTPUT_FILE}`);
        
        // Save human-readable report
        const report = generateReport(output);
        fs.writeFileSync(OUTPUT_TXT, report);
        console.log(`  ✅ Saved report to: ${OUTPUT_TXT}\n`);
        
        // 7. Display summary
        console.log('='.repeat(70));
        console.log('📊 ANALYSIS SUMMARY:\n');
        console.log(`  Threads analyzed: ${successCount}`);
        console.log(`  Threads failed: ${failCount}`);
        console.log(`  Total tokens used: ${totalTokens.toLocaleString()}`);
        console.log(`  Estimated cost: $${totalCost.toFixed(4)} USD`);
        console.log(`\n  Top vulnerabilities found: ${aggregated.top_vulnerabilities.length}`);
        console.log(`  Unique techniques: ${aggregated.unique_techniques.length}`);
        console.log(`  Hardware mentioned: ${aggregated.hardware_mentioned.length}`);
        console.log(`  Protocols discussed: ${aggregated.protocols_mentioned.length}`);
        console.log('='.repeat(70));
        
        console.log('\n✅ COMPLETE! Check the report for detailed insights.\n');
        
    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error.stack);
    }
}

function aggregateInsights(results) {
    const vulnerabilities = [];
    const techniques = [];
    const hardware = [];
    const protocols = new Set();
    const risks = [];
    
    for (const result of results) {
        const analysis = result.analysis;
        
        // Collect vulnerabilities
        if (analysis.vulnerabilities) {
            vulnerabilities.push(...analysis.vulnerabilities.map(v => ({
                ...v,
                thread_id: result.thread_id,
                relevance_score: analysis.relevance_score
            })));
        }
        
        // Collect techniques
        if (analysis.techniques) {
            techniques.push(...analysis.techniques.map(t => ({
                ...t,
                thread_id: result.thread_id
            })));
        }
        
        // Collect hardware
        if (analysis.hardware_mentioned) {
            hardware.push(...analysis.hardware_mentioned.map(h => ({
                ...h,
                thread_id: result.thread_id
            })));
        }
        
        // Collect protocols
        if (analysis.protocols) {
            analysis.protocols.forEach(p => protocols.add(p));
        }
        
        // Collect risks
        if (analysis.security_risks) {
            risks.push(...analysis.security_risks.map(r => ({
                risk: r,
                thread_id: result.thread_id
            })));
        }
    }
    
    // Sort and deduplicate
    const topVulnerabilities = vulnerabilities
        .sort((a, b) => {
            const severityOrder = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
            return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
        })
        .slice(0, 20);
    
    return {
        top_vulnerabilities: topVulnerabilities,
        unique_techniques: techniques.slice(0, 30),
        hardware_mentioned: hardware.slice(0, 30),
        protocols_mentioned: Array.from(protocols),
        security_risks: risks.slice(0, 20)
    };
}

function generateReport(output) {
    let report = '🔒 HARDWARE HACKING & CYBERSECURITY ANALYSIS REPORT\n';
    report += '='.repeat(70) + '\n\n';
    
    report += `Generated: ${new Date(output.metadata.created).toLocaleString()}\n`;
    report += `Threads Analyzed: ${output.metadata.threads_analyzed}\n`;
    report += `Total Tokens: ${output.metadata.total_tokens.toLocaleString()}\n`;
    report += `Estimated Cost: $${output.metadata.estimated_cost_usd} USD\n\n`;
    
    report += '='.repeat(70) + '\n';
    report += '📊 TOP VULNERABILITIES FOUND\n';
    report += '='.repeat(70) + '\n\n';
    
    output.aggregated_insights.top_vulnerabilities.forEach((v, i) => {
        report += `[${i + 1}] ${v.type} (${v.severity})\n`;
        report += `    Description: ${v.description}\n`;
        if (v.hardware_affected) report += `    Hardware: ${v.hardware_affected}\n`;
        report += `    Thread: #${v.thread_id}\n\n`;
    });
    
    report += '\n' + '='.repeat(70) + '\n';
    report += '🛠️  DEBUGGING & HACKING TECHNIQUES\n';
    report += '='.repeat(70) + '\n\n';
    
    output.aggregated_insights.unique_techniques.slice(0, 15).forEach((t, i) => {
        report += `[${i + 1}] ${t.name}\n`;
        report += `    ${t.description}\n`;
        if (t.tools_mentioned && t.tools_mentioned.length > 0) {
            report += `    Tools: ${t.tools_mentioned.join(', ')}\n`;
        }
        report += `    Thread: #${t.thread_id}\n\n`;
    });
    
    report += '\n' + '='.repeat(70) + '\n';
    report += '🔌 PROTOCOLS DISCUSSED\n';
    report += '='.repeat(70) + '\n\n';
    
    report += output.aggregated_insights.protocols_mentioned.join(', ') + '\n\n';
    
    report += '\n' + '='.repeat(70) + '\n';
    report += '⚠️  SECURITY RISKS IDENTIFIED\n';
    report += '='.repeat(70) + '\n\n';
    
    output.aggregated_insights.security_risks.slice(0, 15).forEach((r, i) => {
        report += `[${i + 1}] ${r.risk} (Thread #${r.thread_id})\n`;
    });
    
    report += '\n' + '='.repeat(70) + '\n';
    report += 'END OF REPORT\n';
    report += '='.repeat(70) + '\n';
    
    return report;
}

analyzeAllThreads();




