import { handleCors } from './_shared/cors';
import { verifyAuth, sendAuthError } from './_shared/auth';
import { checkAndIncrementUsage } from './_shared/limits';
import { sanitizeUserInput } from './_shared/sanitize';
import { validateBodySize } from './_shared/validate';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

function resolveApiKey(): string | undefined {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  try {
    const content = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
    return content.match(/^ANTHROPIC_API_KEY=["']?([^"'\r\n]+)["']?/m)?.[1];
  } catch { return undefined; }
}

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: resolveApiKey() });
  return _client;
}

function extractJSON(text: string): unknown {
  const s = text.trim()
    .replace(/^```json\s*/i, '').replace(/```\s*$/i, '')
    .replace(/^```\s*/i, '').trim();
  try { return JSON.parse(s); } catch {}
  const m = s.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch {}
  return null;
}

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Auth check
  let authUser;
  try {
    authUser = await verifyAuth(req);
  } catch (err: any) {
    return sendAuthError(res, err);
  }

  // Rate limiting
  try {
    await checkAndIncrementUsage(authUser.uid, authUser.isAdmin);
  } catch (err: any) {
    if (err?.status === 429) {
      return res.status(429).json({ error: err.message, resetsAt: err.resetsAt });
    }
  }

  try {
    validateBodySize(req.body);
    const { type, context = {} } = req.body || {};
    const {
      userName = '',
      recentMeals = [],
      region = '',
      season = 'winter',
      month = 1,
      cultureWeights = {},
      language = 'hu',
      pendingChanges = [],
      rejectedDishes = [],
    } = context;

    if (!['new_dish', 'weekly_summary', 'season_refresh'].includes(type)) {
      return res.status(400).json({ error: 'type must be new_dish | weekly_summary | season_refresh' });
    }

    const cultureParts = Object.entries(cultureWeights).map(([k, v]) => `${k}:${v}%`).join(', ') || 'hu:60, ro:40';
    const langNote = language === 'ro' ? 'Válaszolj románul.' : language === 'en' ? 'Reply in English.' : 'Válaszolj magyarul.';
    const nameStart = userName ? `Kezdd a nevével: ${userName}.` : '';

    let prompt: string;
    let requiresApproval = false;

    if (type === 'weekly_summary') {
      const changeList = (pendingChanges as Array<{ original: string; replacement: string; reason: string }>)
        .map(c => `• ${c.original} → ${c.replacement}: ${c.reason}`)
        .join('\n') || '(Nem volt változtatás ezen a héten.)';

      prompt = `Te "A Séf" vagy. Küldj barátságos heti összefoglalót ${userName || 'a felhasználónak'} az ezen a héten tett csendes változtatásokról.
${nameStart} ${langNote} Max 2–3 mondat. Meleg, személyes, nem robotszerű.

Változtatások:
${changeList}

Válaszolj JSON-ben: {"message":"<szöveg>"}`;

    } else if (type === 'new_dish') {
      const recentStr = (recentMeals as string[]).slice(0, 14).join(', ') || '(nincs adat)';
      const avoidStr = (rejectedDishes as string[]).join(', ');

      prompt = `Te "A Séf" vagy — ${region || 'erdélyi'} konyha szakértője. Konyhakultúra: ${cultureParts}.
Évszak: ${season}, hónap: ${month}.
${userName} az utóbbi 2 hétben ezeket ette: ${recentStr}.
${avoidStr ? `Ezeket már visszautasította — NE ajánld: ${avoidStr}.` : ''}

Javasolj egy EGYEDI, helyi szezonális ételt ebéd vagy vacsora kategóriában amelyet eddig nem evett.
${nameStart} ${langNote} Max 2 mondat. Magyarázd el miért éppen ez az étel és miért most van szezonja.

Válaszolj JSON-ben:
{"message":"<személyes javaslat>","proposal":{"meal":"lunch","replacement":"<étel neve>","calories":550,"macros":{"protein":35,"carbs":60,"fat":18}}}`;
      requiresApproval = true;

    } else { // season_refresh
      prompt = `Te "A Séf" vagy. Üdvözöld ${userName || 'a felhasználót'} az új évszakban (${season}) és ajánlj egy ízletes menüváltást. ${nameStart} ${langNote} Max 2 mondat.
Válaszolj JSON-ben: {"message":"<üdvözlő szöveg + javaslat>"}`;
    }

    const msg = await getClient().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = msg.content[0]?.type === 'text' ? msg.content[0].text : '';
    const parsed = extractJSON(raw) as Record<string, unknown> | null;

    return res.status(200).json({
      message: (parsed?.message as string) || raw.slice(0, 300),
      proposal: parsed?.proposal ?? undefined,
      requiresApproval,
    });

  } catch (err: any) {
    console.error('[chef-suggest] Error:', err?.message || err);
    return res.status(err?.status || 500).json({ error: 'An error occurred processing your request.' });
  }
}
