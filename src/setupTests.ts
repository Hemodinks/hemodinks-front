import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { queryClient } from './queryClient';

afterEach(() => {
  queryClient.clear();
  cleanup();
  window.history.replaceState(null, '', '/');
});
