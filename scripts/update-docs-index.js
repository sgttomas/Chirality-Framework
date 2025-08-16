#!/usr/bin/env node
/** Update the Documentation Index section in README.md (CommonJS) */
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(process.cwd());
const readmePath = path.join(repoRoot, 'README.md');

function listMarkdownFiles(dir, baseUrl = '.') {
  if (!fs.existsSync(dir)) return [];
  
  // Skip directories we don't want to scan
  const skipDirs = ['.venv', 'node_modules', '.git', '.next', 'dist', 'build', 'archive', 'temp'];
  const dirName = path.basename(dir);
  if (skipDirs.includes(dirName)) return [];
  
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !skipDirs.includes(entry.name)) {
      return listMarkdownFiles(fullPath, path.join(baseUrl, entry.name));
    }
    if (entry.isFile() && entry.name.endsWith('.md') && !entry.name.startsWith('.')) {
      return [{ name: entry.name, path: path.join(baseUrl, entry.name) }];
    }
    return [];
  });
}

function buildDocsTable(files) {
  const rows = files
    .filter((f) => !f.path.includes('node_modules') && 
                  !f.path.includes('.github/ISSUE_TEMPLATE') &&
                  !f.path.includes('archive') &&
                  !f.path.includes('temp'))
    .map((file) => {
      let desc = '';
      switch (file.name) {
        case 'GETTING_STARTED.md': desc = 'Quick setup for backend services.'; break;
        case 'CONTRIBUTING.md': desc = 'How to contribute, workflow, and coding guidelines.'; break;
        case 'CHANGELOG.md': desc = 'Version history and release notes.'; break;
        case 'SECURITY.md': desc = 'Security policies and vulnerability reporting.'; break;
        case 'VERSION.md': desc = 'Current version info and roadmap.'; break;
        case 'CODE_OF_CONDUCT.md': desc = 'Community interaction guidelines.'; break;
        case 'API_REFERENCE.md': desc = 'Complete API documentation and examples.'; break;
        case 'TROUBLESHOOTING.md': desc = 'Problem-solving guide.'; break;
        case 'DEVELOPMENT_WORKFLOW.md': desc = 'Development process, standards, and visuals.'; break;
        case 'README.md': 
          if (file.path === 'README.md') desc = 'Main project overview.';
          else if (file.path === 'graphql-service/README.md') desc = 'GraphQL service documentation.';
          else desc = 'Documentation overview.';
          break;
        case 'RELEASING.md': desc = 'Full release process and versioning policy.'; break;
        case 'RELEASE.md': desc = 'High-level release checklist.'; break;
        case 'PULL_REQUEST_TEMPLATE.md': desc = 'Pull request template.'; break;
        case 'chirality_cli_HELP.md': desc = 'Complete CLI usage guide.'; break;
        case 'README_CLI.md': desc = 'CLI development documentation.'; break;
        case 'CLAUDE_BACKEND.md': desc = 'Backend development guidance for Claude Code.'; break;
        case 'CLAUDE_CLI.md': desc = 'CLI development patterns for Claude Code.'; break;
        case 'CLAUDE_GRAPHQL.md': desc = 'GraphQL service development for Claude Code.'; break;
        case 'CLAUDE.md': desc = 'Claude Code project instructions.'; break;
        case 'BACKEND_DEVELOPMENT.md': desc = 'Backend development status and priorities.'; break;
        default: 
          if (file.path.includes('docs/adr/')) desc = 'Architecture Decision Record.';
          else desc = 'Documentation file.';
          break;
      }
      return `| [${file.name}](${file.path}) | ${desc} |`;
    });

  return [
    '## 📚 Documentation Index',
    '',
    '| Document | Description |',
    '|----------|-------------|',
    ...rows,
    ''
  ].join('\n');
}

function updateReadme(newTable) {
  if (!fs.existsSync(readmePath)) {
    console.error('README.md not found');
    process.exit(1);
  }
  const readme = fs.readFileSync(readmePath, 'utf8');
  const hasSection = /## 📚 Documentation Index/.test(readme);
  const updated = hasSection
    ? readme.replace(/## 📚 Documentation Index[\s\S]*?(?=\n## |\n\[|$)/, newTable)
    : `${readme.trim()}\n\n${newTable}\n`;
  fs.writeFileSync(readmePath, updated, 'utf8');
  console.log('✅ README.md Documentation Index updated');
}

// Collect all markdown files and deduplicate
const allFiles = [
  ...listMarkdownFiles(repoRoot, '.'),
  ...listMarkdownFiles(path.join(repoRoot, 'docs'), 'docs'),
  ...listMarkdownFiles(path.join(repoRoot, 'graphql-service'), 'graphql-service'),
];

// Deduplicate by path
const uniqueFiles = Array.from(
  new Map(allFiles.map(file => [file.path, file])).values()
);

const newTable = buildDocsTable(uniqueFiles);
updateReadme(newTable);