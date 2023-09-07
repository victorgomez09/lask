/** @format */

import { context, Format, PluginBuild } from 'esbuild'
import { spawn } from 'child_process'

export async function dev({
  name,
  isNode,
  outdir,
  tsconfig,
  external,
  target,
  define,
  entryPoints,
  logLevel = 'silent'
}: {
  name: string
  outdir: string
  calculateSize: boolean
  entryPoints: string[]
  isNode: boolean
  tsconfig: string
  external: string[]
  format: 'esm' | 'cjs'
  target: string
  define: Record<string, string>,
  logLevel: 'info' | 'error' | 'warning' | 'debug' | 'verbose' | 'silent'
}) {
  const { log } = console

  log(`‣ ${name}: Starting watch mode`)

  const ts = spawn(`tsc`, [`-w`, `--project`, tsconfig, `--pretty`, `--preserveWatchOutput`], {
    shell: true,
  })

  const errRegex = /error(.*)TS/g
  const cleanRegex = /Found 0 errors\./g

  let hasError = false

  ts.stdout.on('data', function (data: any) {
    const str = data.toString()
    if (errRegex.test(str)) {
      hasError = true
      log(`‣ ${name}: ${str}`)
    } else if (cleanRegex.test(str) && hasError) {
      log(`‣ ${name}: TypeScript errors fixed.`)
    }
  })

  try {
    log(`‣ ${name}: Starting incremental build`)

    const format = ['cjs', 'esm'];

    // Build packages
    (Array.isArray(format) ? format : [format]).forEach(async (fmt) => {
      const extension = fmt === 'esm' ? '.mjs' : '.js'
      const plugins = [
        {
          name: 'watch-plugin',
          setup(build: PluginBuild) {
            let count = 0;
            build.onEnd(result => {
              if (result.errors.length) throw Error(`${name}: Rebuild failed`)
              if (count++ > 0) log(`✔ ${name}: Rebuilt package`)
            });
          }
        }];
      const ctx = await context({
        entryPoints,
        outdir,
        tsconfig,
        external,
        define,
        format: fmt as Format,
        target,
        platform: isNode ? 'node' : 'neutral',
        outExtension: { '.js': extension },
        minify: false,
        bundle: true,
        treeShaking: true,
        metafile: true,
        sourcemap: true,
        write: false,
        logLevel,
        color: true,
        plugins: logLevel !== 'silent' ? plugins : []
      })
      await ctx.watch();
    })
  } catch (err) {
    ts?.kill()
    process.exit(1)
  }
}
