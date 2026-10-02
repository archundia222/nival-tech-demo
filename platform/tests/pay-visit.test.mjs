import test from 'node:test';
import assert from 'node:assert/strict';
import { signVisit, verifyVisit, isAutomatedVisit } from '../src/lib/pay-visit.ts';
import { getPayVisitSession } from '../src/lib/pay-visit-session.ts';

const card = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const first = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const second = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const secret = 'test-secret-used-only-by-this-test';
function storage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test('a signed card entry is bound to its card and session', () => {
  const visit = signVisit(card, first, 'card', secret);
  assert.deepEqual(verifyVisit(card, visit, secret), { sessionId: first, source: 'card' });
  assert.equal(verifyVisit(second, visit, secret), null);
  assert.equal(verifyVisit(card, visit.replace(first, second), secret), null);
  assert.equal(verifyVisit(card, visit + '.extra', secret), null);
});

test('reloads and next-day tab restoration reuse a direct session', () => {
  const store = storage();
  assert.equal(getPayVisitSession(card, undefined, store, () => first).sessionId, first);
  // A new component execution, with no timer or midnight expiry.
  assert.equal(getPayVisitSession(card, undefined, store, () => second).sessionId, first);
});

test('a fresh card entry starts a session while reload keeps the current one', () => {
  const store = storage();
  const visit1 = signVisit(card, first, 'card', secret);
  const visit2 = signVisit(card, second, 'card', secret);
  assert.equal(getPayVisitSession(card, visit1, store, () => second).sessionId, first);
  assert.equal(getPayVisitSession(card, visit1, store, () => second).sessionId, first);
  assert.equal(getPayVisitSession(card, visit2, store, () => first).sessionId, second);
  assert.equal(getPayVisitSession(card, undefined, store, () => first).sessionId, second);
});

test('blocked storage does not manufacture visits on every legacy reload', () => {
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.equal(getPayVisitSession(card, undefined, blocked, () => first), null);
  assert.equal(getPayVisitSession(card, signVisit(card, first, 'card', secret), blocked, () => second).sessionId, first);
});

test('known bots and prefetch requests are ignored', () => {
  assert.equal(isAutomatedVisit(new Headers({ 'user-agent': 'Googlebot' })), true);
  assert.equal(isAutomatedVisit(new Headers({ 'sec-purpose': 'prefetch' })), true);
  assert.equal(isAutomatedVisit(new Headers({ 'user-agent': 'Mozilla/5.0 Mobile Safari' })), false);
});
