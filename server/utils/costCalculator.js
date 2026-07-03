// Pricing per 1 million tokens for supported models.
// Add or update entries as needed.
//
// Tiered pricing: models with a `tiers` array select the price tier based on
// total prompt token count. Tiers are evaluated highest-first; the first tier
// where promptTokens >= minTokens wins. A final tier with minTokens: 0 acts as
// the default. Models without `tiers` use flat pricing as before.
const PRICING_MAP = {
  // ── Google ────────────────────────────────────────────────────────────────
  "google/gemini-3.1-pro-preview": {
    tiers: [
      {
        minTokens: 200001,
        input: 701.4,
        output: 2828.6,
        cacheRead: 701.4,
        cacheWrite: 2828.6,
      },
      {
        minTokens: 0,
        input: 186.07,
        output: 1116.42,
        cacheRead: 18.607,
        cacheWrite: 1116.42,
      },
    ],
  },
  "google/gemini-3-flash-preview": {
    input: 46.52,
    output: 279.11,
    cacheRead: 4.652,
    cacheWrite: 279.11,
  },
  "google/gemini-3.5-flash": {
    input: 135.426,
    output: 812.559,
    cacheRead: 13.543,
    cacheWrite: 135.426,
  },
  "google/gemini-3.1-flash-lite-preview": {
    input: 23.26,
    output: 139.55,
    cacheRead: 2.326,
    cacheWrite: 139.55,
  },

  // ── Anthropic ─────────────────────────────────────────────────────────────
  "anthropic/claude-sonnet-4.6": {
    tiers: [
      {
        minTokens: 200001,
        input: 1547.0,
        output: 5798.0,
        cacheRead: 1547.0,
        cacheWrite: 5798.0,
      },
      {
        minTokens: 0,
        input: 279.105,
        output: 1395.525,
        cacheRead: 27.91,
        cacheWrite: 348.881,
      },
    ],
  },
  "anthropic/claude-opus-4.6": {
    input: 465.175,
    output: 2325.875,
    cacheRead: 46.517,
    cacheWrite: 581.469,
  },
  "anthropic/claude-opus-4.7": {
    input: 465.175,
    output: 2325.875,
    cacheRead: 46.517,
    cacheWrite: 581.469,
  },
  "anthropic/claude-opus-4.8": {
    input: 465.175,
    output: 2325.875,
    cacheRead: 46.517,
    cacheWrite: 581.469,
  },
  "anthropic/claude-fable-5": {
    input: 920.32,
    output: 4601.6,
    cacheRead: 92.032,
    cacheWrite: 1150.4,
  },
  // ── OpenAI ────────────────────────────────────────────────────────────────
  "openai/gpt-5.5": {
    input: 440.39,
    output: 2642.33,
    cacheRead: 44.039,
    cacheWrite: 1395.53,
  },
  "openai/gpt-5.4": {
    input: 232.59,
    output: 1395.53,
    cacheRead: 23.259,
    cacheWrite: 1395.53,
  },
  "openai/gpt-5.3-codex": {
    input: 162.81,
    output: 1302.49,
    cacheRead: 16.281,
    cacheWrite: 1302.49,
  },

  // ── OpenRouter ────────────────────────────────────────────────────────────────
  "deepseek/deepseek-v4-pro": {
    input: 38.314,
    output: 76.628,
    cacheRead: 3.19,
    cacheWrite: 152.563,
  },
  "deepseek/deepseek-v4-flash": {
    input: 12.275,
    output: 24.55,
    cacheRead: 2.455,
    cacheWrite: 12.275,
  },
  "x-ai/grok-4.1-fast": {
    input: 18.607,
    output: 46.517,
    cacheRead: 4.652,
    cacheWrite: 46.517,
  },
  "xiaomi/mimo-v2.5-pro": {
    input: 40.92,
    output: 81.84,
    cacheRead: 0.339,
    cacheWrite: 81.84,
  },
  "minimax/minimax-m3": {
    input: 27.61,
    output: 110.438,
    cacheRead: 5.522,
    cacheWrite: 27.61,
  },
  "z-ai/glm-5.2": {
    input: 130.529,
    output: 410.235,
    cacheRead: 24.241,
    cacheWrite: 410.235,
  },
};

/**
 * Calculates the monetary cost of an LLM API call based on token usage.
 * Supports both flat pricing and tiered pricing (where price depends on
 * prompt token count, e.g. different rates above 200k tokens).
 * @param {string} modelName - The model identifier (e.g. "anthropic/claude-sonnet-4-6")
 * @param {number} promptTokens - Total prompt/input tokens reported by the API
 * @param {number} completionTokens - Total completion/output tokens
 * @param {number} cachedTokens - Cached input tokens (from cache_read_input_tokens or prompt_tokens_details.cached_tokens)
 * @param {number} cacheWriteTokens - Cache write/creation tokens (from cache_creation_input_tokens)
 * @returns {number} The total cost as a float
 */
function calculateCost(
  modelName,
  promptTokens = 0,
  completionTokens = 0,
  cachedTokens = 0,
  cacheWriteTokens = 0
) {
  const entry = PRICING_MAP[modelName];
  if (!entry) return 0;

  // Resolve which price tier to use
  let pricing;
  if (Array.isArray(entry.tiers)) {
    // Tiers are sorted highest minTokens first; pick the first match
    pricing = entry.tiers.find((tier) => promptTokens >= tier.minTokens);
    if (!pricing) return 0;
  } else {
    pricing = entry;
  }

  const standardInputTokens = promptTokens - cachedTokens - cacheWriteTokens;
  const inputCost = (standardInputTokens / 1_000_000) * pricing.input;
  const outputCost = (completionTokens / 1_000_000) * pricing.output;
  const cacheCost = (cachedTokens / 1_000_000) * (pricing.cacheRead ?? 0);
  const cacheWriteCost = (cacheWriteTokens / 1_000_000) * (pricing.cacheWrite ?? 0);

  return inputCost + outputCost + cacheCost + cacheWriteCost;
}

/**
 * Returns a compact human-readable price hint for a model, e.g. "↑760 ↓4550 ₽/1М".
 * For tiered models the base (lowest) tier is shown.
 * Returns null if the model is not in the pricing map.
 * @param {string} modelId
 * @returns {string|null}
 */
function getModelPriceHint(modelId) {
  const entry = PRICING_MAP[modelId];
  if (!entry) return null;
  // For tiered models use the last tier (minTokens: 0 — the base/default rate)
  const pricing = Array.isArray(entry.tiers)
    ? entry.tiers[entry.tiers.length - 1]
    : entry;
  return `\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0Price:\u00a0\u00a0Input\u00a0${pricing.input}\u20bd\u00a0/\u00a0Output\u00a0${pricing.output}\u20bd\u00a0\u00a0/1M tokens`;
}

module.exports = { calculateCost, PRICING_MAP, getModelPriceHint };
