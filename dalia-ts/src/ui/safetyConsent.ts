export const SAFETY_CONSENT_STORAGE_KEY = 'dalia.safety-consent.v1';
export const SAFETY_CONSENT_VERSION = 1;

export type SafetyConsentRecord = {
  accepted: true;
  version: number;
  acceptedAtMs: number;
};

export type SafetyConsentStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function getDefaultStorage(): SafetyConsentStorage | null {
  try {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    return localStorage;
  } catch {
    return null;
  }
}

function isSafetyConsentRecord(value: unknown): value is SafetyConsentRecord {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Partial<SafetyConsentRecord>;
  return (
    record.accepted === true &&
    record.version === SAFETY_CONSENT_VERSION &&
    typeof record.acceptedAtMs === 'number' &&
    Number.isFinite(record.acceptedAtMs)
  );
}

export function readSafetyConsent(storage: SafetyConsentStorage | null = getDefaultStorage()): SafetyConsentRecord | null {
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(SAFETY_CONSENT_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    return isSafetyConsentRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function persistSafetyConsent(storage: SafetyConsentStorage | null = getDefaultStorage()): boolean {
  if (!storage) {
    return false;
  }

  try {
    const record: SafetyConsentRecord = {
      accepted: true,
      version: SAFETY_CONSENT_VERSION,
      acceptedAtMs: Date.now(),
    };
    storage.setItem(SAFETY_CONSENT_STORAGE_KEY, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

export function clearSafetyConsent(storage: SafetyConsentStorage | null = getDefaultStorage()): void {
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(SAFETY_CONSENT_STORAGE_KEY);
  } catch {
    // no-op if storage is unavailable
  }
}

export function needsSafetyConsent(storage: SafetyConsentStorage | null = getDefaultStorage()): boolean {
  return readSafetyConsent(storage) === null;
}