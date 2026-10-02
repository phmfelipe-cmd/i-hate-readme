#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { exec } = require('child_process');
const Groq = require('groq-sdk');

const CONFIG_DIR = path.join(require('os').homedir(), '.i-hate-readme');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

function openBrowser(url) {
  const start = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${start} ${url}`);
}

function getSavedKey() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      return data.apiKey;
    } catch (e) {
      return null;
    }
  }
  return null;
}

function saveKey(apiKey) {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({ apiKey }), 'utf8');
}

function clearSavedKey() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      fs.unlinkSync(CONFIG_FILE);
    } catch (e) {}
  }
}

function promptQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans.trim());
  }));
}

async function getApiKey() {
  const args = process.argv.slice(2);
  
  if (args.includes('--reset-key')) {
    clearSavedKey();
    console.log('🗑️  Saved API Key cleared successfully.');
  }

  const keyArg = args.find(arg => arg.startsWith('--key='));
  if (keyArg) return keyArg.split('=')[1];
  if (process.env.GROQ_API_KEY) return process.env.GROQ_API_KEY;

  const savedKey = getSavedKey();
  if (savedKey) return savedKey;

  console.log('\n🔑 No Groq API key found.');
  console.log('🌐 Opening Groq Console in your browser to get a free key...');
  
  openBrowser('https://console.groq.com/keys');

  const apiKey = await promptQuestion('\n👉 Paste your Groq API key here (starts with gsk_...) and press Enter: ');
  
  if (apiKey) {
    saveKey(apiKey);
    console.log('💾 API Key saved successfully for future runs!\n');
    return apiKey;
  }

  console.error('❌ No API key provided. Exiting...');
  process.exit(1);
}

function getProjectStructure(dirPath, depth = 0) {
  if (depth > 2) return '';
  let structure = '';
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    if (file.startsWith('.') || file === 'node_modules' || file === 'dist' || file === 'build' || file === 'vendor') return;
    
    const fullPath = path.join(dirPath, file);
    const stats = fs.statSync(fullPath);
    const indent = '  '.repeat(depth);

    if (stats.isDirectory()) {
      structure += `${indent}📁 ${file}/\n` + getProjectStructure(fullPath, depth + 1);
    } else {
      structure += `${indent}📄 ${file}\n`;
    }
  });

  return structure;
}

function getProjectMetadata(projectDir) {
  const manifests = ['package.json', 'Cargo.toml', 'pyproject.toml', 'requirements.txt', 'go.mod', 'CMakeLists.txt', 'pubspec.yaml'];
  let meta = '';

  manifests.forEach(manifest => {
    const fullPath = path.join(projectDir, manifest);
    if (fs.existsSync(fullPath)) {
      meta += `=== ${manifest} ===\n` + fs.readFileSync(fullPath, 'utf8') + '\n\n';
    }
  });

  return meta.trim() || 'No standard manifest file found.';
}

async function getActiveModels(groq) {
  const preferredTextModels = [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'allam-2-7b'
  ];

  try {
    const response = await groq.models.list();
    const available = response.data.map(m => m.id);
    
    const validTextModels = available.filter(id => {
      const lower = id.toLowerCase();
      return (
        !lower.includes('whisper') &&
        !lower.includes('safetensors') &&
        !lower.includes('prompt-guard') &&
        !lower.includes('guard') &&
        !lower.includes('orpheus') &&
        !lower.includes('canopylabs') &&
        !lower.includes('audio') &&
        !lower.includes('speech') &&
        !lower.includes('tts')
      );
    });

    const sorted = validTextModels.sort((a, b) => {
      const idxA = preferredTextModels.indexOf(a);
      const idxB = preferredTextModels.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return 0;
    });

    if (sorted.length > 0) return sorted;
  } catch (e) {}

  return preferredTextModels;
}

async function run() {
  const apiKey = await getApiKey();
  const groq = new Groq({ apiKey });

  const args = process.argv.slice(2);
  const modelArg = args.find(arg => arg.startsWith('--model='));
  
  console.log('\n🤬 i-hate-readme v1.0.0 (Powered by Groq)');
  console.log('────────────────────────────────────────────────────────');
  console.log('🔍 Querying Groq API for available text generation models...');

  const activeModels = await getActiveModels(groq);
  const selectedModel = modelArg ? modelArg.split('=')[1] : activeModels[0];

  console.log(`🔍 Scanning project structure... (Preferred model: ${selectedModel})`);

  const projectDir = process.cwd();
  const structure = getProjectStructure(projectDir);
  const metadata = getProjectMetadata(projectDir);
  const projectName = path.basename(projectDir);

  console.log('⚠️  Zero patience detected for writing Markdown.');
  console.log('⚡ Generating a high-converting, Github-famous README.md...\n');

  // Topo HTML garantido e imutável construído diretamente no JS
  const headerHTML = `<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=auto&height=150&section=header&text=${projectName}&fontSize=40" width="100%" />
</p>

<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&pause=1000&color=F75C7E&center=true&vCenter=true&width=435&lines=Automated+documentation+generation;Zero+patience+for+writing+docs;Powered+by+Groq+AI" alt="Typing SVG" />
</p>

<p align="center">
  <a href="#-overview">Overview</a> •
  <a href="#-features">Features</a> •
  <a href="#%EF%B8%8F-tech-stack">Tech Stack</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-license">License</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge" alt="License" />
</p>

---

`;

  const prompt = `
Generate ONLY the body sections of a top-tier open-source GitHub README.md in English for project "${projectName}".

CRITICAL CONSTRAINTS:
1. Start directly with the "## 📌 Overview" heading.
2. DO NOT write or repeat any headers, badges, or typing SVGs above Overview.
3. Write EACH section EXACTLY ONCE. STOP completely after the License section. DO NOT loop or repeat Contributing sections.
4. DO NOT mention "Groq queries", "query language", or JSON configuration formats.
5. Return ONLY raw Markdown content without triple backtick wrappers around the response.

PROJECT DATA:
- Target Project Name: "${projectName}"
- File Hierarchy:
\`\`\`
${structure}
\`\`\`
- Manifests & Configuration Metadata:
\`\`\`
${metadata}
\`\`\`

REQUIRED SECTIONS TO GENERATE:

## 📌 Overview
An impactful summary explaining what this repository does and what developer pain point it solves based on the analyzed files.

## ✨ Features
Bullet points with crisp emojis highlighting real capabilities detected in the codebase (e.g., file-tree scanning, zero-config API key persistence, dynamic model fallback).

## 🛠️️ Tech Stack
List technologies detected in the metadata with concise descriptions.

## 🚀 Quick Start
Copy-paste ready installation and execution commands matching the project ecosystem:
\`\`\`bash
npm install -g ${projectName}${projectName}
\`\`\`

To reset or manage credentials:
\`\`\`bash
${projectName} --reset-key
\`\`\`

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

## 📄 License
This project is licensed under the [MIT License](LICENSE).
`;

  const candidateModels = [selectedModel, ...activeModels].filter((v, i, a) => a.indexOf(v) === i);

  for (const modelName of candidateModels) {
    try {
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are a precise technical documenter. Output raw Markdown body only. Write each section once and STOP immediately after the License section. Never loop.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: modelName,
        temperature: 0.0,
        max_tokens: 800,
      });

      let markdownBody = completion.choices[0]?.message?.content;

      if (!markdownBody) {
        throw new Error('Empty response returned by Groq API.');
      }

      // Remove eventuais loops residuais caso a IA tente repetir seções no final
      if (markdownBody.includes('## 📄 License')) {
        const parts = markdownBody.split('## 📄 License');
        const licenseSection = parts[1].split('##')[0]; // Pega até a próxima tentativa de seção
        markdownBody = parts[0] + '## 📄 License' + licenseSection;
      }

      // Junta o Header HTML garantido pelo JS com o corpo em Markdown perfeito gerado pela IA
      const finalMarkdown = headerHTML + markdownBody.trim() + '\n';

      fs.writeFileSync(path.join(projectDir, 'README.md'), finalMarkdown);
      console.log(`✅ README.md generated successfully using ${modelName}!`);
      console.log('🚀 Now get back to coding what actually matters!\n');
      return;
    } catch (error) {
      const errMessage = error.message || String(error);

      if (errMessage.includes('API key') || errMessage.includes('401') || errMessage.includes('403')) {
        clearSavedKey();
        console.error('\n❌ Invalid or expired Groq API key!');
        console.log('🗑️  The invalid key has been removed automatically.');
        console.log('👉 Please run "node bin/cli.js --reset-key" to insert a new valid key.\n');
        return;
      }

      console.log(`⚠️  Attempt with ${modelName} failed:`, errMessage);
    }
  }

  console.error('\n❌ Could not generate README with any active Groq model.');
}

run();