// Vitest global setup — runs once before every test file.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Unmount whatever the previous test rendered so tests never leak DOM
// nodes, event listeners, or timers into one another.
afterEach(() => {
  cleanup();
});
