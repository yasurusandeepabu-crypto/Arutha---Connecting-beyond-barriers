import { validMotion } from './player.js';

async function database() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('signbridge-motion', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('clips', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transaction(mode, action) {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('clips', mode);
      const request = action(tx.objectStore('clips'));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Local save aborted'));
    });
  } finally { db.close(); }
}

export async function saveMotion(motion, type = 'sign') {
  if (!validMotion(motion) || !/^[A-Z]+(?:-[A-Z]+)*$/.test(motion.gloss) || motion.gloss.length > 32) throw new Error('Invalid motion or sign label.');
  if (!['sign', 'letter'].includes(type) || (type === 'letter' && motion.gloss.length !== 1)) throw new Error('A letter needs one A–Z character.');
  await transaction('readwrite', store => store.put({ id: `${type}:${motion.gloss}`, type, motion, language: 'SLSL', updated: Date.now() }));
}

export const listMotions = () => transaction('readonly', store => store.getAll());
export const deleteMotion = id => transaction('readwrite', store => store.delete(id));
