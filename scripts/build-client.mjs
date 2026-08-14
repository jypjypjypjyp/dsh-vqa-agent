// 生成器:.dsh-plugin/client/index.mjs → .dsh-plugin/client.js(bundle 产物,随插件分发)。
// 契约:--check 模式在内存生成后与已提交 .dsh-plugin/client.js 逐字节比对,不一致非零退出——
// 手改生成物禁止(改 client/index.mjs,勿改 client.js)。
// 包装方式:esbuild CJS 输出(module/exports 供 factory 作用域)+ 外层
// `__ModuleLoader__.load({ id, factory })`(对齐官方 client bundle 产物结构)。
// react 保持 external:运行时由内核种子词 require("react") 解析,不内联进 bundle。
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOT = resolve(import.meta.dirname, '..')
const ENTRY = '.dsh-plugin/client/index.mjs'
const OUTPUT = join(ROOT, '.dsh-plugin', 'client.js')

function resolveEsbuildBin() {
  const candidates = [
    join(ROOT, 'node_modules/.bin/esbuild'),
    join(ROOT, 'node_modules/esbuild/bin/esbuild'),
  ]
  for (const c of candidates) {
    try {
      if (statSync(c).isFile()) return c
    } catch {
      // 下一个候选
    }
  }
  return null
}

export function generate({ check = false, root = ROOT } = {}) {
  const esbuildBin = resolveEsbuildBin()
  if (esbuildBin === null) {
    return { ok: false, errors: ['esbuild 不可用:在仓库内执行 npm i -D esbuild'] }
  }
  const tmpDir = mkdtempSync(join(tmpdir(), 'vqa-dual-agent-'))
  const tmpOut = join(tmpDir, 'client.js')
  const res = spawnSync(
    esbuildBin,
    [
      ENTRY,
      '--bundle',
      '--format=cjs',
      '--platform=browser',
      '--target=es2020',
      '--external:react',
      `--outfile=${tmpOut}`,
    ],
    { cwd: root, encoding: 'utf8' },
  )
  if (res.status !== 0) {
    return { ok: false, errors: [`esbuild 失败:${res.stderr.trim()}`] }
  }
  const body = readFileSync(tmpOut, 'utf8')
  const code = Buffer.from(
    `window.__ModuleLoader__.load({\n`
    + `\tid: "vqa-dual-agent",\n`
    + `\tfactory: (require) => {\n`
    + `\t\tvar module = { exports: {} };\n`
    + `\t\tvar exports = module.exports;\n`
    + body.replace(/\n$/, '')
    + `\n\t\treturn module.exports;\n`
    + `\t}\n`
    + `});\n`,
  )
  const outputPath = join(root, '.dsh-plugin', 'client.js')
  if (!check) {
    writeFileSync(outputPath, code)
    return { ok: true }
  }
  let committed = null
  try {
    committed = readFileSync(outputPath)
  } catch {
    return { ok: false, errors: [`${outputPath} 不存在:运行 node scripts/build-client.mjs 生成`] }
  }
  if (Buffer.compare(committed, code) !== 0) {
    return { ok: false, errors: ['client.js 与生成器输出不一致:运行 node scripts/build-client.mjs 重新生成(手改生成物禁止)'] }
  }
  return { ok: true }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const check = process.argv.includes('--check')
  const result = generate({ check })
  if (!result.ok) {
    for (const e of result.errors ?? []) console.error(`[build-client] ${e}`)
    process.exit(1)
  }
  console.log(check ? '[build-client] client.js 新鲜(--check OK)' : '[build-client] client.js 已生成')
}
