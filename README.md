# vqa-dual-agent

DSH Web 插件(官方 bundle 形态):主模型调用 `vqa_ask` 向**视觉模型**提问,图片字节真实送达视觉模型,UI 实时展示「主模型提问 → 视觉模型回答」的 QA 过程;主设置提供多模态视觉模型选择页。

## 结构

```
package.json              # dsh.bundle.patch + dsh.client.platform=web + exports
cordis.patch.yml          # 向 web 组合挂载本插件(Node half)
.dsh-plugin/index.mjs     # Node half:注册 vqa_ask 工具 + webServer 路由
.dsh-plugin/client/index.mjs  # 浏览器 half 源码(esbuild 打包)
.dsh-plugin/client.js     # 构建产物(手改禁止;改源码后 node scripts/build-client.mjs)
scripts/build-client.mjs  # esbuild 构建器(--check 做新鲜度门禁)
```

## 构建

```bash
npm i -D esbuild          # 首次
node scripts/build-client.mjs   # 生成 .dsh-plugin/client.js
node scripts/build-client.mjs --check   # 校验产物与源码一致
```

## 安装到 DSH Web profile

1. 在 `/Users/a1234/.dsh/profiles/web/package.json`:
   - `dependencies` 增加 `"vqa-dual-agent": "file:<本仓库路径>"`
   - `dsh.profile.bundles` 增加 `"vqa-dual-agent"`
2. 在 profile 目录执行 `pnpm install`(或 `pnpm add vqa-dual-agent@file:<路径>`)。
3. 重启 web 服务并刷新页面。

也可以把本仓库推到 GitHub/GitLab 后用 git 依赖(参考 whale-girl 的 `github:vlln/whale-girl#main`)。

## 通信契约

- Node ↔ 浏览器:`webServer` 路由(全部 `POST` JSON):
  - `/vqa-dual-agent/exchange` `{callId}` — 单次问答快照(轮询,流式)
  - `/vqa-dual-agent/image` `{convKey}` — 图片 dataURL(每会话拉一次)
  - `/vqa-dual-agent/transcript` `{}` — 全部会话 QA 记录
  - `/vqa-dual-agent/settings` `{}` — 当前选择 + 多模态模型列表
  - `/vqa-dual-agent/set-model` `{provider, model}` — 设置页选择视觉模型
- 浏览器 half 由 `__ModuleLoader__.load({id, factory})` 挂载,`React` 经种子词 `require("react")` 解析(esbuild `--external:react`),样式直接注入 DOM。

## 功能

- 工具 `vqa_ask(image, question, model?, provider?, maxTokens?)`:读文件 → 魔数嗅探真实格式(PNG/JPEG/WebP/GIF,不信扩展名)→ attachments 生成引用 → 图片发给视觉模型 → 流式回答;同图追问自动带上下文。
- 工具卡片(`tool.call.toolview` key `vqa_ask`):主模型提问气泡 + 视觉模型回答气泡 + 缩略图 + 状态徽标(固定深色底,明暗主题均清晰)。
- Run 面板(`tool.view.cordis` key `self`):「双模型 QA 过程」总览。
- 设置页(`settings.section` id `vqa-vision`):从所有提供方中选多模态模型作视觉模型(进程内存,重启恢复默认)。

## 默认视觉模型解析顺序

设置页选择 → VQA 配置(`settings.get('vqa')` 的 provider/model)→ 内置默认 `momenta-gateway` / `qwen3.7-plus`。
