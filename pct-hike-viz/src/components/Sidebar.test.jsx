import { describe, it, expect } from 'vitest';
import { ddgTeam } from '../data/planContent';

describe('Sidebar active-user lookup', () => {
  it('resolves a team member and uses Gunnar as the stable fallback', () => {
    const selected = ddgTeam.find((member) => member.id === ddgTeam[0].id) || ddgTeam[2];
    const missing = ddgTeam.find((member) => member.id === 'not-a-hiker') || ddgTeam[2];

    expect(selected).toEqual(ddgTeam[0]);
    expect(missing).toEqual(ddgTeam[2]);
    expect(missing.name).toBe('Gunnar');
  });
});
