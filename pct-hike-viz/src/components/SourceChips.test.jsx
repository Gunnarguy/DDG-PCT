import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import SourceChips from './SourceChips';

// Mock the resourcesIndex data
vi.mock('../data/resourcesIndex', () => ({
  resourcesById: {
    'external-reddit': {
      id: 'external-reddit',
      title: 'Reddit Source',
      url: 'https://reddit.com',
      category: 'reddit',
      excerpt: 'A reddit post'
    },
    'internal-doc': {
      id: 'internal-doc',
      title: 'Internal Doc',
      type: 'internal',
      category: 'official',
      source: 'Internal'
    },
    'external-no-icon': {
      id: 'external-no-icon',
      title: 'Unknown Category Source',
      url: 'https://example.com',
      category: 'unknown'
    },
    'external-custom-icon': {
      id: 'external-custom-icon',
      title: 'Custom Icon',
      url: 'https://example.com/2',
      icon: '🔥'
    }
  }
}));

describe('SourceChips', () => {
  it('returns null if no valid sources are found', () => {
    const result = SourceChips({ sourceIds: ['missing-id'] });
    expect(result).toBeNull();
  });

  it('returns null if no sourceIds provided', () => {
    const result = SourceChips({});
    expect(result).toBeNull();
  });

  it('renders a div with correct base classes', () => {
    const result = SourceChips({ sourceIds: ['external-reddit'], size: 'medium' });
    expect(result.type).toBe('div');
    expect(result.props.className).toBe('source-chips source-chips--medium');
  });

  it('renders correct elements for external and internal sources', () => {
    const result = SourceChips({ sourceIds: ['external-reddit', 'internal-doc'] });
    const children = result.props.children;

    // First part of children is the visible sources map
    const visibleSources = children[0];
    expect(visibleSources.length).toBe(2);

    // External source (rendered as <a>)
    const external = visibleSources[0];
    expect(external.type).toBe('a');
    expect(external.props.href).toBe('https://reddit.com');
    expect(external.props.title).toContain('A reddit post');
    expect(external.props.className).toContain('source-chip--reddit');

    // Check icon and label
    const externalIcon = external.props.children[0];
    const externalLabel = external.props.children[1];
    expect(externalIcon.props.className).toBe('source-chip__icon');
    expect(externalIcon.props.children).toBe('💬'); // reddit icon
    expect(externalLabel.props.children).toBe('Reddit Source');

    // Internal source (rendered as <span>)
    const internal = visibleSources[1];
    expect(internal.type).toBe('span');
    expect(internal.props.className).toContain('source-chip--internal');

    const internalIcon = internal.props.children[0];
    const internalLabel = internal.props.children[1];
    expect(internalIcon.props.children).toBe('📋'); // internal icon
    expect(internalLabel.props.children).toBe('Internal Doc');
  });

  it('respects maxShow and renders remaining count', () => {
    const result = SourceChips({
      sourceIds: ['external-reddit', 'internal-doc', 'external-no-icon'],
      maxShow: 2
    });

    const children = result.props.children;
    const visibleSources = children[0];
    const moreIndicator = children[1];

    expect(visibleSources.length).toBe(2);

    // Check more indicator
    expect(moreIndicator).toBeTruthy();
    expect(moreIndicator.type).toBe('span');
    expect(moreIndicator.props.className).toContain('source-chip--more');
    expect(moreIndicator.props.children).toEqual(['+', 1]);
    expect(moreIndicator.props.title).toBe('1 more sources');
  });

  it('respects showIcons=false', () => {
    const result = SourceChips({ sourceIds: ['external-reddit'], showIcons: false });
    const visibleSources = result.props.children[0];
    const external = visibleSources[0];

    // Icon is the first child, should be null
    expect(external.props.children[0]).toBeNull();
  });

  it('uses custom icon if provided', () => {
    const result = SourceChips({ sourceIds: ['external-custom-icon'] });
    const visibleSources = result.props.children[0];
    const custom = visibleSources[0];

    const icon = custom.props.children[0];
    expect(icon.props.children).toBe('🔥');
  });

  it('uses fallback icon for unknown category', () => {
    const result = SourceChips({ sourceIds: ['external-no-icon'] });
    const visibleSources = result.props.children[0];
    const unknown = visibleSources[0];

    const icon = unknown.props.children[0];
    expect(icon.props.children).toBe('🔗');
  });
});
