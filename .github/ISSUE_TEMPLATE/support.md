---
name: Support Request
about: Get help with setup, configuration, or usage
title: '[SUPPORT] '
labels: ['support', 'question']
assignees: ''

---

## Support Request

**Type of Support:**
- [ ] Setup and Installation Help
- [ ] Configuration Issues  
- [ ] Usage Questions
- [ ] Best Practices Guidance
- [ ] Performance Optimization
- [ ] Integration Help
- [ ] Troubleshooting Assistance

## What You're Trying to Accomplish

**Goal:**
Describe what you're trying to achieve with the Chirality Framework.

**Current Status:**
Where are you in the process? What have you accomplished so far?

**Specific Question:**
What specific help do you need?

## Environment and Setup

**System Information:**
- OS: [e.g. macOS 14.1, Ubuntu 22.04, Windows 11]
- Python Version: [e.g. 3.10.5]
- Node.js Version: [e.g. 18.17.0]
- Git Version: [e.g. 2.39.0]

**Installation Status:**
- [ ] Just cloned the repository
- [ ] Installed Python dependencies
- [ ] Installed Node.js dependencies
- [ ] Set up environment variables
- [ ] GraphQL service running
- [ ] Neo4j database connected
- [ ] Completed getting started guide

**Services Status:**
```bash
# Please run and paste output of:
./scripts/health-check.sh
```

## Configuration Details

**Environment Variables:**
```bash
# Please provide (without sensitive values):
echo "NEO4J_URI: ${NEO4J_URI:-(not set)}"
echo "NEO4J_USER: ${NEO4J_USER:-(not set)}"  
echo "OPENAI_API_KEY: ${OPENAI_API_KEY:+set}"
echo "NEO4J_DATABASE: ${NEO4J_DATABASE:-(not set)}"
```

**Database:**
- Neo4j Type: [e.g. Neo4j Aura, Local Neo4j, Docker]
- Connection Status: [Working / Not Working / Unknown]

**API Access:**
- OpenAI API Key: [Configured / Not Configured]
- API Access Test: [Working / Not Working / Not Tested]

## What You've Tried

**Steps Taken:**
1. [First thing you tried]
2. [Second thing you tried]
3. [Third thing you tried]

**Commands Run:**
```bash
# Paste the exact commands you've run
python chirality_cli.py health-check
./scripts/validate-env.sh
```

**Error Messages:**
```
Paste any error messages you're seeing
```

**Resources Consulted:**
- [ ] README.md
- [ ] GETTING_STARTED.md
- [ ] docs/TROUBLESHOOTING.md
- [ ] CONTRIBUTING.md
- [ ] Searched existing issues
- [ ] Searched discussions
- [ ] Checked documentation files

## Expected vs Actual Behavior

**Expected:**
What you expected to happen.

**Actual:**
What actually happened.

**Confusion Point:**
What specifically is unclear or not working as expected?

## Use Case Context

**Project Type:**
- [ ] Learning/Educational
- [ ] Research Project
- [ ] Development/Integration
- [ ] Production Deployment
- [ ] Contributing to Framework

**Semantic Operations:**
Which operations are you trying to use?
- [ ] Basic matrix generation (A×B=C)
- [ ] Full semantic pipeline (C→F→D)
- [ ] Domain pack integration
- [ ] Custom ontology work
- [ ] GraphQL API integration
- [ ] Admin UI usage

**Integration Context:**
- [ ] Standalone usage
- [ ] Integration with existing system
- [ ] Building on top of framework
- [ ] Contributing new features

## Preferences and Constraints

**Learning Style:**
- [ ] Step-by-step tutorials
- [ ] Code examples and snippets
- [ ] Conceptual explanations
- [ ] Video walkthroughs
- [ ] Interactive guidance

**Time Constraints:**
- [ ] Need help immediately
- [ ] Can wait a few days
- [ ] No rush, learning at my own pace
- [ ] Deadline-driven project

**Technical Background:**
- [ ] New to semantic reasoning
- [ ] Experienced with graph databases
- [ ] Familiar with GraphQL
- [ ] Python development experience
- [ ] CLI tool experience
- [ ] Neo4j experience
- [ ] OpenAI API experience

## Additional Information

**Related Resources:**
Any external resources, documentation, or examples you're working from.

**Specific Files/Commands:**
Any specific files, commands, or operations you're having trouble with.

**Screenshots:**
If applicable, add screenshots of your setup, error messages, or current state.

---

## Support Guidelines

**Before Posting:**
- [ ] I've checked the getting started guide
- [ ] I've run the health check script
- [ ] I've searched existing issues and discussions
- [ ] I've consulted the troubleshooting guide

**Response Expectations:**
- **Community Support**: Community members provide help when available
- **Maintainer Response**: Maintainers will respond as time permits
- **Issue Escalation**: If this reveals a bug, we may convert to a bug report
- **Documentation**: If this reveals missing docs, we may convert to documentation issue

**How You Can Help:**
- Provide complete information requested above
- Test suggested solutions and report back
- Update the issue with your progress
- Consider contributing documentation improvements based on your experience