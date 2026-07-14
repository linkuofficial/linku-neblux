import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { WONDER_FALLBACKS } from '../../frontend/src/atlas/atlas-i18n.js';

test('Atlas Wonder title map mirrors every source title in all three locales', () => {
    const wonderDir = join(process.cwd(), 'data', 'wonders');
    const sourceIds = readdirSync(wonderDir).filter((name) => name.endsWith('.json')).map((name) => name.slice(0, -5)).sort();
    assert.deepEqual(Object.keys(WONDER_FALLBACKS).sort(), sourceIds);
    for (const id of sourceIds) {
        const title = JSON.parse(readFileSync(join(wonderDir, `${id}.json`), 'utf8')).title;
        assert.deepEqual(WONDER_FALLBACKS[id], title, id);
    }
});
