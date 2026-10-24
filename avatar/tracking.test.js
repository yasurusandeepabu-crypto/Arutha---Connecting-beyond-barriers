import test from 'node:test';
import assert from 'node:assert/strict';
import { assignHands, normalizeFrame, makeMotion } from './tracking.js';

const point = (x, y) => ({ x, y, visibility: 1 });
const hand = (x, y) => Array.from({ length: 21 }, () => point(x, y));
const body = () => {
  const pose = Array.from({ length: 33 }, () => point(.5, .5));
  pose[11] = point(.3, .4); pose[12] = point(.7, .4);
  pose[15] = point(.25, .7); pose[16] = point(.75, .7);
  return pose;
};

test('hands use nearest pose wrists even with reversed detector order', () => {
  const left = hand(.25, .7), right = hand(.75, .7);
  assert.deepEqual(assignHands([right, left], [body()[15], body()[16]]), [left, right]);
  assert.deepEqual(assignHands([right], [body()[15], body()[16]]), [null, right]);
});

test('shoulder normalization is centered and uses width as unit', () => {
  const frame = normalizeFrame(body(), [hand(.25, .7)]);
  assert.deepEqual(frame.pose[1], [-.5, 0]);
  assert.deepEqual(frame.pose[2], [.5, 0]);
  assert.equal(frame.lh.length, 21);
  assert.equal(frame.rh, null);
  const hidden = body(); hidden[15].visibility = .1;
  assert.equal(normalizeFrame(hidden, []), null);
});

test('capture uses elapsed time rather than inference frame count', () => {
  const frame = normalizeFrame(body(), [hand(.25, .7)]);
  const samples = Array.from({ length: 11 }, (_, i) => ({ time: i * 100, frame }));
  const motion = makeMotion(samples, 'HELLO');
  assert.equal(motion.fps, 30);
  assert.ok(Math.abs(motion.frames.length / 30 - 1) < .04);
  assert.throws(() => makeMotion(samples.map(s => ({ ...s, frame: null })), 'HELLO'), /missing body/);
  assert.throws(() => makeMotion(samples.map(s => ({ ...s, frame: { ...frame, lh: null } })), 'HELLO'), /No hands/);
});
