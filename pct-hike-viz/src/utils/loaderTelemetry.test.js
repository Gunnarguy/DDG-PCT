/* global global */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loaderTelemetry } from './loaderTelemetry.js';

describe('loaderTelemetry', () => {
  beforeEach(() => {
    // Mock the global object directly, as we're in a Node environment without jsdom by default
    global.window = {};
  });

  afterEach(() => {
    delete global.window;
  });

  it('should not throw if window.__pctLoader is not defined', () => {
    expect(() => loaderTelemetry.step('msg', 50)).not.toThrow();
    expect(() => loaderTelemetry.done()).not.toThrow();
  });

  it('should not throw if window is not defined', () => {
    delete global.window;
    expect(() => loaderTelemetry.step('msg', 50)).not.toThrow();
    expect(() => loaderTelemetry.done()).not.toThrow();
  });

  it('should not throw if __pctLoader is defined but methods are missing', () => {
    global.window.__pctLoader = {};
    expect(() => loaderTelemetry.step('msg', 50)).not.toThrow();
    expect(() => loaderTelemetry.done()).not.toThrow();
  });

  it('should call update on __pctLoader if available', () => {
    const updateMock = vi.fn();
    global.window.__pctLoader = { update: updateMock };

    loaderTelemetry.step('Loading map', 42, 'hint');
    expect(updateMock).toHaveBeenCalledWith('Loading map', 42, 'hint');
  });

  it('should call finish on __pctLoader if available', () => {
    const finishMock = vi.fn();
    global.window.__pctLoader = { finish: finishMock };

    loaderTelemetry.done();
    expect(finishMock).toHaveBeenCalled();
  });
});
