# Contributing to Chirality Framework

[![Contributors Welcome](https://img.shields.io/badge/Contributors-Welcome-brightgreen)](#)
[![Development Status](https://img.shields.io/badge/Status-Active_Development-orange)](#)
[![Backend Focus](https://img.shields.io/badge/Current_Focus-Backend_Development-blue)](#)

Welcome to the Chirality Framework! This guide will help you get started contributing to this production-ready implementation of the CF14 v2.1.1 normative specification.

## 🎯 Quick Start for New Contributors

### 1. Choose Your Contribution Path

**🔥 High Impact - Backend Development** (Most Needed)
- Complete CLI integration in admin UI
- Add GraphQL health checks and monitoring  
- Enhance Python CLI with structured output
- **Time Investment**: 2-8 hours per task
- **Difficulty**: Intermediate to Advanced

**🔧 Infrastructure & Tooling** (Moderate Impact)
- Database administration enhancements
- Performance monitoring and optimization
- Error handling and recovery systems
- **Time Investment**: 4-12 hours per task
- **Difficulty**: Intermediate

**📚 Documentation & Testing** (Foundation Work)
- API documentation and examples
- Integration test coverage
- Developer experience improvements
- **Time Investment**: 1-4 hours per task
- **Difficulty**: Beginner to Intermediate

### 2. Development Environment Setup (15 minutes)

```bash
# 1. Clone and setup
git clone <repository-url>
cd chirality-semantic-framework

# 2. Quick environment validation
./scripts/validate-env.sh  # We'll create this

# 3. Install dependencies
npm install && cd graphql-service && npm install && cd ..
pip install -e .

# 4. Start development services
./scripts/dev-start.sh  # We'll create this

# 5. Verify setup
./scripts/health-check.sh  # We'll create this
```

### 3. Find a Task (5 minutes)

```bash
# Check current backend priorities
cat CLAUDE_BACKEND.md | grep "High Priority" -A 10

# View open development tasks
grep -r "TODO\|FIXME\|HACK" --include="*.py" --include="*.ts" .

# Check issues labeled for new contributors
# (GitHub issues with 'good-first-issue' label)
```

## 🏗️ Development Workflow

### Before You Start

1. **Understand the Big Picture** (10 minutes)
   ```bash
   # Read architecture overview
   head -50 README.md
   
   # Understand current development status
   head -30 CLAUDE.md
   
   # Review backend priorities
   grep "Priority" CLAUDE_BACKEND.md
   ```

2. **Check Current Work** (5 minutes)
   ```bash
   git status
   git log --oneline -10
   git diff --name-only main
   ```

3. **Set Up Feature Branch**
   ```bash
   git checkout -b feature/your-contribution-name
   ```

### During Development

1. **Follow Development Standards**
   - Python: PEP 8, type hints, comprehensive docstrings
   - TypeScript: Strict mode, ESLint compliance, JSDoc comments
   - Git: Conventional commits (feat:, fix:, docs:, etc.)

2. **Test as You Go**
   ```bash
   # Backend tests
   python -m pytest tests/ -v
   
   # CLI integration tests  
   python chirality_cli.py health-check
   
   # GraphQL service tests
   cd graphql-service && npm test
   
   # End-to-end smoke tests
   npm run smoke:rest && npm run smoke:gql
   ```

3. **Document Your Changes**
   - Update relevant README files
   - Add inline comments for complex logic
   - Update CLAUDE*.md files if changing architecture

### Submitting Your Contribution

1. **Pre-Submission Checklist**
   ```bash
   # Run full test suite
   ./scripts/test-all.sh  # We'll create this
   
   # Check code quality
   ./scripts/lint-all.sh  # We'll create this
   
   # Validate documentation
   ./scripts/validate-docs.sh  # We'll create this
   ```

2. **Create Pull Request**
   - Clear title describing the change
   - Reference related issues
   - Include testing instructions
   - Add screenshots for UI changes

## 🎨 Current Development Priorities

### 🔥 Immediate Impact (Complete First)

#### 1. CLI Integration Completion
**File**: `chirality-admin/pages/api/phase1/step.ts`
**What's Needed**: Add remaining CLI commands (generate-f, generate-d, verify-stages)
**Complexity**: ⭐⭐⭐ Intermediate
**Impact**: 🚀🚀🚀 High - Unblocks admin UI functionality

```typescript
// Example implementation needed:
case 'generate-f':
  result = await runCli('generate-f', { 
    api_base: 'http://localhost:8080',
    matrix: 'F' 
  });
  break;
```

**Getting Started**:
1. Read `CLAUDE_CLI.md` section on admin UI integration
2. Test existing `push-axioms` and `generate-c` implementations
3. Follow the same pattern for remaining commands
4. Add error handling and timeout management

#### 2. GraphQL Health Checks
**File**: `graphql-service/src/index.ts`
**What's Needed**: Add `/health` and `/ready` endpoints
**Complexity**: ⭐⭐ Beginner-Intermediate
**Impact**: 🚀🚀🚀 High - Enables production monitoring

```typescript
// Example implementation needed:
app.get('/health', async (req, res) => {
  try {
    await driver.verifyConnectivity();
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});
```

**Getting Started**:
1. Read `CLAUDE_GRAPHQL.md` health check section
2. Study existing GraphQL service structure
3. Implement basic health endpoint first
4. Add comprehensive dependency checks

#### 3. CLI JSON Output Format
**File**: `chirality_cli.py`
**What's Needed**: Add `--json-output` flag to all commands
**Complexity**: ⭐⭐ Intermediate
**Impact**: 🚀🚀 Medium-High - Enables structured admin UI integration

```python
# Example implementation needed:
@click.option('--json-output', is_flag=True, help='Output structured JSON')
def generate_c(json_output, **kwargs):
    if json_output:
        return json.dumps({
            "status": "success",
            "operation": "generate-c",
            "cells_generated": 12,
            "duration_seconds": 180
        })
```

**Getting Started**:
1. Read `CLAUDE_CLI.md` JSON output section
2. Pick one command to start with (e.g., `generate-c`)
3. Test with existing admin UI integration
4. Apply pattern to remaining commands

### 🔶 Foundation Work (Build For Future)

#### 4. Error Handling Standardization
**Files**: Multiple across backend services
**What's Needed**: Consistent error response formats
**Complexity**: ⭐⭐⭐ Intermediate-Advanced
**Impact**: 🚀🚀 Medium - Improves developer experience

#### 5. Performance Monitoring
**Files**: GraphQL service, CLI tools
**What's Needed**: Metrics collection and reporting
**Complexity**: ⭐⭐⭐⭐ Advanced
**Impact**: 🚀 Medium - Enables optimization

#### 6. Database Administration Tools
**File**: `neo4j_admin.py`
**What's Needed**: Bulk operations, validation, backup/restore
**Complexity**: ⭐⭐⭐ Intermediate-Advanced
**Impact**: 🚀 Medium - Operational efficiency

## 📝 Contribution Types & Guidelines

### 🐛 Bug Fixes
- Always include reproduction steps
- Add regression tests
- Update relevant documentation
- Reference issue number in commit message

### ✨ New Features
- Discuss design in issues before implementing
- Follow existing architectural patterns
- Include comprehensive tests
- Update CLAUDE*.md guidance files

### 📚 Documentation
- Keep it practical and actionable
- Include code examples where helpful
- Test all code snippets
- Update related documentation files

### 🧪 Testing
- Aim for 80%+ code coverage on new code
- Include both unit and integration tests
- Test error conditions and edge cases
- Document test setup requirements

## 🔍 Code Review Guidelines

### For Contributors
- Keep changes focused and atomic
- Write clear commit messages
- Add tests for new functionality
- Update documentation

### For Reviewers
- Focus on code clarity and maintainability
- Verify test coverage
- Check documentation updates
- Validate architectural consistency

## 🚨 Common Pitfalls & How to Avoid Them

### 1. Environment Setup Issues
**Problem**: Services not starting or connecting
**Solution**: 
```bash
# Use our validation scripts
./scripts/validate-env.sh
./scripts/health-check.sh

# Check specific services
curl http://localhost:8080/health
python chirality_cli.py health-check
```

### 2. Neo4j Connection Problems
**Problem**: CLI or GraphQL can't connect to database
**Solution**:
```bash
# Verify environment variables
echo $NEO4J_URI $NEO4J_USER  # (don't echo password)

# Test connection manually
python -c "
from neo4j import GraphDatabase
driver = GraphDatabase.driver('$NEO4J_URI', auth=('$NEO4J_USER', '$NEO4J_PASSWORD'))
driver.verify_connectivity()
print('Neo4j connection successful')
"
```

### 3. CLI Integration Issues
**Problem**: Admin UI can't execute CLI commands
**Solution**:
```bash
# Test CLI manually first
python chirality_cli.py generate-c --help

# Check admin UI process spawning
# Look for runCli function in chirality-admin/lib/runCli.ts

# Verify JSON output format
python chirality_cli.py generate-c --json-output
```

### 4. GraphQL Schema Issues
**Problem**: Schema compilation or query failures
**Solution**:
```bash
# Validate schema
cd graphql-service && npm run build

# Test queries manually
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __schema { types { name } } }"}'
```

## 🎓 Learning Resources

### Understanding the Chirality Framework
1. **Start Here**: `README.md` - Project overview and setup
2. **Architecture**: `CLAUDE.md` - System design and services
3. **Backend Focus**: `BACKEND_DEVELOPMENT.md` - Development roadmap

### Technology-Specific Guidance
1. **CLI Development**: `CLAUDE_CLI.md` - Python CLI patterns
2. **GraphQL Service**: `CLAUDE_GRAPHQL.md` - Service development
3. **General Backend**: `CLAUDE_BACKEND.md` - Cross-service patterns

### External Resources
- [GraphQL Yoga Documentation](https://the-guild.dev/graphql/yoga-server)
- [Neo4j GraphQL Library](https://neo4j.com/docs/graphql-manual/current/)
- [Click CLI Framework](https://click.palletsprojects.com/)
- [CF14 Normative Specification](./NORMATIVE_Chriality_Framework_14.2.1.1.txt)

## 💬 Getting Help

### Before Asking for Help
1. Check existing documentation (CLAUDE*.md files)
2. Search for similar issues in the repository
3. Run diagnostic scripts to identify the problem
4. Try the troubleshooting steps in this guide

### Where to Get Help
1. **GitHub Issues** - For bugs, feature requests, and general questions
2. **GitHub Discussions** - For design discussions and community support
3. **Code Comments** - Inline documentation for specific functions

### How to Ask Effective Questions
1. Include your environment details (OS, versions, etc.)
2. Provide steps to reproduce the issue
3. Share relevant error messages and logs
4. Mention what you've already tried

## 🏆 Recognition

Contributors who make significant improvements to the backend infrastructure will be recognized in:
- `CONTRIBUTORS.md` file (we should create this)
- Release notes for new versions
- Special recognition for particularly impactful contributions

## 📋 Development Checklist Template

Copy this checklist for each contribution:

```markdown
## Pre-Development
- [ ] Read relevant CLAUDE*.md guidance
- [ ] Understand the current development context
- [ ] Set up development environment
- [ ] Run health checks to verify setup

## During Development  
- [ ] Follow code quality standards
- [ ] Write tests for new functionality
- [ ] Test integration with other services
- [ ] Update documentation as needed

## Pre-Submission
- [ ] Run full test suite
- [ ] Check code quality and linting
- [ ] Verify documentation is current
- [ ] Test end-to-end workflows

## Submission
- [ ] Create clear pull request description
- [ ] Reference related issues
- [ ] Include testing instructions
- [ ] Respond to code review feedback
```

---

**Welcome to the team!** The Chirality Framework is an ambitious project that needs passionate contributors. Whether you're fixing a small bug or implementing a major feature, your contribution makes a difference in advancing semantic knowledge representation.

**Questions?** Don't hesitate to open an issue or start a discussion. We're here to help you succeed!