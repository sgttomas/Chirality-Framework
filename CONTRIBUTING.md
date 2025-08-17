# Contributing to Chirality Framework

## Overview

The Chirality Framework implements structured semantic computation through matrix operations and LLM semantic interpolation. Contributing requires understanding both the framework's methodology and its practical implementation.

## Getting Started

### Prerequisites
- Python 3.9+
- Node.js 20.x (for frontend components)
- Docker Desktop (for Neo4j)
- OpenAI API key (for semantic operations)

### Development Setup
```bash
# Clone repository
git clone [repository-url]
cd chirality-semantic-framework

# Install dependencies
pip install -r requirements.txt
pip install -e .

# Set up environment
cp .env.example .env
# Edit .env with your API keys

# Run tests
python -m pytest chirality/tests/
```

## Framework Concepts

### Semantic Operations
The framework performs systematic semantic transformations:
- **Semantic Multiplication (*)**: Combines concepts (e.g., "Values * Necessary" → "Essential Values")
- **Semantic Addition (+)**: Concatenates semantic elements
- **Matrix Operations**: Structured combination of semantic content

### Processing Stations
11-station progression from problem to resolution:
1. Problem Statement → 2. Requirements → 3. Objectives → ... → 11. Resolution

### LLM Integration
LLMs serve as "semantic interpolation engines" within structured operations, not as general reasoning tools.

## Contributing Guidelines

### Code Contributions

**Matrix Operations**
- Follow existing patterns in `chirality/core/ops.py`
- Ensure dimensional compatibility checking
- Maintain semantic meaning preservation
- Add tests for new operations

**Resolvers**
- Implement the `Resolver` protocol
- Handle errors gracefully
- Provide deterministic outputs where possible
- Document semantic operation behavior

**Station Processing**
- Follow S1→S2→S3 pattern
- Maintain audit trails
- Support human-in-the-loop validation
- Preserve operation lineage

### Documentation Contributions

**Semantic Examples**
- Provide clear input/output examples
- Show semantic transformation reasoning
- Document edge cases and limitations
- Include validation criteria

**Framework Usage**
- Focus on practical implementation
- Avoid overstated theoretical claims
- Distinguish proven capabilities from speculation
- Provide troubleshooting guidance

### Testing Contributions

**Semantic Operation Tests**
- Test semantic consistency across operations
- Validate matrix dimensional constraints
- Check content integrity preservation
- Test resolver behavior

**Integration Tests**
- Full semantic valley execution
- Multi-service coordination
- Error handling and recovery
- Performance under load

## Development Workflow

### Branch Strategy
- `main`: Stable releases
- `develop`: Integration branch
- `feature/*`: New capabilities
- `fix/*`: Bug fixes
- `docs/*`: Documentation updates

### Commit Messages
Follow conventional commits:
```
feat(ops): add semantic cross product operation
fix(resolver): handle API timeout gracefully
docs(readme): update installation instructions
test(matrix): add validation edge cases
```

### Pull Request Process
1. Create feature branch from `develop`
2. Implement changes with tests
3. Update documentation
4. Ensure all tests pass
5. Submit PR with clear description
6. Address review feedback
7. Merge to `develop`

## Code Standards

### Python Code
- Follow PEP 8 style guidelines
- Use type hints for all functions
- Include docstrings for public APIs
- Handle errors explicitly
- Maintain backward compatibility

### Semantic Operations
- Preserve meaning across transformations
- Maintain operation determinism where possible
- Document semantic reasoning
- Provide validation criteria

### Documentation
- Write clear, practical examples
- Avoid theoretical speculation
- Focus on implementation guidance
- Include troubleshooting information

## Review Process

### Technical Review
- Code quality and style
- Test coverage and quality
- Performance implications
- Security considerations

### Semantic Review
- Semantic operation validity
- Framework consistency
- Documentation accuracy
- Example quality

### Integration Review
- Multi-service compatibility
- Deployment considerations
- User experience impact
- Breaking change assessment

## Getting Help

### Questions
- Check existing documentation first
- Search previous issues
- Ask specific, focused questions
- Provide context and examples

### Bug Reports
Include:
- Framework version
- Environment details
- Reproduction steps
- Expected vs actual behavior
- Error messages and logs

### Feature Requests
Include:
- Use case description
- Proposed approach
- Framework integration
- Backward compatibility impact

## Community Guidelines

### Respectful Collaboration
- Focus on technical merit
- Provide constructive feedback
- Share knowledge openly
- Support fellow contributors

### Quality Standards
- Prioritize working implementations over theoretical discussions
- Maintain honest assessment of capabilities
- Document limitations and known issues
- Test thoroughly before contributing

## Framework Philosophy

Remember that CF14 is:
- **Practical**: Focus on working implementations
- **Systematic**: Structured approach to semantic processing  
- **Honest**: Clear about capabilities vs speculation
- **Collaborative**: Human-AI partnership in reasoning

Contributions should align with these principles while advancing the framework's practical utility.

## Current Focus Areas

See CURRENT_STATUS.md for active development priorities and ROADMAP.md for planned features.

Thank you for contributing to the Chirality Framework!