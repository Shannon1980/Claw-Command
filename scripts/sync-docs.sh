#!/bin/bash
# Claw Command — Sync local OpenClaw workspace docs to dashboard
# Reads .md/.txt files from ~/.openclaw/workspace (recursive) and pushes to Claw Command DB
#
# Usage:
#   ./scripts/sync-docs.sh              # sync to remote (apply directly)
#   ./scripts/sync-docs.sh --preview    # show changes only
#   ./scripts/sync-docs.sh -i           # interactive: preview, then prompt accept/decline
#
# For local Claw Command (npm run dev):
#   CLAW_COMMAND_URL=http://localhost:3000 ./scripts/sync-docs.sh -i
# Ensure .env.local has DATABASE_URL.

WORKSPACE="${OPENCLAW_WORKSPACE:-$HOME/.openclaw/workspace}"
DASHBOARD_URL="${CLAW_COMMAND_URL:-https://claw-command-pi.vercel.app}"
MAX_DOCS="${SYNC_DOCS_MAX:-500}"
export SYNC_DOCS_MAX="$MAX_DOCS"

PREVIEW=0
INTERACTIVE=0
for arg in "$@"; do
  case "$arg" in
    --preview|-p) PREVIEW=1 ;;
    -i|--interactive) INTERACTIVE=1 ;;
  esac
done

echo "[$(date)] Syncing OpenClaw workspace docs → Claw Command ($DASHBOARD_URL)..."

# Build JSON payload with node (recursive scan)
PAYLOAD=$(node -e "
const fs = require('fs');
const path = require('path');

const workspace = process.argv[1];
const EXCLUDED = ['MEMORY.md','SOUL.md','USER.md','IDENTITY.md','TOOLS.md','HEARTBEAT.md'];

function walkDir(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && !e.name.startsWith('.')) {
      walkDir(full, files);
    } else if (e.isFile() && (e.name.endsWith('.md') || e.name.endsWith('.txt')) && !EXCLUDED.includes(e.name)) {
      files.push(path.relative(workspace, full));
    }
  }
  return files;
}

const maxDocs = parseInt(process.env.SYNC_DOCS_MAX || '500', 10);
const allFiles = walkDir(workspace).sort();
const files = allFiles.slice(0, maxDocs);

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
  if (fn.includes('template')) return 'template';
  if (fn.includes('spec') || fn.includes('api-') || fn.includes('design') || fn.includes('checklist')) return 'reference';
  if (fn.includes('safe') || fn.includes('lesson') || fn.includes('teaching')) return 'teaching';
  if (fn.includes('agent') || fn.includes('task') || fn.includes('dashboard')) return 'internal';
  return 'report';
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

const docs = files.map(relPath => {
  const filePath = path.join(workspace, relPath);
  const basename = path.basename(relPath);
  let content = '';
  try { 
    content = fs.readFileSync(filePath, 'utf8').replace(/\0/g, ''); 
  } catch(e) {}
  
  return {
    id: 'ws-' + relPath.replace(/[^a-zA-Z0-9]/g, '-').replace(/\//g, '-').toLowerCase(),
    title: titleFromFilename(basename),
    filename: basename,
    docType: guessType(basename),
    content: content.slice(0, 50000), // Cap at 50KB per doc
    authorAgentId: guessAgent(basename, content),
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
echo "[$(date)] $DOC_COUNT documents (max $MAX_DOCS; set SYNC_DOCS_MAX for more)"

if [ "$PREVIEW" = 1 ] || [ "$INTERACTIVE" = 1 ]; then
  PREVIEW_PAYLOAD=$(echo "$PAYLOAD" | node -e "
    const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    d.preview=true;
    console.log(JSON.stringify(d));
  ")
  HTTP_CODE=$(curl -s -o /tmp/sync-preview.json -w "%{http_code}" --max-time 30 -X POST \
    -H "Content-Type: application/json" \
    -d "$PREVIEW_PAYLOAD" \
    "${DASHBOARD_URL}/api/sync/docs")
  RESPONSE=$(cat /tmp/sync-preview.json 2>/dev/null)
  if [ "$HTTP_CODE" != "200" ]; then
    echo "[$(date)] Preview request failed (HTTP $HTTP_CODE)"
    echo "$RESPONSE" | head -c 500
    echo ""
    if [ "$HTTP_CODE" = "503" ]; then
      echo "[$(date)] Hint: Database may not be configured. Ensure Claw Command has DATABASE_URL set."
    fi
    if [ "$HTTP_CODE" = "000" ] || [ -z "$HTTP_CODE" ]; then
      echo "[$(date)] Hint: Is Claw Command running? For local: CLAW_COMMAND_URL=http://localhost:3000 ./scripts/sync-docs.sh -i"
    fi
    [ "$INTERACTIVE" = 1 ] && echo "[$(date)] Cannot proceed with apply after preview failure."
    exit 1
  else
    echo "$RESPONSE" | node -e "
      try {
        const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
        if (d.preview) {
          const c=(d.created||[]).length, u=(d.updated||[]).length, del=(d.deleted||[]).length;
          console.log('[Sync preview] Created:', c, 'Updated:', u, 'No longer in workspace:', del);
          if (c>0) (d.created||[]).slice(0,5).forEach(x=>console.log('  +', x.title));
          if (u>0) (d.updated||[]).slice(0,5).forEach(x=>console.log('  ~', x.title));
          if (del>0) (d.deleted||[]).slice(0,5).forEach(x=>console.log('  -', x.title));
        } else {
          console.log('Preview failed:', d.error || JSON.stringify(d));
        }
      } catch(e) {
        console.error('Could not parse response:', e.message);
        process.exit(1);
      }
    " || echo "[$(date)] Preview parse error. Raw: $(echo "$RESPONSE" | head -c 200)"
  fi
  if [ "$PREVIEW" = 1 ]; then
    echo "[$(date)] Preview only. Run without --preview to apply, or use -i for interactive."
    exit 0
  fi
  echo -n "[$(date)] Apply these changes? [y/N] "
  read -r ans
  if [ "$ans" != "y" ] && [ "$ans" != "Y" ]; then
    echo "[$(date)] Declined."
    exit 0
  fi
fi

while true; do
  export OFFSET
  export BATCH_SIZE
  BATCH=$(echo "$PAYLOAD" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));const o=parseInt(process.env.OFFSET||0);const s=parseInt(process.env.BATCH_SIZE||100);const b=d.docs.slice(o,o+s);if(b.length===0){process.exit(1);}console.log(JSON.stringify({docs:b}));" 2>/dev/null)
  [ $? -ne 0 ] && break
  RESPONSE=$(echo "$BATCH" | curl -s --max-time 30 -X POST \
    -H "Content-Type: application/json" \
    -d @- \
    "${DASHBOARD_URL}/api/sync/docs")
  echo "[$(date)] Batch offset $OFFSET: $RESPONSE"
  OFFSET=$((OFFSET + BATCH_SIZE))
done

echo "[$(date)] Sync complete"
