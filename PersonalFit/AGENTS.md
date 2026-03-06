# Agent Workflow — PersonalFit

## 4-Agent Mandatory Process
Every task MUST go through all 4 steps before marking done:

### 1. ARCHITECT
- Read TASKS.md and pick next task
- Define acceptance criteria
- Break into subtasks for Coder

### 2. CODER  
- Implement the fix
- Follow MISSION.md rules (no localStorage, IDatabase adapter, etc.)
- Run: npm run typecheck — must pass with 0 errors

### 3. TESTER
- Run: npm run build — must succeed
- Open http://localhost:5176 and manually verify the feature works
- Test edge cases
- If anything fails → back to CODER

### 4. REVIEWER + DEPLOY
- Code review: check MISSION.md rules
- Run: npm run typecheck && npm run build
- Only if both pass, from the **inner PersonalFit app directory**:

  ```bash
  cd "/Users/attilacsorvasi/Desktop/Sajat Dolgok_Desktop 2025 Szept 23-ig/Desktop - ROMS0374MACNB/Works/PersonalFit/PersonalFit"
  git add -A && git commit -m "..." && git push
  vercel --prod --force
  ```

- Wait 2 minutes, verify on personalfit-app.vercel.app
- If Vercel shows wrong version → run vercel --prod --force again

## Rules
- NEVER commit if typecheck fails
- NEVER skip testing on localhost before deploy
- ALWAYS use vercel --prod --force after git push
- ALWAYS verify on personalfit-app.vercel.app after deploy
- If Vercel is stuck → run: vercel --prod --force

