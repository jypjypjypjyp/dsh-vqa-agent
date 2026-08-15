// ============================================================================
// dsh-vqa-agent · 浏览器 half(官方 bundle 契约)
// 由 esbuild 打包为 CJS 并包上 __ModuleLoader__.load({id, factory}),
// factory 返回 { name, apply };内核挂载时调用 apply(ctx)。
// 与 Node half 的通信走 webServer 路由(fetch POST),不再用动态插件的 host.call。
// React 通过 require("react") 从内核种子词解析;样式直接注入 DOM。
// ============================================================================
import React from 'react'

const ROUTE_PREFIX = '/dsh-vqa-agent'

async function postJSON(path, body = {}) {
  try {
    const res = await fetch(ROUTE_PREFIX + path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body || {}),
      cache: 'no-store',
    })
    if (!res.ok) return null
    return await res.json()
  } catch (e) {
    return null
  }
}

function parseArgs(block) {
  try {
    const raw = block && block.kind === 'tool-result'
      ? (block.call ? block.call.argsRaw : null)
      : (block ? block.argsRaw : null)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch (e) {
    return {}
  }
}

function extractContentText(block) {
  if (!block || block.kind !== 'tool-result' || !Array.isArray(block.content)) return ''
  try {
    return block.content
      .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
      .map((b) => b.text)
      .join('\n')
  } catch (e) {
    return ''
  }
}

export const name = 'dsh-vqa-agent'

export function apply(ctx) {
  // ---- 样式注入(卸载时移除) ----
  const styleEl = document.createElement('style')
  styleEl.textContent = `
.vqa-card, .vqa-panel {
  font-size: 13px;
  line-height: 1.5;
  color: var(--dsw-alias-label-primary, #1f2328);
  background: var(--dsw-alias-bg-layer-1, #ffffff);
  border: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.35));
  border-radius: 10px;
  padding: 10px 12px;
  margin: 4px 0;
  max-width: 640px;
}
.vqa-card-head, .vqa-panel-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
.vqa-card-title, .vqa-panel-title { font-weight: 600; font-size: 13px; }
.vqa-panel-sub { color: var(--dsw-alias-label-secondary, #656d76); font-size: 12px; }
.vqa-chip { font-size: 11px; padding: 2px 8px; border-radius: 999px; border: 1px solid currentColor; white-space: nowrap; }
.vqa-chip-warn { color: var(--dsw-alias-state-warn-primary, #9a6700); animation: vqa-pulse 1.2s ease-in-out infinite; }
.vqa-chip-ok { color: var(--dsw-alias-state-success-primary, #1a7f37); }
.vqa-chip-err { color: var(--dsw-alias-state-error-primary, #cf222e); }
@keyframes vqa-pulse { 0%,100% { opacity: 1; } 50% { opacity: .45; } }
.vqa-thumb { max-height: 96px; max-width: 160px; border-radius: 6px; border: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.35)); display: block; }
.vqa-imgwrap { margin-bottom: 8px; }
.vqa-ex { margin: 6px 0; }
.vqa-row { display: flex; gap: 8px; margin: 6px 0; align-items: flex-start; }
.vqa-role { flex: 0 0 auto; font-size: 11px; line-height: 18px; padding: 1px 9px; border-radius: 999px; color: #ffffff; border: 1px solid rgba(0,0,0,.18); }
.vqa-role-main { background: #4f46e5; }
.vqa-role-vision { background: #0f766e; }
.vqa-bubble { padding: 6px 10px; border-radius: 8px; background: var(--dsw-alias-bg-layer-2, #f3f4f6); white-space: pre-wrap; word-break: break-word; min-width: 60px; }
.vqa-bubble-q { border-top-left-radius: 2px; }
.vqa-bubble-a { border-top-right-radius: 2px; }
.vqa-thinking { color: var(--dsw-alias-label-secondary, #656d76); }
.vqa-error { color: var(--dsw-alias-state-error-primary, #cf222e); font-size: 12px; margin-top: 4px; }
.vqa-empty { color: var(--dsw-alias-label-secondary, #656d76); font-size: 12px; padding: 6px 0; }
.vqa-conv { border-top: 1px dashed var(--dsw-alias-border-l1, rgba(128,128,128,.35)); padding: 8px 0 4px; }
.vqa-conv:first-child { border-top: none; padding-top: 0; }
.vqa-conv-head { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.vqa-conv-path { font-size: 11px; color: var(--dsw-alias-label-secondary, #656d76); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 240px; }
.vqa-conv-model { font-size: 11px; color: var(--dsw-alias-label-secondary, #656d76); flex: 0 0 auto; }
/* ---- 设置页 ---- */
.vqa-settings { padding: 4px 2px; }
.vqa-settings h3 { margin: 0 0 4px; font-size: 15px; }
.vqa-settings p { margin: 4px 0; font-size: 12.5px; color: var(--dsw-alias-label-secondary, #656d76); line-height: 1.6; }
.vqa-settings-row { margin: 10px 0; display: flex; flex-direction: column; gap: 6px; }
.vqa-settings-row label { font-size: 12.5px; font-weight: 600; }
.vqa-settings select { font-size: 13px; padding: 6px 8px; border-radius: 8px; border: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.4)); background: var(--dsw-alias-bg-layer-2, #f6f6f6); color: var(--dsw-alias-label-primary, #1f2328); max-width: 100%; }
.vqa-settings-note { font-size: 12px; color: var(--dsw-alias-label-secondary, #656d76); }
.vqa-settings-msg { font-size: 12px; margin-top: 6px; }
.vqa-settings-ok { color: var(--dsw-alias-state-success-primary, #1a7f37); }
.vqa-settings-err { color: var(--dsw-alias-state-error-primary, #cf222e); }
.vqa-settings-list { font-size: 12px; margin-top: 8px; color: var(--dsw-alias-label-secondary, #656d76); }
`
  document.head.appendChild(styleEl)

  // 图片 dataURL 缓存:每个会话只拉一次
  const imgCache = new Map()

  // 轮询单个问答,直到非 asking 状态
  function useExchange(callId) {
    const [snap, setSnap] = React.useState(null)
    React.useEffect(() => {
      let cancelled = false
      let settled = false
      const tick = () => {
        if (settled) return
        postJSON('/exchange', { callId }).then((res) => {
          if (cancelled || !res) return
          setSnap(res)
          if (res.status !== 'asking') settled = true
        })
      }
      tick()
      const timer = setInterval(tick, 500)
      return () => { cancelled = true; clearInterval(timer) }
    }, [callId])
    return snap
  }

  // 每个会话的图片只从 Host 拉一次
  function useImage(convKey) {
    const [img, setImg] = React.useState(null)
    React.useEffect(() => {
      if (!convKey) return
      if (imgCache.has(convKey)) { setImg(imgCache.get(convKey)); return }
      let cancelled = false
      postJSON('/image', { convKey }).then((res) => {
        if (cancelled) return
        const url = res && res.imageDataUrl ? res.imageDataUrl : null
        imgCache.set(convKey, url)
        setImg(url)
      })
      return () => { cancelled = true }
    }, [convKey])
    return img
  }

  function StatusChip(props) {
    const s = props.status === 'answered'
      ? { text: '已回答', cls: 'vqa-chip-ok' }
      : props.status === 'error'
        ? { text: '出错', cls: 'vqa-chip-err' }
        : { text: '视觉模型思考中…', cls: 'vqa-chip-warn' }
    return React.createElement('span', { className: 'vqa-chip ' + s.cls }, s.text)
  }

  // ---- 工具调用卡片:单次 主模型提问 → 视觉模型回答 ----
  function VqaCallCard(props) {
    const block = props.block
    const callId = props.callId
    const running = !block || block.kind !== 'tool-result'
    const args = parseArgs(block)
    const snap = useExchange(callId)
    const img = useImage(snap ? snap.convKey : null)
    const status = snap ? snap.status : (running ? 'asking' : (block.isError ? 'error' : 'answered'))
    const question = (snap && snap.question) || args.question || ''
    const answer = (snap && snap.answer) ? snap.answer : (running ? '' : extractContentText(block))
    const visionModel = (snap && snap.visionModel) || args.model || '视觉模型'
    const error = snap ? snap.error : (block && block.isError ? '执行失败' : null)
    return React.createElement('div', { className: 'vqa-card' },
      React.createElement('div', { className: 'vqa-card-head' },
        React.createElement('span', { className: 'vqa-card-title' }, 'vqa_ask · 双模型视觉问答'),
        React.createElement(StatusChip, { status }),
      ),
      img ? React.createElement('div', { className: 'vqa-imgwrap' },
        React.createElement('img', { src: img, className: 'vqa-thumb', alt: 'image' })) : null,
      React.createElement('div', { className: 'vqa-ex' },
        React.createElement('div', { className: 'vqa-row' },
          React.createElement('span', { className: 'vqa-role vqa-role-main' }, '主模型提问'),
          React.createElement('div', { className: 'vqa-bubble vqa-bubble-q' }, question || '…'),
        ),
        React.createElement('div', { className: 'vqa-row' },
          React.createElement('span', { className: 'vqa-role vqa-role-vision' }, visionModel),
          React.createElement('div', { className: 'vqa-bubble vqa-bubble-a' },
            status === 'asking' && !answer
              ? React.createElement('span', { className: 'vqa-thinking' }, '视觉模型正在看图思考…')
              : (answer || ''),
          ),
        ),
        error ? React.createElement('div', { className: 'vqa-error' }, '错误: ' + error) : null,
      ),
    )
  }

  // ---- Run 卡片面板:完整的两模型 QA 过程 ----
  function ItemBlock(props) {
    const item = props.item
    const model = props.model
    return React.createElement('div', { className: 'vqa-ex' },
      React.createElement('div', { className: 'vqa-row' },
        React.createElement('span', { className: 'vqa-role vqa-role-main' }, '主模型'),
        React.createElement('div', { className: 'vqa-bubble vqa-bubble-q' }, item.question),
      ),
      React.createElement('div', { className: 'vqa-row' },
        React.createElement('span', { className: 'vqa-role vqa-role-vision' }, model),
        React.createElement('div', { className: 'vqa-bubble vqa-bubble-a' },
          item.status === 'asking'
            ? React.createElement('span', { className: 'vqa-thinking' }, '视觉模型正在看图思考…')
            : (item.answer || ''),
        ),
      ),
      item.status === 'error' && item.error
        ? React.createElement('div', { className: 'vqa-error' }, '错误: ' + item.error)
        : null,
    )
  }

  function ConvBlock(props) {
    const conv = props.conv
    const img = useImage(conv.convKey)
    return React.createElement('div', { className: 'vqa-conv' },
      React.createElement('div', { className: 'vqa-conv-head' },
        img ? React.createElement('img', { src: img, className: 'vqa-thumb', alt: 'image' }) : null,
        React.createElement('span', { className: 'vqa-conv-path', title: conv.imagePath }, conv.imagePath),
        React.createElement('span', { className: 'vqa-conv-model' }, conv.model),
      ),
      conv.items.map((item) => React.createElement(ItemBlock, { key: item.itemId, item, model: conv.model })),
    )
  }

  function CordisPanel(props) {
    const [data, setData] = React.useState(null)
    React.useEffect(() => {
      let cancelled = false
      const tick = () => {
        postJSON('/transcript', {}).then((res) => {
          if (!cancelled && res) setData(res)
        })
      }
      tick()
      const timer = setInterval(tick, 700)
      return () => { cancelled = true; clearInterval(timer) }
    }, [])
    const convs = data || []
    return React.createElement('div', { className: 'vqa-panel' },
      React.createElement('div', { className: 'vqa-panel-head' },
        React.createElement('span', { className: 'vqa-panel-title' }, '双模型 QA 过程'),
        React.createElement('span', { className: 'vqa-panel-sub' }, '主模型 ↔ 视觉模型 · ' + convs.length + ' 组会话'),
      ),
      convs.length === 0
        ? React.createElement('div', { className: 'vqa-empty' },
            '还没有问答。让主模型调用 vqa_ask 工具,这里会实时展示两个模型的问答过程。')
        : convs.map((conv) => React.createElement(ConvBlock, { key: conv.convKey, conv })),
    )
  }

  // ---- 设置页:选择视觉模型 ----
  function VisionSettingsPage(props) {
    const [state, setState] = React.useState(null)
    const [busy, setBusy] = React.useState(false)
    const [msg, setMsg] = React.useState({ ok: true, text: '' })
    React.useEffect(() => {
      let cancelled = false
      postJSON('/settings', {}).then((res) => {
        if (!cancelled && res) setState(res)
      })
      return () => { cancelled = true }
    }, [])
    if (!state) {
      return React.createElement('div', { className: 'vqa-settings' },
        React.createElement('p', null, '正在加载多模态模型列表…'))
    }
    const groups = {}
    for (const m of state.multimodal || []) {
      ;(groups[m.provider] = groups[m.provider] || []).push(m)
    }
    const current = state.provider + '\u0000' + state.model
    let inList = false
    for (const m of state.multimodal || []) {
      if (m.provider === state.provider && m.model === state.model) inList = true
    }
    const onChange = (e) => {
      const v = e.target.value
      if (!v) return
      const sep = v.indexOf('\u0000')
      const provider = v.slice(0, sep)
      const model = v.slice(sep + 1)
      setBusy(true)
      setMsg({ ok: true, text: '' })
      postJSON('/set-model', { provider, model }).then((res) => {
        setBusy(false)
        if (res && res.ok) {
          setMsg({ ok: true, text: (res.persisted ? '已应用并保存: ' : '已应用(仅本次运行): ') + provider + ' / ' + model })
          setState((prev) => prev ? { ...prev, provider, model } : prev)
        } else {
          setMsg({ ok: false, text: (res && res.error) || '设置失败' })
        }
      })
    }
    const total = (state.multimodal || []).length
    return React.createElement('div', { className: 'vqa-settings' },
      React.createElement('h3', null, '视觉问答 · 视觉模型'),
      React.createElement('p', null,
        'vqa_ask 工具把主模型的问题交给哪个多模态模型来"看图回答"。此处列出当前所有提供方中支持图片输入的多模态模型,选择后立即生效。'),
      React.createElement('div', { className: 'vqa-settings-row' },
        React.createElement('label', null, '视觉模型(多模态)'),
        React.createElement('select', { value: current, onChange, disabled: busy },
          !inList ? React.createElement('option', { value: current }, state.provider + ' / ' + state.model) : null,
          Object.keys(groups).map((provider) => React.createElement('optgroup', { key: provider, label: provider },
            groups[provider].map((m) => React.createElement('option', { key: m.provider + '/' + m.model, value: m.provider + '\u0000' + m.model },
              m.model + (m.name && m.name !== m.model ? ' (' + m.name + ')' : ''))),
          )),
        ),
      ),
      msg.text ? React.createElement('div', { className: 'vqa-settings-msg ' + (msg.ok ? 'vqa-settings-ok' : 'vqa-settings-err') }, msg.text) : null,
      React.createElement('div', { className: 'vqa-settings-list' },
        '当前可用多模态模型: ' + total + ' 个;选择会写入 settings.yaml 的 vqa 配置,重启后仍然记住。'),
    )
  }

  // ---- 槽位挂载 ----
  const slots = ctx.get('slots')
  const disposers = []
  if (slots !== undefined) {
    disposers.push(slots.inject('tool.call.toolview', () => slots.register(
      { name: 'tool.call.toolview', key: 'vqa_ask' },
      (props) => React.createElement(VqaCallCard, props),
    )))
    disposers.push(slots.inject('tool.view.cordis', () => slots.register(
      { name: 'tool.view.cordis', key: 'self' },
      (props) => React.createElement(CordisPanel, props),
    )))
    disposers.push(slots.inject('settings.section', () => slots.register(
      { name: 'settings.section', id: 'vqa-vision', order: 12, label: '视觉问答' },
      (props) => React.createElement(VisionSettingsPage, props),
    )))
  }

  return () => {
    for (const d of disposers) d()
    styleEl.remove()
  }
}
