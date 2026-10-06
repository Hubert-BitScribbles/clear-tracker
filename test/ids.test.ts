import { afterEach, describe, expect, it } from 'vitest';
import * as P from '../src/data/database';
import { generateId } from '../src/data/db';

const UUID4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const original = crypto.randomUUID;
const hide = () => Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true });
afterEach(() => Object.defineProperty(crypto, 'randomUUID', { value: original, configurable: true }));

describe('ids on an insecure page (phone on http://192.168…)', () => {
  it('generateId still makes valid, unique UUIDs without crypto.randomUUID', () => {
    hide();
    expect(typeof crypto.randomUUID).toBe('undefined');
    const ids = new Set(Array.from({ length: 2000 }, generateId));
    expect(ids.size).toBe(2000);
    for (const id of ids) expect(id).toMatch(UUID4);
  });
  it('logging a day works without crypto.randomUUID', async () => {
    hide();
    await P.resetDatabase();
    expect(await P.cycleDay('2026-09-30', null)).toBe('clear');
    expect(await P.getEntryCount()).toBe(1);
  });
});
