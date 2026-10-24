import test from 'node:test';
import assert from 'node:assert/strict';
import { validMotion, blend, SignBridgePlayer } from './player.js';

const frame = { pose: Array.from({ length: 7 }, () => [0, 0]), lh: null, rh: null };

test('motion rejects unusable coordinates and incomplete hands', () => {
  assert.ok(validMotion({ fps: 30, frames: [frame] }));
  assert.ok(!validMotion({ fps: 0, frames: [frame] }));
  assert.ok(!validMotion({ fps: 30, frames: [] }));
  assert.ok(!validMotion({ fps: 30, frames: [{ ...frame, lh: [[0, 0]] }] }));
  assert.ok(!validMotion({ fps: 30, frames: [{ ...frame, pose: [[NaN, 0], ...frame.pose.slice(1)] }] }));
});

test('interpolation preserves endpoints and computes midpoint', () => {
  const end = { ...frame, pose: frame.pose.map(() => [2, 4]) };
  assert.deepEqual(blend(frame, end, 0), frame);
  assert.deepEqual(blend(frame, end, 1), end);
  assert.deepEqual(blend(frame, end, .5).pose[0], [1, 2]);
});

test('missing hand tracking is hidden without fabricating landmarks', () => {
  const tracked = { ...frame, lh: Array.from({ length: 21 }, () => [1, 1]) };
  assert.equal(blend(tracked, frame, .75).lh, null);
  assert.equal(blend(frame, tracked, .25).lh, null);
});

test('stopping cancels an animation even when its window no longer paints', async () => {
  const scheduled = new Map();
  const view = {performance:{now:()=>0},requestAnimationFrame:fn=>{scheduled.set(1,fn);return 1;},cancelAnimationFrame:id=>scheduled.delete(id)};
  const player = Object.assign(Object.create(SignBridgePlayer.prototype), {
    generation:0, queue:[], canvas:{ownerDocument:{defaultView:view}},
    video:{pause(){},hidden:true}, status:{}, draw(){},
  });
  const animation = player.animate(1000,()=>frame,0);
  player.stop();
  await animation;
  assert.equal(scheduled.size,0);
});
