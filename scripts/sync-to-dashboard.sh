#!/bin/bash
DASHBOARD_URL="${CLAW_COMMAND_URL:-https://claw-command-pi.vercel.app}"

echo "[$(date)] Syncing OpenClaw -> Claw Command..."

STATUS=$(openclaw status --json 2>/dev/null)

if [ -z "$STATUS" ] || [ "$STATUS" = "null" ]; then
  echo "[$(date)] WARNING: Gateway unreachable"
  exit 1
fi

PAYLOAD=$(echo "$STATUS" | node -e "
const data = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
const sessions = (data && data.sessions && data.sessions.recent) ? data.sessions.recent : [];
const AGENT_MAP = {
  main:     {id:'bob',      name:'Bob',      emoji:'robot',     domain:'vorentoe'},
  bob:      {id:'bob',      name:'Bob',      emoji:'robot',     domain:'vorentoe'},
  bertha:   {id:'bertha',   name:'Bertha',   emoji:'briefcase', domain:'vorentoe'},
  veronica: {id:'veronica', name:'Veronica', emoji:'dart',      domain:'vorentoe'},
  depa:     {id:'depa',     name:'Depa',     emoji:'chart',     domain:'vorentoe'},
  forge:    {id:'forge',    name:'Forge',    emoji:'gear',      domain:'vorentoe'},
  atlas:    {id:'atlas',    name:'Atlas',    emoji:'computer',  domain:'vorentoe'},
  muse:     {id:'muse',     name:'Muse',     emoji:'art',       domain:'vorentoe'},
  peter:    {id:'peter',    name:'Peter',    emoji:'clipboard', domain:'vorentoe'},
  harmony:  {id:'harmony',  name:'Harmony',  emoji:'people',    domain:'community'},
  skylar:   {id:'skylar',   name:'Skylar',   emoji:'cloud',     domain:'skyward'},
  sentinel: {id:'sentinel', name:'Sentinel', emoji:'shield',    domain:'vorentoe'}
};
const agentUpdates={};const activities=[];const fiveMinAgo=Date.now()-5*60*1000;
for(const session of sessions){
  const label=(session.agentId||session.label||session.key||'').toLowerCase();
  let agent=null;
  for(const key of Object.keys(AGENT_MAP)){
    if(label===key||label.indexOf(key)!==-1){agent=AGENT_MAP[key];break;}
  }
  if(!agent)continue;
  const lastActive=session.updatedAt||0;
  const isActive=lastActive>fiveMinAgo;
  const existing=agentUpdates[agent.id];
  if(!existing||lastActive>(existing._lastActive||0)){
    agentUpdates[agent.id]=Object.assign({},agent,{status:isActive?'active':'idle',currentTask:session.label||session.key||null,percentUsed:session.percentUsed||null,model:session.model||null,_lastActive:lastActive});
  }
  if(isActive){
    activities.push({id:'sync-'+session.key+'-'+Date.now(),actorAgentId:agent.id,eventType:'task_started',resourceType:'task',resourceId:session.key,details:JSON.stringify({message:session.label||'Active session',source:'openclaw-sync'})});
  }
}
const agents=Object.values(agentUpdates).map(function(a){const r=Object.assign({},a);delete r._lastActive;return r;});
console.log(JSON.stringify({agents:agents,activities:activities.slice(0,20),syncKey:process.env.SYNC_SECRET_KEY||''}));
" 2>/dev/null)

if [ -z "$PAYLOAD" ]; then
  echo "[$(date)] WARNING: Failed to build payload"
  exit 1
fi

RESPONSE=$(curl -s --max-time 15 -X POST -H "Content-Type: application/json" -d "$PAYLOAD" "${DASHBOARD_URL}/api/sync/push")
echo "[$(date)] OK Response: $RESPONSE"
