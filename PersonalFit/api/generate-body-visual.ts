/**
 * POST /api/generate-body-visual
 * Uses Anthropic Claude to generate a personalized SVG body silhouette infographic.
 * Requires Vercel env: ANTHROPIC_API_KEY
 */

import { handleCors } from './_cors';
import Anthropic from "@anthropic-ai/sdk";

export interface GenerateBodyVisualBody {
  currentWeight: number;
  targetWeight: number;
  weightLoss: number;
  bodyFat?: number;
  muscleMass?: number;
  gender: "male" | "female";
  timeframeDays: number;
}

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  }

  const body = req.body as Partial<GenerateBodyVisualBody>;
  const currentWeight = typeof body?.currentWeight === "number" ? body.currentWeight : 80;
  const targetWeight = typeof body?.targetWeight === "number" ? body.targetWeight : currentWeight - 10;
  const weightLoss = typeof body?.weightLoss === "number" ? body.weightLoss : currentWeight - targetWeight;
  const bodyFat = typeof body?.bodyFat === "number" ? body.bodyFat : undefined;
  const muscleMass = typeof body?.muscleMass === "number" ? body.muscleMass : undefined;
  const gender = body?.gender === "female" ? "female" : "male";
  const timeframeDays = typeof body?.timeframeDays === "number" ? body.timeframeDays : 90;

  const client = new Anthropic({ apiKey });

  const prompt = `Generate a single clean SVG (viewBox="0 0 320 480") 
showing a motivational body transformation infographic.

User data:
- Current weight: ${currentWeight}kg
- Target weight: ${targetWeight}kg  
- Weight to lose: ${weightLoss}kg
- Timeframe: ${timeframeDays} days
- Body fat: ${bodyFat ?? "unknown"}%
- Gender: ${gender}

The SVG must contain:
1. Two body silhouettes side by side (before/after)
   - Left silhouette: wider, labeled "Most" with ${currentWeight}kg
   - Right silhouette: slimmer, labeled "${timeframeDays} nap múlva" with ${targetWeight}kg
   - Use simple filled path shapes, rounded, humanoid
   - Left: fill="#e5e7eb" (grey)
   - Right: fill="url(#goalGradient)" (blue-teal gradient)

2. Stats below the silhouettes:
   - "-${weightLoss}kg" in large bold text, color #3b82f6
   - "${timeframeDays} nap alatt" subtitle in grey
   - If bodyFat provided: "Testzsír: ${bodyFat}% → estimated target%"

3. Gradient definition:
   <defs>
     <linearGradient id="goalGradient" x1="0" y1="0" x2="0" y2="1">
       <stop offset="0%" stop-color="#3b82f6"/>
       <stop offset="100%" stop-color="#14b8a6"/>
     </linearGradient>
   </defs>

4. Motivational text at bottom:
   "Ha kitartasz, eléred a célodat! 💪"
   font-size="13" fill="#6b7280" text-anchor="middle"

Return ONLY the raw SVG string starting with <svg and ending with </svg>.
No markdown, no explanation, no backticks.`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const block = message.content[0];
    let raw =
      block && typeof block === "object" && "type" in block && block.type === "text" && "text" in block
        ? String((block as { text: string }).text).trim()
        : "";

    // Strip markdown code fence if present
    const svgMatch = raw.match(/<svg[\s\S]*?<\/svg>/i);
    const svgContent = svgMatch ? svgMatch[0] : raw.replace(/^```\w*\n?/i, "").replace(/\n?```$/i, "").trim();

    if (!svgContent.startsWith("<svg")) {
      return res.status(500).json({ error: "No valid SVG in Claude response" });
    }

    return res.status(200).json({ svg: svgContent });
  } catch (err: any) {
    console.error("[generate-body-visual]", err);
    return res.status(500).json({ error: err?.message || "SVG generation failed" });
  }
}
