import { defineConfig } from 'vitest/config';

// Scoped to domain/ on purpose: that's the only code guaranteed to be
// plain TypeScript with zero React/React Native imports, so it runs
// under plain Node without any RN/Metro transform or mocking.
export default defineConfig({
  test: {
    include: ['domain/**/*.test.ts'],
  },
});
