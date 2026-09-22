import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { VERSION } from '../src/program.js'

interface PackageMetadata {
  version: string
}

describe('version', () => {
  it('matches the package version', () => {
    const packageMetadata = createRequire(import.meta.url)('../package.json') as PackageMetadata
    expect(VERSION).toBe(packageMetadata.version)
  })
})
