/**
 * ====================================================================
 * Local Model Adapter — On-device AI inference interface
 * ====================================================================
 * Abstraction layer for running AI models locally in the browser.
 * Currently implements a smart heuristic fallback.
 *
 * Future: Can be extended to support:
 * - ONNX Runtime Web (onnxruntime-web)
 * - TensorFlow.js (tfjs)
 * - WebLLM (local LLM inference)
 * - Ollama WebSocket bridge
 *
 * All inference is offline — no network calls.
 */

import { logger } from '../core/config';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface InferenceResult {
  text: string;
  confidence: number;
  tokensUsed: number;
  latencyMs: number;
}

export interface ModelInfo {
  id: string;
  name: string;
  type: 'heuristic' | 'onnx' | 'tfjs' | 'webllm';
  loaded: boolean;
  sizeBytes: number;
}

// ═══════════════════════════════════════════════════════════════
// Model State
// ═══════════════════════════════════════════════════════════════

let currentModel: ModelInfo = {
  id: 'heuristic-v1',
  name: 'Rule-based Heuristic Engine',
  type: 'heuristic',
  loaded: true,
  sizeBytes: 0,
};

// ═══════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════

/**
 * Check if a local model is available for inference.
 */
export async function isModelAvailable(): Promise<boolean> {
  return currentModel.loaded;
}

/**
 * Get information about the currently loaded model.
 */
export function getModelInfo(): ModelInfo {
  return { ...currentModel };
}

/**
 * Run local inference on a prompt.
 * Currently uses the heuristic engine. Future: real model inference.
 */
export async function runLocalInference(prompt: string): Promise<InferenceResult> {
  const startTime = Date.now();

  logger.debug('[LocalModel] Running inference...', {
    model: currentModel.id,
    promptLength: prompt.length,
  });

  // Heuristic engine: parse the prompt and generate contextual response
  const text = heuristicInference(prompt);
  const latencyMs = Date.now() - startTime;

  return {
    text,
    confidence: 0.65, // Heuristic confidence baseline
    tokensUsed: Math.ceil(prompt.length / 4), // Approximate
    latencyMs,
  };
}

/**
 * Initialize / load a model. No-op for heuristic engine.
 * Future: download and initialize ONNX/TFjs model.
 */
export async function initializeModel(modelId?: string): Promise<void> {
  logger.info('[LocalModel] Model initialized:', currentModel.name);
  // Future: load ONNX model from IndexedDB cache
  // const modelBuffer = await loadModelFromCache(modelId);
  // session = await ort.InferenceSession.create(modelBuffer);
}

/**
 * Release model resources. No-op for heuristic engine.
 */
export async function disposeModel(): Promise<void> {
  logger.info('[LocalModel] Model disposed');
}

// ═══════════════════════════════════════════════════════════════
// Heuristic Inference Engine
// ═══════════════════════════════════════════════════════════════

function heuristicInference(prompt: string): string {
  const lower = prompt.toLowerCase();

  // Detect category from prompt content
  if (lower.includes('calorie') || lower.includes('nutrition') || lower.includes('macro')) {
    return generateNutritionResponse(prompt);
  }
  if (lower.includes('workout') || lower.includes('exercise') || lower.includes('training')) {
    return generateWorkoutResponse(prompt);
  }
  if (lower.includes('weight') || lower.includes('progress') || lower.includes('body fat')) {
    return generateProgressResponse(prompt);
  }

  return generateGeneralResponse(prompt);
}

function generateNutritionResponse(prompt: string): string {
  const responses = [
    'Focus on hitting your protein target first — it keeps you full and preserves muscle. Fill the rest with complex carbs and healthy fats.',
    'Consistency in meal logging is more important than perfection. Track everything, even the snacks, to build awareness.',
    'If you are under your calorie target, add nutrient-dense foods like nuts, avocado, or Greek yogurt rather than empty calories.',
    'Consider meal prepping on weekends to stay on track during busy weekdays. Preparation is half the battle.',
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

function generateWorkoutResponse(prompt: string): string {
  const responses = [
    'For your goals, combine 3 strength sessions with 2 cardio sessions per week. Rest days are just as important as training days.',
    'Progressive overload is key — gradually increase weight, reps, or duration each week. Small consistent improvements add up.',
    'Mix up your routine every 4-6 weeks to prevent plateaus. Your body adapts, so keep challenging it with variety.',
    'Do not skip warm-ups! 5-10 minutes of dynamic stretching reduces injury risk and improves performance.',
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

function generateProgressResponse(prompt: string): string {
  const responses = [
    'Weight fluctuations of 1-2kg daily are normal (water, food timing). Focus on the weekly trend, not daily numbers.',
    'Take progress photos alongside weight measurements — the scale does not tell the whole story, especially with body recomposition.',
    'If the scale is not moving but your clothes fit better, you might be gaining muscle while losing fat. That is great progress!',
    'Aim for 0.5-1kg weight loss per week for sustainable results. Faster rates often lead to muscle loss and rebound.',
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

function generateGeneralResponse(prompt: string): string {
  return 'I am here to help with your nutrition, workouts, and progress tracking. Ask me about meal planning, exercise routines, or analyzing your trends — all computed locally on your device for privacy.';
}
