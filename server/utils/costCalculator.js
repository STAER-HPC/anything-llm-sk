// Pricing per 1 million tokens for supported models.
// Add or update entries as needed.
//
// Tiered pricing: models with a `tiers` array select the price tier based on
// total prompt token count. Tiers are evaluated highest-first; the first tier
// where promptTokens >= minTokens wins. A final tier with minTokens: 0 acts as
// the default. Models without `tiers` use flat pricing as before.
const PRICING_MAP = {
  // ── Google ────────────────────────────────────────────────────────────────
  "gemini/gemini-3.1-pro-preview": {
    tiers: [
      {
        minTokens: 200001,
        input: 1200.0,
        output: 5460.0,
      },
      {
        minTokens: 0,
        input: 600.0,
        output: 3640.0,
      },
    ],
  },
  "gemini/gemini-3-flash-preview": {
    input: 152.0,
    output: 910.0,
  },
    "gemini/gemini-3.1-flash-lite-preview": {
    input: 76.0,
    output: 455.0,
  },

  // ── Anthropic ─────────────────────────────────────────────────────────────
  // claude-sonnet-4-6: standard rate up to 200k tokens; 200k+ rate above that
  "anthropic/claude-sonnet-4-6": {
    tiers: [
      {
        minTokens: 200001,
        input: 1547.0,
        output: 5798.0,
        cacheRead: 155.0,
        cacheWrite: 1933.0,
      },
      {
        minTokens: 0,
        input: 774.0,
        output: 3866.0,
        cacheRead: 78.0,
        cacheWrite: 967.0,
      },
    ],
  },
  "anthropic/claude-opus-4-6": {
    input: 1516.0,
    output: 7579.0,
    cacheRead: 152.0,
    cacheWrite: 1895.0,
  },

    // ── OpenAI ────────────────────────────────────────────────────────────────
  "openai/gpt-5.4": {
    input: 760.0,
    output: 4550.0,
    cacheRead: 76.0,
  },
  "openai/gpt-5.3-chat-latest": {
    input: 530.0,
    output: 4240.0,
    cacheRead: 53.0,
  },
  "openai/gpt-5.3-codex": {
    input: 530.0,
    output: 4240.0,
    cacheRead: 53.0,
  },
      // ── OpenRouter ────────────────────────────────────────────────────────────────
  "openrouter/minimax/minimax-m2.5": {
    input: 41.0,
    output: 150.0,
  },
  "openrouter/deepseek/deepseek-v3.2": {
    input: 39.0,
    output: 57.0,
  },
  "openrouter/x-ai/grok-4.1-fast": {
    input: 30.0,
    output: 50.0,
  },
  "openrouter/x-ai/grok-4.20-beta": {
    tiers: [
      {
        minTokens: 200001,
        input: 600.0,
        output: 1800.0,
      },
      {
        minTokens: 0,
        input: 300.0,
        output: 900.0,
      },
    ],
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
