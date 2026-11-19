import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayKey, finishExpired, initialData, isDue, parseBackup, suggestedItem } from '../src/lib/model.ts';

test('a local day key does not shift dates through UTC', () => {
  assert.equal(dayKey(new Date(2026, 10, 17, 0, 5)), '2026-11-17');
});
test('habits follow weekdays; tasks follow their chosen date; archived actions are not due', () => {
  const date = new Date(2026, 10, 17, 12);
  const item = { ...suggestedItem('Learning'), days: [2] };
  assert.equal(isDue(item, date), true);
  assert.equal(isDue({ ...item, days: [1] }, date), false);
  assert.equal(isDue({ ...item, archived: true }, date), false);
  assert.equal(isDue({ ...item, kind: 'task', date: '2026-11-17' }, date), true);
  assert.equal(isDue({ ...item, kind: 'task', date: '2026-11-18' }, date), false);
});
test('timers remain active before the deadline and complete exactly once after restart', () => {
  const active = { id: 'session', title: 'Read', start: 1000, end: 61000, apps: [] };
  const data = { ...initialData(), active };
  assert.equal(finishExpired(data, 60000), data);
  const finished = finishExpired(data, 61000);
  assert.equal(finished.active, null);
  assert.equal(finished.sessions.length, 1);
  assert.equal(finishExpired(finished, 90000).sessions.length, 1);
  assert.equal(finishExpired({ ...finished, active }, 90000).sessions.length, 1);
});
test('valid plans and journal round-trip without losing history', () => {
  const data = { ...initialData(), onboarded: true, items: [suggestedItem('Career')], reflections: [{ date: '2026-11-17', wentWell: 'A small step', obstacle: '', tomorrow: 'Read', mood: 'Okay' }] };
  assert.deepEqual(parseBackup(JSON.stringify(data)), data);
});
test('reject malformed backups, impossible dates, duplicate IDs and invalid durations', () => {
  const data = initialData(); const item = suggestedItem('Learning');
  for (const broken of [null, {}, { ...data, version: 3 }, { ...data, items: [{ ...item, date: '2026-02-31' }] }, { ...data, items: [item, item] }, { ...data, items: [{ ...item, minutes: 0 }] }, { ...data, items: [{ ...item, days: [9] }] }, { ...data, active: { id: 's', title: 'x', start: 1000, end: 1, apps: [] } }]) {
    assert.throws(() => parseBackup(JSON.stringify(broken)));
  }
  assert.throws(() => parseBackup('not json'));
  assert.throws(() => parseBackup('x'.repeat(5_000_001)));
});
