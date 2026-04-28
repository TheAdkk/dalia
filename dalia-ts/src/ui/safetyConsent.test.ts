import { describe, expect, it } from 'vitest';
import {
  SAFETY_CONSENT_STORAGE_KEY,
  SAFETY_CONSENT_VERSION,
  clearSafetyConsent,
  needsSafetyConsent,
  persistSafetyConsent,
  readSafetyConsent,
  type SafetyConsentStorage,
} from './safetyConsent';

class FakeStorage implements SafetyConsentStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.has(key) ? this.values.get(key) ?? null : null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setRaw(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('safetyConsent', () => {
  it('persists and restores accepted consent', () => {
    const storage = new FakeStorage();

    expect(needsSafetyConsent(storage)).toBe(true);
    expect(persistSafetyConsent(storage)).toBe(true);

    const record = readSafetyConsent(storage);
    expect(record).not.toBeNull();
    expect(record?.accepted).toBe(true);
    expect(record?.version).toBe(SAFETY_CONSENT_VERSION);
    expect(typeof record?.acceptedAtMs).toBe('number');
    expect(needsSafetyConsent(storage)).toBe(false);
    expect(storage.getItem(SAFETY_CONSENT_STORAGE_KEY)).not.toBeNull();
  });

  it('rejects corrupt JSON and version mismatches', () => {
    const storage = new FakeStorage();

    storage.setRaw(SAFETY_CONSENT_STORAGE_KEY, '{not valid json');
    expect(readSafetyConsent(storage)).toBeNull();

    storage.setRaw(
      SAFETY_CONSENT_STORAGE_KEY,
      JSON.stringify({ accepted: true, version: SAFETY_CONSENT_VERSION + 1, acceptedAtMs: Date.now() }),
    );
    expect(readSafetyConsent(storage)).toBeNull();
    expect(needsSafetyConsent(storage)).toBe(true);
  });

  it('allows clearing the stored consent', () => {
    const storage = new FakeStorage();

    expect(persistSafetyConsent(storage)).toBe(true);
    expect(needsSafetyConsent(storage)).toBe(false);

    clearSafetyConsent(storage);
    expect(readSafetyConsent(storage)).toBeNull();
    expect(needsSafetyConsent(storage)).toBe(true);
  });
});