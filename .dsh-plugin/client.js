window.__ModuleLoader__.load({
	id: "dsh-vqa-agent",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// .dsh-plugin/client/index.mjs
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  name: () => name
});
module.exports = __toCommonJS(index_exports);
var import_react = __toESM(require("react"), 1);
var ROUTE_PREFIX = "/dsh-vqa-agent";
async function postJSON(path, body = {}) {
  try {
    const res = await fetch(ROUTE_PREFIX + path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body || {}),
      cache: "no-store"
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}
function parseArgs(block) {
  try {
    const raw = block && block.kind === "tool-result" ? block.call ? block.call.argsRaw : null : block ? block.argsRaw : null;
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (e) {
    return {};
  }
}
function extractContentText(block) {
  if (!block || block.kind !== "tool-result" || !Array.isArray(block.content)) return "";
  try {
    return block.content.filter((b) => b && b.type === "text" && typeof b.text === "string").map((b) => b.text).join("\n");
  } catch (e) {
    return "";
  }
}
var name = "dsh-vqa-agent";
function apply(ctx) {
  const styleEl = document.createElement("style");
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
/* ---- \u8BBE\u7F6E\u9875 ---- */
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
`;
  document.head.appendChild(styleEl);
  const imgCache = /* @__PURE__ */ new Map();
  function useExchange(callId) {
    const [snap, setSnap] = import_react.default.useState(null);
    import_react.default.useEffect(() => {
      let cancelled = false;
      let settled = false;
      const tick = () => {
        if (settled) return;
        postJSON("/exchange", { callId }).then((res) => {
          if (cancelled || !res) return;
          setSnap(res);
          if (res.status !== "asking") settled = true;
        });
      };
      tick();
      const timer = setInterval(tick, 500);
      return () => {
        cancelled = true;
        clearInterval(timer);
      };
    }, [callId]);
    return snap;
  }
  function useImage(convKey) {
    const [img, setImg] = import_react.default.useState(null);
    import_react.default.useEffect(() => {
      if (!convKey) return;
      if (imgCache.has(convKey)) {
        setImg(imgCache.get(convKey));
        return;
      }
      let cancelled = false;
      postJSON("/image", { convKey }).then((res) => {
        if (cancelled) return;
        const url = res && res.imageDataUrl ? res.imageDataUrl : null;
        imgCache.set(convKey, url);
        setImg(url);
      });
      return () => {
        cancelled = true;
      };
    }, [convKey]);
    return img;
  }
  function StatusChip(props) {
    const s = props.status === "answered" ? { text: "\u5DF2\u56DE\u7B54", cls: "vqa-chip-ok" } : props.status === "error" ? { text: "\u51FA\u9519", cls: "vqa-chip-err" } : { text: "\u89C6\u89C9\u6A21\u578B\u601D\u8003\u4E2D\u2026", cls: "vqa-chip-warn" };
    return import_react.default.createElement("span", { className: "vqa-chip " + s.cls }, s.text);
  }
  function VqaCallCard(props) {
    const block = props.block;
    const callId = props.callId;
    const running = !block || block.kind !== "tool-result";
    const args = parseArgs(block);
    const snap = useExchange(callId);
    const img = useImage(snap ? snap.convKey : null);
    const status = snap ? snap.status : running ? "asking" : block.isError ? "error" : "answered";
    const question = snap && snap.question || args.question || "";
    const answer = snap && snap.answer ? snap.answer : running ? "" : extractContentText(block);
    const visionModel = snap && snap.visionModel || args.model || "\u89C6\u89C9\u6A21\u578B";
    const error = snap ? snap.error : block && block.isError ? "\u6267\u884C\u5931\u8D25" : null;
    return import_react.default.createElement(
      "div",
      { className: "vqa-card" },
      import_react.default.createElement(
        "div",
        { className: "vqa-card-head" },
        import_react.default.createElement("span", { className: "vqa-card-title" }, "vqa_ask \xB7 \u53CC\u6A21\u578B\u89C6\u89C9\u95EE\u7B54"),
        import_react.default.createElement(StatusChip, { status })
      ),
      img ? import_react.default.createElement(
        "div",
        { className: "vqa-imgwrap" },
        import_react.default.createElement("img", { src: img, className: "vqa-thumb", alt: "image" })
      ) : null,
      import_react.default.createElement(
        "div",
        { className: "vqa-ex" },
        import_react.default.createElement(
          "div",
          { className: "vqa-row" },
          import_react.default.createElement("span", { className: "vqa-role vqa-role-main" }, "\u4E3B\u6A21\u578B\u63D0\u95EE"),
          import_react.default.createElement("div", { className: "vqa-bubble vqa-bubble-q" }, question || "\u2026")
        ),
        import_react.default.createElement(
          "div",
          { className: "vqa-row" },
          import_react.default.createElement("span", { className: "vqa-role vqa-role-vision" }, visionModel),
          import_react.default.createElement(
            "div",
            { className: "vqa-bubble vqa-bubble-a" },
            status === "asking" && !answer ? import_react.default.createElement("span", { className: "vqa-thinking" }, "\u89C6\u89C9\u6A21\u578B\u6B63\u5728\u770B\u56FE\u601D\u8003\u2026") : answer || ""
          )
        ),
        error ? import_react.default.createElement("div", { className: "vqa-error" }, "\u9519\u8BEF: " + error) : null
      )
    );
  }
  function ItemBlock(props) {
    const item = props.item;
    const model = props.model;
    return import_react.default.createElement(
      "div",
      { className: "vqa-ex" },
      import_react.default.createElement(
        "div",
        { className: "vqa-row" },
        import_react.default.createElement("span", { className: "vqa-role vqa-role-main" }, "\u4E3B\u6A21\u578B"),
        import_react.default.createElement("div", { className: "vqa-bubble vqa-bubble-q" }, item.question)
      ),
      import_react.default.createElement(
        "div",
        { className: "vqa-row" },
        import_react.default.createElement("span", { className: "vqa-role vqa-role-vision" }, model),
        import_react.default.createElement(
          "div",
          { className: "vqa-bubble vqa-bubble-a" },
          item.status === "asking" ? import_react.default.createElement("span", { className: "vqa-thinking" }, "\u89C6\u89C9\u6A21\u578B\u6B63\u5728\u770B\u56FE\u601D\u8003\u2026") : item.answer || ""
        )
      ),
      item.status === "error" && item.error ? import_react.default.createElement("div", { className: "vqa-error" }, "\u9519\u8BEF: " + item.error) : null
    );
  }
  function ConvBlock(props) {
    const conv = props.conv;
    const img = useImage(conv.convKey);
    return import_react.default.createElement(
      "div",
      { className: "vqa-conv" },
      import_react.default.createElement(
        "div",
        { className: "vqa-conv-head" },
        img ? import_react.default.createElement("img", { src: img, className: "vqa-thumb", alt: "image" }) : null,
        import_react.default.createElement("span", { className: "vqa-conv-path", title: conv.imagePath }, conv.imagePath),
        import_react.default.createElement("span", { className: "vqa-conv-model" }, conv.model)
      ),
      conv.items.map((item) => import_react.default.createElement(ItemBlock, { key: item.itemId, item, model: conv.model }))
    );
  }
  function CordisPanel(props) {
    const [data, setData] = import_react.default.useState(null);
    import_react.default.useEffect(() => {
      let cancelled = false;
      const tick = () => {
        postJSON("/transcript", {}).then((res) => {
          if (!cancelled && res) setData(res);
        });
      };
      tick();
      const timer = setInterval(tick, 700);
      return () => {
        cancelled = true;
        clearInterval(timer);
      };
    }, []);
    const convs = data || [];
    return import_react.default.createElement(
      "div",
      { className: "vqa-panel" },
      import_react.default.createElement(
        "div",
        { className: "vqa-panel-head" },
        import_react.default.createElement("span", { className: "vqa-panel-title" }, "\u53CC\u6A21\u578B QA \u8FC7\u7A0B"),
        import_react.default.createElement("span", { className: "vqa-panel-sub" }, "\u4E3B\u6A21\u578B \u2194 \u89C6\u89C9\u6A21\u578B \xB7 " + convs.length + " \u7EC4\u4F1A\u8BDD")
      ),
      convs.length === 0 ? import_react.default.createElement(
        "div",
        { className: "vqa-empty" },
        "\u8FD8\u6CA1\u6709\u95EE\u7B54\u3002\u8BA9\u4E3B\u6A21\u578B\u8C03\u7528 vqa_ask \u5DE5\u5177,\u8FD9\u91CC\u4F1A\u5B9E\u65F6\u5C55\u793A\u4E24\u4E2A\u6A21\u578B\u7684\u95EE\u7B54\u8FC7\u7A0B\u3002"
      ) : convs.map((conv) => import_react.default.createElement(ConvBlock, { key: conv.convKey, conv }))
    );
  }
  function VisionSettingsPage(props) {
    const [state, setState] = import_react.default.useState(null);
    const [busy, setBusy] = import_react.default.useState(false);
    const [msg, setMsg] = import_react.default.useState({ ok: true, text: "" });
    import_react.default.useEffect(() => {
      let cancelled = false;
      postJSON("/settings", {}).then((res) => {
        if (!cancelled && res) setState(res);
      });
      return () => {
        cancelled = true;
      };
    }, []);
    if (!state) {
      return import_react.default.createElement(
        "div",
        { className: "vqa-settings" },
        import_react.default.createElement("p", null, "\u6B63\u5728\u52A0\u8F7D\u591A\u6A21\u6001\u6A21\u578B\u5217\u8868\u2026")
      );
    }
    const groups = {};
    for (const m of state.multimodal || []) {
      ;
      (groups[m.provider] = groups[m.provider] || []).push(m);
    }
    const current = state.provider + "\0" + state.model;
    let inList = false;
    for (const m of state.multimodal || []) {
      if (m.provider === state.provider && m.model === state.model) inList = true;
    }
    const onChange = (e) => {
      const v = e.target.value;
      if (!v) return;
      const sep = v.indexOf("\0");
      const provider = v.slice(0, sep);
      const model = v.slice(sep + 1);
      setBusy(true);
      setMsg({ ok: true, text: "" });
      postJSON("/set-model", { provider, model }).then((res) => {
        setBusy(false);
        if (res && res.ok) {
          setMsg({ ok: true, text: (res.persisted ? "\u5DF2\u5E94\u7528\u5E76\u4FDD\u5B58: " : "\u5DF2\u5E94\u7528(\u4EC5\u672C\u6B21\u8FD0\u884C): ") + provider + " / " + model });
          setState((prev) => prev ? { ...prev, provider, model } : prev);
        } else {
          setMsg({ ok: false, text: res && res.error || "\u8BBE\u7F6E\u5931\u8D25" });
        }
      });
    };
    const total = (state.multimodal || []).length;
    return import_react.default.createElement(
      "div",
      { className: "vqa-settings" },
      import_react.default.createElement("h3", null, "\u89C6\u89C9\u95EE\u7B54 \xB7 \u89C6\u89C9\u6A21\u578B"),
      import_react.default.createElement(
        "p",
        null,
        'vqa_ask \u5DE5\u5177\u628A\u4E3B\u6A21\u578B\u7684\u95EE\u9898\u4EA4\u7ED9\u54EA\u4E2A\u591A\u6A21\u6001\u6A21\u578B\u6765"\u770B\u56FE\u56DE\u7B54"\u3002\u6B64\u5904\u5217\u51FA\u5F53\u524D\u6240\u6709\u63D0\u4F9B\u65B9\u4E2D\u652F\u6301\u56FE\u7247\u8F93\u5165\u7684\u591A\u6A21\u6001\u6A21\u578B,\u9009\u62E9\u540E\u7ACB\u5373\u751F\u6548\u3002'
      ),
      import_react.default.createElement(
        "div",
        { className: "vqa-settings-row" },
        import_react.default.createElement("label", null, "\u89C6\u89C9\u6A21\u578B(\u591A\u6A21\u6001)"),
        import_react.default.createElement(
          "select",
          { value: current, onChange, disabled: busy },
          !inList ? import_react.default.createElement("option", { value: current }, state.provider + " / " + state.model) : null,
          Object.keys(groups).map((provider) => import_react.default.createElement(
            "optgroup",
            { key: provider, label: provider },
            groups[provider].map((m) => import_react.default.createElement(
              "option",
              { key: m.provider + "/" + m.model, value: m.provider + "\0" + m.model },
              m.model + (m.name && m.name !== m.model ? " (" + m.name + ")" : "")
            ))
          ))
        )
      ),
      msg.text ? import_react.default.createElement("div", { className: "vqa-settings-msg " + (msg.ok ? "vqa-settings-ok" : "vqa-settings-err") }, msg.text) : null,
      import_react.default.createElement(
        "div",
        { className: "vqa-settings-list" },
        "\u5F53\u524D\u53EF\u7528\u591A\u6A21\u6001\u6A21\u578B: " + total + " \u4E2A;\u9009\u62E9\u4F1A\u5199\u5165 settings.yaml \u7684 vqa \u914D\u7F6E,\u91CD\u542F\u540E\u4ECD\u7136\u8BB0\u4F4F\u3002"
      )
    );
  }
  const slots = ctx.get("slots");
  const disposers = [];
  if (slots !== void 0) {
    disposers.push(slots.inject("tool.call.toolview", () => slots.register(
      { name: "tool.call.toolview", key: "vqa_ask" },
      (props) => import_react.default.createElement(VqaCallCard, props)
    )));
    disposers.push(slots.inject("tool.view.cordis", () => slots.register(
      { name: "tool.view.cordis", key: "self" },
      (props) => import_react.default.createElement(CordisPanel, props)
    )));
    disposers.push(slots.inject("settings.section", () => slots.register(
      { name: "settings.section", id: "vqa-vision", order: 12, label: "\u89C6\u89C9\u95EE\u7B54" },
      (props) => import_react.default.createElement(VisionSettingsPage, props)
    )));
  }
  return () => {
    for (const d of disposers) d();
    styleEl.remove();
  };
}
		return module.exports;
	}
});
