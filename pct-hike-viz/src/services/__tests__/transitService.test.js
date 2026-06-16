import { describe, it, expect } from 'vitest';
import { getTransitPlan } from '../transitService.js';

describe('transitService.js - getTransitPlan', () => {
  it('should return the correct plan for Sacramento', () => {
    const plan = getTransitPlan('Sacramento');
    expect(plan).toBeDefined();
    expect(plan.duration).toBe('5-6 hours total');
    expect(plan.routes).toContain('sac-redding');
  });

  it('should return the correct plan for SJC', () => {
    const plan = getTransitPlan('SJC');
    expect(plan).toBeDefined();
    expect(plan.duration).toContain('rail');
    expect(plan.routes).toContain('diridon-redding');
  });

  it('should return the correct plan for SFO', () => {
    const plan = getTransitPlan('SFO');
    expect(plan).toBeDefined();
    expect(plan.routes).toContain('sfo-bart-richmond');
    expect(plan.routes).toContain('sac-redding');
  });

  it('should return the correct plan for San Francisco', () => {
    const plan = getTransitPlan('San Francisco');
    expect(plan).toBeDefined();
    expect(plan.routes).toContain('sfo-bart-richmond');
  });

  it('should return the correct plan for Home', () => {
    const plan = getTransitPlan('Home');
    expect(plan).toBeDefined();
    expect(plan.duration).toBe('4.75-5.25 hours drive');
  });

  it('should return the Rental Car plan for an unknown origin', () => {
    const plan = getTransitPlan('New York');
    expect(plan).toBeDefined();
    expect(plan.duration).toBe('3.5-4 hours drive');
    expect(plan.notes).toContain('Recommended approach');
  });

  it('should return the Rental Car plan for an empty string', () => {
    const plan = getTransitPlan('');
    expect(plan).toBeDefined();
    expect(plan.duration).toBe('3.5-4 hours drive');
    expect(plan.notes).toContain('Recommended approach');
  });

  it('should return the Rental Car plan for null', () => {
    const plan = getTransitPlan(null);
    expect(plan).toBeDefined();
    expect(plan.duration).toBe('3.5-4 hours drive');
    expect(plan.notes).toContain('Recommended approach');
  });

  it('should return the Rental Car plan for undefined', () => {
    const plan = getTransitPlan(undefined);
    expect(plan).toBeDefined();
    expect(plan.duration).toBe('3.5-4 hours drive');
    expect(plan.notes).toContain('Recommended approach');
  });
});
