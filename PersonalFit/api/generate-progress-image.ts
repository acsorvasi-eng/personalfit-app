/**
 * POST /api/generate-progress-image
 * Uses Replicate (Stability AI SDXL) to generate a "future body" progress image.
 * Requires Vercel env: REPLICATE_API_TOKEN
 */

function handleCors(req: any, res: any): boolean { res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); if (req.method === 'OPTIONS') { res.status(204).end(); return true; } return false; }
import Replicate from "replicate";

export interface GenerateProgressImageBody {
  weightLoss: number;
  currentWeight: number;
  targetWeight: number;
  gender: "male" | "female";
  timeframeDays: number;
}

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    return res.status(500).json({ error: "REPLICATE_API_TOKEN not configured" });
  }

  const body = req.body as Partial<GenerateProgressImageBody>;
  const weightLoss = typeof body?.weightLoss === "number" ? body.weightLoss : 0;
  const currentWeight = typeof body?.currentWeight === "number" ? body.currentWeight : 80;
  const targetWeight = typeof body?.targetWeight === "number" ? body.targetWeight : currentWeight - weightLoss;
  const gender = body?.gender === "female" ? "female" : "male";
  const timeframeDays = typeof body?.timeframeDays === "number" ? body.timeframeDays : 90;

  const prompt =
    gender === "male"
      ? `Athletic fit male body, ${targetWeight}kg, lean muscular physique, healthy weight loss transformation, front view, neutral background, photorealistic, fitness progress photo`
      : `Athletic fit female body, ${targetWeight}kg, lean toned physique, healthy weight loss transformation, front view, neutral background, photorealistic, fitness progress photo`;

  const negativePrompt = "deformed, ugly, bad anatomy, extra limbs";

  try {
    const replicate = new Replicate({ auth: token });
    const output = await replicate.run(
      "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
      {
        input: {
          prompt,
          negative_prompt: negativePrompt,
          width: 512,
          height: 768,
          num_outputs: 1,
        },
      }
    );

    const imageUrl = Array.isArray(output) && output.length > 0 ? output[0] : null;
    if (!imageUrl || typeof imageUrl !== "string") {
      return res.status(500).json({ error: "No image URL in Replicate response" });
    }
    return res.status(200).json({ imageUrl });
  } catch (err: any) {
    console.error("[generate-progress-image]", err);
    return res.status(500).json({ error: err?.message || "Image generation failed" });
  }
}
