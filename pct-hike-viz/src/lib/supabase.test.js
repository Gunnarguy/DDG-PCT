import { describe, it, expect } from 'vitest';
import { isAllowedEmail } from './supabase.js';

describe('isAllowedEmail', () => {
  it('returns true for allowed emails', () => {
    expect(isAllowedEmail('smileyguy@aol.com')).toBe(true);
    expect(isAllowedEmail('andrew.d.hostetler@gmail.com')).toBe(true);
    expect(isAllowedEmail('gunnarguy@me.com')).toBe(true);
    expect(isAllowedEmail('gunnarguy@aol.com')).toBe(true);
  });

  it('returns true for allowed emails regardless of case', () => {
    expect(isAllowedEmail('SMILEYGUY@AOL.COM')).toBe(true);
    expect(isAllowedEmail('Andrew.D.Hostetler@Gmail.com')).toBe(true);
    expect(isAllowedEmail('GunnarGuy@me.com')).toBe(true);
  });

  it('returns false for unknown emails', () => {
    expect(isAllowedEmail('unknown@example.com')).toBe(false);
    expect(isAllowedEmail('hiker@pct.org')).toBe(false);
  });

  it('returns false for invalid inputs', () => {
    expect(isAllowedEmail(null)).toBe(false);
    expect(isAllowedEmail(undefined)).toBe(false);
    expect(isAllowedEmail('')).toBe(false);
  });
});
