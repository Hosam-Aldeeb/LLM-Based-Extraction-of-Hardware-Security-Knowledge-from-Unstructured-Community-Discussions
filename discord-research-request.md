# Discord Research Access Request Template

## Short Version (for DMs to admins)

```
Hi! I'm a student working on a hardware security research project under Prof. [NAME] at [UNIVERSITY]. 

We're studying how hardware hacking knowledge spreads through online communities. I'd love to include your server in our analysis (anonymized, read-only access to public channels).

Would you be open to either:
1. Whitelisting a read-only bot, or
2. Setting up a webhook relay for select channels?

Happy to share our findings when complete and credit your community (with permission). Thanks for considering!
```

---

## Detailed Version (for formal requests)

**Subject:** Research Request - Hardware Security Community Analysis

Dear [Server Name] moderators,

My name is [Your Name], and I'm a [year/program] student at [University] working under Professor [Name] on a research project analyzing hardware hacking discourse.

**Project Overview:**
We're studying how hardware security knowledge, techniques, and best practices are shared and discussed in online communities. Our goal is to identify patterns in collaboration, common challenges, and emerging trends in the hardware hacking space.

**What We're Requesting:**
Read-only access to your public channels (or select channels you deem appropriate) through one of these methods:
- A whitelisted Discord bot with message read permissions
- A webhook relay that forwards messages to our analysis system
- Periodic channel exports (if you prefer manual control)

**Privacy & Ethics:**
- All data will be anonymized (no usernames/IDs in published work)
- Only public channels (no DMs, private channels, or personal data)
- Used solely for academic research (not commercial)
- We'll share our findings with you before publication
- You can revoke access at any time
- IRB approval: [pending/approved - include number if you have it]

**Technical Details:**
Our bot uses local LLM (TinyLlama via Ollama) to:
- Summarize hardware-related discussions
- Extract bill-of-materials mentions
- Identify safety/legal considerations
- Score posts by relevance and actionability

**What You'll Get:**
- Credit in our final report (if you wish)
- A copy of our findings specific to hardware hacking communities
- Aggregate insights that might benefit your community

**Timeline:**
Data collection: [X months]
Expected completion: [Date]

I'm happy to hop on a call to discuss further or answer any questions. Thank you for building such a valuable community!

Best regards,
[Your Name]
[Your Email]
[University/Department]
```

---

## Follow-Up Template (if they say yes)

```
Awesome, thank you! Here's what I need to get started:

**Option 1 - Bot Invite:**
Invite this bot to your server: [YOUR BOT INVITE URL]
- Grant it "Read Messages" and "Read Message History" for channels you approve
- It will only read, never post (unless you want summaries posted somewhere)

**Option 2 - Webhook:**
Create a webhook in the channel(s) you want to share:
Server Settings → Integrations → Webhooks → New Webhook → Copy URL
Send me the URL and I'll configure our system to receive posts.

**Option 3 - Manual Export:**
Use Discord's export feature or let me know your preferred method.

I'll send you a progress update in [2 weeks / 1 month] and share preliminary findings. Thanks again!
```

---

## Target Servers Checklist

**Tier 1 (High Priority):**
- [ ] DEF CON Groups
- [ ] HackTheBox Discord
- [ ] r/hardwarehacking Discord
- [ ] Open Security Training
- [ ] Hardware Hacking Village (DEF CON)

**Tier 2 (Medium Priority):**
- [ ] Flashpoint Discord
- [ ] OSHWA (Open Source Hardware Association)
- [ ] EEVblog Forum Discord
- [ ] Adafruit Discord
- [ ] SparkFun Discord
- [ ] Arduino Discord

**Tier 3 (Specialized):**
- [ ] RFID Hacking communities
- [ ] IoT Security groups
- [ ] PCB/Hardware reverse engineering
- [ ] FPGA/HDL communities
- [ ] Embedded systems security
- [ ] Bug bounty hardware-related servers
- [ ] DEFCON Groups (local chapters)
- [ ] CCC (Chaos Computer Club) English channels

---

## Tips for Success

1. **Personalize each message** - mention specific projects/discussions you've seen
2. **Start small** - ask for 1-2 channels first, expand later if they're comfortable
3. **Be patient** - admins are volunteers, may take days to respond
4. **Offer value** - share insights, help their community grow
5. **Show your work** - link to your university profile, professor's page, etc.
6. **Respect "no"** - some communities won't participate, that's fine

---

## Legal/Ethical Notes

- Get your professor's approval before sending
- Check if your university requires IRB approval for this type of research
- Keep copies of all permission grants
- If publishing, follow your institution's research ethics guidelines
- Consider offering to anonymize the server name itself if they prefer

---

## Your Current Setup (to mention in requests)

"We're using a local LLM (Ollama/TinyLlama) with Model Context Protocol - all processing happens on our own hardware, no data goes to OpenAI or other third parties. The bot is open source and we're happy to share the code."




