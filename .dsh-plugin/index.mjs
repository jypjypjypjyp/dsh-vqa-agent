// ============================================================================
// dsh-vqa-agent · Node half(官方 bundle 形态,whale-girl 同款契约)
// 功能:
//   1) 注册模型工具 vqa_ask:读图片字节(魔数嗅探真实格式)→ attachments 生成引用
//      → llm.stream 把图片发给视觉模型 → 流式回答;同图追问自动带上下文。
//   2) webServer 路由(浏览器 half 经 fetch 轮询):
//      POST /dsh-vqa-agent/exchange     {callId}           单次问答快照
//      POST /dsh-vqa-agent/image        {convKey}          图片 dataURL
//      POST /dsh-vqa-agent/transcript   {}                 全部会话转录
//      POST /dsh-vqa-agent/settings     {}                 当前选择 + 多模态模型列表
//      POST /dsh-vqa-agent/set-model    {provider, model}  设置页选择视觉模型
// ============================================================================
import z from 'schemastery'

export const name = 'dsh-vqa-agent'
export const inject = ['tools', 'llm', 'attachments', 'fs', 'webServer', 'settings']

const ROUTE_PREFIX = '/dsh-vqa-agent'
const BODY_LIMIT = 256 * 1024

function bytesToBase64(u8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  let out = ''
  for (let i = 0; i < u8.length; i += 3) {
    const b0 = u8[i]
    const b1 = i + 1 < u8.length ? u8[i + 1] : 0
    const b2 = i + 2 < u8.length ? u8[i + 2] : 0
    out += chars[b0 >> 2]
    out += chars[((b0 & 3) << 4) | (b1 >> 4)]
    out += i + 1 < u8.length ? chars[((b1 & 15) << 2) | (b2 >> 6)] : '='
    out += i + 2 < u8.length ? chars[b2 & 63] : '='
  }
  return out
}

function mediaTypeOf(path) {
  const m = /\.([a-zA-Z0-9]+)$/.exec(path)
  if (!m) return null
  const ext = m[1].toLowerCase()
  if (ext === 'png') return 'image/png'
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'gif') return 'image/gif'
  return null
}

// 按字节魔数嗅探真实图片格式(扩展名可能骗人:如 .jpg 实为 webp)
function sniffMediaType(bytes) {
  if (bytes.length >= 8 &&
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
      bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return 'image/png'
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes.length >= 6 &&
      bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return 'image/gif'
  if (bytes.length >= 12 &&
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp'
  return null
}

function json(res, status, body, extra = {}) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra })
  res.end(JSON.stringify(body))
}

async function readBody(req, limit = BODY_LIMIT) {
  let data = ''
  for await (const chunk of req) {
    data += chunk
    if (data.length > limit) return null
  }
  return data
}

