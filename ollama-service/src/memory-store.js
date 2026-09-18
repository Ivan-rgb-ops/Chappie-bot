import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DEFAULT_TRAITS } from './personality-engine.js';

const STATE_PATH = './data/state.json';

export function loadState() {
  if (!existsSync(STATE_PATH)) {
    return { traits: { ...DEFAULT_TRAITS }, lessons: [], history: [] };
  }
  return JSON.parse(readFileSync(STATE_PATH, 'utf-8'));
}

export function saveState(state) {
  mkdirSync(dirname(STATE_PATH), { recursive: true });
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}
