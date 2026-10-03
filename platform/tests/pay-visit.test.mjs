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

test('direct pages never create billable sessions, including empty or cleared storage', () => {
  const store = storage();
  assert.equal(getPayVisitSession(card, undefined, store), null);
  getPayVisitSession(card, signVisit(card, first, 'card', secret), store);
  assert.equal(getPayVisitSession(card, undefined, store), null);
  assert.equal(getPayVisitSession(card, undefined, storage()), null);
});

test('a restored signed URL keeps its ID without any browser storage', () => {
  const visit = signVisit(card, first, 'card', secret);
  assert.equal(getPayVisitSession(card, visit, storage()).sessionId, first);
  assert.equal(getPayVisitSession(card, visit, storage()).sessionId, first);
});

test('a fresh card entry starts a session while reload keeps the current one', () => {
  const store = storage();
  const visit1 = signVisit(card, first, 'card', secret);
  const visit2 = signVisit(card, second, 'card', secret);
  assert.equal(getPayVisitSession(card, visit1, store).sessionId, first);
  assert.equal(getPayVisitSession(card, visit1, store).sessionId, first);
  assert.equal(getPayVisitSession(card, visit2, store).sessionId, second);
  assert.equal(getPayVisitSession(card, undefined, store), null);
});

test('blocked storage does not manufacture visits on every legacy reload', () => {
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.equal(getPayVisitSession(card, undefined, blocked), null);
  assert.equal(getPayVisitSession(card, signVisit(card, first, 'card', secret), blocked).sessionId, first);
});

test('known bots and prefetch requests are ignored', () => {
  assert.equal(isAutomatedVisit(new Headers({ 'user-agent': 'Googlebot' })), true);
  assert.equal(isAutomatedVisit(new Headers({ 'sec-purpose': 'prefetch' })), true);
  assert.equal(isAutomatedVisit(new Headers({ 'user-agent': 'Mozilla/5.0 Mobile Safari' })), false);
});