export function apply(ctx) {
  const convs = new Map()
  const byCallId = new Map()
  // 用户在设置页选择的视觉模型(进程内即时生效;set-model 同时持久化到 vqa 配置)
  let selectedVision = null
  let seq = 0

  // vqa 配置(settings.yaml 的 `vqa:` 分节),使默认视觉模型可持久配置
  let vqaSettings = null
  let vqaScope = null
  let settingsSeam = null
  try { settingsSeam = ctx.get('settings') } catch (e) { /* settings 服务可选 */ }
  if (settingsSeam && typeof settingsSeam.register === 'function') {
    try {
      const scope = settingsSeam.register('vqa', z.object({
        provider: z.string().default(''),
        model: z.string().default(''),
      }), { applies: 'live' })
      vqaScope = scope
      vqaSettings = scope.get()
      scope.watch((next) => { vqaSettings = next })
    } catch (e) { /* vqa 命名空间可能已由其它插件注册 */ }
  }

  // 把设置页选择的视觉模型写入 settings.yaml 的 `vqa:` 分节(用户分节持久化)。
  async function persistVision(provider, model) {
    if (!vqaScope || typeof vqaScope.update !== 'function') return false
    try {
      await vqaScope.update({ provider, model })
      const cur = vqaScope.get()
      return !!cur && typeof cur === 'object' && cur.provider === provider && cur.model === model
    } catch (e) {
      return false
    }
  }

  // 解析当前默认视觉模型:设置页选择 > vqa 配置 > 内置默认
  function visionDefaults() {
    if (selectedVision && selectedVision.provider && selectedVision.model) {
      return { provider: selectedVision.provider, model: selectedVision.model }
    }
    let provider = 'momenta-gateway'
    let model = 'qwen3.7-plus'
    if (vqaSettings && typeof vqaSettings === 'object') {
      if (typeof vqaSettings.provider === 'string' && vqaSettings.provider) provider = vqaSettings.provider
      if (typeof vqaSettings.model === 'string' && vqaSettings.model) model = vqaSettings.model
    } else {
      const settings = ctx.get('settings')
      if (settings) {
        try {
          const cfg = settings.get('vqa')
          if (cfg && typeof cfg === 'object') {
            if (typeof cfg.provider === 'string' && cfg.provider) provider = cfg.provider
            if (typeof cfg.model === 'string' && cfg.model) model = cfg.model
          }
        } catch (e) { /* vqa 命名空间可能未注册 */ }
      }
    }
    return { provider, model }
  }

  // 枚举所有提供方中支持图片输入的多模态模型
  async function listMultimodal() {
    const out = []
    const seen = new Set()
    let providers = []
    try {
      providers = ctx.llm.listProviders()
    } catch (e) {}
    for (const p of providers) {
      let models = []
      try {
        models = await ctx.llm.listModels(p.id)
      } catch (e) {}
      for (const m of models) {
        const mods = m.inputModalities
        if (mods == null || mods.includes('image')) {
          const key = p.id + '/' + m.id
          if (!seen.has(key)) {
            seen.add(key)
            out.push({ provider: p.id, model: m.id, name: m.name || m.id })
          }
        }
      }
    }
    return out
  }

  // ---- webServer 路由(浏览器 half 轮询) ----
  const disposers = []
  const webServer = ctx.get('webServer')
  if (webServer !== undefined) {
    disposers.push(webServer.register({
      kind: 'exact',
      path: `${ROUTE_PREFIX}/exchange`,
      handler: async (req, res) => {
        if (req.method !== 'POST') return json(res, 405, { error: 'method not allowed; use POST' })
        const raw = await readBody(req)
        const body = raw === null ? null : safeParse(raw)
        const callId = body && typeof body.callId === 'string' ? body.callId : null
        if (!callId) return json(res, 400, { error: 'callId required' })
        const ent = byCallId.get(callId)
        if (!ent) return json(res, 404, { error: 'unknown call' })
        const conv = convs.get(ent.convKey)
        if (!conv) return json(res, 404, { error: 'unknown conversation' })
        const item = conv.items.find((it) => it.itemId === ent.itemId)
        if (!item) return json(res, 404, { error: 'unknown exchange' })
        return json(res, 200, {
          callId,
          convKey: ent.convKey,
          status: item.status,
          question: item.question,
          answer: item.answer,
          error: item.error || null,
          visionModel: conv.model,
          imagePath: conv.image.path,
          ts: item.ts,
        })
      },
    }))

    disposers.push(webServer.register({
      kind: 'exact',
      path: `${ROUTE_PREFIX}/image`,
      handler: async (req, res) => {
        if (req.method !== 'POST') return json(res, 405, { error: 'method not allowed; use POST' })
        const raw = await readBody(req)
        const body = raw === null ? null : safeParse(raw)
        const convKey = body && typeof body.convKey === 'string' ? body.convKey : null
        const conv = convKey ? convs.get(convKey) : undefined
        if (!conv) return json(res, 404, { error: 'unknown conversation' })
        return json(res, 200, { convKey, imagePath: conv.image.path, imageDataUrl: conv.image.dataUrl || null })
      },
    }))

    disposers.push(webServer.register({
      kind: 'exact',
      path: `${ROUTE_PREFIX}/transcript`,
      handler: async (req, res) => {
        if (req.method !== 'POST') return json(res, 405, { error: 'method not allowed; use POST' })
        const out = []
        for (const [convKey, conv] of convs) {
          out.push({
            convKey,
            imagePath: conv.image.path,
            model: conv.model,
            items: conv.items.map((it) => ({
              itemId: it.itemId,
              question: it.question,
              answer: it.answer,
              status: it.status,
              error: it.error || null,
              ts: it.ts,
            })),
          })
        }
        return json(res, 200, out)
      },
    }))

    disposers.push(webServer.register({
      kind: 'exact',
      path: `${ROUTE_PREFIX}/settings`,
      handler: async (req, res) => {
        if (req.method !== 'POST') return json(res, 405, { error: 'method not allowed; use POST' })
        const def = visionDefaults()
        let multimodal = []
        try {
          multimodal = await listMultimodal()
        } catch (e) {}
        return json(res, 200, { provider: def.provider, model: def.model, multimodal })
      },
    }))

    disposers.push(webServer.register({
      kind: 'exact',
      path: `${ROUTE_PREFIX}/set-model`,
      handler: async (req, res) => {
        if (req.method !== 'POST') return json(res, 405, { error: 'method not allowed; use POST' })
        const raw = await readBody(req)
        const body = raw === null ? null : safeParse(raw)
        const provider = body && typeof body.provider === 'string' && body.provider ? body.provider : null
        const model = body && typeof body.model === 'string' && body.model ? body.model : null
        if (!provider || !model) return json(res, 400, { error: 'provider 和 model 不能为空' })
        const persisted = await persistVision(provider, model)
        selectedVision = { provider, model }
        return json(res, 200, { ok: true, provider, model, persisted })
      },
    }))
  }

  // ---- 模型工具 vqa_ask ----
  const tool = {
    name: 'vqa_ask',
    description: '视觉问答工具:把问题交给视觉模型,让它看图回答。整个"主模型提问 → 视觉模型回答"的过程会实时展示在 UI 上。对同一张图片再次提问会自动带上之前的问答上下文。当用户让你"看图""分析图片""这张图里有什么"等涉及图片内容时使用。',
    timeoutMs: 120000,
    parameters: {
      type: 'object',
      properties: {
        image: { type: 'string', description: '图片文件路径(PNG/JPEG/WebP/GIF,绝对路径或相对工作区路径)' },
        question: { type: 'string', description: '要问视觉模型的问题,例如"这张图里有什么?"' },
        model: { type: 'string', description: '视觉模型 id(覆盖设置页的选择),例如 qwen3.7-plus、deepseek-v4-flash' },
        provider: { type: 'string', description: '模型提供方路由(覆盖设置页的选择)' },
        maxTokens: { type: 'integer', description: '回答的最大 token 数(默认 1024)' },
      },
      required: ['image', 'question'],
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          answer: { type: 'string' },
          visionModel: { type: 'string' },
          exchangeId: { type: 'string' },
          conversationId: { type: 'string' },
        },
        required: ['answer', 'visionModel', 'exchangeId', 'conversationId'],
      },
      render(args, value) {
        return [{ type: 'text', text: '[视觉模型 ' + value.visionModel + '] ' + value.answer }]
      },
    },
    async execute(args, exec) {
      const image = typeof args.image === 'string' ? args.image.trim() : ''
      const question = typeof args.question === 'string' ? args.question.trim() : ''
      if (!image) throw new Error('vqa_ask 需要 image 参数(图片路径)')
      if (!question) throw new Error('vqa_ask 需要 question 参数(要问的问题)')
      const def = visionDefaults()
      const provider = typeof args.provider === 'string' && args.provider ? args.provider : def.provider
      const model = typeof args.model === 'string' && args.model ? args.model : def.model
      const maxTokens = typeof args.maxTokens === 'number' && args.maxTokens > 0 ? Math.floor(args.maxTokens) : undefined

      // 相对路径基于会话工作区(cwd)解析;绝对路径原样使用
      let base
      try {
        if (exec.agent && exec.agent.session && exec.agent.session.header && typeof exec.agent.session.header.cwd === 'string' && exec.agent.session.header.cwd) {
          base = exec.agent.session.header.cwd
        }
      } catch (e) {}
      if (!base) {
        try {
          const sp = ctx.get('sandboxPolicy')
          if (sp && typeof sp.workspaceRoot === 'string' && sp.workspaceRoot) base = sp.workspaceRoot
        } catch (e) {}
      }
      const isAbsolute = image[0] === '/' || /^[A-Za-z]:[\\/]/.test(image)
      const target = (base && !isAbsolute)
        ? await ctx.fs.resolve(image, { cwd: base, signal: exec.signal })
        : await ctx.fs.resolve(image, { signal: exec.signal })
      const displayPath = ctx.fs.processPath(target)

      let conv = convs.get(displayPath)
      if (!conv) {
        const info = await ctx.fs.stat(target, exec.signal)
        if (!info || info.type !== 'file') throw new Error('找不到图片文件: ' + image)
        const size = typeof info.size === 'number' && info.size > 0 ? info.size : 64 * 1024 * 1024
        const bytes = await ctx.fs.readBytes(target, exec.signal, size)
        // 以真实字节格式为准,扩展名只做兜底
        const mediaType = sniffMediaType(bytes) || mediaTypeOf(displayPath)
        if (!mediaType) throw new Error('不支持的图片格式(仅支持 png / jpg / webp / gif): ' + image)
        const ref = await ctx.attachments.saveImage({ data: bytes, mediaType, name: displayPath.split('/').pop() })
        conv = {
          image: { path: displayPath, dataUrl: 'data:' + mediaType + ';base64,' + bytesToBase64(bytes), ref },
          model,
          items: [],
          history: [],
        }
        convs.set(displayPath, conv)
      } else {
        conv.model = model
      }

      const itemId = 'ex' + (++seq)
      const item = { itemId, question, answer: '', status: 'asking', error: null, ts: Date.now() }
      conv.items.push(item)
      byCallId.set(exec.callId, { convKey: displayPath, itemId })

      const messages = []
      for (const h of conv.history) messages.push(h)
      messages.push({
        id: 'msg' + (++seq),
        role: 'user',
        content: [{ type: 'image', attachment: conv.image.ref }, { type: 'text', text: question }],
        source: { kind: 'user' },
      })

      try {
        const stream = ctx.llm.stream({ provider, model, messages, maxTokens, signal: exec.signal })
        for await (const chunk of stream) {
          if (chunk.type === 'text-delta') {
            item.answer += chunk.text
          } else if (chunk.type === 'finish') {
            if (chunk.reason && (chunk.reason.kind === 'error' || chunk.reason.kind === 'aborted')) {
              item.status = 'error'
              item.error = chunk.reason.failure ? (chunk.reason.failure.message || String(chunk.reason.kind)) : String(chunk.reason.kind)
            } else if (item.status === 'asking') {
              item.status = 'answered'
            }
          }
        }
        if (item.status === 'asking') item.status = 'answered'
        conv.history.push({
          id: 'msg' + (++seq), role: 'user',
          content: [{ type: 'text', text: question }], source: { kind: 'user' },
        })
        conv.history.push({
          id: 'msg' + (++seq), role: 'assistant',
          content: [{ type: 'text', text: item.answer }], source: { kind: 'model', provider, model },
        })
      } catch (err) {
        item.status = 'error'
        item.error = err && err.message ? err.message : String(err)
      }

      if (item.status === 'error') throw new Error(item.error || '视觉模型调用失败')
      return {
        answer: item.answer,
        visionModel: model,
        exchangeId: itemId,
        conversationId: displayPath,
      }
    },
  }
  disposers.push(ctx.tools.register(tool))

  return () => {
    for (const d of disposers) d()
  }
}

function safeParse(raw) {
  try {
    const v = JSON.parse(raw || '{}')
    return v && typeof v === 'object' && !Array.isArray(v) ? v : null
  } catch (e) {
    return null
  }
}
