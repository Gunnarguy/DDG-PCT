import { describe, it, expect } from 'vitest';
import { getHikerIdFromEmail, isAllowedEmail } from './supabase';

describe('getHikerIdFromEmail', () => {
  it('should return correct ID for valid emails', () => {
    expect(getHikerIdFromEmail('smileyguy@aol.com')).toBe('dan');
    expect(getHikerIdFromEmail('andrew.d.hostetler@gmail.com')).toBe('drew');
    expect(getHikerIdFromEmail('gunnarguy@me.com')).toBe('gunnar');
    expect(getHikerIdFromEmail('gunnarguy@aol.com')).toBe('gunnar');
  });

  it('should be case insensitive', () => {
    expect(getHikerIdFromEmail('SmileyGuy@aol.com')).toBe('dan');
    expect(getHikerIdFromEmail('ANDREW.d.hostetler@gmail.com')).toBe('drew');
    expect(getHikerIdFromEmail('GunnarGuy@me.com')).toBe('gunnar');
  });

  it('should return null for invalid emails', () => {
    expect(getHikerIdFromEmail('invalid@example.com')).toBeNull();
    expect(getHikerIdFromEmail('hiker@pct.org')).toBeNull();
  });

  it('should return null for empty, null, or undefined inputs', () => {
    expect(getHikerIdFromEmail('')).toBeNull();
    expect(getHikerIdFromEmail(null)).toBeNull();
    expect(getHikerIdFromEmail(undefined)).toBeNull();
  });
});

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
