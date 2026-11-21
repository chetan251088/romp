// Regenerate the Swedish clue recordings with an extracted eSpeak NG Emscripten package.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { clipName, spokenClues } from '../src/family/swedish.ts';

const source = process.argv[2];
if (!source) throw new Error('Pass the path to @echogarden/espeak-ng-emscripten/espeak-ng.js.');
const { default: loadEspeak } = await import(pathToFileURL(resolve(source)).href);
const module = await loadEspeak();
const voice = new module.eSpeakNGWorker();
assert.equal(voice.set_voice('', 'sv'), 0, 'Swedish voice unavailable');
voice.rate = 138;

const out = new URL('../public/family-voice/', import.meta.url);
await mkdir(out, { recursive: true });
for (const text of spokenClues) {
  const samples = [];
  voice.synthesize(text, (chunk) => { samples.push(chunk); return false; });
  const bytes = samples.reduce((total, chunk) => total + chunk.byteLength, 0);
  assert.ok(bytes > voice.samplerate / 2, 'No speech generated for ' + text);
  const sampleRate = voice.samplerate;
  const wave = Buffer.alloc(44 + bytes);
  wave.write('RIFF', 0);
  wave.writeUInt32LE(wave.length - 8, 4);
  wave.write('WAVEfmt ', 8);
  wave.writeUInt32LE(16, 16); // PCM format chunk length
  wave.writeUInt16LE(1, 20); // PCM
  wave.writeUInt16LE(1, 22); // Mono
  wave.writeUInt32LE(sampleRate, 24);
  wave.writeUInt32LE(sampleRate * 2, 28);
  wave.writeUInt16LE(2, 32);
  wave.writeUInt16LE(16, 34);
  wave.write('data', 36);
  wave.writeUInt32LE(bytes, 40);
  let offset = 44;
  for (const chunk of samples) for (const sample of chunk) {
    wave.writeInt16LE(sample, offset);
    offset += 2;
  }
  await writeFile(new URL(clipName(text), out), wave);
}
console.log('Generated ' + spokenClues.length + ' Swedish clips.');
