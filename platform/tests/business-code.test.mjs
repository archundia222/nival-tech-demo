import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBusinessCode, newBusinessCode, CODE_PATTERN, businessSecretHash } from '../src/lib/business-code.ts';

test('generated access codes retain 128 bits and accept copy/paste separators', () => {
  const code = newBusinessCode();
  assert.match(code, /^([A-F0-9]{4}-){7}[A-F0-9]{4}$/);
  const normalized = normalizeBusinessCode(` ${code.toLowerCase()} `);
  assert.match(normalized, CODE_PATTERN);
  assert.equal(normalized.length, 32);
});
test('stored identifiers do not reveal the code and separate session and access purposes', () => {
  const code = normalizeBusinessCode(newBusinessCode());
  const hash = businessSecretHash(code, 'code', 'test-server-secret');
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.notEqual(hash, code);
  assert.notEqual(hash, businessSecretHash(code, 'session', 'test-server-secret'));
  assert.notEqual(hash, businessSecretHash(code, 'code', 'another-server-secret'));
});
