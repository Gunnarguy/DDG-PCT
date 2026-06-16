import { describe, it, expect } from 'vitest';
import { getLandManagementZone } from './landManagementData';

describe('getLandManagementZone', () => {
  it('should return the correct zone for a mile within Lassen National Forest', () => {
    // 1353.0 to 1376.4
    const zone = getLandManagementZone(1360.0);
    expect(zone).toBeDefined();
    expect(zone.id).toBe('lassen-nf');
  });

  it('should return the correct zone for a mile within Shasta-Trinity National Forest', () => {
    // 1376.4 to 1430.0
    const zone = getLandManagementZone(1400.0);
    expect(zone).toBeDefined();
    expect(zone.id).toBe('shasta-trinity-nf');
  });

  it('should return the correct zone for a mile within Castle Crags State Park', () => {
    // 1430.0 to 1435.9
    const zone = getLandManagementZone(1432.0);
    expect(zone).toBeDefined();
    expect(zone.id).toBe('castle-crags-sp');
  });

  it('should return the correct zone at the exact start boundary of Lassen NF', () => {
    const zone = getLandManagementZone(1353.0);
    expect(zone).toBeDefined();
    expect(zone.id).toBe('lassen-nf');
  });

  it('should return the correct zone at the exact end boundary of Castle Crags SP', () => {
    const zone = getLandManagementZone(1435.9);
    expect(zone).toBeDefined();
    expect(zone.id).toBe('castle-crags-sp');
  });

  it('should return the first matched zone at exact shared boundaries (Lassen / Shasta-Trinity)', () => {
    // Both Lassen NF and Shasta-Trinity NF define 1376.4 as a boundary.
    // The find method returns the first match, which is Lassen NF.
    const zone = getLandManagementZone(1376.4);
    expect(zone).toBeDefined();
    expect(zone.id).toBe('lassen-nf');
  });

  it('should return the first matched zone at exact shared boundaries (Shasta-Trinity / Castle Crags)', () => {
    // Both Shasta-Trinity NF and Castle Crags SP define 1430.0 as a boundary.
    // The find method returns the first match, which is Shasta-Trinity NF.
    const zone = getLandManagementZone(1430.0);
    expect(zone).toBeDefined();
    expect(zone.id).toBe('shasta-trinity-nf');
  });

  it('should return undefined for a mile before the start of the first zone', () => {
    const zone = getLandManagementZone(1352.9);
    expect(zone).toBeUndefined();
  });

  it('should return undefined for a mile after the end of the last zone', () => {
    const zone = getLandManagementZone(1436.0);
    expect(zone).toBeUndefined();
  });

  it('should return undefined for invalid input: null', () => {
    const zone = getLandManagementZone(null);
    expect(zone).toBeUndefined();
  });

  it('should return undefined for invalid input: undefined', () => {
    const zone = getLandManagementZone(undefined);
    expect(zone).toBeUndefined();
  });

  it('should return undefined for invalid input: NaN', () => {
    const zone = getLandManagementZone(NaN);
    expect(zone).toBeUndefined();
  });

  it('should return undefined for negative miles', () => {
    const zone = getLandManagementZone(-1360.0);
    expect(zone).toBeUndefined();
  });

  it('should return undefined for non-numeric string inputs', () => {
    const zone = getLandManagementZone('not-a-number');
    expect(zone).toBeUndefined();
  });
});
