#!/bin/bash
# Auto TypeScript checker — runs after every Write/Edit on .ts/.tsx files
# Injects errors back into Claude's context so it can fix them immediately.

FILE=$(jq -r '.tool_input.file_path // empty' 2>/dev/null)
if [ -z "$FILE" ]; then exit 0; fi

# Only check TypeScript files
echo "$FILE" | grep -qE '\.(ts|tsx)$' || exit 0

PROJECT_DIR="/Users/attilacsorvasi/Desktop/Sajat Dolgok_Desktop 2025 Szept 23-ig/Desktop - ROMS0374MACNB/Works/PersonalFit/PersonalFit"

ERRORS=$(cd "$PROJECT_DIR" && npx tsc --noEmit 2>&1 | grep -v "buildIngredientSelection.test" | grep -v "^$")

if [ -n "$ERRORS" ]; then
  # Return errors as additionalContext so Claude sees them immediately
  MSG=$(echo "$ERRORS" | head -20 | sed 's/"/\\"/g' | tr '\n' '|' | sed 's/|/\\n/g')
  printf '{"hookSpecificOutput": {"hookEventName": "PostToolUse", "additionalContext": "⚠️ TypeScript hibak talalhatok:\\n%s"}}\n' "$MSG"
fi
