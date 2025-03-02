import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  'packages/*',
  {
    test: {
      name: '@l4ph/s3-compatible-loader',
      root: './packages/s3-compatible-loader',
      environment: 'node',
    },
  },
])