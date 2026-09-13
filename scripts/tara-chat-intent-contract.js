const assert = require('assert');
const { extractSymbol, detectIntent, nativeReply } = require('../tara-chat-intent');

const casual = ['Hi', 'Ho', 'Hello', 'Hey', 'Tara', 'AI', 'OK', 'Yes', 'No'];
for (const input of casual) {
  assert.strictEqual(extractSymbol(input), '', `casual word must not become symbol: ${input}`);
}

assert.strictEqual(detectIntent('Hi'), 'GREETING');
assert.strictEqual(detectIntent('Ho'), 'GREETING');
assert.strictEqual(detectIntent('Hi Tara'), 'GENERAL_MARKET');
assert.strictEqual(detectIntent('Tara nuv AI va?'), 'IDENTITY');
assert.strictEqual(detectIntent('who are you?'), 'IDENTITY');
assert.strictEqual(detectIntent('are you AI?'), 'IDENTITY');
assert.strictEqual(detectIntent('TCS price'), 'QUOTE');
assert.strictEqual(extractSymbol('Tara TCS price'), 'TCS');
assert.strictEqual(extractSymbol('Reliance Industries price'), 'RELIANCE');

const identity = nativeReply('IDENTITY', '', 'te');
assert.ok(identity.includes('Tara AI'), 'identity reply must name Tara AI');
assert.ok(identity.includes('market'), 'identity reply must explain market scope');

console.log('Tara chat intent contract passed: casual-word guard, identity routing, and explicit symbol extraction are correct.');
