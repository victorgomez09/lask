/** @format */

import fs from 'fs'
import path from 'path'
import { build } from './build'
import { dev } from './dev'

export interface Options {
  isDev: boolean
  isNode: boolean
  entryPoints: string[]
  clean: boolean
  outDir: string
  external: {
    dependencies: boolean
    devDependencies: boolean
    peerDependencies: boolean
  }
  target: string
  format: 'esm' | 'cjs' | ('esm' | 'cjs')[]
  devFormat: 'esm' | 'cjs'
  devConfig: string
  buildConfig: string
  define: { [key: string]: string }
  calculateSize: boolean
}

export async function lask(opts = {} as Partial<Options>) {
  const {
    isDev = false,
    isNode = false,
    entryPoints = ['src/index.ts'],
    clean = true,
    devConfig = 'tsconfig.dev.json',
    buildConfig = 'tsconfig.build.json',
    devFormat = 'esm',
    format = ['cjs', 'esm'],
    target = 'es6',
    outDir = 'dist',
    external = {
      dependencies: true,
      devDependencies: true,
      peerDependencies: true,
    },
    define = {
      'process.env.NODE_ENV': isDev ? '"development"' : '"production"',
    },
    calculateSize = true,
  } = opts

  const cwd = process.cwd()
  const pkg = require(path.join(cwd, 'package.json'))

  // Collect externals from package
  const externals = [
    ...(external.dependencies ? Object.keys(pkg.dependencies ?? {}) : []),
    ...(external.devDependencies ? Object.keys(pkg.devDependencies ?? {}) : []),
    ...(external.peerDependencies ? Object.keys(pkg.peerDependencies ?? {}) : []),
  ]

  // Absolute path to out directory
  const outDirAbs = path.join(cwd, outDir)

  // Absolute path to config
  let configAbs = path.join(cwd, isDev ? devConfig : buildConfig)
  if (!fs.existsSync(configAbs)) {
    const { log } = console
    log(
      `‣ ${pkg.name}: Could not find ${isDev ? 'dev' : 'build'} config file (${
        isDev ? devConfig : buildConfig
      }), using tsconfig.json.`
    )
    configAbs = path.join(cwd, 'tsconfig.json')
  }

  // Absolute paths to entry points
  const entryPointsAbs = entryPoints.map((entryPoint) => path.join(cwd, entryPoint))

  if (isDev) {
    await build({
      name: pkg.name,
      outdir: outDirAbs,
      tsconfig: configAbs,
      external: externals,
      entryPoints: entryPointsAbs,
      format,
      target,
      isNode,
      define,
      calculateSize,
    })

    return dev({
      name: pkg.name,
      outdir: outDirAbs,
      tsconfig: configAbs,
      external: externals,
      format: devFormat,
      target,
      entryPoints: entryPointsAbs,
      isNode,
      define,
      calculateSize,
    })
  } else {
    // Delete dist
    if (clean) {
      if (fs.existsSync(outDirAbs)) {
        fs.rmSync(outDirAbs, { recursive: true })
      }
    }

    return build({
      name: pkg.name,
      outdir: outDirAbs,
      tsconfig: configAbs,
      external: externals,
      entryPoints: entryPointsAbs,
      format,
      target,
      isNode,
      define,
      calculateSize,
    })
  }
}
