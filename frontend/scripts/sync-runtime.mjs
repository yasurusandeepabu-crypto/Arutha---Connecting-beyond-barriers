import { mkdir, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const target = path.join(root, 'frontend/public/runtime');
await mkdir(target, { recursive: true });
for (const name of ['player.js', 'player.css', 'floating-window.js', 'floating-shell.html', 'tab-audio.js', 'library.js', 'cwasa-player.js', 'cwasa-frame.html', 'cwasa-frame.js']) {
  await copyFile(path.join(root, 'avatar', name), path.join(target, name));
}
const licenses = path.join(root, 'frontend/public/licenses');
await mkdir(licenses, { recursive: true });
await copyFile(path.join(root, 'frontend/node_modules/@fontsource/inter/LICENSE'), path.join(licenses, 'inter-OFL.txt'));
console.log('Synced shared capture and avatar runtime.');
