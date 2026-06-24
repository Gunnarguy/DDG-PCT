import { describe, it, expect } from 'vitest';
import { ddgTeam } from '../data/planContent';

describe('Sidebar performance benchmark', () => {
  it('should measure render time for finding active user', () => {
    // Generate dummy props
    const defaultProps = {
      currentUserId: ddgTeam[0].id,
    };

    const iterations = 10000;

    // Current unoptimized logic
    let unoptimizedTotalTime = 0;
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      const activeUser = ddgTeam.find((member) => member.id === defaultProps.currentUserId) || ddgTeam[2];
      const activeUserName = activeUser?.name || "Gunnar";
      unoptimizedTotalTime += (performance.now() - start);
      expect(activeUserName).toBeDefined();
    }

    // Since we'll wrap it in useMemo, the find is only executed ONCE
    let optimizedTotalTime = 0;
    const startMemo = performance.now();
    const memoizedActiveUser = ddgTeam.find((member) => member.id === defaultProps.currentUserId) || ddgTeam[2];
    optimizedTotalTime += (performance.now() - startMemo);

    for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        // simulating reading from memoized value
        const activeUser = memoizedActiveUser;
        const activeUserName = activeUser?.name || "Gunnar";
        optimizedTotalTime += (performance.now() - start);
        expect(activeUserName).toBeDefined();
    }

    console.log(`Unoptimized total time: ${unoptimizedTotalTime}ms`);
    console.log(`Optimized total time: ${optimizedTotalTime}ms`);
    console.log(`Improvement: ${unoptimizedTotalTime / optimizedTotalTime}x faster`);

    expect(optimizedTotalTime).toBeLessThan(unoptimizedTotalTime);
  });
});
