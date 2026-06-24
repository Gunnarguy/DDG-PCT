import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getAQIInfo, fetchWildfires } from './wildfireService';

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

describe('fetchWildfires', () => {
  const originalFetch = global.fetch;
  const originalConsoleError = console.error;

  beforeEach(() => {
    global.fetch = vi.fn();
    console.error = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    console.error = originalConsoleError;
  });

  it('should return fallback object when fetch rejects', async () => {
    const errorMsg = 'Network Error';
    global.fetch.mockRejectedValueOnce(new Error(errorMsg));

    const result = await fetchWildfires();

    expect(global.fetch).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith('Failed to fetch wildfire data:', expect.any(Error));
    expect(result).toEqual({
      fires: [],
      timestamp: null,
      count: 0,
      error: errorMsg
    });
  });

  it('should return fallback object when fetch returns non-ok status', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500
    });

    const result = await fetchWildfires();

    expect(global.fetch).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith('Failed to fetch wildfire data:', expect.any(Error));
    expect(result).toEqual({
      fires: [],
      timestamp: null,
      count: 0,
      error: 'Wildfire API returned 500'
    });
  });
});
