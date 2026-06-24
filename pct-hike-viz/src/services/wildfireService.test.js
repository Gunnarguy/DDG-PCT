import { describe, it, expect } from 'vitest';
import { getAQIInfo, assessHikingSafety } from './wildfireService';

describe('getAQIInfo', () => {
  it('should return Unknown for null or undefined', () => {
    expect(getAQIInfo(null)).toEqual({ category: 'Unknown', color: '#999', emoji: '❓' });
    expect(getAQIInfo(undefined)).toEqual({ category: 'Unknown', color: '#999', emoji: '❓' });
  });

  it('should return Good for AQI <= 50', () => {
    expect(getAQIInfo(0)).toEqual({ category: 'Good', color: '#00E400', emoji: '✅' });
    expect(getAQIInfo(25)).toEqual({ category: 'Good', color: '#00E400', emoji: '✅' });
    expect(getAQIInfo(50)).toEqual({ category: 'Good', color: '#00E400', emoji: '✅' });
  });

  it('should return Moderate for AQI > 50 and <= 100', () => {
    expect(getAQIInfo(51)).toEqual({ category: 'Moderate', color: '#FFFF00', emoji: '⚠️' });
    expect(getAQIInfo(75)).toEqual({ category: 'Moderate', color: '#FFFF00', emoji: '⚠️' });
    expect(getAQIInfo(100)).toEqual({ category: 'Moderate', color: '#FFFF00', emoji: '⚠️' });
  });

  it('should return Unhealthy for Sensitive Groups for AQI > 100 and <= 150', () => {
    expect(getAQIInfo(101)).toEqual({ category: 'Unhealthy for Sensitive Groups', color: '#FF7E00', emoji: '🟠' });
    expect(getAQIInfo(125)).toEqual({ category: 'Unhealthy for Sensitive Groups', color: '#FF7E00', emoji: '🟠' });
    expect(getAQIInfo(150)).toEqual({ category: 'Unhealthy for Sensitive Groups', color: '#FF7E00', emoji: '🟠' });
  });

  it('should return Unhealthy for AQI > 150 and <= 200', () => {
    expect(getAQIInfo(151)).toEqual({ category: 'Unhealthy', color: '#FF0000', emoji: '🔴' });
    expect(getAQIInfo(175)).toEqual({ category: 'Unhealthy', color: '#FF0000', emoji: '🔴' });
    expect(getAQIInfo(200)).toEqual({ category: 'Unhealthy', color: '#FF0000', emoji: '🔴' });
  });

  it('should return Very Unhealthy for AQI > 200 and <= 300', () => {
    expect(getAQIInfo(201)).toEqual({ category: 'Very Unhealthy', color: '#8F3F97', emoji: '🟣' });
    expect(getAQIInfo(250)).toEqual({ category: 'Very Unhealthy', color: '#8F3F97', emoji: '🟣' });
    expect(getAQIInfo(300)).toEqual({ category: 'Very Unhealthy', color: '#8F3F97', emoji: '🟣' });
  });

  it('should return Hazardous for AQI > 300', () => {
    expect(getAQIInfo(301)).toEqual({ category: 'Hazardous', color: '#7E0023', emoji: '☠️' });
    expect(getAQIInfo(500)).toEqual({ category: 'Hazardous', color: '#7E0023', emoji: '☠️' });
  });
});

describe('assessHikingSafety', () => {
  it('should return safe when no nearby fires and good AQI', () => {
    const wildfireData = { fires: [] };
    const airQualityData = { readings: [{ aqi: 50 }, { aqi: 100 }] };

    const result = assessHikingSafety(wildfireData, airQualityData);

    expect(result.safe).toBe(true);
    expect(result.warnings).toHaveLength(0);
    expect(result.recommendations).toContain('Conditions currently favorable for hiking');
  });

  it('should return unsafe when fires are within 25 miles', () => {
    const wildfireData = {
      fires: [{ name: 'Test Fire', distanceToTrail: 24, acres: 100, containment: 50 }]
    };
    const airQualityData = { readings: [{ aqi: 50 }] };

    const result = assessHikingSafety(wildfireData, airQualityData);

    expect(result.safe).toBe(false);
    expect(result.warnings).toContain('1 active fire(s) within 25 miles of trail');
    expect(result.warnings).toContain('Test Fire: 100 acres, 50% contained, 24 mi away');
    expect(result.recommendations).toContain('Check trail closure status before departure');
  });

  it('should return unsafe when AQI > 100', () => {
    const wildfireData = { fires: [] };
    const airQualityData = { readings: [{ aqi: 101 }] };

    const result = assessHikingSafety(wildfireData, airQualityData);

    expect(result.safe).toBe(false);
    expect(result.warnings).toContain('Poor air quality detected at 1 location(s)');
    expect(result.recommendations).toContain('Consider N95 masks for smoke exposure');
  });

  it('should return unsafe with multiple warnings when both fires and bad AQI exist', () => {
    const wildfireData = {
      fires: [{ name: 'Test Fire', distanceToTrail: 10, acres: 500, containment: 0 }]
    };
    const airQualityData = { readings: [{ aqi: 150 }] };

    const result = assessHikingSafety(wildfireData, airQualityData);

    expect(result.safe).toBe(false);
    expect(result.warnings.length).toBe(3);
    expect(result.warnings).toContain('1 active fire(s) within 25 miles of trail');
    expect(result.warnings).toContain('Test Fire: 500 acres, 0% contained, 10 mi away');
    expect(result.warnings).toContain('Poor air quality detected at 1 location(s)');
    expect(result.recommendations).toContain('Monitor conditions daily via InciWeb and PCTA trail updates');
  });

  it('should consider exactly 25 miles for fire as safe', () => {
    const wildfireData = {
      fires: [{ name: 'Far Fire', distanceToTrail: 25, acres: 100, containment: 50 }]
    };
    const airQualityData = { readings: [{ aqi: 50 }] };

    const result = assessHikingSafety(wildfireData, airQualityData);

    expect(result.safe).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it('should consider exactly 100 AQI as safe', () => {
    const wildfireData = { fires: [] };
    const airQualityData = { readings: [{ aqi: 100 }] };

    const result = assessHikingSafety(wildfireData, airQualityData);

    expect(result.safe).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });
});
