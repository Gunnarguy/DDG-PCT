import { describe, it, expect } from 'vitest';
import { getHikerIdFromEmail } from './supabase';

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
