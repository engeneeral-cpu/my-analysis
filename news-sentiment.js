'use strict';

// Deterministic, explainable sentiment helper for verified news/disclosures.
// This is a heuristic label, not a market prediction and never changes source facts.
const POSITIVE = new Set(['profit','growth','record','approval','wins','award','expansion','surge','improves','improved','strong','positive','dividend','bonus','order','partnership','launch']);
const NEGATIVE = new Set(['loss','decline','fall','drops','drop','penalty','fraud','investigation','default','downgrade','weak','negative','delay','resignation','fine','litigation','warning','shutdown']);

function tokenize(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter(Boolean);
}

function scoreText(text) {
  const tokens = tokenize(text);
  let score = 0;
  for (const token of tokens) {
    if (POSITIVE.has(token)) score += 1;
    if (NEGATIVE.has(token)) score -= 1;
  }
  const label = score > 0 ? 'POSITIVE' : score < 0 ? 'NEGATIVE' : 'NEUTRAL';
  return { score, label, method: 'transparent-keyword-heuristic-v1' };
}

function enrichNewsItems(items) {
  if (!Array.isArray(items)) return [];
  return items.map(item => {
    if (!item || item.verified !== true) return item;
    const sentiment = scoreText(item.title);
    return { ...item, sentiment };
  });
}

module.exports = { tokenize, scoreText, enrichNewsItems };
