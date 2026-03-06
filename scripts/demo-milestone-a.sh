#!/usr/bin/env bash
# Milestone A demo script - 10-15 min walkthrough
# Run with dev server: npm run dev (in another terminal)
# Then: ./scripts/demo-milestone-a.sh

BASE="${1:-http://localhost:3000}"

echo "=========================================="
echo "Mission Control Milestone A Demo"
echo "=========================================="
echo ""
echo "Base URL: $BASE"
echo "Ensure 'npm run dev' is running in another terminal."
echo ""
read -p "Press Enter to start..."

echo ""
echo "1. MC Tab - Open $BASE/mission-control"
echo "   - MissionHeader, Kanban, Schedule, Memory Recall, Dependencies"
read -p "   Press Enter when MC page is visible..."

echo ""
echo "2. Seed memory from MEMORY.md"
curl -s -X POST "$BASE/api/mission-control/seed" | head -c 200
echo ""
read -p "   Press Enter to continue..."

echo ""
echo "3. Recall - GET /api/mission-control/recall?q=certification"
curl -s "$BASE/api/mission-control/recall?q=certification" | head -c 300
echo ""
read -p "   Press Enter to continue..."

echo ""
echo "4. Chat recall/remember - Open $BASE/chat"
echo "   - Type: /recall certification"
echo "   - Type: /remember Something important"
read -p "   Press Enter when done..."

echo ""
echo "5. Smoke tests"
./scripts/smoke-test-mc-api.sh "$BASE"

echo ""
echo "=========================================="
echo "Demo complete."
echo "=========================================="
