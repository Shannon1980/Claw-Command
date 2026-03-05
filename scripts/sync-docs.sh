#!/bin/bash
# Claw Command — Sync local workspace docs to dashboard
# Reads .md/.txt files from ~/.openclaw/workspace and pushes to Vercel

WORKSPACE="${OPENCLAW_WORKSPACE:-$HOME/.openclaw/workspace}"
DASHBOARD_URL="${CLAW_COMMAND_URL:-https://claw-command-pi.vercel.app}"

echo "[$(date)] Syncing workspace docs → Claw Command..."

# Build JSON payload with node
PAYLOAD=$(node -e "
const fs = require('fs');
const path = require('path');

const workspace = process.argv[1];
const files = fs.readdirSync(workspace)
  .filter(f => f.endsWith('.md') || f.endsWith('.txt'))
  .filter(f => !['MEMORY.md','SOUL.md','USER.md','IDENTITY.md','TOOLS.md','HEARTBEAT.md'].includes(f));

// Agent mapping by content/name patterns
function guessAgent(filename, content) {
  const fn = filename.toLowerCase();
  const c = (content || '').toLowerCase().slice(0, 500);
  if (fn.includes('cpars') || fn.includes('seas') || fn.includes('skyward')) return 'skylar';
  if (fn.includes('mbe') || fn.includes('cert') || fn.includes('wosb') || fn.includes('lsbrp')) return 'veronica';
  if (fn.includes('capability') || fn.includes('brand') || fn.includes('muse')) return 'muse';
  if (fn.includes('bd-') || fn.includes('opportunity') || fn.includes('capture') || fn.includes('scout') || fn.includes('competitive')) return 'bertha';
  if (fn.includes('safe') || fn.includes('itbiz') || fn.includes('lesson') || fn.includes('teaching')) return 'bob';
  if (fn.includes('agent') || fn.includes('subagent') || fn.includes('dashboard') || fn.includes('task')) return 'bob';
  if (fn.includes('api-') || fn.includes('component') || fn.includes('implementation') || fn.includes('sam-')) return 'forge';
  if (fn.includes('depa')) return 'depa';
  if (fn.includes('pta') || fn.includes('community') || fn.includes('courtyard')) return 'harmony';
  return 'bob';
}

function guessType(filename) {
  const fn = filename.toLowerCase();
  if (fn.includes('capability') || fn.includes('proposal') || fn.includes('rfi') || fn.includes('capture')) return 'proposal';
  if (fn.includes('cert') || fn.includes('mbe') || fn.includes('wosb') || fn.includes('lsbrp')) return 'certification_doc';
  if (fn.includes('cpars') || fn.includes('report') || fn.includes('seas')) return 'report';
  if (fn.includes('spec') || fn.includes('api-') || fn.includes('design') || fn.includes('checklist')) return 'reference';
  if (fn.includes('safe') || fn.includes('lesson') || fn.includes('teaching')) return 'teaching';
  if (fn.includes('agent') || fn.includes('task') || fn.includes('dashboard')) return 'internal';
  return 'document';
}

function guessStatus(content) {
  const c = (content || '').toLowerCase().slice(0, 1000);
  if (c.includes('draft') || c.includes('tbd') || c.includes('pending')) return 'draft';
  if (c.includes('ready for review') || c.includes('in review')) return 'in_review';
  if (c.includes('approved') || c.includes('complete') || c.includes('final')) return 'approved';
  return 'draft';
}

function titleFromFilename(filename) {
  return filename
    .replace(/\.(md|txt)$/, '')
    .replace(/[-_]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '\$1 \$2')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const docs = files.map(f => {
  const filePath = path.join(workspace, f);
  let content = '';
  try { 
    content = fs.readFileSync(filePath, 'utf8').replace(/\0/g, ''); 
  } catch(e) {}
  
  return {
    id: 'ws-' + f.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase(),
    title: titleFromFilename(f),
    filename: f,
    docType: guessType(f),
    content: content.slice(0, 50000), // Cap at 50KB per doc
    authorAgentId: guessAgent(f, content),
    status: guessStatus(content),
    filePath: filePath,
  };
});

console.log(JSON.stringify({ docs }));
" "$WORKSPACE" 2>/dev/null)

if [ -z "$PAYLOAD" ]; then
  echo "[$(date)] ⚠️  Failed to build payload"
  exit 1
fi

DOC_COUNT=$(echo "$PAYLOAD" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log(d.docs.length)")
echo "[$(date)] Found $DOC_COUNT documents to sync"

# Push to dashboard
RESPONSE=$(curl -s --max-time 30 -X POST \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  "${DASHBOARD_URL}/api/sync/docs")

echo "[$(date)] ✅ Response: $RESPONSE"
