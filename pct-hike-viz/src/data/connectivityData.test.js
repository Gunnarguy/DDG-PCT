import { describe, it, expect } from 'vitest';
import { getSignalBadgeClass } from './connectivityData';

describe('getSignalBadgeClass', () => {
  it('should return signal-good for excellent or good strength', () => {
    expect(getSignalBadgeClass('excellent')).toBe('signal-good');
    expect(getSignalBadgeClass('good')).toBe('signal-good');
  });

  it('should return signal-fair for fair or spotty strength', () => {
    expect(getSignalBadgeClass('fair')).toBe('signal-fair');
    expect(getSignalBadgeClass('spotty')).toBe('signal-fair');
  });

  it('should return signal-poor for poor strength', () => {
    expect(getSignalBadgeClass('poor')).toBe('signal-poor');
  });

  it('should return signal-none for none strength', () => {
    expect(getSignalBadgeClass('none')).toBe('signal-none');
  });

  it('should return signal-unknown for unexpected string inputs', () => {
    expect(getSignalBadgeClass('bad')).toBe('signal-unknown');
    expect(getSignalBadgeClass('amazing')).toBe('signal-unknown');
    expect(getSignalBadgeClass('')).toBe('signal-unknown');
  });

  it('should return signal-unknown for null or undefined inputs', () => {
    expect(getSignalBadgeClass(null)).toBe('signal-unknown');
    expect(getSignalBadgeClass(undefined)).toBe('signal-unknown');
  });

  it('should return signal-unknown for non-string inputs', () => {
    expect(getSignalBadgeClass(123)).toBe('signal-unknown');
    expect(getSignalBadgeClass(true)).toBe('signal-unknown');
    expect(getSignalBadgeClass({})).toBe('signal-unknown');
    expect(getSignalBadgeClass([])).toBe('signal-unknown');
  });
});
