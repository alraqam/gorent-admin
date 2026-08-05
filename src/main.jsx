// main.jsx — Gorent Admin entry.
//
// This is a faithful port of the Claude Design prototype. The original was a set
// of <script type="text/babel"> files that all shared ONE global scope (React +
// ReactDOM came from UMD globals). To preserve that exact behavior — bare
// cross-file references AND `window.*` lookups — every prototype file is
// concatenated below, in the original load order, inside this single module.
//
// React / ReactDOM are imported here so the prototype's `React.*` / `ReactDOM.*`
// references resolve, and mirrored onto window for any global consumers.
import React from 'react';
import ReactDOM from 'react-dom/client';
import { api } from './api.js';
import { eimzo } from './eimzo.js';

window.React = React;
window.ReactDOM = ReactDOM;
window.gorentApi = api;
window.__gorentLogout = () => api.logout();


// ============================================================
// tweaks-panel.jsx
// ============================================================


// tweaks-panel.jsx
// Reusable Tweaks shell + form-control helpers.
//
// Owns the host protocol (listens for __activate_edit_mode / __deactivate_edit_mode,
// posts __edit_mode_available / __edit_mode_set_keys / __edit_mode_dismissed) so
// individual prototypes don't re-roll it. Ships a consistent set of controls so you
// don't hand-draw <input type="range">, segmented radios, steppers, etc.
//
// Usage (in an HTML file that loads React + Babel):
//
//   const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
//     "primaryColor": "#D97757",
//     "palette": ["#D97757", "#29261b", "#f6f4ef"],
//     "fontSize": 16,
//     "density": "regular",
//     "dark": false
//   }/*EDITMODE-END*/;
//
//   function App() {
//     const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
//     return (
//       <div style={{ fontSize: t.fontSize, color: t.primaryColor }}>
//         Hello
//         <TweaksPanel>
//           <TweakSection label="Typography" />
//           <TweakSlider label="Font size" value={t.fontSize} min={10} max={32} unit="px"
//                        onChange={(v) => setTweak('fontSize', v)} />
//           <TweakRadio  label="Density" value={t.density}
//                        options={['compact', 'regular', 'comfy']}
//                        onChange={(v) => setTweak('density', v)} />
//           <TweakSection label="Theme" />
//           <TweakColor  label="Primary" value={t.primaryColor}
//                        options={['#D97757', '#2A6FDB', '#1F8A5B', '#7A5AE0']}
//                        onChange={(v) => setTweak('primaryColor', v)} />
//           <TweakColor  label="Palette" value={t.palette}
//                        options={[['#D97757', '#29261b', '#f6f4ef'],
//                                  ['#475569', '#0f172a', '#f1f5f9']]}
//                        onChange={(v) => setTweak('palette', v)} />
//           <TweakToggle label="Dark mode" value={t.dark}
//                        onChange={(v) => setTweak('dark', v)} />
//         </TweaksPanel>
//       </div>
//     );
//   }
//
// ─────────────────────────────────────────────────────────────────────────────

const __TWEAKS_STYLE = `
  .twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;
    max-height:calc(100vh - 32px);display:flex;flex-direction:column;
    transform:scale(var(--dc-inv-zoom,1));transform-origin:bottom right;
    background:rgba(250,249,247,.78);color:#29261b;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid rgba(255,255,255,.6);border-radius:14px;
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;cursor:move;user-select:none}
  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
  .twk-x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);
    width:22px;height:22px;border-radius:6px;cursor:default;font-size:13px;line-height:1}
  .twk-x:hover{background:rgba(0,0,0,.06);color:#29261b}
  .twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;overflow-x:hidden;min-height:0;
    scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.15) transparent}
  .twk-body::-webkit-scrollbar{width:8px}
  .twk-body::-webkit-scrollbar-track{background:transparent;margin:2px}
  .twk-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:4px;
    border:2px solid transparent;background-clip:content-box}
  .twk-body::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.25);
    border:2px solid transparent;background-clip:content-box}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;
    color:rgba(41,38,27,.72)}
  .twk-lbl>span:first-child{font-weight:500}
  .twk-val{color:rgba(41,38,27,.5);font-variant-numeric:tabular-nums}

  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:rgba(41,38,27,.45);padding:10px 0 0}
  .twk-sect:first-child{padding-top:0}

  .twk-field{appearance:none;box-sizing:border-box;width:100%;min-width:0;height:26px;padding:0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;
    background:rgba(255,255,255,.6);color:inherit;font:inherit;outline:none}
  .twk-field:focus{border-color:rgba(0,0,0,.25);background:rgba(255,255,255,.85)}
  select.twk-field{padding-right:22px;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='rgba(0,0,0,.5)' d='M0 0h10L5 6z'/></svg>");
    background-repeat:no-repeat;background-position:right 8px center}

  .twk-slider{appearance:none;-webkit-appearance:none;width:100%;height:4px;margin:6px 0;
    border-radius:999px;background:rgba(0,0,0,.12);outline:none}
  .twk-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
    width:14px;height:14px;border-radius:50%;background:#fff;
    border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}
  .twk-slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;
    background:#fff;border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}

  .twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;
    background:rgba(0,0,0,.06);user-select:none}
  .twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;
    background:rgba(255,255,255,.9);box-shadow:0 1px 2px rgba(0,0,0,.12);
    transition:left .15s cubic-bezier(.3,.7,.4,1),width .15s}
  .twk-seg.dragging .twk-seg-thumb{transition:none}
  .twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;
    background:transparent;color:inherit;font:inherit;font-weight:500;min-height:22px;
    border-radius:6px;cursor:default;padding:4px 6px;line-height:1.2;
    overflow-wrap:anywhere}

  .twk-toggle{position:relative;width:32px;height:18px;border:0;border-radius:999px;
    background:rgba(0,0,0,.15);transition:background .15s;cursor:default;padding:0}
  .twk-toggle[data-on="1"]{background:#34c759}
  .twk-toggle i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;
    background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
  .twk-toggle[data-on="1"] i{transform:translateX(14px)}

  .twk-num{display:flex;align-items:center;box-sizing:border-box;min-width:0;height:26px;padding:0 0 0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;background:rgba(255,255,255,.6)}
  .twk-num-lbl{font-weight:500;color:rgba(41,38,27,.6);cursor:ew-resize;
    user-select:none;padding-right:8px}
  .twk-num input{flex:1;min-width:0;height:100%;border:0;background:transparent;
    font:inherit;font-variant-numeric:tabular-nums;text-align:right;padding:0 8px 0 0;
    outline:none;color:inherit;-moz-appearance:textfield}
  .twk-num input::-webkit-inner-spin-button,.twk-num input::-webkit-outer-spin-button{
    -webkit-appearance:none;margin:0}
  .twk-num-unit{padding-right:8px;color:rgba(41,38,27,.45)}

  .twk-btn{appearance:none;height:26px;padding:0 12px;border:0;border-radius:7px;
    background:rgba(0,0,0,.78);color:#fff;font:inherit;font-weight:500;cursor:default}
  .twk-btn:hover{background:rgba(0,0,0,.88)}
  .twk-btn.secondary{background:rgba(0,0,0,.06);color:inherit}
  .twk-btn.secondary:hover{background:rgba(0,0,0,.1)}

  .twk-swatch{appearance:none;-webkit-appearance:none;width:56px;height:22px;
    border:.5px solid rgba(0,0,0,.1);border-radius:6px;padding:0;cursor:default;
    background:transparent;flex-shrink:0}
  .twk-swatch::-webkit-color-swatch-wrapper{padding:0}
  .twk-swatch::-webkit-color-swatch{border:0;border-radius:5.5px}
  .twk-swatch::-moz-color-swatch{border:0;border-radius:5.5px}

  .twk-chips{display:flex;gap:6px}
  .twk-chip{position:relative;appearance:none;flex:1;min-width:0;height:46px;
    padding:0;border:0;border-radius:6px;overflow:hidden;cursor:default;
    box-shadow:0 0 0 .5px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.06);
    transition:transform .12s cubic-bezier(.3,.7,.4,1),box-shadow .12s}
  .twk-chip:hover{transform:translateY(-1px);
    box-shadow:0 0 0 .5px rgba(0,0,0,.18),0 4px 10px rgba(0,0,0,.12)}
  .twk-chip[data-on="1"]{box-shadow:0 0 0 1.5px rgba(0,0,0,.85),
    0 2px 6px rgba(0,0,0,.15)}
  .twk-chip>span{position:absolute;top:0;bottom:0;right:0;width:34%;
    display:flex;flex-direction:column;box-shadow:-1px 0 0 rgba(0,0,0,.1)}
  .twk-chip>span>i{flex:1;box-shadow:0 -1px 0 rgba(0,0,0,.1)}
  .twk-chip>span>i:first-child{box-shadow:none}
  .twk-chip svg{position:absolute;top:6px;left:6px;width:13px;height:13px;
    filter:drop-shadow(0 1px 1px rgba(0,0,0,.3))}
`;

// ── useTweaks ───────────────────────────────────────────────────────────────
// Single source of truth for tweak values. setTweak persists via the host
// (__edit_mode_set_keys → host rewrites the EDITMODE block on disk).
function useTweaks(defaults) {
  const [values, setValues] = React.useState(defaults);
  // Accepts either setTweak('key', value) or setTweak({ key: value, ... }) so a
  // useState-style call doesn't write a "[object Object]" key into the persisted
  // JSON block.
  const setTweak = React.useCallback((keyOrEdits, val) => {
    const edits = typeof keyOrEdits === 'object' && keyOrEdits !== null
      ? keyOrEdits : { [keyOrEdits]: val };
    setValues((prev) => ({ ...prev, ...edits }));
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits }, '*');
    // Same-window signal so in-page listeners (deck-stage rail thumbnails)
    // can react — the parent message only reaches the host, not peers.
    window.dispatchEvent(new CustomEvent('tweakchange', { detail: edits }));
  }, []);
  return [values, setTweak];
}

// ── TweaksPanel ─────────────────────────────────────────────────────────────
// Floating shell. Registers the protocol listener BEFORE announcing
// availability — if the announce ran first, the host's activate could land
// before our handler exists and the toolbar toggle would silently no-op.
// The close button posts __edit_mode_dismissed so the host's toolbar toggle
// flips off in lockstep; the host echoes __deactivate_edit_mode back which
// is what actually hides the panel.
function TweaksPanel({ title = 'Tweaks', noDeckControls = false, children }) {
  const [open, setOpen] = React.useState(false);
  const dragRef = React.useRef(null);
  // Auto-inject a rail toggle when a <deck-stage> is on the page. The
  // toggle drives the deck's per-viewer _railVisible via window message;
  // state is mirrored from the same localStorage key the deck reads so
  // the control reflects reality across reloads. The mechanism is the
  // message — authors who want custom placement can post it directly
  // and pass noDeckControls to suppress this one.
  const hasDeckStage = React.useMemo(
    () => typeof document !== 'undefined' && !!document.querySelector('deck-stage'),
    [],
  );
  // deck-stage enables its rail in connectedCallback, but this panel can
  // mount before that element has upgraded. The initial read catches the
  // common case; the listener covers mounting first. (Older deck-stage.js
  // copies still wait for the host's __omelette_rail_enabled postMessage —
  // same listener handles those.)
  const [railEnabled, setRailEnabled] = React.useState(
    () => hasDeckStage && !!document.querySelector('deck-stage')?._railEnabled,
  );
  React.useEffect(() => {
    if (!hasDeckStage || railEnabled) return undefined;
    const onMsg = (e) => {
      if (e.data && e.data.type === '__omelette_rail_enabled') setRailEnabled(true);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [hasDeckStage, railEnabled]);
  const [railVisible, setRailVisible] = React.useState(() => {
    try { return localStorage.getItem('deck-stage.railVisible') !== '0'; } catch (e) { return true; }
  });
  const toggleRail = (on) => {
    setRailVisible(on);
    window.postMessage({ type: '__deck_rail_visible', on }, '*');
  };
  const offsetRef = React.useRef({ x: 16, y: 16 });
  const PAD = 16;

  const clampToViewport = React.useCallback(() => {
    const panel = dragRef.current;
    if (!panel) return;
    const w = panel.offsetWidth, h = panel.offsetHeight;
    const maxRight = Math.max(PAD, window.innerWidth - w - PAD);
    const maxBottom = Math.max(PAD, window.innerHeight - h - PAD);
    offsetRef.current = {
      x: Math.min(maxRight, Math.max(PAD, offsetRef.current.x)),
      y: Math.min(maxBottom, Math.max(PAD, offsetRef.current.y)),
    };
    panel.style.right = offsetRef.current.x + 'px';
    panel.style.bottom = offsetRef.current.y + 'px';
  }, []);

  React.useEffect(() => {
    if (!open) return;
    clampToViewport();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', clampToViewport);
      return () => window.removeEventListener('resize', clampToViewport);
    }
    const ro = new ResizeObserver(clampToViewport);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, [open, clampToViewport]);

  React.useEffect(() => {
    const onMsg = (e) => {
      const t = e?.data?.type;
      if (t === '__activate_edit_mode') setOpen(true);
      else if (t === '__deactivate_edit_mode') setOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const dismiss = () => {
    setOpen(false);
    window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*');
  };

  const onDragStart = (e) => {
    const panel = dragRef.current;
    if (!panel) return;
    const r = panel.getBoundingClientRect();
    const sx = e.clientX, sy = e.clientY;
    const startRight = window.innerWidth - r.right;
    const startBottom = window.innerHeight - r.bottom;
    const move = (ev) => {
      offsetRef.current = {
        x: startRight - (ev.clientX - sx),
        y: startBottom - (ev.clientY - sy),
      };
      clampToViewport();
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  if (!open) return null;
  return (
    <>
      <style>{__TWEAKS_STYLE}</style>
      <div ref={dragRef} className="twk-panel" data-noncommentable=""
           style={{ right: offsetRef.current.x, bottom: offsetRef.current.y }}>
        <div className="twk-hd" onMouseDown={onDragStart}>
          <b>{title}</b>
          <button className="twk-x" aria-label="Close tweaks"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={dismiss}>✕</button>
        </div>
        <div className="twk-body">
          {children}
          {hasDeckStage && railEnabled && !noDeckControls && (
            <TweakSection label="Deck">
              <TweakToggle label="Thumbnail rail" value={railVisible} onChange={toggleRail} />
            </TweakSection>
          )}
        </div>
      </div>
    </>
  );
}

// ── Layout helpers ──────────────────────────────────────────────────────────

function TweakSection({ label, children }) {
  return (
    <>
      <div className="twk-sect">{label}</div>
      {children}
    </>
  );
}

function TweakRow({ label, value, children, inline = false }) {
  return (
    <div className={inline ? 'twk-row twk-row-h' : 'twk-row'}>
      <div className="twk-lbl">
        <span>{label}</span>
        {value != null && <span className="twk-val">{value}</span>}
      </div>
      {children}
    </div>
  );
}

// ── Controls ────────────────────────────────────────────────────────────────

function TweakSlider({ label, value, min = 0, max = 100, step = 1, unit = '', onChange }) {
  return (
    <TweakRow label={label} value={`${value}${unit}`}>
      <input type="range" className="twk-slider" min={min} max={max} step={step}
             value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </TweakRow>
  );
}

function TweakToggle({ label, value, onChange }) {
  return (
    <div className="twk-row twk-row-h">
      <div className="twk-lbl"><span>{label}</span></div>
      <button type="button" className="twk-toggle" data-on={value ? '1' : '0'}
              role="switch" aria-checked={!!value}
              onClick={() => onChange(!value)}><i /></button>
    </div>
  );
}

function TweakRadio({ label, value, options, onChange }) {
  const trackRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);
  // The active value is read by pointer-move handlers attached for the lifetime
  // of a drag — ref it so a stale closure doesn't fire onChange for every move.
  const valueRef = React.useRef(value);
  valueRef.current = value;

  // Segments wrap mid-word once per-segment width runs out. The track is
  // ~248px (280 panel − 28 body pad − 4 seg pad), each button loses 12px
  // to its own padding, and 11.5px system-ui averages ~6.3px/char — so 2
  // options fit ~16 chars each, 3 fit ~10. Past that (or >3 options), fall
  // back to a dropdown rather than wrap.
  const labelLen = (o) => String(typeof o === 'object' ? o.label : o).length;
  const maxLen = options.reduce((m, o) => Math.max(m, labelLen(o)), 0);
  const fitsAsSegments = maxLen <= ({ 2: 16, 3: 10 }[options.length] ?? 0);
  if (!fitsAsSegments) {
    // <select> emits strings — map back to the original option value so the
    // fallback stays type-preserving (numbers, booleans) like the segment path.
    const resolve = (s) => {
      const m = options.find((o) => String(typeof o === 'object' ? o.value : o) === s);
      return m === undefined ? s : typeof m === 'object' ? m.value : m;
    };
    return <TweakSelect label={label} value={value} options={options}
                        onChange={(s) => onChange(resolve(s))} />;
  }
  const opts = options.map((o) => (typeof o === 'object' ? o : { value: o, label: o }));
  const idx = Math.max(0, opts.findIndex((o) => o.value === value));
  const n = opts.length;

  const segAt = (clientX) => {
    const r = trackRef.current.getBoundingClientRect();
    const inner = r.width - 4;
    const i = Math.floor(((clientX - r.left - 2) / inner) * n);
    return opts[Math.max(0, Math.min(n - 1, i))].value;
  };

  const onPointerDown = (e) => {
    setDragging(true);
    const v0 = segAt(e.clientX);
    if (v0 !== valueRef.current) onChange(v0);
    const move = (ev) => {
      if (!trackRef.current) return;
      const v = segAt(ev.clientX);
      if (v !== valueRef.current) onChange(v);
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <TweakRow label={label}>
      <div ref={trackRef} role="radiogroup" onPointerDown={onPointerDown}
           className={dragging ? 'twk-seg dragging' : 'twk-seg'}>
        <div className="twk-seg-thumb"
             style={{ left: `calc(2px + ${idx} * (100% - 4px) / ${n})`,
                      width: `calc((100% - 4px) / ${n})` }} />
        {opts.map((o) => (
          <button key={o.value} type="button" role="radio" aria-checked={o.value === value}>
            {o.label}
          </button>
        ))}
      </div>
    </TweakRow>
  );
}

function TweakSelect({ label, value, options, onChange }) {
  return (
    <TweakRow label={label}>
      <select className="twk-field" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => {
          const v = typeof o === 'object' ? o.value : o;
          const l = typeof o === 'object' ? o.label : o;
          return <option key={v} value={v}>{l}</option>;
        })}
      </select>
    </TweakRow>
  );
}

function TweakText({ label, value, placeholder, onChange }) {
  return (
    <TweakRow label={label}>
      <input className="twk-field" type="text" value={value} placeholder={placeholder}
             onChange={(e) => onChange(e.target.value)} />
    </TweakRow>
  );
}

function TweakNumber({ label, value, min, max, step = 1, unit = '', onChange }) {
  const clamp = (n) => {
    if (min != null && n < min) return min;
    if (max != null && n > max) return max;
    return n;
  };
  const startRef = React.useRef({ x: 0, val: 0 });
  const onScrubStart = (e) => {
    e.preventDefault();
    startRef.current = { x: e.clientX, val: value };
    const decimals = (String(step).split('.')[1] || '').length;
    const move = (ev) => {
      const dx = ev.clientX - startRef.current.x;
      const raw = startRef.current.val + dx * step;
      const snapped = Math.round(raw / step) * step;
      onChange(clamp(Number(snapped.toFixed(decimals))));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return (
    <div className="twk-num">
      <span className="twk-num-lbl" onPointerDown={onScrubStart}>{label}</span>
      <input type="number" value={value} min={min} max={max} step={step}
             onChange={(e) => onChange(clamp(Number(e.target.value)))} />
      {unit && <span className="twk-num-unit">{unit}</span>}
    </div>
  );
}

// Relative-luminance contrast pick — checkmarks drawn over a swatch need to
// read on both #111 and #fafafa without per-option configuration. Hex input
// only (#rgb / #rrggbb); named or rgb()/hsl() colors fall through to "light".
function __twkIsLight(hex) {
  const h = String(hex).replace('#', '');
  const x = h.length === 3 ? h.replace(/./g, (c) => c + c) : h.padEnd(6, '0');
  const n = parseInt(x.slice(0, 6), 16);
  if (Number.isNaN(n)) return true;
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return r * 299 + g * 587 + b * 114 > 148000;
}

const __TwkCheck = ({ light }) => (
  <svg viewBox="0 0 14 14" aria-hidden="true">
    <path d="M3 7.2 5.8 10 11 4.2" fill="none" strokeWidth="2.2"
          strokeLinecap="round" strokeLinejoin="round"
          stroke={light ? 'rgba(0,0,0,.78)' : '#fff'} />
  </svg>
);

// TweakColor — curated color/palette picker. Each option is either a single
// hex string or an array of 1-5 hex strings; the card adapts — a lone color
// renders solid, a palette renders colors[0] as the hero (left ~2/3) with the
// rest stacked in a sharp column on the right. onChange emits the
// option in the shape it was passed (string stays string, array stays array).
// Without options it falls back to the native color input for back-compat.
function TweakColor({ label, value, options, onChange }) {
  if (!options || !options.length) {
    return (
      <div className="twk-row twk-row-h">
        <div className="twk-lbl"><span>{label}</span></div>
        <input type="color" className="twk-swatch" value={value}
               onChange={(e) => onChange(e.target.value)} />
      </div>
    );
  }
  // Native <input type=color> emits lowercase hex per the HTML spec, so
  // compare case-insensitively. String() guards JSON.stringify(undefined),
  // which returns the primitive undefined (no .toLowerCase).
  const key = (o) => String(JSON.stringify(o)).toLowerCase();
  const cur = key(value);
  return (
    <TweakRow label={label}>
      <div className="twk-chips" role="radiogroup">
        {options.map((o, i) => {
          const colors = Array.isArray(o) ? o : [o];
          const [hero, ...rest] = colors;
          const sup = rest.slice(0, 4);
          const on = key(o) === cur;
          return (
            <button key={i} type="button" className="twk-chip" role="radio"
                    aria-checked={on} data-on={on ? '1' : '0'}
                    aria-label={colors.join(', ')} title={colors.join(' · ')}
                    style={{ background: hero }}
                    onClick={() => onChange(o)}>
              {sup.length > 0 && (
                <span>
                  {sup.map((c, j) => <i key={j} style={{ background: c }} />)}
                </span>
              )}
              {on && <__TwkCheck light={__twkIsLight(hero)} />}
            </button>
          );
        })}
      </div>
    </TweakRow>
  );
}

function TweakButton({ label, onClick, secondary = false }) {
  return (
    <button type="button" className={secondary ? 'twk-btn secondary' : 'twk-btn'}
            onClick={onClick}>{label}</button>
  );
}

Object.assign(window, {
  useTweaks, TweaksPanel, TweakSection, TweakRow,
  TweakSlider, TweakToggle, TweakRadio, TweakSelect,
  TweakText, TweakNumber, TweakColor, TweakButton,
});

// ============================================================
// src/tokens.jsx
// ============================================================

// tokens.jsx — Gorent: tokens, data, copy (Uzbek Latin)
// Loaded into window so other Babel files can read it.

const GO = {
  // CSS vars are set by App from Tweaks; constants here are layout-only.
  rad: 14,
  radSm: 8,
  shadow: '0 1px 0 rgba(0,0,0,0.04), 0 12px 32px -12px rgba(0,0,0,0.12)',
  shadowLg: '0 24px 60px -20px rgba(0,0,0,0.22), 0 2px 0 rgba(0,0,0,0.04)',
  font: '"Geologica", system-ui, -apple-system, sans-serif',
};

// ─── Categories ─────────────────────────────────────────────
const CATEGORIES = [
  { id: 'private',   name: "Shaxsiy ofis",      short: "Shaxsiy",     sub: "Yopiq, jamoangiz uchun" },
  { id: 'shared',    name: "Birgalashgan ofis", short: "Birgalashgan", sub: "Boshqa kompaniyalar bilan" },
  { id: 'coworking', name: "Koworking joyi",    short: "Koworking",   sub: "Stol va kun bo'yicha" },
  { id: 'virtual',   name: "Virtual ofis",      short: "Virtual",     sub: "Yuridik manzil + xizmat" },
];

// ─── Cities & districts ─────────────────────────────────────
const CITIES = ["Toshkent", "Samarqand", "Buxoro", "Andijon", "Namangan", "Farg'ona", "Qarshi", "Nukus"];
const DISTRICTS_TASHKENT = [
  "Yunusobod", "Mirobod", "Yakkasaroy", "Mirzo Ulug'bek", "Chilonzor",
  "Shayxontoxur", "Yashnobod", "Olmazor", "Sergeli", "Uchtepa", "Bektemir",
];

// ─── Localized copy ─────────────────────────────────────────
const T = {
  brand: "gorent",
  tagline: "Ish uchun joy. Bir bosishda topiladi.",
  taglineLong: "Toshkent va butun O'zbekiston bo'ylab tasdiqlangan ofislar, koworkinglar va virtual manzillar.",
  search: "Qidirish",
  searchPh: "Shahar yoki tuman",
  date: "Sana",
  dateFromTo: "Sanalar",
  guests: "Sig'imi",
  people: "odam",
  category: "Toifa",
  filters: "Filtrlar",
  filtersCount: (n) => `Filtrlar (${n})`,
  sort: "Saralash",
  map: "Xarita",
  showMap: "Xaritani ko'rsatish",
  hideMap: "Xaritani yashirish",
  verified: "Tasdiqlangan",
  superhost: "Yulduz mezbon",
  reviews: "sharh",
  rating: "Baho",
  host: "Mezbon",
  hostedBy: "Mezbon",
  bookNow: "Hozir band qilish",
  reserve: "Band qilish",
  instantBook: "Tezkor band",
  freeCancel: "Bepul bekor qilish",
  perDay: "kuniga",
  perMonth: "oyiga",
  perHour: "soatiga",
  perDesk: "stol uchun",
  som: "so'm",
  total: "Jami",
  serviceFee: "Xizmat haqi",
  deposit: "Garov",
  login: "Kirish",
  signup: "Ro'yxatdan o'tish",
  addListing: "Joy qo'shish",
  becomeHost: "Mezbon bo'ling",
  favorites: "Saqlanganlar",
  messages: "Xabarlar",
  help: "Yordam",
  language: "Til",
  currency: "Valyuta",
  size: "Maydoni",
  capacity: "Sig'imi",
  floor: "Qavat",
  available: "Bo'sh",
  unavailable: "Band",
  amenities: "Imkoniyatlar",
  description: "Tavsif",
  location: "Joylashuvi",
  reviewsTitle: "Sharhlar",
  similar: "Shunga o'xshash",
  results: (n) => `${n} ta natija`,
  near: "Yaqin atrofda",
  popularInCity: (c) => `${c}da mashhur`,
  exploreCategories: "Toifalar bo'ylab",
  newOnGorent: "Gorent'da yangi",
  featured: "Tanlangan",
  topRated: "Yuqori baholi",
  whyGorent: "Nima uchun Gorent?",
  forBusiness: "Biznes uchun",
  startsFrom: "boshlanadi",
};

// ─── Currency formatting ────────────────────────────────────
function fmtSom(n) {
  // 8500000 -> "8 500 000"
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
function fmtPrice(n, period, currency = 'UZS', lang = 'uz') {
  const periodMap = {
    month: { uz: "oyiga", ru: "в месяц", en: "/mo" },
    day:   { uz: "kuniga", ru: "в день",  en: "/day" },
    hour:  { uz: "soatiga", ru: "в час",  en: "/hr" },
    desk:  { uz: "stol/oy", ru: "стол/мес", en: "desk/mo" },
  };
  let val, unit;
  if (currency === 'USD') {
    val = "$" + Math.round(n / 12300).toLocaleString('en-US');
    unit = periodMap[period]?.en || '';
  } else {
    val = fmtSom(n) + " so'm";
    unit = periodMap[period]?.[lang] || '';
  }
  return { val, unit };
}

// ─── Sample listings ────────────────────────────────────────
// Locations laid out in [x%, y%] for the schematic Tashkent map.
const LISTINGS = [
  { id: 'L01', cat: 'private',   title: "Yunusobod biznes minorasi, 7-qavat", district: "Yunusobod",     city: "Toshkent",  m2: 64,  cap: 8,   price: 12500000, period: 'month', rating: 4.92, reviews: 184, hue: 38,  verified: true,  instant: true,  super: true,  host: "Aziza R.",  hostYr: 4 },
  { id: 'L02', cat: 'coworking', title: "Stol · Sun Tower koworking",         district: "Mirobod",        city: "Toshkent",  m2: 4,   cap: 1,   price: 1850000,  period: 'month', rating: 4.88, reviews: 412, hue: 165, verified: true,  instant: true,  super: false, host: "Sanjar M.", hostYr: 2 },
  { id: 'L03', cat: 'shared',    title: "Olmazor open-space, 18 stol",        district: "Olmazor",        city: "Toshkent",  m2: 120, cap: 18,  price: 7200000,  period: 'month', rating: 4.76, reviews: 64,  hue: 220, verified: true,  instant: false, super: false, host: "Diyora T.", hostYr: 3 },
  { id: 'L04', cat: 'virtual',   title: "Virtual ofis · Toshkent City",       district: "Yakkasaroy",     city: "Toshkent",  m2: 0,   cap: 1,   price: 850000,   period: 'month', rating: 4.95, reviews: 902, hue: 280, verified: true,  instant: true,  super: true,  host: "Asaxiy B.", hostYr: 5 },
  { id: 'L05', cat: 'private',   title: "Loft ofis · Chilonzor",              district: "Chilonzor",      city: "Toshkent",  m2: 48,  cap: 6,   price: 9400000,  period: 'month', rating: 4.81, reviews: 121, hue: 12,  verified: true,  instant: false, super: false, host: "Otabek S.", hostYr: 2 },
  { id: 'L06', cat: 'coworking', title: "Hot-desk · Workspace Plaza",         district: "Shayxontoxur",   city: "Toshkent",  m2: 3,   cap: 1,   price: 1450000,  period: 'month', rating: 4.66, reviews: 248, hue: 195, verified: true,  instant: true,  super: false, host: "Karina O.", hostYr: 1 },
  { id: 'L07', cat: 'private',   title: "Studio ofis · Mirzo Ulug'bek",       district: "Mirzo Ulug'bek", city: "Toshkent",  m2: 36,  cap: 4,   price: 6500000,  period: 'month', rating: 4.89, reviews: 73,  hue: 55,  verified: true,  instant: true,  super: true,  host: "Komron J.", hostYr: 3 },
  { id: 'L08', cat: 'shared',    title: "Birgalashgan ofis · IT Park",        district: "Yashnobod",      city: "Toshkent",  m2: 86,  cap: 12,  price: 5100000,  period: 'month', rating: 4.93, reviews: 311, hue: 158, verified: true,  instant: false, super: true,  host: "Rustam A.", hostYr: 6 },
  { id: 'L09', cat: 'virtual',   title: "Premium virtual · biznes manzil",    district: "Mirobod",        city: "Toshkent",  m2: 0,   cap: 1,   price: 1450000,  period: 'month', rating: 4.97, reviews: 1244, hue: 295, verified: true, instant: true,  super: true,  host: "Plaza G.",  hostYr: 7 },
  { id: 'L10', cat: 'private',   title: "Penthouse ofis · Tashkent City",     district: "Yakkasaroy",     city: "Toshkent",  m2: 140, cap: 16,  price: 28500000, period: 'month', rating: 4.99, reviews: 42,  hue: 24,  verified: true,  instant: false, super: true,  host: "Nodir P.",  hostYr: 5 },
  { id: 'L11', cat: 'coworking', title: "Stol · Spaces Sergeli",              district: "Sergeli",        city: "Toshkent",  m2: 4,   cap: 1,   price: 1250000,  period: 'month', rating: 4.71, reviews: 167, hue: 175, verified: true,  instant: true,  super: false, host: "Madina U.", hostYr: 1 },
  { id: 'L12', cat: 'shared',    title: "Open-space · Buxoro markaz",         district: "Markaz",         city: "Buxoro",    m2: 95,  cap: 14,  price: 4200000,  period: 'month', rating: 4.84, reviews: 38,  hue: 35,  verified: true,  instant: false, super: false, host: "Shahriyor", hostYr: 2 },
];

// Map pin positions in 0..100 for a schematic city map
const MAP_POSITIONS = {
  L01: [62, 22], L02: [48, 46], L03: [22, 28], L04: [44, 52],
  L05: [28, 70], L06: [38, 36], L07: [70, 42], L08: [78, 30],
  L09: [50, 44], L10: [55, 50], L11: [32, 84], L12: [12, 60],
};

const AMENITIES = [
  { id: 'wifi', name: "Tezkor Wi-Fi" },
  { id: 'ac', name: "Konditsioner" },
  { id: 'lift', name: "Lift" },
  { id: 'meeting', name: "Yig'ilish xonasi" },
  { id: 'kitchen', name: "Oshxona" },
  { id: 'parking', name: "Avtoturargoh" },
  { id: 'printer', name: "Printer / skaner" },
  { id: 'coffee', name: "Qahva mashinasi" },
  { id: 'reception', name: "Reseption" },
  { id: 'security', name: "24/7 xavfsizlik" },
  { id: 'phone', name: "Telefon kabinasi" },
];

// ─── Helpers ────────────────────────────────────────────────
function listingsByCat(cat) { return LISTINGS.filter((l) => !cat || l.cat === cat); }

Object.assign(window, {
  GO, CATEGORIES, CITIES, DISTRICTS_TASHKENT, T,
  LISTINGS, MAP_POSITIONS, AMENITIES,
  fmtSom, fmtPrice, listingsByCat,
});

// ============================================================
// src/icons.jsx
// ============================================================

// icons.jsx — minimal stroke-based icons for Gorent UI
const Ico = ({ d, size = 18, sw = 1.6, fill = "none", style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...style }}>
    {typeof d === 'string' ? <path d={d} /> : d}
  </svg>
);

const IconSearch     = (p) => <Ico {...p} d="M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zm5 5l4 4" />;
const IconChev       = (p) => <Ico {...p} d="M6 9l6 6 6-6" />;
const IconChevR      = (p) => <Ico {...p} d="M9 6l6 6-6 6" />;
const IconChevL      = (p) => <Ico {...p} d="M15 6l-6 6 6 6" />;
const IconChevUp     = (p) => <Ico {...p} d="M6 15l6-6 6 6" />;
const IconClose      = (p) => <Ico {...p} d="M6 6l12 12M18 6L6 18" />;
const IconCalendar   = (p) => <Ico {...p} d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z M8 3v4 M16 3v4 M4 10h16" />;
const IconHeart      = (p) => <Ico {...p} d="M12 20s-7-4.35-9.5-9C.5 6.5 4 3 7.5 4.5 9.4 5.3 12 8 12 8s2.6-2.7 4.5-3.5C20 3 23.5 6.5 21.5 11 19 15.65 12 20 12 20z" />;
const IconStar       = (p) => <Ico {...p} fill="currentColor" sw={0} d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5 7.3 14 2.5 9.4l6.6-.9L12 2.5z" />;
const IconStarO      = (p) => <Ico {...p} d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5 7.3 14 2.5 9.4l6.6-.9L12 2.5z" />;
const IconCheck      = (p) => <Ico {...p} d="M5 12l5 5L20 7" />;
const IconShield     = (p) => <Ico {...p} d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z M9 12l2 2 4-4" />;
const IconMap        = (p) => <Ico {...p} d="M9 5l-6 2v12l6-2 6 2 6-2V5l-6 2-6-2zM9 5v12M15 7v12" />;
const IconGrid       = (p) => <Ico {...p} d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />;
const IconList       = (p) => <Ico {...p} d="M4 6h16M4 12h16M4 18h16" />;
const IconFeed       = (p) => <Ico {...p} d="M4 5h16v4H4zM4 13h16v6H4z" />;
const IconFilter     = (p) => <Ico {...p} d="M4 6h16M7 12h10M10 18h4" />;
const IconCal        = (p) => <Ico {...p} d="M5 6h14v14H5zM5 10h14M9 4v4M15 4v4" />;
const IconUser       = (p) => <Ico {...p} d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c1-4 4.5-6 8-6s7 2 8 6" />;
const IconMenu       = (p) => <Ico {...p} d="M4 7h16M4 12h16M4 17h16" />;
const IconWifi       = (p) => <Ico {...p} d="M5 10c4-3 10-3 14 0M8 13c2.5-2 5.5-2 8 0M12 17h.01" />;
const IconPark       = (p) => <Ico {...p} d="M5 5h11a4 4 0 0 1 0 8h-6v6H5z M10 8h5a1.5 1.5 0 0 1 0 3h-5" />;
const IconCoffee     = (p) => <Ico {...p} d="M4 9h12v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V9z M16 11h2a2 2 0 0 1 0 4h-2 M7 4v2M11 4v2" />;
const IconPrinter    = (p) => <Ico {...p} d="M7 9V4h10v5 M5 9h14a2 2 0 0 1 2 2v5h-4 M3 16v-5a2 2 0 0 1 2-2 M7 14h10v6H7z" />;
const IconAC         = (p) => <Ico {...p} d="M3 8h18M3 14h18 M8 8v-2M8 16v2M16 8v-2M16 16v2" />;
const IconLock       = (p) => <Ico {...p} d="M6 11h12v9H6zM9 11V7a3 3 0 0 1 6 0v4" />;
const IconBolt       = (p) => <Ico {...p} fill="currentColor" sw={0} d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />;
const IconPin        = (p) => <Ico {...p} d="M12 21s7-6 7-12a7 7 0 0 0-14 0c0 6 7 12 7 12z M12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />;
const IconGlobe      = (p) => <Ico {...p} d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M3 12h18 M12 3c2.5 3 4 6 4 9s-1.5 6-4 9c-2.5-3-4-6-4-9s1.5-6 4-9z" />;
const IconPlus       = (p) => <Ico {...p} d="M12 5v14M5 12h14" />;
const IconMinus      = (p) => <Ico {...p} d="M5 12h14" />;
const IconArrowR     = (p) => <Ico {...p} d="M5 12h14M13 6l6 6-6 6" />;
const IconCamera     = (p) => <Ico {...p} d="M4 8h3l2-2h6l2 2h3v11H4zM12 11a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />;
const IconShare      = (p) => <Ico {...p} d="M12 4v12M7 9l5-5 5 5 M5 14v6h14v-6" />;
const IconMessage    = (p) => <Ico {...p} d="M4 5h16v11H8l-4 4z" />;
const IconBell       = (p) => <Ico {...p} d="M6 9a6 6 0 0 1 12 0v5l2 3H4l2-3V9z M10 20a2 2 0 0 0 4 0" />;
const IconHome       = (p) => <Ico {...p} d="M3 11l9-7 9 7v9h-6v-6H9v6H3z" />;
const IconCheckCirc  = (p) => <Ico {...p} d="M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z M8 12l3 3 5-6" />;
const IconBuilding   = (p) => <Ico {...p} d="M5 21V5l7-2 7 2v16 M9 8h2M9 12h2M9 16h2M13 8h2M13 12h2M13 16h2" />;
const IconDesk       = (p) => <Ico {...p} d="M3 9h18l-1 4H4z M6 13v8M18 13v8 M9 4h10v5H9z" />;
const IconUsers      = (p) => <Ico {...p} d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M3 21c0-4 3-6 6-6s6 2 6 6 M16 5a3 3 0 1 1 0 6 M22 20c0-3-2-5-5-5" />;
const IconMail       = (p) => <Ico {...p} d="M3 6h18v12H3zM3 6l9 7 9-7" />;

Object.assign(window, {
  IconSearch, IconChev, IconChevR, IconChevL, IconChevUp, IconClose, IconHeart, IconStar, IconStarO,
  IconCheck, IconShield, IconMap, IconGrid, IconList, IconFeed, IconFilter, IconCal, IconUser, IconMenu,
  IconWifi, IconPark, IconCoffee, IconPrinter, IconAC, IconLock, IconBolt, IconPin, IconGlobe,
  IconPlus, IconMinus, IconArrowR, IconCamera, IconShare, IconMessage, IconBell, IconHome,
  IconCheckCirc, IconBuilding, IconDesk, IconUsers, IconMail,
});

// ============================================================
// src/placeholders.jsx
// ============================================================

// placeholders.jsx — striped SVG photo placeholders with monospace labels
// Following the system prompt: never hand-draw imagery; use subtle stripes + mono caption.

// Tinted, soft-striped placeholder with a small monospace label.
function PhotoPlaceholder({ hue = 30, label = "ofis · joy", radius = 12, style }) {
  const c1 = `oklch(0.86 0.045 ${hue})`;
  const c2 = `oklch(0.79 0.055 ${hue})`;
  const ink = `oklch(0.34 0.04 ${hue})`;
  const stripeId = `stripes-${hue}-${Math.round(Math.random() * 9999)}`;
  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%', overflow: 'hidden',
      borderRadius: radius, background: c1, ...style,
    }}>
      <svg width="100%" height="100%" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice"
        style={{ display: 'block', position: 'absolute', inset: 0 }}>
        <defs>
          <pattern id={stripeId} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(38)">
            <rect width="14" height="14" fill={c1} />
            <rect width="7"  height="14" fill={c2} />
          </pattern>
        </defs>
        <rect width="200" height="200" fill={`url(#${stripeId})`} opacity="0.55" />
      </svg>
      <div style={{
        position: 'absolute', left: 10, bottom: 8,
        font: '500 9.5px ui-monospace, "JetBrains Mono", Menlo, monospace',
        letterSpacing: '0.04em', color: ink, opacity: 0.7,
        background: 'rgba(255,255,255,0.55)', padding: '2px 6px', borderRadius: 4,
        backdropFilter: 'blur(4px)',
      }}>
        [ {label} ]
      </div>
    </div>
  );
}

// Avatar with initials on tinted bg.
function Avatar({ name = "—", size = 32, hue = 30 }) {
  const initials = name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `oklch(0.86 0.06 ${hue})`,
      color: `oklch(0.28 0.06 ${hue})`,
      font: `600 ${Math.round(size * 0.4)}px ${window.GO.font}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, userSelect: 'none',
    }}>{initials}</div>
  );
}

// Schematic Tashkent-like map: warm cream paper, faint roads, river curve,
// blocks of parks. NOT a real map — a believable backdrop for price pins.
function SchematicMap({ width = '100%', height = '100%', style, density = 1 }) {
  return (
    <div style={{ position: 'relative', width, height, background: '#eee7d8', overflow: 'hidden', ...style }}>
      <svg width="100%" height="100%" viewBox="0 0 1000 800" preserveAspectRatio="xMidYMid slice"
        style={{ position: 'absolute', inset: 0, display: 'block' }}>
        <defs>
          <pattern id="mapgrid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0V40" fill="none" stroke="rgba(120,100,70,0.06)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="1000" height="800" fill="#f0e8d6" />
        <rect width="1000" height="800" fill="url(#mapgrid)" />
        {/* Parks */}
        <rect x="180" y="120" width="180" height="120" fill="#d6e4c2" rx="4" />
        <rect x="640" y="380" width="220" height="160" fill="#d6e4c2" rx="4" />
        <rect x="80"  y="560" width="140" height="110" fill="#d6e4c2" rx="4" />
        {/* River — Chirchiq-like curve */}
        <path d="M0 540 Q 200 480 380 540 T 760 540 T 1000 500" stroke="#c9d8e5" strokeWidth="22" fill="none" strokeLinecap="round" />
        <path d="M0 540 Q 200 480 380 540 T 760 540 T 1000 500" stroke="#b6cad8" strokeWidth="1.5" fill="none" />
        {/* Big arterials */}
        <path d="M0 200 H1000" stroke="#fff" strokeWidth="6" />
        <path d="M0 200 H1000" stroke="#e2d4b6" strokeWidth="1" />
        <path d="M0 380 H1000" stroke="#fff" strokeWidth="5" />
        <path d="M0 380 H1000" stroke="#e2d4b6" strokeWidth="1" />
        <path d="M0 660 H1000" stroke="#fff" strokeWidth="5" />
        <path d="M0 660 H1000" stroke="#e2d4b6" strokeWidth="1" />
        <path d="M260 0 V800" stroke="#fff" strokeWidth="5" />
        <path d="M260 0 V800" stroke="#e2d4b6" strokeWidth="1" />
        <path d="M520 0 V800" stroke="#fff" strokeWidth="6" />
        <path d="M520 0 V800" stroke="#e2d4b6" strokeWidth="1" />
        <path d="M780 0 V800" stroke="#fff" strokeWidth="5" />
        <path d="M780 0 V800" stroke="#e2d4b6" strokeWidth="1" />
        {/* Minor streets */}
        <g stroke="#fff" strokeWidth="2" opacity="0.7">
          <path d="M0 90 H1000" /><path d="M0 290 H1000" /><path d="M0 470 H1000" /><path d="M0 720 H1000" />
          <path d="M120 0 V800" /><path d="M380 0 V800" /><path d="M620 0 V800" /><path d="M880 0 V800" />
        </g>
        {/* Subtle district labels */}
        <g fill="rgba(70,55,30,0.32)" fontFamily="ui-monospace, Menlo, monospace" fontSize="11" letterSpacing="2">
          <text x="60"  y="60">YUNUSOBOD</text>
          <text x="540" y="60">MIRZO ULUG'BEK</text>
          <text x="60"  y="320">SHAYXONTOXUR</text>
          <text x="540" y="320">MIROBOD</text>
          <text x="60"  y="600">CHILONZOR</text>
          <text x="540" y="600">YASHNOBOD</text>
        </g>
      </svg>
    </div>
  );
}

Object.assign(window, { PhotoPlaceholder, Avatar, SchematicMap });

// ============================================================
// src/admin-data.jsx
// ============================================================

// admin-data.jsx — Gorent Admin: derived data + Uzbek labels + helpers.
// Builds on tokens.jsx (LISTINGS, CATEGORIES, fmtSom, fmtPrice).

// ─── Admin copy (Uzbek Latin) ───────────────────────────────
const AT = {
  appName: "gorent",
  appKicker: "admin",
  // nav
  navOverview: "Boshqaruv paneli",
  navProducts: "Mahsulotlar",
  navBookings: "Bandlovlar",
  navHosts: "Mezbonlar",
  navBuildings: "Binolar",
  navRevenue: "Daromad",
  navReviews: "Sharhlar",
  navSettings: "Sozlamalar",
  // roles
  rolePlatform: "Platforma admini",
  roleHost: "Mezbon ko'rinishi",
  // generic
  search: "Qidirish…",
  all: "Barchasi",
  add: "Qo'shish",
  addProduct: "Mahsulot qo'shish",
  edit: "Tahrirlash",
  save: "Saqlash",
  cancel: "Bekor qilish",
  delete: "O'chirish",
  approve: "Tasdiqlash",
  reject: "Rad etish",
  view: "Ko'rish",
  export: "Eksport",
  filters: "Filtrlar",
  status: "Holat",
  category: "Toifa",
  city: "Shahar",
  host: "Mezbon",
  price: "Narx",
  bookings: "Bandlovlar",
  revenue: "Daromad",
  occupancy: "Bandlik",
  rating: "Baho",
  created: "Qo'shilgan",
  actions: "Amallar",
  perMonth: "/oy",
  som: "so'm",
  vsLast: "o'tgan oyga nisbatan",
  thisMonth: "Shu oy",
  viewAll: "Barchasini ko'rish",
  noResults: "Natija topilmadi",
  back: "Orqaga",
};

// ─── Status dictionaries ────────────────────────────────────
const PRODUCT_STATUS = {
  active:  { label: "Faol",            hue: 155, tone: "good" },
  pending: { label: "Tasdiqlanmoqda",  hue: 70,  tone: "warn" },
  paused:  { label: "To'xtatilgan",    hue: 30,  tone: "muted" },
  draft:   { label: "Qoralama",        hue: 250, tone: "muted" },
};
const BOOKING_STATUS = {
  active:    { label: "Faol",          hue: 155, tone: "good" },
  confirmed: { label: "Tasdiqlangan",  hue: 200, tone: "info" },
  pending:   { label: "Kutilmoqda",    hue: 70,  tone: "warn" },
  completed: { label: "Yakunlangan",   hue: 250, tone: "muted" },
  cancelled: { label: "Bekor qilingan",hue: 25,  tone: "bad" },
};
const PAYOUT_STATUS = {
  paid:    { label: "To'langan",   hue: 155, tone: "good" },
  pending: { label: "Kutilmoqda",  hue: 70,  tone: "warn" },
  hold:    { label: "Ushlab turilgan", hue: 25, tone: "bad" },
};
// Money-loop dictionaries: contracts, payments, charges, payout statements.
const CONTRACT_STATUS = {
  active:     { label: "Faol",            hue: 155, tone: "good" },
  expiring:   { label: "30 kun ichida",   hue: 70,  tone: "warn" },
  expired:    { label: "Muddati tugagan", hue: 25,  tone: "bad" },
  draft:      { label: "Qoralama",        hue: 250, tone: "muted" },
  terminated: { label: "Bekor qilingan",  hue: 25,  tone: "bad" },
  renewed:    { label: "Uzaytirilgan",    hue: 200, tone: "info" },
};
const PAYMENT_METHODS = {
  bank:  { label: "Bank o'tkazma", hue: 200 },
  cash:  { label: "Naqd",          hue: 155 },
  payme: { label: "Payme",         hue: 190 },
  click: { label: "Click",         hue: 220 },
  uzum:  { label: "Uzum",          hue: 290 },
  other: { label: "Boshqa",        hue: 250 },
};
const CHARGE_TYPES = {
  utility: { label: "Kommunal",     hue: 200 },
  service: { label: "Xizmat",       hue: 155 },
  penalty: { label: "Jarima",       hue: 25 },
  deposit: { label: "Kafolat puli", hue: 70 },
  other:   { label: "Boshqa",       hue: 250 },
};
const STATEMENT_STATUS = {
  draft:    { label: "Qoralama",     hue: 250, tone: "muted" },
  approved: { label: "Tasdiqlangan", hue: 70,  tone: "warn" },
  paid:     { label: "To'langan",    hue: 155, tone: "good" },
};

// ─── Category meta (admin coloring) ─────────────────────────
const CAT_META = {
  private:   { hue: 24,  accent: "oklch(0.62 0.13 24)" },
  shared:    { hue: 158, accent: "oklch(0.58 0.12 158)" },
  coworking: { hue: 200, accent: "oklch(0.58 0.12 220)" },
  virtual:   { hue: 290, accent: "oklch(0.55 0.13 290)" },
};
function catName(id) { return (window.CATEGORIES.find((c) => c.id === id) || {}).name || id; }
function catShort(id) { return (window.CATEGORIES.find((c) => c.id === id) || {}).short || id; }

// ─── Unit types & periods (fallback if /meta is unavailable) ─
// Fallback mirror of the API's UNIT_TYPES spec (window.META.unitTypes is the
// live copy). fungible → Soni is real stock; priceBasis 'per_m2' → the price
// is per square meter; m2/capacity say whether those fields apply
// ('required' | 'optional' | 'hidden'). Virtual offices REQUIRE m² — the
// yuridik-manzil lease must declare an area for ijara.soliq.uz registration.
const UNIT_TYPES = {
  virtual_office:  { label: "Virtual ofis (yuridik manzil)", short: "Virtual",      defaultPeriod: 'month', hue: 290, fungible: true,  priceBasis: 'per_unit', m2: 'required', capacity: 'hidden' },
  room:            { label: "Xona (shaxsiy ofis)",           short: "Xona",         defaultPeriod: 'month', hue: 24,  fungible: false, priceBasis: 'per_unit', m2: 'optional', capacity: 'optional' },
  meeting_room:    { label: "Yig'ilish xonasi",              short: "Yig'ilish",    defaultPeriod: 'hour',  hue: 200, fungible: false, priceBasis: 'per_unit', m2: 'optional', capacity: 'optional' },
  conference_room: { label: "Konferensiya zali",             short: "Konferensiya", defaultPeriod: 'hour',  hue: 250, fungible: false, priceBasis: 'per_unit', m2: 'optional', capacity: 'optional' },
  desk:            { label: "Ish stoli (koworking)",         short: "Stol",         defaultPeriod: 'month', hue: 158, fungible: true,  priceBasis: 'per_unit', m2: 'hidden',   capacity: 'hidden' },
  area:            { label: "Maydon (m²)",                   short: "Maydon",       defaultPeriod: 'month', hue: 95,  fungible: false, priceBasis: 'per_m2',   m2: 'required', capacity: 'optional' },
};
const PERIOD_LABELS = { month: 'oy', day: 'kun', hour: 'soat' };
function unitTypeMeta(type) {
  return ((window.META && window.META.unitTypes) || UNIT_TYPES)[type] || { label: type, short: type, defaultPeriod: 'month', hue: 250 };
}
function periodLabel(period) {
  return ((window.META && window.META.periods) || PERIOD_LABELS)[period] || period;
}
// Honest price unit for a product: "so'm/oy", "so'm/m²/oy", "so'm/soat"…
function priceUnitLabel(product) {
  const spec = unitTypeMeta(product?.type);
  return `so'm/${spec.priceBasis === 'per_m2' ? 'm²/' : ''}${periodLabel(product?.period || spec.defaultPeriod)}`;
}

// ─── Date/time & avatar-hue helpers ─────────────────────────
// Booking dates come from the API as ISO DateTime strings.
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}
function fmtTimeHM(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
// Deterministic avatar hue from a name (the API no longer sends a hue per customer).
function nameHue(name) { return (String(name || '?').charCodeAt(0) * 137) % 360; }
// "01.07.2026 – 01.08.2026" / hourly: "04.07.2026 · 10:00–12:00"
// Monthly lease ends are stored as the exclusive boundary (day after the last
// day of occupancy), so the last day the tenant actually holds the unit is
// end − 1. Daily/hourly ends already fall on the right calendar day.
function endMinusDay(iso) {
  if (!iso) return iso;
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString();
}
function bookingEndDisplay(b) {
  const period = b.unit?.offering?.product?.period;
  return period === 'month' && b.end ? endMinusDay(b.end) : b.end;
}
function fmtBookingRange(b) {
  const period = b.unit?.offering?.product?.period;
  if (period === 'hour') return `${fmtDate(b.start)} · ${fmtTimeHM(b.start)}–${fmtTimeHM(b.end)}`;
  return `${fmtDate(b.start)} – ${fmtDate(bookingEndDisplay(b))}`;
}

// Day-first date entry. A native <input type="date"> renders in the browser's
// locale (often mm/dd/yyyy); this ALWAYS shows and accepts dd.mm.yyyy while
// storing the ISO yyyy-mm-dd string the forms use. `onChange` is called with
// that ISO string (or '' when cleared). The calendar button opens the native
// picker for convenience. Drop-in for `<input type="date">`.
function DateField({ value, onChange, min, style, placeholder = 'kk.oo.yyyy' }) {
  const nativeRef = React.useRef(null);
  const toDisp = (iso) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    return m ? `${m[3]}.${m[2]}.${m[1]}` : '';
  };
  const [text, setText] = React.useState(() => toDisp(value));
  // Resync the visible text when the value changes from outside (prefill,
  // seeded term on unit change, picker selection, etc.).
  React.useEffect(() => { setText(toDisp(value)); }, [value]);

  const parse = (raw) => {
    const m = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(raw.trim());
    if (!m) return null;
    const d = +m[1], mo = +m[2], y = +m[3];
    const dt = new Date(Date.UTC(y, mo - 1, d));
    // Reject impossible dates (e.g. 31.02 rolls over to March).
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
    return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  const onText = (e) => {
    const v = e.target.value;
    setText(v);
    if (v.trim() === '') { onChange(''); return; }
    const iso = parse(v);
    if (iso) onChange(iso);
  };

  const openPicker = () => {
    const el = nativeRef.current;
    if (!el) return;
    if (typeof el.showPicker === 'function') { try { el.showPicker(); return; } catch (_) { /* fall through */ } }
    el.focus();
  };

  return (
    <div style={{ position: 'relative', ...style }}>
      <input className="adm-input" value={text} onChange={onText}
        onBlur={() => setText(toDisp(value))} placeholder={placeholder}
        inputMode="numeric" style={{ width: '100%', paddingRight: 36 }} />
      <button type="button" onClick={openPicker} aria-label="Kalendar" tabIndex={-1}
        style={{ position: 'absolute', right: 8, top: 0, bottom: 0, margin: 'auto 0', height: 24, width: 24, background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--g-ink-4)', display: 'grid', placeItems: 'center' }}>
        <IconCalendar size={16} />
      </button>
      {/* Visually-hidden native input drives the calendar popup + keeps min. */}
      <input ref={nativeRef} type="date" value={value || ''} min={min || undefined}
        onChange={(e) => onChange(e.target.value)} tabIndex={-1} aria-hidden="true"
        style={{ position: 'absolute', right: 8, bottom: 0, width: 1, height: 1, opacity: 0, pointerEvents: 'none' }} />
    </div>
  );
}

// ─── Initial datasets — replaced by api.bootstrap() before render ──
const MONTHS_UZ = ["Yan","Fev","Mar","Apr","May","Iyn","Iyl","Avg","Sen","Okt","Noy","Dek"];
const BUILDINGS = [];
const PRODUCTS = [];
const UNITS = [];
const HOSTS = [];
const BOOKINGS = [];
const REVIEWS = [];
const PAYOUTS = [];
const NOTIFS = [];
const revenueSeries = MONTHS_UZ.map((m) => ({ label: m, value: 0 }));
const bookingsSeries = MONTHS_UZ.map((m) => ({ label: m, value: 0 }));
const byCategory = window.CATEGORIES.map((c) => ({ id: c.id, name: c.name, short: c.short, count: 0, revenue: 0, bookings: 0, occ: 0 }));
const totalRevenue = 0;
const totalBookings = 0;
const activeBookings = 0;
const avgOccupancy = 0;
const pendingApproval = 0;
const avgRating = 0;
const KPIS = [];

// ─── Formatters ─────────────────────────────────────────────
// Full exact figure with thousand separators — prices are shown in full, never
// abbreviated to "mln/ming" (which rounds). Kept as a distinct name because many
// call sites use it; output is identical to fmtSom.
function fmtCompactSom(n) {
  return fmtSom(n);
}
function fmtSomFull(n) { return window.fmtSom(n) + " so'm"; }

// A tenant is a legal entity (INN) or an individual / YaTT (PINFL). One place
// that decides the buyer's tax label so tables, dropdowns, invoices and the
// contract doc all read the same.
function taxLabel(c) {
  if (!c) return '';
  if (c.type === 'individual') return c.pinfl ? `PINFL ${c.pinfl}` : '';
  return c.inn ? `INN ${c.inn}` : (c.pinfl ? `PINFL ${c.pinfl}` : '');
}

Object.assign(window, { NOTIFS, taxLabel });

Object.assign(window, {
  AT, PRODUCT_STATUS, BOOKING_STATUS, PAYOUT_STATUS, CAT_META,
  CONTRACT_STATUS, PAYMENT_METHODS, CHARGE_TYPES, STATEMENT_STATUS,
  catName, catShort, BUILDINGS, PRODUCTS, UNITS, HOSTS, BOOKINGS, REVIEWS, PAYOUTS,
  MONTHS_UZ, revenueSeries, bookingsSeries, byCategory,
  KPIS, totalRevenue, totalBookings, activeBookings, avgOccupancy, pendingApproval, avgRating,
  fmtCompactSom, fmtSomFull,
  UNIT_TYPES, PERIOD_LABELS, unitTypeMeta, periodLabel, priceUnitLabel,
  fmtDate, fmtTimeHM, nameHue, fmtBookingRange,
});

// ============================================================
// src/admin-ui.jsx
// ============================================================

// admin-ui.jsx — Gorent Admin: primitives (icons, cards, charts, table, pills).

// ─── Extra admin icons (same stroke language as icons.jsx) ──
const AIco = ({ d, size = 18, sw = 1.6, fill = "none", style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...style }}>
    {typeof d === 'string' ? <path d={d} /> : d}
  </svg>
);
const IconGauge   = (p) => <AIco {...p} d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />;
const IconBox     = (p) => <AIco {...p} d="M12 3l8 4v10l-8 4-8-4V7l8-4z M4 7l8 4 8-4 M12 11v10" />;
const IconWallet  = (p) => <AIco {...p} d="M3 7h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a1 1 0 0 1-1-1V7z M3 7l1.5-3 11 2 M16 13h2" />;
const IconChart   = (p) => <AIco {...p} d="M4 20V4 M4 20h16 M8 16v-5M12 16V8M16 16v-3" />;
const IconSettings= (p) => <AIco {...p} d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z M19 12a7 7 0 0 0-.1-1l2-1.6-2-3.4-2.4 1a7 7 0 0 0-1.7-1l-.3-2.5H9.5L9.2 6a7 7 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.3 2.5h5l.3-2.5a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.6a7 7 0 0 0 .1-1z" sw={1.3} />;
const IconLogout  = (p) => <AIco {...p} d="M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4 M10 8l-4 4 4 4 M6 12h11" />;
const IconDots    = (p) => <AIco {...p} d="M5 12h.01M12 12h.01M19 12h.01" sw={2.6} />;
const IconEdit    = (p) => <AIco {...p} d="M4 20h4l10-10-4-4L4 16v4z M13 6l4 4" />;
const IconTrash   = (p) => <AIco {...p} d="M5 7h14 M9 7V4h6v3 M6 7l1 13h10l1-13" />;
const IconEye     = (p) => <AIco {...p} d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />;
const IconTrendUp = (p) => <AIco {...p} d="M4 16l5-5 4 4 7-7 M16 8h4v4" />;
const IconTrendDn = (p) => <AIco {...p} d="M4 8l5 5 4-4 7 7 M16 16h4v-4" />;
const IconDownload= (p) => <AIco {...p} d="M12 4v10 M8 11l4 4 4-4 M5 20h14" />;
const IconClock   = (p) => <AIco {...p} d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 7v5l3 2" />;
const IconCard    = (p) => <AIco {...p} d="M3 6h18v12H3zM3 10h18 M7 15h3" />;
const IconExternal= (p) => <AIco {...p} d="M14 4h6v6 M20 4l-8 8 M18 13v6H5V6h6" />;
const IconFlag    = (p) => <AIco {...p} d="M6 21V4 M6 4h11l-2 4 2 4H6" />;
const IconCheck2  = (p) => <AIco {...p} d="M5 12l5 5L20 7" />;
const IconX2      = (p) => <AIco {...p} d="M6 6l12 12M18 6L6 18" />;
const IconPhone   = (p) => <AIco {...p} d="M5 4h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />;
const IconArrowUp = (p) => <AIco {...p} d="M12 19V5 M6 11l6-6 6 6" />;
const IconRefresh = (p) => <AIco {...p} d="M4 12a8 8 0 0 1 13.7-5.7L20 8 M20 3.5V8h-4.5 M20 12a8 8 0 0 1-13.7 5.7L4 16 M4 20.5V16h4.5" />;
const IconLink    = (p) => <AIco {...p} d="M9.5 14.5l5-5 M9 7l1.2-1.2a3.5 3.5 0 0 1 5 5L15 12 M15 17l-1.2 1.2a3.5 3.5 0 0 1-5-5L10 12" />;
const IconDoc     = (p) => <AIco {...p} d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z M14 3v5h5 M9 13h6M9 17h4" />;
const IconShieldCheck = (p) => <AIco {...p} d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z M8.5 12l2.5 2.5L16 9.5" />;
const IconWarn    = (p) => <AIco {...p} d="M12 3.5L2.5 20h19L12 3.5z M12 10v4.5 M12 17.5h.01" />;

// ─── Status pill ────────────────────────────────────────────
function StatusPill({ s, dict = window.PRODUCT_STATUS, size = "md" }) {
  const meta = dict[s] || { label: s, hue: 250 };
  const pad = size === "sm" ? "3px 8px" : "4px 10px 4px 8px";
  const fs = size === "sm" ? 11 : 11.5;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: pad,
      borderRadius: 999, background: `oklch(0.95 0.04 ${meta.hue})`,
      color: `oklch(0.42 0.12 ${meta.hue})`, font: `600 ${fs}px ${window.GO.font}`,
      whiteSpace: 'nowrap', lineHeight: 1,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: `oklch(0.6 0.16 ${meta.hue})` }} />
      {meta.label}
    </span>
  );
}

// ─── Category glyph (from shared vocab) ─────────────────────
function CategoryGlyph({ cat, size = 22 }) {
  if (cat === 'private') return <IconBuilding size={size} />;
  if (cat === 'shared')  return <IconUsers size={size} />;
  if (cat === 'coworking') return <IconDesk size={size} />;
  if (cat === 'virtual') return <IconMail size={size} />;
  return <IconBuilding size={size} />;
}

// ─── Category tag ───────────────────────────────────────────
function CatTag({ cat, withIcon = true }) {
  const m = window.CAT_META[cat] || { hue: 250, accent: '#888' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px',
      borderRadius: 8, background: `oklch(0.96 0.025 ${m.hue})`,
      color: `oklch(0.4 0.1 ${m.hue})`, font: `600 11.5px ${window.GO.font}`, whiteSpace: 'nowrap',
    }}>
      {withIcon && <span style={{ color: m.accent, display: 'flex' }}><CategoryGlyph cat={cat} size={13} /></span>}
      {window.catShort(cat)}
    </span>
  );
}

// ─── Delta chip (▲ +12.4%) ──────────────────────────────────
function Delta({ value, invert = false }) {
  const up = value >= 0;
  const good = invert ? !up : up;
  const col = good ? 'oklch(0.52 0.13 155)' : 'oklch(0.55 0.16 25)';
  const bg = good ? 'oklch(0.95 0.04 155)' : 'oklch(0.95 0.05 25)';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px 2px 5px',
      borderRadius: 999, background: bg, color: col, font: `600 11.5px ${window.GO.font}`,
    }}>
      {up ? <IconTrendUp size={12} /> : <IconTrendDn size={12} />}
      {up ? '+' : ''}{value}%
    </span>
  );
}

// ─── Sparkline (area) ───────────────────────────────────────
function Sparkline({ data, w = 132, h = 38, color = 'var(--g-brand)', fill = true }) {
  const max = Math.max(...data), min = Math.min(...data);
  const rng = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - ((v - min) / rng) * (h - 6) - 3]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${w} ${h} L0 ${h} Z`;
  const id = 'sg' + Math.round(Math.random() * 99999);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#${id})`} />}
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.6" fill={color} />
    </svg>
  );
}

// ─── Bar chart (months) ─────────────────────────────────────
function BarChart({ data, h = 200, color = 'var(--g-brand)', unit = '', fmt = (v) => v }) {
  const max = Math.max(...data.map((d) => d.value));
  const [hover, setHover] = React.useState(null);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: h, position: 'relative' }}>
      {data.map((d, i) => (
        <div key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, height: '100%', justifyContent: 'flex-end', cursor: 'default' }}>
          <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', height: '100%' }}>
            {hover === i && (
              <div style={{ position: 'absolute', bottom: `calc(${(d.value / max) * 100}% + 8px)`, background: 'var(--g-ink)', color: '#fff',
                font: `600 11px ${window.GO.font}`, padding: '4px 8px', borderRadius: 6, whiteSpace: 'nowrap', zIndex: 2 }}>
                {fmt(d.value)}{unit}
              </div>
            )}
            <div style={{
              width: '68%', borderRadius: '5px 5px 2px 2px',
              height: `${(d.value / max) * 100}%`,
              background: hover === i ? color : `color-mix(in oklab, ${color} 78%, white)`,
              transition: 'background .15s',
            }} />
          </div>
          <div style={{ font: `500 10.5px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Donut (category split) ─────────────────────────────────
function Donut({ segments, size = 150, thickness = 22, centerLabel, centerSub }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = (size - thickness) / 2;
  const C = 2 * Math.PI * r;
  let off = 0;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        {segments.map((seg, i) => {
          const frac = seg.value / total;
          const dash = frac * C;
          const el = (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={seg.color} strokeWidth={thickness}
              strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-off}
              strokeLinecap="butt" />
          );
          off += dash;
          return el;
        })}
      </svg>
      {centerLabel && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ font: `700 22px ${window.GO.font}`, color: 'var(--g-ink)', letterSpacing: '-0.02em' }}>{centerLabel}</div>
          {centerSub && <div style={{ font: `500 11px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>{centerSub}</div>}
        </div>
      )}
    </div>
  );
}

// ─── Progress bar ───────────────────────────────────────────
function ProgressBar({ value, color = 'var(--g-brand)', track = 'var(--g-bg-2)', h = 7 }) {
  return (
    <div style={{ width: '100%', height: h, borderRadius: 999, background: track, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(100, value)}%`, height: '100%', borderRadius: 999, background: color }} />
    </div>
  );
}

// ─── Card shell ─────────────────────────────────────────────
function Card({ children, style, pad = 20, ...rest }) {
  return (
    <div {...rest} style={{
      background: 'var(--g-card)', border: '1px solid var(--g-line)', borderRadius: 16,
      padding: pad, ...style,
    }}>{children}</div>
  );
}

// ─── Stat card ──────────────────────────────────────────────
function StatCard({ icon, label, value, unit, delta, deltaInvert, spark, accent = 'var(--g-brand)' }) {
  return (
    <Card pad={18} style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, display: 'grid', placeItems: 'center',
            background: 'var(--g-brand-soft)', color: 'var(--g-brand-ink)' }}>{icon}</div>
          <div style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink-3)' }}>{label}</div>
        </div>
        {delta !== undefined && <Delta value={delta} invert={deltaInvert} />}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
          <div style={{ font: `700 27px ${window.GO.font}`, color: 'var(--g-ink)', letterSpacing: '-0.03em' }}>{value}</div>
          {unit && <div style={{ font: `500 12.5px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>{unit}</div>}
        </div>
        {spark && <div style={{ flexShrink: 0 }}><Sparkline data={spark} color={accent} w={104} h={36} /></div>}
      </div>
    </Card>
  );
}

// ─── Buttons ────────────────────────────────────────────────
function Btn({ children, kind = 'ghost', sm, onClick, style, ...rest }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer',
    borderRadius: 10, font: `600 ${sm ? 12.5 : 13.5}px ${window.GO.font}`,
    padding: sm ? '7px 12px' : '10px 16px', whiteSpace: 'nowrap', transition: 'all .14s', border: '1px solid transparent',
  };
  const kinds = {
    primary: { background: 'var(--g-brand)', color: '#fff' },
    ghost:   { background: 'var(--g-card)', color: 'var(--g-ink)', borderColor: 'var(--g-line)' },
    soft:    { background: 'var(--g-bg-2)', color: 'var(--g-ink)' },
    danger:  { background: 'oklch(0.96 0.04 25)', color: 'oklch(0.5 0.16 25)' },
    quiet:   { background: 'transparent', color: 'var(--g-ink-3)' },
  };
  return <button onClick={onClick} className={`adm-btn adm-btn-${kind}`} style={{ ...base, ...kinds[kind], ...style }} {...rest}>{children}</button>;
}

// ─── Icon button ────────────────────────────────────────────
function IconBtn({ children, onClick, title, style }) {
  return (
    <button onClick={onClick} title={title} className="adm-iconbtn" style={{
      width: 32, height: 32, borderRadius: 9, display: 'grid', placeItems: 'center',
      background: 'transparent', border: '1px solid transparent', cursor: 'pointer', color: 'var(--g-ink-3)', ...style,
    }}>{children}</button>
  );
}

// ─── Segmented control ──────────────────────────────────────
function Segmented({ options, value, onChange }) {
  return (
    <div style={{ display: 'inline-flex', gap: 2, padding: 3, background: 'var(--g-bg-2)', borderRadius: 10 }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button key={o.value} onClick={() => onChange(o.value)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: 0, cursor: 'pointer',
            background: active ? 'var(--g-card)' : 'transparent', color: active ? 'var(--g-ink)' : 'var(--g-ink-3)',
            font: `600 12.5px ${window.GO.font}`, boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', transition: 'all .14s',
          }}>{o.icon}{o.label}</button>
        );
      })}
    </div>
  );
}

// ─── Section header ─────────────────────────────────────────
function SectionHead({ title, sub, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
      <div>
        <div style={{ font: `700 16px ${window.GO.font}`, color: 'var(--g-ink)', letterSpacing: '-0.02em' }}>{title}</div>
        {sub && <div style={{ font: `400 12.5px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 3 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

// ─── Drawer (right slide-in) ────────────────────────────────
function Drawer({ open, onClose, width = 560, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 90, pointerEvents: open ? 'auto' : 'none' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(20,16,12,0.4)',
        opacity: open ? 1 : 0, transition: 'opacity .25s' }} />
      <div style={{
        position: 'absolute', top: 0, right: 0, height: '100%', width, maxWidth: '92vw',
        background: 'var(--g-bg)', boxShadow: '-20px 0 60px -20px rgba(0,0,0,0.3)',
        transform: open ? 'translateX(0)' : 'translateX(100%)', transition: 'transform .3s cubic-bezier(.4,0,.2,1)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>{children}</div>
    </div>
  );
}

// ─── Empty / search input ───────────────────────────────────
function SearchInput({ value, onChange, placeholder, width = 260 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10,
      background: 'var(--g-card)', border: '1px solid var(--g-line)', width }}>
      <span style={{ color: 'var(--g-ink-4)', display: 'flex' }}><IconSearch size={16} /></span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder || window.AT.search}
        style={{ border: 0, outline: 'none', background: 'transparent', width: '100%', font: `400 13px ${window.GO.font}`, color: 'var(--g-ink)' }} />
    </div>
  );
}

const ADMIN_UI_CSS = `
  .adm-btn-primary:hover { background: var(--g-brand-ink) !important; }
  .adm-btn-ghost:hover { background: var(--g-bg-2) !important; }
  .adm-btn-soft:hover { background: var(--g-line) !important; }
  .adm-btn-quiet:hover { color: var(--g-ink) !important; background: var(--g-bg-2) !important; }
  .adm-btn-danger:hover { filter: brightness(0.97); }
  .adm-iconbtn:hover { background: var(--g-bg-2) !important; color: var(--g-ink) !important; }
  .adm-row:hover { background: var(--g-bg) !important; }
  .adm-spin { animation: adm-rot 0.85s linear infinite; transform-origin: center; }
  @keyframes adm-rot { to { transform: rotate(360deg); } }
  .adm-navitem:hover { background: rgba(255,255,255,0.06); }
  .adm-scroll::-webkit-scrollbar { width: 10px; height: 10px; }
  .adm-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.14); border-radius: 999px; border: 3px solid transparent; background-clip: padding-box; }
  .adm-scroll::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.24); background-clip: padding-box; }
`;

Object.assign(window, {
  AIco, IconGauge, IconBox, IconWallet, IconChart, IconSettings, IconLogout, IconDots,
  IconEdit, IconTrash, IconEye, IconTrendUp, IconTrendDn, IconDownload, IconClock, IconCard,
  IconExternal, IconFlag, IconCheck2, IconX2, IconPhone, IconArrowUp, IconRefresh, IconLink, IconDoc, IconShieldCheck, IconWarn,
  StatusPill, CatTag, CategoryGlyph, Delta, Sparkline, BarChart, Donut, ProgressBar, Card, StatCard,
  Btn, IconBtn, Segmented, SectionHead, Drawer, SearchInput, ADMIN_UI_CSS,
});

// ============================================================
// src/admin-shell.jsx
// ============================================================

// admin-shell.jsx — Gorent Admin: Sidebar, Topbar, DataTable.

// ─── Sidebar ────────────────────────────────────────────────
const NAV = [
  { id: 'overview',  label: () => window.AT.navOverview,  icon: IconGauge },
  { id: 'buildings', label: () => window.AT.navBuildings, icon: IconBuilding },
  { id: 'products',  label: () => window.AT.navProducts,  icon: IconBox },
  { id: 'bookings',  label: () => window.AT.navBookings,  icon: IconCal },
  { id: 'contracts', label: () => "Shartnomalar",          icon: IconDoc },
  { id: 'debtors',   label: () => "Qarzdorlik",            icon: IconWarn },
  { id: 'hosts',     label: () => window.AT.navHosts,     icon: IconUsers },
  { id: 'companies', label: () => "Kompaniyalar",         icon: IconBuilding },
  { id: 'revenue',   label: () => window.AT.navRevenue,   icon: IconWallet },
  { id: 'invoices',  label: () => "Hisob-fakturalar",     icon: IconDoc },
  { id: 'reviews',   label: () => window.AT.navReviews,   icon: IconStar },
];

function Sidebar({ route, setRoute, role, counts }) {
  const badge = { buildings: counts.pendingBuildings, products: counts.pendingProducts, bookings: counts.pendingBookings, reviews: counts.pendingReviews, debtors: ((window.DEBTORS || {}).totals || {}).debtorCount || 0 };
  return (
    <div style={{
      width: 244, flexShrink: 0, background: 'var(--g-brand-deep)', color: '#fff',
      display: 'flex', flexDirection: 'column', height: '100%',
    }}>
      {/* Brand */}
      <div style={{ padding: '20px 18px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src="/assets/gorent-symbol.svg" alt="Gorent" style={{ width: 30, height: 30, display: 'block' }} />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
          <span style={{ font: `700 19px ${window.GO.font}`, letterSpacing: '-0.03em' }}>gorent</span>
          <span style={{ font: `500 10px ui-monospace, "JetBrains Mono", monospace`, letterSpacing: '0.14em',
            color: 'var(--g-brand)', textTransform: 'uppercase', background: 'rgba(255,255,255,0.08)',
            padding: '2px 6px', borderRadius: 5 }}>admin</span>
        </div>
      </div>

      {/* Nav */}
      <div className="adm-scroll" style={{ flex: 1, overflowY: 'auto', padding: '6px 12px' }}>
        <div style={{ font: `600 10px ui-monospace, monospace`, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.4)',
          padding: '10px 10px 8px', textTransform: 'uppercase' }}>Menyu</div>
        {NAV.map((n) => {
          const active = route.section === n.id;
          const b = badge[n.id];
          return (
            <button key={n.id} className="adm-navitem" onClick={() => setRoute({ section: n.id })} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: '10px 10px', marginBottom: 2,
              border: 0, borderRadius: 10, cursor: 'pointer', textAlign: 'left',
              background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
              color: active ? '#fff' : 'rgba(255,255,255,0.66)',
              font: `${active ? 600 : 500} 13.5px ${window.GO.font}`,
            }}>
              <span style={{ display: 'flex', color: active ? 'var(--g-brand)' : 'rgba(255,255,255,0.55)' }}><n.icon size={18} /></span>
              <span style={{ flex: 1 }}>{n.label()}</span>
              {b > 0 && <span style={{ minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999, background: 'var(--g-brand)',
                color: '#fff', font: `700 10.5px ${window.GO.font}`, display: 'grid', placeItems: 'center' }}>{b}</span>}
            </button>
          );
        })}
      </div>

      {/* Settings + role */}
      <div style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <button className="adm-navitem" onClick={() => setRoute({ section: 'settings' })} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: '10px', border: 0, borderRadius: 10,
          cursor: 'pointer', font: `${route.section === 'settings' ? 600 : 500} 13.5px ${window.GO.font}`,
          background: route.section === 'settings' ? 'rgba(255,255,255,0.12)' : 'transparent',
          color: route.section === 'settings' ? '#fff' : 'rgba(255,255,255,0.66)',
        }}>
          <span style={{ display: 'flex', color: route.section === 'settings' ? 'var(--g-brand)' : 'rgba(255,255,255,0.55)' }}><IconSettings size={18} /></span> {window.AT.navSettings}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 10px 4px' }}>
          <Avatar name="Admin Operator" size={34} hue={155} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: `600 12.5px ${window.GO.font}`, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {role === 'host' ? "Aziza Rashidova" : "Admin Operator"}
            </div>
            <div style={{ font: `400 11px ${window.GO.font}`, color: 'rgba(255,255,255,0.45)' }}>
              {role === 'host' ? "AR Estate · mezbon" : "Platforma · super-admin"}
            </div>
          </div>
          <button title="Chiqish" onClick={() => window.__gorentLogout()} className="adm-iconbtn" style={{ color: 'rgba(255,255,255,0.4)', display: 'flex', background: 'transparent', border: 0, cursor: 'pointer', padding: 4 }}><IconLogout size={16} /></button>
        </div>
      </div>
    </div>
  );
}

// ─── Notifications bell + dropdown ──────────────────────────
function NotificationsBell({ onNavigate }) {
  const [open, setOpen] = React.useState(false);
  const [notifs, setNotifs] = React.useState(window.NOTIFS);
  const ref = React.useRef(null);
  const unread = notifs.filter((n) => n.unread).length;
  React.useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  const icons = { box: <IconBox size={16} />, cal: <IconCal size={16} />, flag: <IconFlag size={16} />, wallet: <IconWallet size={16} />, user: <IconUser size={16} /> };
  const markAll = () => { setNotifs((s) => s.map((n) => ({ ...n, unread: false }))); api.post('/notifications/read-all').catch(() => {}); };
  const open1 = (n) => { setNotifs((s) => s.map((x) => x.id === n.id ? { ...x, unread: false } : x)); api.patch(`/notifications/${n.id}/read`).catch(() => {}); setOpen(false); onNavigate && onNavigate(n.section); };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <IconBtn title="Bildirishnomalar" onClick={() => setOpen((o) => !o)} style={{ border: '1px solid var(--g-line)', position: 'relative', background: open ? 'var(--g-bg-2)' : 'transparent' }}>
        <IconBell size={17} />
        {unread > 0 && <span style={{ position: 'absolute', top: 4, right: 4, minWidth: 15, height: 15, padding: '0 3px', borderRadius: 999, background: 'var(--g-brand)', border: '1.5px solid var(--g-card)', color: '#fff', font: `700 9px ${window.GO.font}`, display: 'grid', placeItems: 'center' }}>{unread}</span>}
      </IconBtn>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: 360, maxHeight: 460, background: 'var(--g-card)',
          border: '1px solid var(--g-line)', borderRadius: 16, boxShadow: '0 20px 50px -16px rgba(0,0,0,0.28)', zIndex: 80, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--g-line)' }}>
            <div style={{ font: `700 14px ${window.GO.font}`, color: 'var(--g-ink)' }}>Bildirishnomalar {unread > 0 && <span style={{ font: `600 11px ${window.GO.font}`, color: 'var(--g-brand-ink)', background: 'var(--g-brand-soft)', padding: '2px 7px', borderRadius: 999, marginLeft: 4 }}>{unread} yangi</span>}</div>
            {unread > 0 && <button onClick={markAll} style={{ border: 0, background: 'transparent', cursor: 'pointer', font: `600 12px ${window.GO.font}`, color: 'var(--g-brand-ink)' }}>Hammasini o'qildi</button>}
          </div>
          <div className="adm-scroll" style={{ flex: 1, overflowY: 'auto' }}>
            {notifs.map((n) => (
              <button key={n.id} onClick={() => open1(n)} className="adm-row" style={{ width: '100%', textAlign: 'left', display: 'flex', gap: 12, padding: '13px 16px', border: 0,
                borderBottom: '1px solid var(--g-line)', cursor: 'pointer', background: n.unread ? 'var(--g-bg)' : 'transparent' }}>
                <span style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, display: 'grid', placeItems: 'center', background: `oklch(0.95 0.04 ${n.hue})`, color: `oklch(0.45 0.14 ${n.hue})` }}>{icons[n.icon]}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink)' }}>{n.title}</div>
                  <div style={{ font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-3)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.body}</div>
                  <div style={{ font: `400 10.5px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 4 }}>{n.time}</div>
                </div>
                {n.unread && <span style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--g-brand)', flexShrink: 0, marginTop: 5 }} />}
              </button>
            ))}
          </div>
          <button onClick={() => setOpen(false)} style={{ padding: '12px', border: 0, borderTop: '1px solid var(--g-line)', background: 'var(--g-card)', cursor: 'pointer', font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink-3)' }}>Yopish</button>
        </div>
      )}
    </div>
  );
}

// ─── Topbar ─────────────────────────────────────────────────
function Topbar({ title, sub, role, onRole, search, setSearch, actions, onNavigate }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      padding: '14px 24px', borderBottom: '1px solid var(--g-line)', background: 'var(--g-card)', flexShrink: 0,
    }}>
      <div style={{ minWidth: 0, flexShrink: 1 }}>
        <div style={{ font: `700 19px ${window.GO.font}`, color: 'var(--g-ink)', letterSpacing: '-0.03em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        {sub && <div style={{ font: `400 12px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <SearchInput value={search} onChange={setSearch} width={220} />
        {actions}
        {/* Role switch */}
        <div style={{ display: 'inline-flex', gap: 2, padding: 3, background: 'var(--g-bg-2)', borderRadius: 999 }}>
          {[['platform', window.AT.rolePlatform], ['host', window.AT.roleHost]].map(([v, lbl]) => (
            <button key={v} onClick={() => onRole(v)} title={lbl} style={{
              padding: '6px 12px', borderRadius: 999, border: 0, cursor: 'pointer',
              background: role === v ? 'var(--g-card)' : 'transparent', color: role === v ? 'var(--g-ink)' : 'var(--g-ink-3)',
              font: `600 12px ${window.GO.font}`, boxShadow: role === v ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>{v === 'platform' ? <IconShield size={13} /> : <IconUser size={13} />}{v === 'platform' ? 'Platforma' : 'Mezbon'}</button>
          ))}
        </div>
        <NotificationsBell onNavigate={onNavigate} />
      </div>
    </div>
  );
}

// ─── DataTable — generic ────────────────────────────────────
// columns: [{ key, label, w, align, render(row), th }]
function DataTable({ columns, rows, onRow, rowKey = (r, i) => i, empty }) {
  if (!rows.length) {
    return (
      <Card pad={48} style={{ textAlign: 'center' }}>
        <div style={{ color: 'var(--g-ink-4)', display: 'flex', justifyContent: 'center', marginBottom: 10 }}><IconSearch size={26} /></div>
        <div style={{ font: `600 14px ${window.GO.font}`, color: 'var(--g-ink-3)' }}>{empty || window.AT.noResults}</div>
      </Card>
    );
  }
  return (
    <Card pad={0} style={{ overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }} className="adm-scroll">
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
          <thead>
            <tr style={{ background: 'var(--g-bg)' }}>
              {columns.map((c) => (
                <th key={c.key} style={{
                  textAlign: c.align || 'left', padding: '12px 16px', font: `600 11px ${window.GO.font}`,
                  color: 'var(--g-ink-4)', textTransform: 'uppercase', letterSpacing: '0.04em',
                  whiteSpace: 'nowrap', width: c.w, borderBottom: '1px solid var(--g-line)',
                }}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={rowKey(r, i)} className="adm-row" onClick={onRow ? () => onRow(r) : undefined}
                style={{ cursor: onRow ? 'pointer' : 'default', borderBottom: i < rows.length - 1 ? '1px solid var(--g-line)' : 0, transition: 'background .12s' }}>
                {columns.map((c) => (
                  <td key={c.key} style={{ padding: '13px 16px', textAlign: c.align || 'left', verticalAlign: 'middle' }}>
                    {c.render(r, i)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ─── Cell helpers ───────────────────────────────────────────
function ProductCell({ p }) {
  const hue = (window.CAT_META[p.cat] || {}).hue ?? 30;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
        <PhotoPlaceholder hue={hue} label="" radius={10} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ font: `600 13.5px ${window.GO.font}`, color: 'var(--g-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}>{p.name}</div>
        <div style={{ font: `400 12px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 1 }}>{p.id} · {window.unitTypeMeta(p.type).short}</div>
      </div>
    </div>
  );
}

function PersonCell({ name, sub, hue }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
      <Avatar name={name} size={36} hue={hue} />
      <div style={{ minWidth: 0 }}>
        <div style={{ font: `600 13.5px ${window.GO.font}`, color: 'var(--g-ink)', whiteSpace: 'nowrap' }}>{name}</div>
        {sub && <div style={{ font: `400 12px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>{sub}</div>}
      </div>
    </div>
  );
}

function MoneyCell({ n, compact = true, sub }) {
  return (
    <div>
      <div style={{ font: `600 13.5px ${window.GO.font}`, color: 'var(--g-ink)' }}>{compact ? window.fmtCompactSom(n) : window.fmtSom(n)} <span style={{ font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>so'm</span></div>
      {sub && <div style={{ font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

Object.assign(window, { NAV, Sidebar, Topbar, DataTable, ProductCell, PersonCell, MoneyCell });

// ============================================================
// src/admin-overview.jsx
// ============================================================

// admin-overview.jsx — Gorent Admin: Overview dashboard, 3 layout variants.

const CAT_COLORS = {
  private:   'oklch(0.64 0.14 24)',
  shared:    'oklch(0.6 0.12 158)',
  coworking: 'oklch(0.6 0.12 220)',
  virtual:   'oklch(0.58 0.14 290)',
};

// Shared building blocks ------------------------------------------------------
function RevenuePanel({ tall }) {
  const data = window.revenueSeries;
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <Card style={{ display: 'flex', flexDirection: 'column' }}>
      <SectionHead
        title="Daromad dinamikasi"
        sub="Oxirgi 12 oy · so'm"
        right={<Segmented value="12m" onChange={() => {}} options={[
          { value: '3m', label: "3 oy" }, { value: '6m', label: "6 oy" }, { value: '12m', label: "12 oy" },
        ]} />}
      />
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 18 }}>
        <div style={{ font: `700 30px ${window.GO.font}`, color: 'var(--g-ink)', letterSpacing: '-0.03em' }}>{window.fmtSom(total)} <span style={{ fontSize: 16, color: 'var(--g-ink-4)', fontWeight: 500 }}>so'm</span></div>
        <Delta value={12.4} />
      </div>
      <BarChart data={data} h={tall ? 230 : 180} unit=" so'm" fmt={(v) => window.fmtSom(v)} />
    </Card>
  );
}

function CategorySplitPanel() {
  const segments = window.byCategory.map((c) => ({ value: c.revenue, color: CAT_COLORS[c.id], ...c }));
  return (
    <Card style={{ display: 'flex', flexDirection: 'column' }}>
      <SectionHead title="Toifa bo'yicha" sub="Daromad ulushi" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
        <Donut segments={segments} size={132} thickness={20}
          centerLabel={String(window.PRODUCTS.length)} centerSub="mahsulot" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 11 }}>
          {segments.map((s) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ width: 9, height: 9, borderRadius: 3, background: s.color, flexShrink: 0 }} />
              <span style={{ flex: 1, font: `500 12.5px ${window.GO.font}`, color: 'var(--g-ink-2)' }}>{s.short}</span>
              <span style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink)' }}>{window.fmtCompactSom(s.revenue)}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function OccupancyPanel() {
  const so = window.spaceOccupancy;
  return (
    <Card>
      <SectionHead title="Toifalar bandligi" sub="O'rtacha bandlik darajasi" />
      {so && (
        <div style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--g-bg)', marginBottom: 15 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <span style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink-2)' }}>Band maydon (hozir)</span>
            <span style={{ font: `700 15px ${window.GO.font}`, color: 'var(--g-ink)' }}>
              {so.pct}% <span style={{ font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>· {window.fmtSom(so.usedM2)} / {window.fmtSom(so.totalM2)} m²</span>
            </span>
          </div>
          <ProgressBar value={so.pct} color="var(--g-brand)" />
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
        {window.byCategory.map((c) => (
          <div key={c.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ font: `500 12.5px ${window.GO.font}`, color: 'var(--g-ink-2)' }}>{c.name}</span>
              <span style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink)' }}>{c.occ}%</span>
            </div>
            <ProgressBar value={c.occ} color={CAT_COLORS[c.id]} />
          </div>
        ))}
      </div>
    </Card>
  );
}

function RecentBookingsPanel({ onSeeAll, rows = 6 }) {
  const list = window.BOOKINGS.slice(0, rows);
  return (
    <Card pad={0}>
      <div style={{ padding: '18px 20px 14px' }}>
        <SectionHead title="So'nggi bandlovlar" sub={`${window.BOOKINGS.length} ta jami`}
          right={<Btn kind="quiet" sm onClick={onSeeAll}>{window.AT.viewAll} <IconChevR size={14} /></Btn>} />
      </div>
      {list.map((b, i) => (
        <div key={b.id} className="adm-row" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px',
          borderTop: '1px solid var(--g-line)', transition: 'background .12s' }}>
          <Avatar name={b.customer} size={34} hue={nameHue(b.customer)} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: `600 13px ${window.GO.font}`, color: 'var(--g-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.customer}{b.companyRef?.name && <span style={{ color: 'var(--g-ink-4)', fontWeight: 400 }}> · {b.companyRef.name}</span>}</div>
            <div style={{ font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.unit?.name} · {b.unit?.offering?.building?.name}</div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink)' }}>{window.fmtCompactSom(b.total)} so'm</div>
            <div style={{ marginTop: 3 }}><StatusPill s={b.status} dict={window.BOOKING_STATUS} size="sm" /></div>
          </div>
        </div>
      ))}
    </Card>
  );
}

// Pending offerings live under each building (buildings responses include offerings).
function pendingOfferings() {
  return (window.BUILDINGS || []).flatMap((b) =>
    (b.offerings || []).filter((o) => o.status === 'pending').map((o) => ({ ...o, building: o.building || b })));
}

function ApprovalQueuePanel({ onGoProducts, onGoReviews }) {
  const pendO = pendingOfferings();
  const flagged = window.REVIEWS.filter((r) => r.state === 'flagged' || r.state === 'pending');
  return (
    <Card>
      <SectionHead title="Tasdiqlash navbati" sub={`${pendO.length + flagged.length} ta amal kutilmoqda`} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {pendO.slice(0, 3).map((o) => (
          <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, borderRadius: 12, background: 'var(--g-bg)' }}>
            <div style={{ width: 38, height: 38, borderRadius: 9, overflow: 'hidden', flexShrink: 0 }}><PhotoPlaceholder hue={o.building?.hue ?? 30} label="" radius={9} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.product?.name || '—'}</div>
              <div style={{ font: `400 11px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>Yangi taklif · {o.building?.name || '—'}</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <IconBtn title="Tasdiqlash" onClick={() => gorentMutate(() => api.post(`/offerings/${o.id}/approve`))} style={{ background: 'oklch(0.95 0.05 155)', color: 'oklch(0.5 0.14 155)', width: 30, height: 30 }}><IconCheck2 size={15} /></IconBtn>
              <IconBtn title="Rad etish" onClick={() => gorentMutate(() => api.post(`/offerings/${o.id}/reject`))} style={{ background: 'oklch(0.96 0.04 25)', color: 'oklch(0.55 0.15 25)', width: 30, height: 30 }}><IconX2 size={15} /></IconBtn>
            </div>
          </div>
        ))}
        {flagged.slice(0, 1).map((r) => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, borderRadius: 12, background: 'oklch(0.97 0.03 25)' }}>
            <div style={{ width: 38, height: 38, borderRadius: 9, display: 'grid', placeItems: 'center', flexShrink: 0, background: 'oklch(0.93 0.05 25)', color: 'oklch(0.52 0.15 25)' }}><IconFlag size={17} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink)' }}>Belgilangan sharh · {r.author}</div>
              <div style={{ font: `400 11px ${window.GO.font}`, color: 'var(--g-ink-4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>"{r.text}"</div>
            </div>
            <Btn kind="ghost" sm onClick={onGoReviews}>Ko'rish</Btn>
          </div>
        ))}
      </div>
    </Card>
  );
}

// Catalog products don't carry revenue — rank by how many buildings offer them.
function TopProductsPanel() {
  const withOfferings = window.PRODUCTS.map((p) => ({ ...p, offeringCount: (p.offerings || []).length }));
  const top = withOfferings.sort((a, b) => b.offeringCount - a.offeringCount).slice(0, 5);
  const max = Math.max(1, ...top.map((p) => p.offeringCount));
  return (
    <Card>
      <SectionHead title="Eng ko'p taklif qilingan mahsulotlar" sub="Binolar soni bo'yicha" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {top.map((p, i) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ font: `700 12px ui-monospace, monospace`, color: 'var(--g-ink-4)', width: 16 }}>{i + 1}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 5 }}>
                <span style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>{p.name}</span>
                <span style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink)', flexShrink: 0 }}>{p.offeringCount} ta bino</span>
              </div>
              <ProgressBar value={(p.offeringCount / max) * 100} color={CAT_COLORS[p.cat]} h={6} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// KPI row ---------------------------------------------------------------------
function KpiRow() {
  const icons = { rev: <IconWallet size={17} />, book: <IconCal size={17} />, occ: <IconChart size={17} />, pend: <IconClock size={17} /> };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
      {window.KPIS.map((k) => (
        <StatCard key={k.id} icon={icons[k.id]} label={k.label} value={k.value} unit={k.unit}
          delta={k.delta} deltaInvert={k.deltaInvert} spark={k.spark} />
      ))}
    </div>
  );
}

// ─── Variant A — Classic: KPI row, revenue hero + side, two columns ─────────
function OverviewA({ setRoute }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <KpiRow />
      <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 16 }}>
        <RevenuePanel tall />
        <CategorySplitPanel />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
        <RecentBookingsPanel onSeeAll={() => setRoute({ section: 'bookings' })} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ApprovalQueuePanel onGoProducts={() => setRoute({ section: 'products' })} onGoReviews={() => setRoute({ section: 'reviews' })} />
          <OccupancyPanel />
        </div>
      </div>
    </div>
  );
}

// ─── Variant B — Bento: mixed tiles ────────────────────────────────────────
function OverviewB({ setRoute }) {
  const icons = { rev: <IconWallet size={17} />, book: <IconCal size={17} />, occ: <IconChart size={17} />, pend: <IconClock size={17} /> };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridAutoRows: 'min-content', gap: 16 }}>
      {/* Revenue hero spanning 2 cols, 2 rows feel */}
      <div style={{ gridColumn: 'span 2', gridRow: 'span 2' }}><RevenuePanel tall /></div>
      <div style={{ gridColumn: 'span 2' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {window.KPIS.map((k) => (
            <StatCard key={k.id} icon={icons[k.id]} label={k.label} value={k.value} unit={k.unit}
              delta={k.delta} deltaInvert={k.deltaInvert} spark={k.spark} />
          ))}
        </div>
      </div>
      <div style={{ gridColumn: 'span 2' }}><CategorySplitPanel /></div>
      <div style={{ gridColumn: 'span 2' }}><TopProductsPanel /></div>
      <div style={{ gridColumn: 'span 2' }}><RecentBookingsPanel rows={5} onSeeAll={() => setRoute({ section: 'bookings' })} /></div>
      <div style={{ gridColumn: 'span 2' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ApprovalQueuePanel onGoProducts={() => setRoute({ section: 'products' })} onGoReviews={() => setRoute({ section: 'reviews' })} />
          <OccupancyPanel />
        </div>
      </div>
    </div>
  );
}

// ─── Variant C — Focus: big left feed, right rail metrics ──────────────────
function OverviewC({ setRoute }) {
  const icons = { rev: <IconWallet size={16} />, book: <IconCal size={16} />, occ: <IconChart size={16} />, pend: <IconClock size={16} /> };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <RevenuePanel tall />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <TopProductsPanel />
          <OccupancyPanel />
        </div>
        <RecentBookingsPanel onSeeAll={() => setRoute({ section: 'bookings' })} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {window.KPIS.map((k) => (
          <Card key={k.id} pad={16} style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'var(--g-brand-soft)', color: 'var(--g-brand-ink)', flexShrink: 0 }}>{icons[k.id]}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: `500 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>{k.label}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ font: `700 19px ${window.GO.font}`, color: 'var(--g-ink)', letterSpacing: '-0.02em' }}>{k.value}</span>
                <span style={{ font: `500 11px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>{k.unit}</span>
              </div>
            </div>
            <Delta value={k.delta} invert={k.deltaInvert} />
          </Card>
        ))}
        <CategorySplitPanel />
        <ApprovalQueuePanel onGoProducts={() => setRoute({ section: 'products' })} onGoReviews={() => setRoute({ section: 'reviews' })} />
      </div>
    </div>
  );
}

function Overview({ variant, setLayout, setRoute }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ font: `400 13px ${window.GO.font}`, color: 'var(--g-ink-3)' }}>
          Salom, Operator — bugun platformada <b style={{ color: 'var(--g-ink)' }}>{window.activeBookings}</b> ta faol bandlov.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ font: `500 12px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>Ko'rinish</span>
          <Segmented value={variant} onChange={setLayout} options={[
            { value: 'A', label: 'Klassik' }, { value: 'B', label: 'Bento' }, { value: 'C', label: 'Fokus' },
          ]} />
        </div>
      </div>
      {variant === 'B' ? <OverviewB setRoute={setRoute} />
        : variant === 'C' ? <OverviewC setRoute={setRoute} />
        : <OverviewA setRoute={setRoute} />}
    </div>
  );
}

Object.assign(window, { Overview, KpiRow, CAT_COLORS });

// ============================================================
// src/admin-integrations.jsx
// ============================================================

// admin-integrations.jsx — Gorent Admin: official document integrations for
// VIRTUAL OFFICE products — didox.uz (EDI / e-invoices) & ijara.soliq.uz (STC
// rental-contract registration). Shown in the product detail drawer and form.

const CONN_STATUS = {
  connected: { label: "Ulangan", hue: 155 },
  syncing:   { label: "Sinxronlanmoqda", hue: 220 },
  off:       { label: "Ulanmagan", hue: 35 },
};
const DOC_STATUS = {
  registered: { label: "Ro'yxatdan o'tgan", hue: 155 },
  signed:     { label: "Imzolangan", hue: 155 },
  sent:       { label: "Yuborilgan", hue: 220 },
  pending:    { label: "Kutilmoqda", hue: 70 },
  error:      { label: "Xatolik", hue: 25 },
};

// Two official services Gorent syncs with.
const CONNECTORS = {
  didox: { key: 'didox', domain: "didox.uz", mono: "dx", hue: 268,
    name: "didox.uz", sub: "Elektron hujjat almashinuvi · ESF, dalolatnoma" },
  soliq: { key: 'soliq', domain: "ijara.soliq.uz", mono: "S", hue: 205,
    name: "ijara.soliq.uz", sub: "Soliq qo'mitasi · ijara shartnomasi ro'yxati" },
};

// Sample synced documents for a given virtual product (stable per id).
function virtualDocs(p) {
  const n = parseInt((p.id || 'L04').replace(/\D/g, ''), 10) || 4;
  const yr = 2026;
  return [
    { id: 'd1', type: "Ijara shartnomasi", no: `IJ-${yr}-${String(40 + n).padStart(4, '0')}`, src: 'soliq', date: "01.06.2026", status: 'registered' },
    { id: 'd2', type: "Elektron hisob-faktura (ESF)", no: `ESF-${String(88900 + n * 7)}`, src: 'didox', date: "02.06.2026", status: 'signed' },
    { id: 'd3', type: "Topshirish-qabul dalolatnomasi", no: `ACT-${yr}-${200 + n}`, src: 'didox', date: "02.06.2026", status: 'sent' },
    { id: 'd4', type: "Yuridik manzil tasdiqnomasi", no: `ADR-${1000 + n}`, src: 'soliq', date: "28.05.2026", status: 'registered' },
  ];
}

// ─── Connector monogram tile ────────────────────────────────
function ConnTile({ c, size = 40 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 11, flexShrink: 0, display: 'grid', placeItems: 'center',
      background: `oklch(0.95 0.035 ${c.hue})`, color: `oklch(0.45 0.15 ${c.hue})`,
      font: `700 ${size * 0.36}px ${window.GO.font}`, letterSpacing: '-0.02em',
      border: `1px solid oklch(0.88 0.05 ${c.hue})`,
    }}>{c.mono}</div>
  );
}

// ─── Full integration panel (detail drawer) ─────────────────
function VirtualOfficeIntegration({ p }) {
  const [conns, setConns] = React.useState({
    didox: { status: 'connected', last: "02.06.2026 · 14:20" },
    soliq: { status: 'connected', last: "01.06.2026 · 09:05" },
  });
  const docs = React.useMemo(() => virtualDocs(p), [p.id]);

  const sync = (key) => {
    setConns((s) => ({ ...s, [key]: { ...s[key], status: 'syncing' } }));
    api.post(`/integrations/${key}/sync`)
      .then((r) => setConns((s) => ({ ...s, [key]: { status: 'connected', last: (r && r.lastSync) || 'hozirgina' } })))
      .catch(() => setConns((s) => ({ ...s, [key]: { status: 'connected', last: 'hozirgina' } })));
  };
  const connect = (key) => {
    api.post(`/integrations/${key}/connect`).catch(() => {});
    setConns((s) => ({ ...s, [key]: { status: 'connected', last: 'hozirgina' } }));
  };
  const syncAll = () => { sync('didox'); sync('soliq'); };
  const anySyncing = conns.didox.status === 'syncing' || conns.soliq.status === 'syncing';

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--g-brand-ink)', display: 'flex' }}><IconShieldCheck size={16} /></span>
          <div style={{ font: `600 13px ${window.GO.font}`, color: 'var(--g-ink)' }}>Rasmiy hujjat integratsiyasi</div>
        </div>
        <Btn kind="ghost" sm onClick={syncAll} disabled={anySyncing}>
          <span className={anySyncing ? 'adm-spin' : ''} style={{ display: 'flex' }}><IconRefresh size={14} /></span>
          Hammasini sinxronlash
        </Btn>
      </div>

      {/* Connector cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {['didox', 'soliq'].map((key) => {
          const c = CONNECTORS[key]; const st = conns[key];
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: 14, borderRadius: 13,
              background: 'var(--g-card)', border: '1px solid var(--g-line)' }}>
              <ConnTile c={c} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ font: `600 13.5px ${window.GO.font}`, color: 'var(--g-ink)' }}>{c.name}</span>
                  <StatusPill s={st.status} dict={CONN_STATUS} size="sm" />
                </div>
                <div style={{ font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.sub}</div>
                {st.status !== 'off' && (
                  <div style={{ font: `400 11px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 3 }}>
                    So'nggi sinxron: <span style={{ color: 'var(--g-ink-3)', fontWeight: 500 }}>{st.last}</span>
                  </div>
                )}
              </div>
              {st.status === 'off'
                ? <Btn kind="primary" sm onClick={() => connect(key)}><IconLink size={14} /> Ulash</Btn>
                : <Btn kind="soft" sm onClick={() => sync(key)} disabled={st.status === 'syncing'}>
                    <span className={st.status === 'syncing' ? 'adm-spin' : ''} style={{ display: 'flex' }}><IconRefresh size={14} /></span>
                    {st.status === 'syncing' ? "Sinxron…" : "Sinxronlash"}
                  </Btn>}
            </div>
          );
        })}
      </div>

      {/* Synced documents */}
      <div style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink-2)' }}>Sinxronlangan hujjatlar</div>
          <span style={{ font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>{docs.length} ta</span>
        </div>
        <div style={{ borderRadius: 13, border: '1px solid var(--g-line)', overflow: 'hidden', background: 'var(--g-card)' }}>
          {docs.map((d, i) => {
            const c = CONNECTORS[d.src];
            return (
              <div key={d.id} className="adm-row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px',
                borderTop: i ? '1px solid var(--g-line)' : 0, transition: 'background .12s' }}>
                <span style={{ color: 'var(--g-ink-4)', display: 'flex', flexShrink: 0 }}><IconDoc size={17} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.type}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, font: `400 11px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>
                    <span style={{ fontFamily: 'ui-monospace, monospace' }}>№{d.no}</span> ·
                    <span style={{ color: `oklch(0.5 0.12 ${c.hue})`, fontWeight: 600 }}>{c.domain}</span> · {d.date}
                  </div>
                </div>
                <StatusPill s={d.status} dict={DOC_STATUS} size="sm" />
                <IconBtn title="Yuklab olish" style={{ width: 30, height: 30 }}><IconDownload size={15} /></IconBtn>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 10, font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>
          <IconShieldCheck size={13} /> Hujjatlar avtomatik tarzda didox.uz va ijara.soliq.uz bilan sinxronlanadi.
        </div>
      </div>
    </div>
  );
}

// ─── Compact connect block (add/edit form) ──────────────────
function VirtualIntegrationForm() {
  const [stir, setStir] = React.useState("");
  const [conns, setConns] = React.useState({ didox: 'off', soliq: 'off' });
  const toggle = (key) => setConns((s) => ({ ...s, [key]: s[key] === 'connected' ? 'off' : 'connected' }));

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ color: 'var(--g-brand-ink)', display: 'flex' }}><IconShieldCheck size={17} /></span>
        <div style={{ font: `700 15px ${window.GO.font}`, color: 'var(--g-ink)' }}>Rasmiy hujjat integratsiyasi</div>
      </div>
      <div style={{ font: `400 12px ${window.GO.font}`, color: 'var(--g-ink-4)', marginBottom: 16 }}>
        Virtual ofis uchun ijara shartnomasi va elektron hujjatlar rasmiy ravishda sinxronlanadi.
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink-2)', marginBottom: 7 }}>STIR (soliq to'lovchi raqami)</div>
        <input className="adm-input" value={stir} onChange={(e) => setStir(e.target.value.replace(/\D/g, '').slice(0, 9))} placeholder="305112233" inputMode="numeric" />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {['didox', 'soliq'].map((key) => {
          const c = CONNECTORS[key]; const on = conns[key] === 'connected';
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12,
              background: on ? 'var(--g-brand-soft)' : 'var(--g-bg)', border: `1px solid ${on ? 'var(--g-brand)' : 'var(--g-line)'}`, transition: 'all .14s' }}>
              <ConnTile c={c} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: `600 13px ${window.GO.font}`, color: 'var(--g-ink)' }}>{c.name}</div>
                <div style={{ font: `400 11px ${window.GO.font}`, color: 'var(--g-ink-4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.sub}</div>
              </div>
              <Btn kind={on ? 'soft' : 'primary'} sm onClick={() => toggle(key)}>
                {on ? <><IconCheck2 size={14} /> Ulangan</> : <><IconLink size={14} /> Ulash</>}
              </Btn>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

Object.assign(window, { VirtualOfficeIntegration, VirtualIntegrationForm, CONNECTORS, virtualDocs, CONN_STATUS, DOC_STATUS });

// ============================================================
// src/admin-products.jsx
// ============================================================

// admin-products.jsx — Gorent Admin: global product catalog + add/edit form.
// A Product is a catalog entry (unique name); buildings support it via Offerings.

function CategoryFilterBar({ cat, setCat }) {
  const cats = [{ id: 'all', name: window.AT.all }, ...window.CATEGORIES.map((c) => ({ id: c.id, name: c.name }))];
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
        {cats.map((c) => {
          const active = cat === c.id;
          const count = c.id === 'all' ? window.PRODUCTS.length : window.PRODUCTS.filter((p) => p.cat === c.id).length;
          return (
            <button key={c.id} onClick={() => setCat(c.id)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 13px', borderRadius: 10, cursor: 'pointer',
              border: '1px solid', borderColor: active ? 'var(--g-ink)' : 'var(--g-line)',
              background: active ? 'var(--g-ink)' : 'var(--g-card)', color: active ? '#fff' : 'var(--g-ink-2)',
              font: `600 12.5px ${window.GO.font}`, transition: 'all .14s',
            }}>
              {c.id !== 'all' && <CategoryGlyph cat={c.id} size={14} />}
              {c.name}
              <span style={{ font: `600 11px ${window.GO.font}`, color: active ? 'rgba(255,255,255,0.65)' : 'var(--g-ink-4)' }}>{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Products screen — global catalog ───────────────────────
// Every product is platform-wide; "Binolar" shows how many buildings offer it.
function ProductsScreen({ search, openForm, role }) {
  const [cat, setCat] = React.useState('all');
  const [detail, setDetail] = React.useState(null);
  const isPlatform = role === 'platform';

  let rows = window.PRODUCTS.filter((p) => cat === 'all' || p.cat === cat);
  if (search) rows = rows.filter((p) => (p.name + ' ' + (p.desc || '') + ' ' + p.id).toLowerCase().includes(search.toLowerCase()));

  const columns = [
    { key: 'id', label: 'ID', render: (p) => <span style={{ font: `600 12px ui-monospace, monospace`, color: 'var(--g-ink-2)' }}>{p.id}</span> },
    { key: 'name', label: 'Nomi', render: (p) => <ProductCell p={p} /> },
    { key: 'cat', label: window.AT.category, render: (p) => <CatTag cat={p.cat} /> },
    { key: 'type', label: 'Birlik turi', render: (p) => <span style={{ font: `500 13px ${window.GO.font}`, color: 'var(--g-ink-2)' }}>{window.unitTypeMeta(p.type).label}</span> },
    { key: 'period', label: 'Davr', align: 'center', render: (p) => <span style={{ font: `500 13px ${window.GO.font}`, color: 'var(--g-ink-2)' }}>{window.periodLabel(p.period)}</span> },
    { key: 'offerings', label: 'Binolar', align: 'center', render: (p) => <span style={{ font: `600 13px ${window.GO.font}`, color: 'var(--g-ink)' }}>{(p.offerings || []).length}</span> },
    { key: 'desc', label: 'Tavsif', render: (p) => <span style={{ font: `400 12.5px ${window.GO.font}`, color: 'var(--g-ink-4)', display: 'inline-block', maxWidth: 240, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', verticalAlign: 'bottom' }}>{p.desc || '—'}</span> },
    ...(isPlatform ? [{ key: 'act', label: '', align: 'right', render: (p) => (
      <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
        <IconBtn title={window.AT.view} onClick={() => setDetail(p)}><IconEye size={16} /></IconBtn>
        <IconBtn title={window.AT.edit} onClick={() => openForm(p)}><IconEdit size={16} /></IconBtn>
        <IconBtn title={window.AT.delete} style={{ color: 'oklch(0.55 0.16 25)' }} onClick={() => window.confirm(`"${p.name}" mahsulotini katalogdan o'chirasizmi?`) && gorentMutate(() => api.del(`/products/${p.id}`))}><IconTrash size={16} /></IconBtn>
      </div>
    ) }] : []),
  ];

  return (
    <div>
      <CategoryFilterBar cat={cat} setCat={setCat} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ font: `400 13px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>{rows.length} ta mahsulot · katalog{isPlatform ? '' : " · faqat o'qish uchun"}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn kind="ghost" sm><IconDownload size={15} /> {window.AT.export}</Btn>
          {isPlatform && <Btn kind="primary" sm onClick={() => openForm(null)}><IconPlus size={15} /> {window.AT.addProduct}</Btn>}
        </div>
      </div>

      <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} onRow={(p) => setDetail(p)} empty="Katalogda mahsulot yo'q" />

      <ProductDetailDrawer p={detail} role={role} onClose={() => setDetail(null)} onEdit={(p) => { setDetail(null); openForm(p); }} />
    </div>
  );
}

// ─── Unit add/edit inline form (per offering) ───────────────
// Type/period come from the offering's catalog product; a unit only overrides
// price — an empty price means "bino narxi" (inherits offering.price).
// Fields shown per the type spec: Soni only for fungible stock, Sig'imi/m²
// only where they mean something; m² is mandatory for virtual offices
// (yuridik-manzil registration needs the declared area) and Maydon units
// (it drives the per-m² price).
function UnitEditor({ unit, offering, onDone }) {
  const isEdit = !!unit;
  const spec = window.unitTypeMeta(offering?.product?.type);
  const [f, setF] = React.useState(() => unit ? {
    name: unit.name, qty: unit.qty ?? 1, capacity: unit.capacity ?? '', m2: unit.m2 || '',
    price: unit.price ?? '', status: unit.status || 'active',
  } : { name: '', qty: 1, capacity: '', m2: '', price: '', status: 'active' });
  const [busy, setBusy] = React.useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const Label = ({ children }) => <div style={{ font: `600 12px ${window.GO.font}`, color: 'var(--g-ink-2)', marginBottom: 5 }}>{children}</div>;

  const m2Missing = spec.m2 === 'required' && !(Number(f.m2) >= 1);
  const submit = async () => {
    if (!String(f.name).trim() || m2Missing) return;
    setBusy(true);
    const payload = {
      name: String(f.name).trim(),
      qty: spec.fungible ? (Number(f.qty) || 1) : 1,
      capacity: f.capacity === '' || f.capacity == null ? undefined : Number(f.capacity),
      m2: f.m2 === '' || f.m2 == null ? undefined : Number(f.m2),
      price: f.price === '' || f.price == null ? null : Number(f.price),
      status: f.status,
    };
    const ok = await gorentMutate(() => isEdit
      ? api.patch(`/units/${unit.id}`, payload)
      : api.post('/units', { ...payload, offeringId: offering.id }));
    setBusy(false);
    if (ok) onDone();
  };

  const showCapacity = spec.capacity !== 'hidden';
  const showM2 = spec.m2 !== 'hidden';
  return (
    <div style={{ padding: 14, borderRadius: 12, border: '1px solid var(--g-line)', background: 'var(--g-bg)' }}>
      <div style={{ font: `700 13px ${window.GO.font}`, color: 'var(--g-ink)', marginBottom: 12 }}>{isEdit ? "Birlikni tahrirlash" : "Yangi birlik"} <span style={{ color: 'var(--g-ink-4)', fontWeight: 400 }}>· {offering?.product?.name || ''}</span></div>
      <div style={{ display: 'grid', gridTemplateColumns: spec.fungible ? '1fr 1fr' : '1fr', gap: 10, marginBottom: 10 }}>
        <div>
          <Label>Nomi</Label>
          <input className="adm-input" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="7A xona" />
        </div>
        {spec.fungible && (
          <div>
            <Label>Soni (zaxira)</Label>
            <input className="adm-input" type="number" min={1} value={f.qty} onChange={(e) => set('qty', e.target.value)} />
          </div>
        )}
      </div>
      {(showCapacity || showM2) && (
        <div style={{ display: 'grid', gridTemplateColumns: showCapacity && showM2 ? 'repeat(2, 1fr)' : '1fr', gap: 10, marginBottom: 10 }}>
          {showCapacity && (
            <div>
              <Label>Sig'imi (odam)</Label>
              <input className="adm-input" type="number" value={f.capacity} onChange={(e) => set('capacity', e.target.value)} placeholder="4" />
            </div>
          )}
          {showM2 && (
            <div>
              <Label>Maydoni (m²){spec.m2 === 'required' ? ' — majburiy' : ''}</Label>
              <input className="adm-input" type="number" min={1} value={f.m2} onChange={(e) => set('m2', e.target.value)} placeholder="24" />
              {spec.m2 === 'required' && (
                <div style={{ font: `400 11px ${window.GO.font}`, color: m2Missing ? 'oklch(0.5 0.16 25)' : 'var(--g-ink-4)', marginTop: 4 }}>
                  {spec.priceBasis === 'per_m2'
                    ? "Narx m² bo'yicha hisoblanadi."
                    : "Yuridik manzil shartnomasi uchun maydon ko'rsatilishi shart (soliq ro'yxati)."}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div>
          <Label>Narx ({window.priceUnitLabel(offering?.product)}) — ixtiyoriy</Label>
          <input className="adm-input" type="number" value={f.price} onChange={(e) => set('price', e.target.value)}
            placeholder={offering?.price ? `Bino narxi: ${window.fmtSom(offering.price)}` : "Bino narxi"} />
          <div style={{ font: `400 11px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 4 }}>
            Bo'sh qoldirilsa bino narxi qo'llanadi{offering?.price ? ` (${window.fmtSom(offering.price)} ${window.priceUnitLabel(offering?.product)})` : ''}.
          </div>
        </div>
        <div>
          <Label>Holat</Label>
          <select className="adm-select" style={{ width: '100%' }} value={f.status} onChange={(e) => set('status', e.target.value)}>
            {Object.entries(window.PRODUCT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Btn kind="ghost" sm onClick={onDone}>{window.AT.cancel}</Btn>
        <Btn kind="primary" sm onClick={submit} disabled={busy || !String(f.name).trim() || m2Missing}><IconCheck size={14} /> {busy ? 'Saqlanmoqda…' : window.AT.save}</Btn>
      </div>
    </div>
  );
}

// ─── Detail drawer — catalog product + offerings by building ─
function ProductDetailDrawer({ p: pProp, role, onClose, onEdit }) {
  // Re-resolve from the live dataset so refreshes are visible.
  const p = pProp ? (window.PRODUCTS.find((x) => x.id === pProp.id) || pProp) : null;
  const offerings = (p && p.offerings) || [];
  const isPlatform = role === 'platform';
  const hue = p ? ((window.CAT_META[p.cat] || {}).hue ?? 30) : 30;
  return (
    <Drawer open={!!p} onClose={onClose} width={580}>
      {p && (
        <>
          <div style={{ position: 'relative', height: 150, flexShrink: 0 }}>
            <PhotoPlaceholder hue={hue} label={`katalog · ${p.cat}`} radius={0} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.25), transparent 40%)' }} />
            <button onClick={onClose} className="adm-iconbtn" style={{ position: 'absolute', top: 16, left: 16, width: 34, height: 34, borderRadius: 999, background: 'rgba(255,255,255,0.9)', border: 0, display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--g-ink)' }}><IconClose size={17} /></button>
            <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 8 }}><CatTag cat={p.cat} /></div>
          </div>

          <div className="adm-scroll" style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <div>
              <div style={{ font: `700 19px ${window.GO.font}`, color: 'var(--g-ink)', letterSpacing: '-0.02em' }}>{p.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, font: `400 13px ${window.GO.font}`, color: 'var(--g-ink-3)' }}>
                <IconBox size={14} /> Katalog mahsuloti · <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{p.id}</span>
              </div>
            </div>

            {/* Specs */}
            <div style={{ marginTop: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
                {[
                  ['Toifa', window.catName(p.cat)],
                  ['Birlik turi', window.unitTypeMeta(p.type).label],
                  ['Davr', window.periodLabel(p.period)],
                  ['Binolar', `${offerings.length} ta`],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--g-line)', paddingBottom: 8 }}>
                    <span style={{ font: `400 13px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>{k}</span>
                    <span style={{ font: `600 13px ${window.GO.font}`, color: 'var(--g-ink)' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {p.desc && (
              <div style={{ marginTop: 18, font: `400 13px ${window.GO.font}`, color: 'var(--g-ink-2)', lineHeight: 1.55 }}>{p.desc}</div>
            )}

            {/* Offerings — which buildings support this product */}
            <div style={{ marginTop: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ font: `600 13px ${window.GO.font}`, color: 'var(--g-ink)' }}>Takliflar ({offerings.length} ta bino)</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {offerings.length === 0 && (
                  <div style={{ padding: '18px 14px', borderRadius: 12, background: 'var(--g-bg)', font: `400 12.5px ${window.GO.font}`, color: 'var(--g-ink-4)', textAlign: 'center' }}>
                    Hozircha hech bir bino bu mahsulotni taklif qilmaydi — bino sahifasidan taklif qo'shing.
                  </div>
                )}
                {offerings.map((o) => (
                  <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, background: 'var(--g-bg)' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, overflow: 'hidden', flexShrink: 0 }}><PhotoPlaceholder hue={o.building?.hue ?? 30} label="" radius={9} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.building?.name || '—'}</div>
                      <div style={{ font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 2 }}>{o.building?.district || ''}{o.building?.city ? `, ${o.building.city}` : ''} · {(o.units || []).length} ta birlik</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink)' }}>{window.fmtCompactSom(o.price || 0)} {window.priceUnitLabel(p)}</div>
                      <div style={{ marginTop: 3 }}><StatusPill s={o.status} size="sm" /></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Official document integration — virtual office only */}
            {p.cat === 'virtual' && <VirtualOfficeIntegration p={p} />}
          </div>

          {/* Footer actions — catalog CRUD is platform-only */}
          {isPlatform && (
            <div style={{ display: 'flex', gap: 10, padding: '16px 24px', borderTop: '1px solid var(--g-line)', background: 'var(--g-card)', flexShrink: 0 }}>
              <Btn kind="danger" style={{}} onClick={async () => { if (window.confirm(`"${p.name}" mahsulotini katalogdan o'chirasizmi?`)) { await gorentMutate(() => api.del(`/products/${p.id}`)); onClose(); } }}><IconTrash size={16} /></Btn>
              <Btn kind="ghost" style={{ flex: 1 }} onClick={() => onEdit(p)}><IconEdit size={16} /> {window.AT.edit}</Btn>
              <Btn kind="primary" style={{ flex: 1 }}><IconExternal size={16} /> Saytda ochish</Btn>
            </div>
          )}
        </>
      )}
    </Drawer>
  );
}

// ─── Add / edit form (full page) — catalog entry ────────────
// Platform-only. Name is unique across the catalog — a 409 from the API
// (duplicate name) surfaces inline under the name field.
function ProductForm({ product, onClose, onSave }) {
  const isEdit = !!product;
  const [f, setF] = React.useState(() => product ? {
    name: product.name, cat: product.cat, type: product.type,
    period: product.period, desc: product.desc || '',
  } : {
    name: '', cat: 'private', type: 'room', period: 'month', desc: '',
  });
  const [err, setErr] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const Label = ({ children }) => <div style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink-2)', marginBottom: 7 }}>{children}</div>;
  const types = (window.META && window.META.unitTypes) || window.UNIT_TYPES;
  const periods = (window.META && window.META.periods) || window.PERIOD_LABELS;

  const submit = async () => {
    if (!f.name.trim()) return;
    setErr(null); setBusy(true);
    const payload = {
      name: f.name.trim(), cat: f.cat, type: f.type, period: f.period,
      desc: f.desc.trim() || undefined,
    };
    try {
      if (isEdit) await api.put(`/products/${product.id}`, payload);
      else await api.post('/products', payload);
      if (window.__gorentRefresh) await window.__gorentRefresh();
      onSave();
    } catch (e) {
      // 409 — duplicate catalog name; show it inline instead of an alert.
      setErr(e && e.message ? e.message : 'Xatolik yuz berdi');
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 920, margin: '0 auto' }}>
      <button onClick={onClose} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--g-ink-3)', font: `600 13px ${window.GO.font}`, marginBottom: 16, padding: 0 }}>
        <IconChevL size={16} /> {window.AT.back}
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>
        {/* Left: form fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Card>
            <div style={{ font: `700 15px ${window.GO.font}`, color: 'var(--g-ink)', marginBottom: 16 }}>Asosiy ma'lumotlar</div>
            <div style={{ marginBottom: 16 }}>
              <Label>Nomi (katalogda yagona)</Label>
              <input className="adm-input" value={f.name} onChange={(e) => { set('name', e.target.value); if (err) setErr(null); }} placeholder="Masalan: Virtual ofis (yuridik manzil)" />
              {err && (
                <div style={{ marginTop: 8, font: `500 12.5px ${window.GO.font}`, color: 'oklch(0.5 0.16 25)', background: 'oklch(0.96 0.04 25)', padding: '9px 12px', borderRadius: 9 }}>{err}</div>
              )}
            </div>
            <div style={{ marginBottom: 16 }}>
              <Label>Toifa</Label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 9 }}>
                {window.CATEGORIES.map((c) => {
                  const active = f.cat === c.id;
                  return (
                    <button key={c.id} onClick={() => set('cat', c.id)} style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '14px 8px', borderRadius: 12, cursor: 'pointer',
                      border: '1.5px solid', borderColor: active ? 'var(--g-brand)' : 'var(--g-line)',
                      background: active ? 'var(--g-brand-soft)' : 'var(--g-card)', color: active ? 'var(--g-brand-ink)' : 'var(--g-ink-3)',
                      font: `600 12px ${window.GO.font}`, transition: 'all .14s', textAlign: 'center',
                    }}>
                      <CategoryGlyph cat={c.id} size={20} />
                      {c.short}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div>
                <Label>Birlik turi</Label>
                <select className="adm-select" style={{ width: '100%' }} value={f.type}
                  onChange={(e) => { const type = e.target.value; setF((s) => ({ ...s, type, period: (types[type] || {}).defaultPeriod || s.period })); }}>
                  {Object.entries(types).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <Label>Davr</Label>
                <select className="adm-select" style={{ width: '100%' }} value={f.period} onChange={(e) => set('period', e.target.value)}>
                  {Object.entries(periods).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div>
              <Label>Tavsif (ixtiyoriy)</Label>
              <textarea className="adm-input" rows={3} style={{ resize: 'vertical', minHeight: 72 }} value={f.desc}
                onChange={(e) => set('desc', e.target.value)} placeholder="Mahsulot haqida qisqacha ma'lumot…" />
            </div>
          </Card>

          {/* Official document integration — virtual office only */}
          {f.cat === 'virtual' && <VirtualIntegrationForm />}
        </div>

        {/* Right: summary + save */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, position: 'sticky', top: 0 }}>
          <Card>
            <div style={{ font: `700 14px ${window.GO.font}`, color: 'var(--g-ink)', marginBottom: 14 }}>Katalog mahsuloti</div>
            <div style={{ aspectRatio: '4/3', borderRadius: 12, overflow: 'hidden', marginBottom: 10 }}>
              <PhotoPlaceholder hue={window.CAT_META[f.cat]?.hue ?? 30} label={`katalog · ${f.cat}`} radius={12} />
            </div>
            <div style={{ font: `400 12px ${window.GO.font}`, color: 'var(--g-ink-4)', lineHeight: 1.55 }}>
              Mahsulot butun platforma uchun umumiy. Har bir bino uni "Takliflar" orqali o'z narxi bilan qo'shadi.
            </div>
            {isEdit && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--g-line)', display: 'flex', justifyContent: 'space-between', font: `500 12.5px ${window.GO.font}`, color: 'var(--g-ink-3)' }}>
                <span>Takliflar</span>
                <span style={{ fontWeight: 700, color: 'var(--g-ink)' }}>{(product.offerings || []).length} ta bino</span>
              </div>
            )}
          </Card>

          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <Btn kind="primary" onClick={submit} disabled={busy || !f.name.trim()} style={{ justifyContent: 'center' }}>{busy ? 'Saqlanmoqda…' : (isEdit ? window.AT.save : "Katalogga qo'shish")}</Btn>
              <Btn kind="ghost" onClick={onClose} style={{ justifyContent: 'center' }}>{window.AT.cancel}</Btn>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
Object.assign(window, { ProductsScreen, ProductForm });

// ============================================================
// src/admin-sections.jsx
// ============================================================

// admin-sections.jsx — Gorent Admin: Bookings, Hosts, Buildings, Revenue, Reviews.

// ─── Filter chips row (status) ──────────────────────────────
function StatusChips({ dict, value, setValue, counts }) {
  const all = [{ k: 'all', label: window.AT.all }, ...Object.entries(dict).map(([k, v]) => ({ k, label: v.label, hue: v.hue }))];
  return (
    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
      {all.map((o) => {
        const active = value === o.k;
        return (
          <button key={o.k} onClick={() => setValue(o.k)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 13px', borderRadius: 999, cursor: 'pointer',
            border: '1px solid', borderColor: active ? 'var(--g-ink)' : 'var(--g-line)',
            background: active ? 'var(--g-ink)' : 'var(--g-card)', color: active ? '#fff' : 'var(--g-ink-2)',
            font: `600 12.5px ${window.GO.font}`, transition: 'all .14s',
          }}>
            {o.hue !== undefined && <span style={{ width: 7, height: 7, borderRadius: 999, background: active ? '#fff' : `oklch(0.6 0.16 ${o.hue})` }} />}
            {o.label}
            {counts && counts[o.k] !== undefined && <span style={{ opacity: 0.6, font: `600 11px ${window.GO.font}` }}>{counts[o.k]}</span>}
          </button>
        );
      })}
    </div>
  );
}

// ═══ BOOKINGS ═══════════════════════════════════════════════
function BookingDetailDrawer({ b, onClose, onEdit }) {
  if (!b) return <Drawer open={false} onClose={onClose} width={520}><div /></Drawer>;
  const unit = b.unit || {};
  const offering = unit.offering || {};
  const product = offering.product || {};
  const building = offering.building || {};
  const period = product.period || 'month';
  // Unit price overrides the offering (building-level) price when set.
  const price = unit.effectivePrice ?? unit.price ?? offering.price ?? 0;
  const fee = Math.round(b.total * 0.12);
  const payout = b.total - fee;
  const isHourly = period === 'hour';
  const steps = [
    { label: "So'rov yuborilgan", date: fmtDate(b.start), done: true },
    { label: "Mezbon tasdiqladi", date: fmtDate(b.start), done: b.status !== 'pending' },
    { label: "To'lov amalga oshirildi", date: fmtDate(b.start), done: ['active', 'confirmed', 'completed'].includes(b.status) },
    { label: b.status === 'cancelled' ? "Bekor qilindi" : "Yakunlandi", date: '—', done: ['completed', 'cancelled'].includes(b.status) },
  ];
  return (
    <Drawer open={!!b} onClose={onClose} width={520}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--g-line)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onClose} className="adm-iconbtn" style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--g-bg-2)', border: 0, display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--g-ink)' }}><IconClose size={17} /></button>
          <div>
            <div style={{ font: `700 16px ui-monospace, monospace`, color: 'var(--g-ink)' }}>{b.id}</div>
            <div style={{ font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>Bandlov tafsilotlari</div>
          </div>
        </div>
        <StatusPill s={b.status} dict={window.BOOKING_STATUS} />
      </div>

      <div className="adm-scroll" style={{ flex: 1, overflowY: 'auto', padding: 22 }}>
        {/* Unit */}
        <div style={{ display: 'flex', gap: 13, padding: 14, borderRadius: 13, background: 'var(--g-bg)', marginBottom: 18 }}>
          <div style={{ width: 56, height: 56, borderRadius: 11, overflow: 'hidden', flexShrink: 0 }}><PhotoPlaceholder hue={nameHue(building.name)} label="" radius={11} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: `600 14px ${window.GO.font}`, color: 'var(--g-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{unit.name || '—'} <span style={{ color: 'var(--g-ink-4)', fontWeight: 400 }}>· {window.unitTypeMeta(product.type).short}</span></div>
            <div style={{ font: `400 12px ${window.GO.font}`, color: 'var(--g-ink-4)', margin: '3px 0 7px' }}>{product.name || '—'} · {building.name || '—'}{building.district ? `, ${building.district}` : ''}</div>
            {product.cat && <CatTag cat={product.cat} />}
          </div>
        </div>

        {/* Customer */}
        <div style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink-2)', marginBottom: 10 }}>Mijoz</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <Avatar name={b.customer} size={42} hue={nameHue(b.customer)} />
          <div style={{ flex: 1 }}>
            <div style={{ font: `600 13.5px ${window.GO.font}`, color: 'var(--g-ink)' }}>{b.customer}</div>
            <div style={{ font: `400 12px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>{b.companyRef?.name ? `${b.companyRef.name}${window.taxLabel(b.companyRef) ? ` (${window.taxLabel(b.companyRef)})` : ''} · ` : ''}+{b.phone}</div>
          </div>
          <IconBtn title="Xabar" style={{ border: '1px solid var(--g-line)' }}><IconMessage size={16} /></IconBtn>
          <IconBtn title={`+${b.phone}`} onClick={() => window.open(`tel:+${b.phone}`)} style={{ border: '1px solid var(--g-line)' }}><IconPhone size={16} /></IconBtn>
        </div>

        {/* Period + payment grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          {[
            ['Boshlanish', isHourly ? `${fmtDate(b.start)} ${fmtTimeHM(b.start)}` : fmtDate(b.start)],
            ['Tugash', isHourly ? `${fmtDate(b.end)} ${fmtTimeHM(b.end)}` : fmtDate(bookingEndDisplay(b))],
            ['Muddat', b.months ? `${b.months} oy` : fmtBookingRange(b)],
            ['Narx', `${window.fmtCompactSom(price)} so'm/${window.periodLabel(period)} × ${b.qty || 1}`],
          ].map(([k, v]) => (
            <div key={k} style={{ background: 'var(--g-bg)', borderRadius: 11, padding: '11px 13px' }}>
              <div style={{ font: `400 11px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>{k}</div>
              <div style={{ font: `600 13.5px ${window.GO.font}`, color: 'var(--g-ink)', marginTop: 3 }}>{v}</div>
            </div>
          ))}
        </div>

        {/* What was agreed on this lease, and what is known about the tenant.
            Both internal; shown here because this drawer is where an operator
            looks before phoning someone. */}
        {(b.notes || b.companyRef?.notes) && (
          <div style={{ border: '1px solid var(--g-line)', borderRadius: 13, padding: 16, marginBottom: 20, background: 'var(--g-surface-2, oklch(0.98 0.004 250))' }}>
            {b.notes && (
              <div style={{ marginBottom: b.companyRef?.notes ? 12 : 0 }}>
                <div style={{ font: `600 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)', marginBottom: 4 }}>BANDLOV IZOHI</div>
                <div style={{ font: `400 13px ${window.GO.font}`, color: 'var(--g-ink-2)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{b.notes}</div>
              </div>
            )}
            {b.companyRef?.notes && (
              <div>
                <div style={{ font: `600 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)', marginBottom: 4 }}>IJARACHI HAQIDA</div>
                <div style={{ font: `400 13px ${window.GO.font}`, color: 'var(--g-ink-3)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{b.companyRef.notes}</div>
              </div>
            )}
          </div>
        )}

        {/* Money breakdown */}
        <div style={{ border: '1px solid var(--g-line)', borderRadius: 13, padding: 16, marginBottom: 20 }}>
          {[['Bandlov summasi', window.fmtSom(b.total) + " so'm"], ['Platforma komissiyasi (12%)', '− ' + window.fmtSom(fee) + " so'm"]].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 9, font: `400 13px ${window.GO.font}`, color: 'var(--g-ink-3)' }}>
              <span>{k}</span><span style={{ color: 'var(--g-ink-2)', fontWeight: 500 }}>{v}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 11, borderTop: '1px solid var(--g-line)', font: `700 14px ${window.GO.font}`, color: 'var(--g-ink)' }}>
            <span>Mezbonga to'lov</span><span>{window.fmtSom(payout)} so'm</span>
          </div>
        </div>

        {/* Money loop — payments, extra charges, contract (skip cancelled) */}
        {b.status !== 'cancelled' && <BookingMoneySections b={b} />}

        {/* Timeline */}
        <div style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink-2)', marginBottom: 12 }}>Holat tarixi</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ width: 18, height: 18, borderRadius: 999, flexShrink: 0, display: 'grid', placeItems: 'center',
                  background: s.done ? 'var(--g-brand)' : 'var(--g-bg-2)', color: '#fff' }}>{s.done && <IconCheck size={11} />}</span>
                {i < steps.length - 1 && <span style={{ width: 2, flex: 1, minHeight: 22, background: s.done ? 'var(--g-brand)' : 'var(--g-line)' }} />}
              </div>
              <div style={{ paddingBottom: 14 }}>
                <div style={{ font: `${s.done ? 600 : 400} 13px ${window.GO.font}`, color: s.done ? 'var(--g-ink)' : 'var(--g-ink-4)' }}>{s.label}</div>
                <div style={{ font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 1 }}>{s.date}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, padding: '16px 22px', borderTop: '1px solid var(--g-line)', background: 'var(--g-card)', flexShrink: 0 }}>
        {b.status === 'pending'
          ? <><Btn kind="primary" style={{ flex: 1, justifyContent: 'center' }} onClick={async () => { await gorentMutate(() => api.post(`/bookings/${b.id}/approve`)); onClose(); }}><IconCheck2 size={16} /> {window.AT.approve}</Btn><Btn kind="danger" style={{ flex: 1, justifyContent: 'center' }} onClick={async () => { await gorentMutate(() => api.post(`/bookings/${b.id}/reject`)); onClose(); }}><IconX2 size={16} /> {window.AT.reject}</Btn></>
          : <><Btn kind="ghost" style={{ flex: 1, justifyContent: 'center' }}><IconDownload size={16} /> Chek</Btn><Btn kind="ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => onEdit && onEdit(b)}><IconEdit size={16} /> {window.AT.edit}</Btn>{['active','confirmed'].includes(b.status) && <Btn kind="danger" style={{ justifyContent: 'center' }} onClick={async () => { if (window.confirm(`${b.id} bandlovni bekor qilasizmi?`)) { await gorentMutate(() => api.post(`/bookings/${b.id}/cancel`)); onClose(); } }}><IconX2 size={16} /></Btn>}</>}
      </div>
    </Drawer>
  );
}

// Monthly lease term, mirrored from the API's src/common/term.ts so the form
// previews exactly what the backend will bill. A term may end mid-month; the
// final month is charged pro-rata by days.
function addMonthsClamped(d, months) {
  const r = new Date(d);
  const day = r.getDate();
  r.setDate(1);
  r.setMonth(r.getMonth() + months);
  const lastDay = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
  r.setDate(Math.min(day, lastDay));
  return r;
}
function daysBetween(a, b) {
  const midnight = (d) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((midnight(b) - midnight(a)) / 86400000);
}
function monthlyTerm(start, end, monthlyPrice, qty = 1) {
  if (!start || !end || !(end > start)) return null;
  const monthly = monthlyPrice * qty;
  let cursor = new Date(start);
  let months = 0;
  let total = 0;
  for (;;) {
    const next = addMonthsClamped(start, months + 1);
    if (next > end) break;
    total += monthly;
    cursor = next;
    months++;
  }
  const tailDays = daysBetween(cursor, end);
  let tail = null;
  if (tailDays > 0) {
    const daysInMonth = daysBetween(cursor, addMonthsClamped(cursor, 1));
    const amount = Math.round((monthly * tailDays) / daysInMonth);
    tail = { days: tailDays, daysInMonth, amount };
    total += amount;
  }
  return { months, tailDays, tail, total };
}
function termLabelUz(months, tailDays) {
  const parts = [];
  if (months > 0) parts.push(`${months} oy`);
  if (tailDays > 0) parts.push(`${tailDays} kun`);
  return parts.length ? parts.join(' ') : '0 kun';
}

// Quantity (Soni) only makes sense for fungible, countable inventory —
// hot-desks and virtual-office packages, where you can take several at once.
// Single spaces (rooms, meeting/conference rooms, area) are qty 1. Reads the
// per-type spec (window.META.unitTypes) so this can't drift from the API.
function isCountableUnit(type) {
  return !!window.unitTypeMeta(type)?.fungible;
}

// Monthly lease dates are pure calendar dates — parse them at UTC midnight so
// the server (which runs UTC) reads the same day the operator picked. Sending
// a LOCAL-midnight date shifts it back ~5h in UTC+5 and the container would
// bill the wrong month.
function utcMidnight(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function addUTCDays(dt, n) {
  const r = new Date(dt);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}
// The picked monthly end date is the LAST day of the lease (inclusive), so the
// exclusive boundary the term schedule needs is the day after. This makes
// 01.07 → 31.07 exactly one full month, not a 30/31 pro-rata stub.
function monthlyEndExclusive(ymd) {
  return addUTCDays(utcMidnight(ymd), 1);
}

// Booking form — create AND edit. Month-period units take a company (required)
// + an end date (the term may end mid-month, billed pro-rata); hour/day units
// take start/end with an availability preview for the day. Editing re-sends the
// full payload via PATCH: the server re-prices the term and re-checks slot
// conflicts (excluding this booking), so every field is editable except for
// cancelled/completed bookings, which the server rejects.
function BookingForm({ booking, onClose, onSave }) {
  const isEdit = !!booking;
  const [f, setF] = React.useState(() => {
    if (!booking) return {
      unitId: ((window.UNITS || [])[0] || {}).id || '', customer: '', phone: '', companyId: '', notes: '',
      qty: 1, months: 1, price: '', date: '', startTime: '09:00', endTime: '10:00', endDate: '',
      // Additional rented units for a monthly bundle (office + desks + address).
      // Each is { unitId, qty, start, end, price }; all must be monthly units in
      // the primary's building.
      extraItems: [],
    };
    // Reconstruct the picker inputs from the stored booking. Monthly terms are
    // UTC-anchored with an EXCLUSIVE end (last day + 1), so the inclusive end
    // date shown is end − 1; hour/day terms are stored in local time.
    const period = booking.unit?.offering?.product?.period || 'month';
    const items = booking.items || [];
    const primary = items.find((i) => i.unitId === booking.unitId) || items[0] || null;
    const extras = items.filter((i) => i !== primary);
    const pad = (n) => String(n).padStart(2, '0');
    const ymdUTC = (iso) => { const d = new Date(iso); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };
    const ymdLocal = (iso) => { const d = new Date(iso); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
    const base = {
      unitId: booking.unitId, customer: booking.customer, phone: booking.phone || '',
      companyId: booking.companyId || '', notes: booking.notes || '', qty: booking.qty || 1, months: booking.months || 1,
      // Prefill the negotiated rate so an edit preserves it (monthly only; the
      // hourly/daily rate isn't stored per-unit, so it falls back to catalog).
      price: primary?.monthlyPrice ?? '',
      date: '', startTime: '09:00', endTime: '10:00', endDate: '', extraItems: [],
    };
    if (period === 'hour') {
      base.date = ymdLocal(booking.start);
      base.startTime = fmtTimeHM(booking.start);
      base.endTime = fmtTimeHM(booking.end);
    } else if (period === 'day') {
      base.date = ymdLocal(booking.start);
      base.endDate = ymdLocal(booking.end);
    } else {
      base.date = ymdUTC(primary?.start ?? booking.start);
      base.endDate = ymdUTC(endMinusDay(primary?.end ?? booking.end));
      base.extraItems = extras.map((it) => ({
        unitId: it.unitId, qty: it.qty,
        start: ymdUTC(it.start), end: ymdUTC(endMinusDay(it.end)),
        price: it.monthlyPrice ?? '',
      }));
    }
    return base;
  });
  const [companies, setCompanies] = React.useState(() => window.COMPANIES || []);
  const [avail, setAvail] = React.useState(null);
  const [err, setErr] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const Label = ({ children }) => <div style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink-2)', marginBottom: 7 }}>{children}</div>;

  const units = window.UNITS || [];
  const unit = units.find((u) => u.id === f.unitId);
  const period = (unit && unit.offering?.product?.period) || 'month';
  // GET /units returns effectivePrice (unit.price ?? offering.price). For area
  // units this is the per-m² rate.
  const unitPrice = (u) => u.effectivePrice ?? u.price ?? u.offering?.price ?? 0;
  const isAreaUnit = (u) => u?.offering?.product?.type === 'area';
  // The effective per-unit period rate: area units bill rate × m².
  const rateFor = (u) => isAreaUnit(u) ? unitPrice(u) * (u.m2 || 0) : unitPrice(u);
  // A blank/invalid negotiated-price override falls back to the catalog rate.
  const priceNum = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v));
  // Effective line rate: an explicit override wins (absolute, per period — NOT
  // ×m² even for area units, matching the server), else the catalog rate.
  const priceOr = (u, override) => { const p = priceNum(override); return p != null ? p : rateFor(u); };
  // Soni is shown only for countable units; area-priced spaces are always qty 1.
  const showQty = isCountableUnit(unit?.offering?.product?.type);
  const effectiveQty = showQty ? (Number(f.qty) || 1) : 1;

  // Hosts don't get companies preloaded — fetch on demand for the select.
  React.useEffect(() => {
    if (companies.length) return;
    api.get('/companies').then((d) => setCompanies(d || [])).catch(() => {});
  }, []);

  // Busy slots for hour/day units on the picked date.
  React.useEffect(() => {
    setAvail(null);
    if (!unit || period === 'month' || !f.date) return undefined;
    let live = true;
    api.get(`/bookings/availability?unit=${encodeURIComponent(unit.id)}&date=${encodeURIComponent(f.date)}`)
      .then((d) => { if (live) setAvail(d); })
      .catch(() => {});
    return () => { live = false; };
  }, [f.unitId, f.date, isEdit]);

  // Client-side start/end + total preview.
  const startDt = period === 'hour'
    ? (f.date && f.startTime ? new Date(`${f.date}T${f.startTime}`) : null)
    : (f.date ? new Date(`${f.date}T00:00:00`) : null);
  const endDt = period === 'hour'
    ? (f.date && f.endTime ? new Date(`${f.date}T${f.endTime}`) : null)
    // Daily: the end date is the last day used, so bill through end-of-day
    // (01.07 → 31.07 = 31 days, not 30).
    : period === 'day'
    ? (f.endDate ? new Date(`${f.endDate}T23:59:59.999`) : null)
    : null;
  // Monthly: UTC-midnight start + exclusive end boundary (last day + 1). These
  // are what get sent AND previewed, so the operator sees exactly what the
  // server will bill.
  const mStart = period === 'month' && f.date ? utcMidnight(f.date) : null;
  const mEndExcl = period === 'month' && f.endDate ? monthlyEndExclusive(f.endDate) : null;
  let spanLabel = '';
  let total = 0;
  // Resolve a unit's booked qty (fungible → chosen qty, else 1).
  const qtyOf = (u, q) => (isCountableUnit(u?.offering?.product?.type) ? (Number(q) || 1) : 1);
  // Monthly booking may bundle several units (primary + extras). Each line has
  // its OWN term (defaults to the primary's dates); the booking total is the sum.
  const monthlyItems = period === 'month'
    ? [{ unitId: f.unitId, qty: f.qty, start: f.date, end: f.endDate, price: f.price }, ...(f.extraItems || [])]
    : [];
  const itemTerms = period === 'month'
    ? monthlyItems.map((it) => {
        const u = units.find((x) => x.id === it.unitId);
        const s = it.start ? utcMidnight(it.start) : null;
        const e = it.end ? monthlyEndExclusive(it.end) : null;
        if (!u || !s || !e || !(e > s)) return null;
        const q = qtyOf(u, it.qty);
        return { unit: u, qty: q, start: s, end: e, term: monthlyTerm(s, e, priceOr(u, it.price), q) };
      }).filter((x) => x && x.term)
    : [];
  // All items must resolve to a valid term for the bundle to be submittable.
  const allItemsValid = period !== 'month' || itemTerms.length === monthlyItems.length;
  // The term shape (months / pro-rata tail) — take the first line's for labels.
  const term = itemTerms.length ? itemTerms[0].term : null;
  // Monthly units in the primary's building that can be added as extra lines.
  const primaryBuildingId = unit?.offering?.building?.id;
  const addableUnits = period === 'month' && unit
    ? units.filter((u) => u.offering?.product?.period === 'month'
        && u.offering?.building?.id === primaryBuildingId
        && u.id !== f.unitId
        && !(f.extraItems || []).some((e) => e.unitId === u.id))
    : [];
  // New lines default to the primary's dates; the operator can change them.
  const addExtra = () => { const a = addableUnits[0]; if (a) setF((s) => ({ ...s, extraItems: [...(s.extraItems || []), { unitId: a.id, qty: 1, start: s.date, end: s.endDate, price: '' }] })); };
  const setExtra = (i, k, v) => setF((s) => { const arr = [...(s.extraItems || [])]; arr[i] = { ...arr[i], [k]: v }; return { ...s, extraItems: arr }; });
  const removeExtra = (i) => setF((s) => ({ ...s, extraItems: (s.extraItems || []).filter((_, idx) => idx !== i) }));
  if (period === 'month') {
    if (term) {
      spanLabel = termLabelUz(term.months, term.tailDays);
      total = itemTerms.reduce((s, it) => s + it.term.total, 0);
    }
  } else if (startDt && endDt && endDt > startDt) {
    const ms = endDt.getTime() - startDt.getTime();
    const spanCount = period === 'hour' ? Math.ceil(ms / 3600000) : Math.max(1, Math.ceil(ms / 86400000));
    spanLabel = `${spanCount} ${window.periodLabel(period)}`;
    total = unit ? priceOr(unit, f.price) * spanCount * effectiveQty : 0;
  }

  // Changing the unit can switch the billing period (hour ↔ day ↔ month). The
  // period-specific pickers differ, so seed a sensible default term for the new
  // period when its inputs are empty — otherwise Save silently disables because
  // e.g. a monthly unit needs an end date the hourly form never had.
  const onUnitChange = (v) => setF((s) => {
    const nu = units.find((u) => u.id === v);
    const np = nu?.offering?.product?.period || 'month';
    // A negotiated rate belongs to the old unit — clear it so the new unit bills
    // at its own catalog rate (the operator can re-enter an override).
    const next = { ...s, unitId: v, price: '' };
    if ((np === 'month' || np === 'day') && s.date && !s.endDate) {
      if (np === 'day') {
        next.endDate = s.date; // one-day default
      } else {
        // One whole month: the inclusive end date is (start + 1 month − 1 day).
        const d = utcMidnight(s.date);
        d.setUTCMonth(d.getUTCMonth() + 1);
        const incl = addUTCDays(d, -1);
        const pad = (n) => String(n).padStart(2, '0');
        next.endDate = `${incl.getUTCFullYear()}-${pad(incl.getUTCMonth() + 1)}-${pad(incl.getUTCDate())}`;
      }
    }
    return next;
  });

  // Blacklist check on whoever this booking now points at. Debounced because
  // it re-runs as the phone is typed. A failed check never blocks the form —
  // the API refuses the booking anyway, so a warning we couldn't fetch must
  // not stop legitimate work.
  const [bl, setBl] = React.useState(null);
  const [blConfirmed, setBlConfirmed] = React.useState(false);
  const isPlatform = (api.currentUser() || {}).role === 'platform';
  const blPhone = f.phone.trim();
  React.useEffect(() => {
    setBlConfirmed(false);
    if (!f.companyId && blPhone.replace(/\D/g, '').length < 9) { setBl(null); return; }
    let dead = false;
    const t = setTimeout(async () => {
      const q = new URLSearchParams();
      if (f.companyId) q.set('companyId', f.companyId);
      if (blPhone) q.set('phone', blPhone);
      try {
        const res = await api.get(`/blacklist/check?${q.toString()}`);
        if (!dead) setBl(res);
      } catch { if (!dead) setBl(null); }
    }, 350);
    return () => { dead = true; clearTimeout(t); };
  }, [f.companyId, blPhone]);
  // Host: hard stop. Platform: stop until they tick the confirmation.
  const blStops = !!(bl && bl.blocked && (!isPlatform || !blConfirmed));

  // Same validation for create and edit — dates/term/company are now editable.
  const canSubmit = !!(f.customer.trim() && unit && startDt && !blStops
    && (period === 'month' ? (term && f.companyId && allItemsValid) : (endDt && endDt > startDt)));
  // Why Save is disabled — surfaced so it's never a dead button.
  let disabledReason = '';
  if (blStops) disabledReason = isPlatform ? "Qora ro'yxatni tasdiqlang" : "Ijarachi qora ro'yxatda";
  else if (!f.customer.trim()) disabledReason = 'Mijoz ismini kiriting';
  else if (!unit) disabledReason = 'Birlik tanlang';
  else if (period === 'month') {
    if (!f.date || !f.endDate) disabledReason = "Sana oralig'ini tanlang";
    else if (!term) disabledReason = "Tugash sanasi boshlanishdan keyin bo'lishi kerak";
    else if (!f.companyId) disabledReason = 'Kompaniyani tanlang';
    else if (!allItemsValid) disabledReason = "Qo'shimcha birliklar sanasini tekshiring";
  } else {
    if (!startDt || !endDt) disabledReason = "Vaqt oralig'ini tanlang";
    else if (!(endDt > startDt)) disabledReason = "Tugash vaqti boshlanishdan keyin bo'lishi kerak";
  }

  const submit = async () => {
    if (!canSubmit) return;
    setErr(null); setBusy(true);
    try {
      let payload;
      if (period === 'month') {
        // Each line carries its own term (UTC-midnight start, exclusive end) and
        // an optional negotiated rate.
        const items = monthlyItems.map((it) => {
          const u = units.find((x) => x.id === it.unitId);
          const pr = priceNum(it.price);
          return {
            unitId: it.unitId, qty: qtyOf(u, it.qty),
            start: utcMidnight(it.start).toISOString(),
            end: monthlyEndExclusive(it.end).toISOString(),
            ...(pr != null ? { price: pr } : {}),
          };
        });
        payload = {
          items, customer: f.customer.trim(), phone: f.phone.trim(),
          companyId: f.companyId, start: mStart.toISOString(), end: mEndExcl.toISOString(),
          notes: f.notes.trim() || null,
          ...(blConfirmed ? { overrideBlacklist: true } : {}),
        };
      } else {
        const pr = priceNum(f.price);
        payload = {
          unitId: f.unitId, customer: f.customer.trim(), phone: f.phone.trim(),
          start: startDt.toISOString(), end: endDt.toISOString(), qty: effectiveQty,
          ...(f.companyId ? { companyId: f.companyId } : {}),
          ...(pr != null ? { price: pr } : {}),
          notes: f.notes.trim() || null,
          ...(blConfirmed ? { overrideBlacklist: true } : {}),
        };
      }
      if (isEdit) await api.patch(`/bookings/${booking.id}`, payload);
      // Operator-created bookings are confirmed on the spot (the operator is
      // making the reservation, not requesting one), so they immediately hold
      // the slot AND count toward the building's occupied m². Only future
      // marketplace requests would come in as 'pending'.
      else await api.post('/bookings', { ...payload, status: 'confirmed' });
      if (window.__gorentRefresh) await window.__gorentRefresh();
      onSave();
    } catch (e) {
      // 409 (slot band) / 400 come back with an Uzbek message — surface it inline.
      setErr(e && e.message ? e.message : 'Xatolik yuz berdi');
      setBusy(false);
    }
  };

  const unitLabel = (u) => {
    const prod = u.offering?.product || {};
    const tm = window.unitTypeMeta(prod.type);
    return `${u.offering?.building?.name || '—'} · ${prod.name || '—'} · ${u.name} (${tm.short}, ${window.fmtSom(unitPrice(u))} so'm/${window.periodLabel(prod.period)})`;
  };

  // Negotiated-rate override for the primary unit — on its own row so the tight
  // date/time pickers don't squeeze it. Placeholder shows the catalog rate.
  const priceRow = (
    <div style={{ marginTop: 14, maxWidth: 260 }}>
      <Label>Narx/{window.periodLabel(period)} (kelishilgan, ixtiyoriy)</Label>
      <input className="adm-input" type="number" min={0} value={f.price} onChange={(e) => set('price', e.target.value)} placeholder={unit ? window.fmtSom(rateFor(unit)) : ''} />
    </div>
  );

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      <button onClick={onClose} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--g-ink-3)', font: `600 13px ${window.GO.font}`, marginBottom: 16, padding: 0 }}>
        <IconChevL size={16} /> {window.AT.back}
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Card>
            <div style={{ font: `700 15px ${window.GO.font}`, color: 'var(--g-ink)', marginBottom: 16 }}>Mijoz ma'lumotlari</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <Label>Ism familiya</Label>
                <input className="adm-input" value={f.customer} onChange={(e) => set('customer', e.target.value)} placeholder="Bekzod Yusupov" />
              </div>
              <div>
                <Label>Telefon raqami</Label>
                <input className="adm-input" value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+998901234567" />
              </div>
            </div>
            <div>
              <Label>Kompaniya (ijarachi){period === 'month' ? ' — majburiy' : ''}</Label>
              <select className="adm-select" style={{ width: '100%' }} value={f.companyId} onChange={(e) => set('companyId', e.target.value)}>
                <option value="">— Tanlanmagan —</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name} · {window.taxLabel(c)}</option>)}
              </select>
              {period === 'month' && !f.companyId && (
                <div style={{ marginTop: 8, font: `500 12px ${window.GO.font}`, color: 'oklch(0.5 0.14 70)' }}>
                  Oylik ijara uchun kompaniya tanlash majburiy (hisob-faktura shu nomga chiqadi).
                </div>
              )}
            </div>

            {/* This lease specifically — what was agreed for it, as distinct
                from what is known about the tenant. Internal, like the
                tenant's own notes. */}
            <div style={{ marginTop: 14 }}>
              <Label>Ichki izoh (shu bandlov uchun)</Label>
              <textarea className="adm-input" rows={2} style={{ resize: 'vertical', lineHeight: 1.45 }}
                value={f.notes} onChange={(e) => set('notes', e.target.value)}
                placeholder="Kelishuv shartlari, alohida talablar…" />
            </div>

            {/* Blacklist hit. A host sees why and stops here; a platform
                operator can proceed, but only by saying so out loud. */}
            {bl && bl.blocked && (
              <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 10, background: 'oklch(0.96 0.03 25)', border: '1px solid oklch(0.82 0.11 25)' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', font: `700 13px ${window.GO.font}`, color: 'oklch(0.45 0.17 25)' }}>
                  <IconWarn size={16} /> Ijarachi qora ro'yxatda
                </div>
                {bl.entries.map((e) => (
                  <div key={e.id} style={{ marginTop: 6, font: `500 12.5px ${window.GO.font}`, color: 'oklch(0.42 0.12 25)' }}>
                    {e.company?.name || e.phone} — {e.reason}
                    {e.note && <span style={{ color: 'var(--g-ink-4)', fontWeight: 400 }}> · {e.note}</span>}
                  </div>
                ))}
                {isPlatform ? (
                  <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10, cursor: 'pointer', font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink-2)' }}>
                    <input type="checkbox" checked={blConfirmed} onChange={(e) => setBlConfirmed(e.target.checked)} />
                    Ogohlantirishni ko'rdim, baribir bandlov yarataman
                  </label>
                ) : (
                  <div style={{ marginTop: 8, font: `400 12px ${window.GO.font}`, color: 'var(--g-ink-3)' }}>
                    Bandlov yaratish uchun platforma operatoriga murojaat qiling.
                  </div>
                )}
              </div>
            )}
          </Card>

          {(
            <Card>
              <div style={{ font: `700 15px ${window.GO.font}`, color: 'var(--g-ink)', marginBottom: 16 }}>Birlik va muddat</div>
              <div style={{ marginBottom: 14 }}>
                <Label>Birlik</Label>
                {units.length === 0 ? (
                  <div style={{ padding: '12px 14px', borderRadius: 10, background: 'oklch(0.97 0.02 70)', border: '1px solid oklch(0.88 0.06 70)', font: `500 12.5px ${window.GO.font}`, color: 'oklch(0.45 0.1 70)' }}>
                    Hozircha birliklar yo'q. Avval <b>Binolar</b> bo'limida bino yarating, so'ng uning ichida
                    <b> «Taklif qo'shish»</b> orqali katalogdan mahsulot tanlab, narx belgilang — birlik avtomatik yaratiladi.
                  </div>
                ) : (
                  <select className="adm-select" style={{ width: '100%' }} value={f.unitId} onChange={(e) => onUnitChange(e.target.value)}>
                    {units.map((u) => <option key={u.id} value={u.id}>{unitLabel(u)}</option>)}
                  </select>
                )}
              </div>

              {period === 'month' ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: showQty ? '1fr 1fr 1fr' : '1fr 1fr', gap: 14 }}>
                    <div>
                      <Label>Boshlanish sanasi</Label>
                      <DateField value={f.date} onChange={(v) => set('date', v)} />
                    </div>
                    <div>
                      <Label>Tugash sanasi</Label>
                      <DateField min={f.date || undefined} value={f.endDate} onChange={(v) => set('endDate', v)} />
                    </div>
                    {showQty && (
                      <div>
                        <Label>Soni</Label>
                        <input className="adm-input" type="number" min={1} value={f.qty} onChange={(e) => set('qty', e.target.value)} />
                      </div>
                    )}
                  </div>
                  {priceRow}
                  {/* Term preview: whole months + pro-rata tail (matches the API). */}
                  {term && (
                    <div style={{ marginTop: 12, padding: '11px 13px', borderRadius: 10, background: 'var(--g-bg)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink-2)' }}>
                        <span>Muddat</span><span>{termLabelUz(term.months, term.tailDays)}</span>
                      </div>
                      {term.tail && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, font: `400 12px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>
                          <span>Oxirgi oy (to'liq emas)</span>
                          <span>{term.tail.days}/{term.tail.daysInMonth} kun · {window.fmtSom(term.tail.amount)} so'm</span>
                        </div>
                      )}
                    </div>
                  )}
                  {f.date && f.endDate && !term && (
                    <div style={{ marginTop: 12, font: `500 12px ${window.GO.font}`, color: 'oklch(0.5 0.16 25)' }}>
                      Tugash sanasi boshlanishdan keyin bo'lishi kerak.
                    </div>
                  )}
                  {/* Additional units — one booking may bundle several monthly
                      products in the same building (office + desks + address). */}
                  {(f.extraItems || []).length > 0 && (
                    <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {f.extraItems.map((it, i) => {
                        const eu = units.find((u) => u.id === it.unitId);
                        const euShowQty = isCountableUnit(eu?.offering?.product?.type);
                        const opts = [eu, ...addableUnits].filter(Boolean);
                        return (
                          <div key={i} style={{ padding: '11px 12px', borderRadius: 10, background: 'var(--g-bg)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: euShowQty ? '1fr 90px auto' : '1fr auto', gap: 10, alignItems: 'end' }}>
                              <div>
                                <Label>Qo'shimcha birlik {i + 2}</Label>
                                <select className="adm-select" style={{ width: '100%' }} value={it.unitId} onChange={(e) => setF((s) => { const arr = [...(s.extraItems || [])]; arr[i] = { ...arr[i], unitId: e.target.value, price: '' }; return { ...s, extraItems: arr }; })}>
                                  {opts.map((u) => <option key={u.id} value={u.id}>{unitLabel(u)}</option>)}
                                </select>
                              </div>
                              {euShowQty && (
                                <div>
                                  <Label>Soni</Label>
                                  <input className="adm-input" type="number" min={1} value={it.qty} onChange={(e) => setExtra(i, 'qty', e.target.value)} />
                                </div>
                              )}
                              <Btn kind="ghost" sm onClick={() => removeExtra(i)}><IconTrash size={14} /></Btn>
                            </div>
                            {/* Per-line term + rate — differ from the primary when the operator changes them. */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 8 }}>
                              <div>
                                <Label>Boshlanish</Label>
                                <DateField value={it.start || ''} onChange={(v) => setExtra(i, 'start', v)} />
                              </div>
                              <div>
                                <Label>Tugash</Label>
                                <DateField min={it.start || undefined} value={it.end || ''} onChange={(v) => setExtra(i, 'end', v)} />
                              </div>
                              <div>
                                <Label>Narx/oy (ixtiyoriy)</Label>
                                <input className="adm-input" type="number" min={0} value={it.price || ''} onChange={(e) => setExtra(i, 'price', e.target.value)} placeholder={eu ? window.fmtSom(rateFor(eu)) : ''} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {addableUnits.length > 0 && (
                    <Btn kind="ghost" sm style={{ marginTop: 10 }} onClick={addExtra}><IconPlus size={14} /> Birlik qo'shish</Btn>
                  )}
                </>
              ) : period === 'hour' ? (
                <>
                <div style={{ display: 'grid', gridTemplateColumns: showQty ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr', gap: 14 }}>
                  <div>
                    <Label>Sana</Label>
                    <DateField value={f.date} onChange={(v) => set('date', v)} />
                  </div>
                  <div>
                    <Label>Boshlanish</Label>
                    <input className="adm-input" type="time" value={f.startTime} onChange={(e) => set('startTime', e.target.value)} />
                  </div>
                  <div>
                    <Label>Tugash</Label>
                    <input className="adm-input" type="time" value={f.endTime} onChange={(e) => set('endTime', e.target.value)} />
                  </div>
                  {showQty && (
                    <div>
                      <Label>Soni</Label>
                      <input className="adm-input" type="number" min={1} value={f.qty} onChange={(e) => set('qty', e.target.value)} />
                    </div>
                  )}
                </div>
                {priceRow}
                </>
              ) : (
                <>
                <div style={{ display: 'grid', gridTemplateColumns: showQty ? '1fr 1fr 1fr' : '1fr 1fr', gap: 14 }}>
                  <div>
                    <Label>Boshlanish sanasi</Label>
                    <DateField value={f.date} onChange={(v) => set('date', v)} />
                  </div>
                  <div>
                    <Label>Tugash sanasi</Label>
                    <DateField min={f.date || undefined} value={f.endDate} onChange={(v) => set('endDate', v)} />
                  </div>
                  {showQty && (
                    <div>
                      <Label>Soni</Label>
                      <input className="adm-input" type="number" min={1} value={f.qty} onChange={(e) => set('qty', e.target.value)} />
                    </div>
                  )}
                </div>
                {priceRow}
                </>
              )}

              {/* Availability — busy slots on the picked date (the booking being
                  edited is excluded, since it doesn't conflict with itself). */}
              {period !== 'month' && f.date && avail && (() => {
                const busy = (avail.busy || []).filter((s) => !isEdit || s.id !== booking.id);
                return (
                <div style={{ marginTop: 14, padding: '11px 13px', borderRadius: 10, background: 'var(--g-bg)' }}>
                  <div style={{ font: `600 12px ${window.GO.font}`, color: 'var(--g-ink-2)', marginBottom: 6 }}>
                    Bandlik · {fmtDate(f.date + 'T00:00:00')}
                  </div>
                  {busy.length === 0
                    ? <div style={{ font: `400 12.5px ${window.GO.font}`, color: 'oklch(0.5 0.13 155)' }}>Bu kunda band emas — barcha vaqtlar bo'sh.</div>
                    : busy.map((s) => (
                        <div key={s.id} style={{ font: `500 12.5px ${window.GO.font}`, color: 'oklch(0.5 0.15 25)', marginBottom: 3 }}>
                          Band: {period === 'hour' ? `${fmtTimeHM(s.start)}–${fmtTimeHM(s.end)}` : `${fmtDate(s.start)} – ${fmtDate(s.end)}`} ({s.qty}/{avail.qty})
                        </div>
                      ))}
                </div>
                );
              })()}
            </Card>
          )}

          {err && (
            <div style={{ font: `500 13px ${window.GO.font}`, color: 'oklch(0.5 0.16 25)', background: 'oklch(0.96 0.04 25)', padding: '11px 14px', borderRadius: 10 }}>{err}</div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {unit && (
            <Card>
              <div style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink-2)', marginBottom: 12 }}>Tanlangan birlik</div>
              <div style={{ width: '100%', height: 100, borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}><PhotoPlaceholder hue={unit.offering?.building?.hue ?? nameHue(unit.name)} label={unit.name} radius={10} /></div>
              <div style={{ font: `600 13px ${window.GO.font}`, color: 'var(--g-ink)', marginBottom: 4 }}>{unit.name} · {window.unitTypeMeta(unit.offering?.product?.type).short}</div>
              <div style={{ font: `400 12px ${window.GO.font}`, color: 'var(--g-ink-4)', marginBottom: 8 }}>{unit.offering?.product?.name} · {unit.offering?.building?.name}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', font: `500 13px ${window.GO.font}`, color: 'var(--g-ink-2)' }}>
                <span>Narx</span>
                <span style={{ fontWeight: 700, color: 'var(--g-ink)' }}>{window.fmtCompactSom(unitPrice(unit))} so'm/{isAreaUnit(unit) ? 'm²/' : ''}{window.periodLabel(period)}</span>
              </div>
              {isAreaUnit(unit) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', font: `500 12.5px ${window.GO.font}`, color: 'var(--g-ink-3)', marginTop: 6 }}>
                  <span>Maydon</span>
                  <span>{unit.m2 || 0} m² × {window.fmtCompactSom(unitPrice(unit))} = {window.fmtCompactSom(rateFor(unit))} so'm/{window.periodLabel(period)}</span>
                </div>
              )}
              {total > 0 && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--g-line)' }}>
                  {period === 'month' && itemTerms.length > 1 && itemTerms.map((it, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', font: `400 12px ${window.GO.font}`, color: 'var(--g-ink-3)', marginBottom: 5 }}>
                      <span>{it.unit.name}{it.qty > 1 ? ` × ${it.qty}` : ''} · {termLabelUz(it.term.months, it.term.tailDays)}</span>
                      <span>{window.fmtCompactSom(it.term.total)} so'm</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', font: `600 13px ${window.GO.font}`, color: 'var(--g-ink-2)' }}>
                    <span>Jami {period === 'month' && itemTerms.length > 1 ? `(${spanLabel}, ${itemTerms.length} birlik)` : `(${spanLabel}${showQty ? ` × ${effectiveQty}` : ''})`}</span>
                    <span style={{ fontWeight: 700, color: 'var(--g-brand)' }}>{window.fmtCompactSom(total)} so'm</span>
                  </div>
                </div>
              )}
            </Card>
          )}

          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {!canSubmit && disabledReason && (
                <div style={{ font: `500 12px ${window.GO.font}`, color: 'oklch(0.5 0.14 70)', textAlign: 'center' }}>{disabledReason}</div>
              )}
              <Btn kind="primary" style={{ justifyContent: 'center' }} onClick={submit} disabled={busy || !canSubmit}><IconCheck size={16} /> {busy ? 'Saqlanmoqda…' : window.AT.save}</Btn>
              <Btn kind="ghost" style={{ justifyContent: 'center' }} onClick={onClose}>{window.AT.cancel}</Btn>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function BookingsScreen({ search, role, route, setRoute }) {
  const [status, setStatus] = React.useState('all');
  const detail = route.sub === 'detail' ? (window.BOOKINGS.find((b) => b.id === route.id) || null) : null;
  const openDetail = (b) => setRoute({ section: 'bookings', sub: 'detail', id: b.id });
  const closeDetail = () => setRoute({ section: 'bookings' });
  let rows = window.BOOKINGS.filter((b) => status === 'all' || b.status === status);
  if (search) rows = rows.filter((b) => (b.id + ' ' + b.customer + ' ' + (b.companyRef?.name || '') + ' ' + (b.unit?.name || '') + ' ' + (b.unit?.offering?.product?.name || '') + ' ' + (b.unit?.offering?.building?.name || '')).toLowerCase().includes(search.toLowerCase()));
  const counts = { all: window.BOOKINGS.length };
  Object.keys(window.BOOKING_STATUS).forEach((k) => counts[k] = window.BOOKINGS.filter((b) => b.status === k).length);

  const columns = [
    { key: 'id', label: 'ID', render: (b) => <span style={{ fontFamily: 'ui-monospace, monospace', font: `600 12px ui-monospace, monospace`, color: 'var(--g-ink-2)' }}>{b.id}</span> },
    { key: 'cust', label: 'Mijoz', render: (b) => <PersonCell name={b.customer} sub={b.companyRef?.name} hue={nameHue(b.customer)} /> },
    { key: 'unit', label: 'Birlik', render: (b) => (
      <div style={{ minWidth: 0 }}>
        <div style={{ font: `600 13px ${window.GO.font}`, color: 'var(--g-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>{b.unit?.name || '—'} <span style={{ color: 'var(--g-ink-4)', fontWeight: 400 }}>· {b.unit?.offering?.building?.name || '—'}</span></div>
        {b.unit?.offering?.product?.cat && <div style={{ marginTop: 4 }}><CatTag cat={b.unit.offering.product.cat} /></div>}
      </div>
    ) },
    { key: 'period', label: 'Muddat', render: (b) => (
      <div>
        <div style={{ font: `500 13px ${window.GO.font}`, color: 'var(--g-ink)' }}>{fmtBookingRange(b)}</div>
        {b.months ? <div style={{ font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>{b.months} oy</div> : null}
      </div>
    ) },
    { key: 'total', label: 'Summa', align: 'right', render: (b) => <MoneyCell n={b.total} /> },
    { key: 'status', label: window.AT.status, render: (b) => <StatusPill s={b.status} dict={window.BOOKING_STATUS} /> },
    { key: 'act', label: '', align: 'right', render: (b) => (
      <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
        {b.status === 'pending' && <IconBtn title="Tasdiqlash" onClick={() => gorentMutate(() => api.post(`/bookings/${b.id}/approve`))} style={{ color: 'oklch(0.52 0.13 155)' }}><IconCheck2 size={16} /></IconBtn>}
        <IconBtn title="Ko'rish" onClick={() => openDetail(b)}><IconEye size={16} /></IconBtn>
        <IconBtn title="Tahrirlash" onClick={(e) => { e.stopPropagation(); setRoute({ section: 'bookings', sub: 'edit', id: b.id }); }}><IconEdit size={16} /></IconBtn>
      </div>
    ) },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
        <StatusChips dict={window.BOOKING_STATUS} value={status} setValue={setStatus} counts={counts} />
        <Btn kind="ghost" sm><IconDownload size={15} /> {window.AT.export}</Btn>
      </div>
      <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} onRow={(b) => openDetail(b)} />
      <BookingDetailDrawer b={detail} onClose={closeDetail} onEdit={(b) => setRoute({ section: 'bookings', sub: 'edit', id: b.id })} />
    </div>
  );
}

// ═══ HOSTS ══════════════════════════════════════════════════
function HostDetailDrawer({ h, onClose, onEdit }) {
  // Full detail (buildings + payout) comes from /hosts/:id.
  const [full, setFull] = React.useState(null);
  React.useEffect(() => {
    setFull(null);
    if (h && h.id) api.get(`/hosts/${h.id}`).then(setFull).catch(() => {});
  }, [h && h.id]);
  if (!h) return <Drawer open={false} onClose={onClose} width={560}><div /></Drawer>;
  const buildings = (full && full.buildings) || [];
  const payout = full && full.payout;
  return (
    <Drawer open={!!h} onClose={onClose} width={560}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--g-line)', flexShrink: 0 }}>
        <button onClick={onClose} className="adm-iconbtn" style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--g-bg-2)', border: 0, display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--g-ink)' }}><IconClose size={17} /></button>
        {h.verified
          ? <StatusPill s="v" dict={{ v: { label: 'Tasdiqlangan', hue: 155 } }} />
          : <StatusPill s="x" dict={{ x: { label: 'Tasdiq kutmoqda', hue: 70 } }} />}
      </div>

      <div className="adm-scroll" style={{ flex: 1, overflowY: 'auto', padding: 22 }}>
        {/* Profile head */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <Avatar name={h.name} size={56} hue={h.hue} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ font: `700 18px ${window.GO.font}`, color: 'var(--g-ink)', letterSpacing: '-0.02em' }}>{h.name}</span>
              {h.super && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, font: `600 10px ${window.GO.font}`, color: 'var(--g-brand-ink)', background: 'var(--g-brand-soft)', padding: '3px 7px', borderRadius: 6 }}>★ Yulduz mezbon</span>}
            </div>
            <div style={{ font: `400 13px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 3 }}>{h.org} · {h.city} · <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{h.id}</span></div>
            {(full || h).phone && <div style={{ font: `400 12.5px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 2 }}>+{(full || h).phone}</div>}
          </div>
          <IconBtn title="Xabar" style={{ border: '1px solid var(--g-line)' }}><IconMessage size={16} /></IconBtn>
        </div>

        {/* Stat tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 22 }}>
          {[
            { l: "E'lonlar", v: h.listings },
            { l: 'Bandlovlar', v: h.bookings },
            { l: 'Baho', v: (h.rating || 0).toFixed(2) },
            { l: "Qo'shilgan", v: h.joined },
          ].map((s) => (
            <div key={s.l} style={{ background: 'var(--g-bg)', borderRadius: 12, padding: '13px 14px' }}>
              <div style={{ font: `700 18px ${window.GO.font}`, color: 'var(--g-ink)', letterSpacing: '-0.02em' }}>{s.v}</div>
              <div style={{ font: `500 11px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Revenue + payout */}
        <div style={{ border: '1px solid var(--g-line)', borderRadius: 13, padding: 16, marginBottom: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ font: `400 13px ${window.GO.font}`, color: 'var(--g-ink-3)' }}>Jami daromad</span>
            <span style={{ font: `700 17px ${window.GO.font}`, color: 'var(--g-ink)' }}>{window.fmtSom(h.revenue)} so'm</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 12, borderTop: '1px solid var(--g-line)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, font: `500 12.5px ${window.GO.font}`, color: 'var(--g-ink-2)' }}><IconCard size={15} /> {h.payout}</span>
            {payout && <StatusPill s={payout.status} dict={window.PAYOUT_STATUS} size="sm" />}
          </div>
        </div>

        {/* Buildings */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink-2)' }}>Mezbon binolari</div>
          <span style={{ font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>{buildings.length} ta</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!full && <div style={{ padding: '14px 12px', borderRadius: 12, background: 'var(--g-bg)', font: `400 12.5px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>Yuklanmoqda…</div>}
          {full && buildings.length === 0 && <div style={{ padding: '14px 12px', borderRadius: 12, background: 'var(--g-bg)', font: `400 12.5px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>Hozircha binolar yo'q.</div>}
          {buildings.map((b) => (
            <div key={b.id} className="adm-row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, borderRadius: 12, background: 'var(--g-bg)' }}>
              <div style={{ width: 42, height: 42, borderRadius: 9, overflow: 'hidden', flexShrink: 0 }}><PhotoPlaceholder hue={b.hue ?? 30} label="" radius={9} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.name}</div>
                <div style={{ font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.address} · {b.district}, {b.city}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink)' }}>{(b.offerings || []).length} ta taklif</div>
                <div style={{ marginTop: 3 }}><StatusPill s={b.status} size="sm" /></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, padding: '16px 22px', borderTop: '1px solid var(--g-line)', background: 'var(--g-card)', flexShrink: 0 }}>
        {h.verified
          ? <><Btn kind="ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => onEdit && onEdit(h)}><IconEdit size={16} /> {window.AT.edit}</Btn><Btn kind="primary" style={{ flex: 1, justifyContent: 'center' }}><IconExternal size={16} /> Profilni ochish</Btn></>
          : <><Btn kind="ghost" style={{}} onClick={() => onEdit && onEdit(h)}><IconEdit size={16} /></Btn><Btn kind="primary" style={{ flex: 1, justifyContent: 'center' }} onClick={async () => { await gorentMutate(() => api.post(`/hosts/${h.id}/approve`)); onClose(); }}><IconCheck2 size={16} /> Mezbonni tasdiqlash</Btn><Btn kind="danger" style={{ flex: 1, justifyContent: 'center' }} onClick={async () => { await gorentMutate(() => api.post(`/hosts/${h.id}/reject`)); onClose(); }}><IconX2 size={16} /> Rad etish</Btn></>}
      </div>
    </Drawer>
  );
}

function HostForm({ host, onClose, onSave }) {
  const isEdit = !!host;
  const [f, setF] = React.useState(() => host ? {
    name: host.name, org: host.org, city: host.city, payout: host.payout, phone: host.phone || '',
  } : { name: '', org: '', city: window.CITIES[0] || 'Toshkent', payout: 'UZCARD', phone: '' });
  const [busy, setBusy] = React.useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const Label = ({ children }) => <div style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink-2)', marginBottom: 7 }}>{children}</div>;

  const submit = async () => {
    if (!f.name.trim() || !f.org.trim()) return;
    setBusy(true);
    try {
      if (isEdit) await gorentMutate(() => api.put(`/hosts/${host.id}`, f));
      else await gorentMutate(() => api.post('/hosts', f));
      onSave();
    } catch (e) { window.alert(e.message); setBusy(false); }
  };

  const PAYOUT_METHODS = ['UZCARD', 'HUMO', "Naqd pul", 'Bank o\'tkazmasi'];

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <button onClick={onClose} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--g-ink-3)', font: `600 13px ${window.GO.font}`, marginBottom: 16, padding: 0 }}>
        <IconChevL size={16} /> {window.AT.back}
      </button>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Card>
            <div style={{ font: `700 15px ${window.GO.font}`, color: 'var(--g-ink)', marginBottom: 16 }}>Mezbon ma'lumotlari</div>
            <div style={{ marginBottom: 14 }}>
              <Label>Ism familiya</Label>
              <input className="adm-input" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Aziza Rashidova" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <Label>Tashkilot / Kompaniya</Label>
              <input className="adm-input" value={f.org} onChange={(e) => set('org', e.target.value)} placeholder="AR Estate" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <Label>Shahar</Label>
              <select className="adm-select" style={{ width: '100%' }} value={f.city} onChange={(e) => set('city', e.target.value)}>
                {window.CITIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label>Telefon (ixtiyoriy)</Label>
              <input className="adm-input" value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+998 90 123 45 67" />
              <div style={{ font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 6 }}>
                Qarzdorlik eslatmalari mezbonga ham yuborilishi uchun kerak (Sozlamalar → SMS). Bo'sh qoldirilsa, mezbonga xabar yuborilmaydi.
              </div>
            </div>
          </Card>
          <Card>
            <div style={{ font: `700 15px ${window.GO.font}`, color: 'var(--g-ink)', marginBottom: 16 }}>To'lov usuli</div>
            <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
              {PAYOUT_METHODS.map((m) => (
                <button key={m} onClick={() => set('payout', m)} style={{
                  padding: '8px 16px', borderRadius: 9, cursor: 'pointer', font: `600 12.5px ${window.GO.font}`,
                  border: '1.5px solid', borderColor: f.payout === m ? 'var(--g-brand)' : 'var(--g-line)',
                  background: f.payout === m ? 'var(--g-brand-soft)' : 'var(--g-card)',
                  color: f.payout === m ? 'var(--g-brand-ink)' : 'var(--g-ink-3)',
                }}>{m}</button>
              ))}
            </div>
          </Card>
        </div>
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Btn kind="primary" style={{ justifyContent: 'center' }} onClick={submit} disabled={busy || !f.name.trim() || !f.org.trim()}>
              <IconCheck size={16} /> {busy ? 'Saqlanmoqda…' : window.AT.save}
            </Btn>
            <Btn kind="ghost" style={{ justifyContent: 'center' }} onClick={onClose}>{window.AT.cancel}</Btn>
          </div>
          {isEdit && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--g-line)' }}>
              <div style={{ font: `500 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)', marginBottom: 4 }}>Mezbon ID</div>
              <div style={{ font: `600 12px ui-monospace, monospace`, color: 'var(--g-ink-2)' }}>{host.id}</div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function HostsScreen({ search, route, setRoute }) {
  const [detail, setDetail] = React.useState(null);
  let rows = window.HOSTS;
  if (search) rows = rows.filter((h) => (h.name + h.org + h.city).toLowerCase().includes(search.toLowerCase()));
  const columns = [
    { key: 'host', label: 'Mezbon', render: (h) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar name={h.name} size={40} hue={h.hue} />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ font: `600 13.5px ${window.GO.font}`, color: 'var(--g-ink)' }}>{h.name}</span>
            {h.super && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, font: `600 10px ${window.GO.font}`, color: 'var(--g-brand-ink)', background: 'var(--g-brand-soft)', padding: '2px 6px', borderRadius: 5 }}>★ Yulduz</span>}
          </div>
          <div style={{ font: `400 12px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 1 }}>{h.org} · {h.id}</div>
        </div>
      </div>
    ) },
    { key: 'city', label: 'Shahar', render: (h) => <span style={{ font: `500 13px ${window.GO.font}`, color: 'var(--g-ink-2)' }}>{h.city}</span> },
    { key: 'listings', label: 'E\u2019lonlar', align: 'center', render: (h) => <span style={{ font: `600 13px ${window.GO.font}`, color: 'var(--g-ink)' }}>{h.listings}</span> },
    { key: 'bookings', label: 'Bandlovlar', align: 'center', render: (h) => <span style={{ font: `600 13px ${window.GO.font}`, color: 'var(--g-ink)' }}>{h.bookings}</span> },
    { key: 'revenue', label: 'Daromad', align: 'right', render: (h) => <MoneyCell n={h.revenue} /> },
    { key: 'rating', label: 'Baho', align: 'center', render: (h) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink)' }}><IconStar size={12} /> {h.rating.toFixed(2)}</span> },
    { key: 'verif', label: window.AT.status, render: (h) => h.verified
      ? <StatusPill s="active" dict={{ active: { label: 'Tasdiqlangan', hue: 155 } }} />
      : <StatusPill s="x" dict={{ x: { label: 'Kutilmoqda', hue: 70 } }} /> },
    { key: 'act', label: '', align: 'right', render: (h) => <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}><IconBtn title={window.AT.view} onClick={() => setDetail(h)}><IconEye size={16} /></IconBtn><IconBtn title={window.AT.edit} onClick={() => setRoute({ section: 'hosts', sub: 'edit', id: h.id })}><IconEdit size={16} /></IconBtn></div> },
  ];
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 18 }}>
        <StatCard icon={<IconUsers size={17} />} label="Jami mezbonlar" value={String(window.HOSTS.length)} unit="ta" />
        <StatCard icon={<IconShield size={17} />} label="Tasdiqlangan" value={String(window.HOSTS.filter((h) => h.verified).length)} unit="ta" />
        <StatCard icon={<IconStar size={17} />} label="Yulduz mezbonlar" value={String(window.HOSTS.filter((h) => h.super).length)} unit="ta" />
        <StatCard icon={<IconClock size={17} />} label="Tasdiq kutmoqda" value={String(window.HOSTS.filter((h) => !h.verified).length)} unit="ta" deltaInvert />
      </div>
      <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} onRow={(h) => setDetail(h)} />
      <HostDetailDrawer h={detail} onClose={() => setDetail(null)} onEdit={(h) => setRoute({ section: 'hosts', sub: 'edit', id: h.id })} />
    </div>
  );
}

// ═══ BUILDINGS (binolar) ════════════════════════════════════
function BuildingsScreen({ search, role }) {
  const [status, setStatus] = React.useState('all');
  const [editing, setEditing] = React.useState(null); // null | {} (new) | building (edit)

  let rows = window.BUILDINGS || [];
  if (status !== 'all') rows = rows.filter((b) => b.status === status);
  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter((b) => `${b.id} ${b.name} ${b.address} ${b.district} ${b.city} ${b.ownerName || ''} ${b.kadastrNumber || ''}`.toLowerCase().includes(q));
  }
  const counts = { all: (window.BUILDINGS || []).length };
  Object.keys(window.PRODUCT_STATUS).forEach((k) => counts[k] = (window.BUILDINGS || []).filter((b) => b.status === k).length);

  if (editing) return <BuildingForm building={editing.id ? editing : null} role={role}
    onClose={() => setEditing(null)}
    // After creating, switch to editing the fresh building so its offerings
    // (Takliflar) section becomes available immediately.
    onCreated={(id) => setEditing((window.BUILDINGS || []).find((b) => b.id === id) || { id })} />;

  const columns = [
    { key: 'id', label: 'ID', render: (b) => <span style={{ font: `600 12px ui-monospace, monospace`, color: 'var(--g-ink-2)' }}>{b.id}</span> },
    { key: 'name', label: 'Nomi', render: (b) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}><PhotoPlaceholder hue={b.hue ?? 30} label="" radius={10} /></div>
        <div style={{ minWidth: 0 }}>
          <div style={{ font: `600 13.5px ${window.GO.font}`, color: 'var(--g-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>{b.name}</div>
          {b.marketplace && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 3, padding: '2px 8px', borderRadius: 999, background: 'oklch(0.95 0.05 155)', color: 'oklch(0.42 0.12 155)', font: `600 10.5px ${window.GO.font}` }}>
              <IconEye size={11} /> Marketplace
            </span>
          )}
        </div>
      </div>
    ) },
    { key: 'address', label: 'Manzil', render: (b) => (
      <div>
        <div style={{ font: `500 13px ${window.GO.font}`, color: 'var(--g-ink)' }}>{b.address}</div>
        <div style={{ font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 1 }}>{b.district} · {b.city}</div>
      </div>
    ) },
    { key: 'owner', label: 'Egasi', render: (b) => (
      <div>
        <div style={{ font: `500 13px ${window.GO.font}`, color: 'var(--g-ink)' }}>{b.ownerName || '—'}</div>
        {b.ownerInn && <div style={{ font: `400 11.5px ui-monospace, monospace`, color: 'var(--g-ink-4)', marginTop: 1 }}>INN {b.ownerInn}</div>}
      </div>
    ) },
    { key: 'kadastr', label: 'Kadastr raqami', render: (b) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ font: `500 12.5px ui-monospace, monospace`, color: 'var(--g-ink-2)' }}>{b.kadastrNumber || '—'}</span>
        {b.kadastrFile && <span title="Kadastr fayli yuklangan" style={{ color: 'oklch(0.52 0.13 155)', display: 'flex' }}><IconDoc size={14} /></span>}
      </div>
    ) },
    { key: 'physical', label: 'Maydon / Qavat', render: (b) => (
      <div>
        <div style={{ font: `500 13px ${window.GO.font}`, color: 'var(--g-ink)' }}>{b.totalM2 ? `${b.totalM2} m²` : '—'} · {b.floors ? `${b.floors} qavat` : '—'}</div>
        <div style={{ font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 2 }}>
          Band: {b.usedM2 || 0} m²{b.totalM2 ? ` (${Math.round(((b.usedM2 || 0) / b.totalM2) * 100)}%)` : ''}
          {(b.facilities || []).length > 0 ? ` · ${(b.facilities || []).length} qulaylik` : ''}
        </div>
      </div>
    ) },
    { key: 'offerings', label: 'Takliflar', align: 'center', render: (b) => <span style={{ font: `600 13px ${window.GO.font}`, color: 'var(--g-ink)' }}>{(b.offerings || []).length}</span> },
    { key: 'status', label: window.AT.status, render: (b) => <StatusPill s={b.status} /> },
    { key: 'act', label: '', align: 'right', render: (b) => (
      <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
        {role === 'platform' && b.status === 'pending' && (
          <>
            <IconBtn title={window.AT.approve} onClick={() => gorentMutate(() => api.post(`/buildings/${b.id}/approve`))} style={{ color: 'oklch(0.52 0.13 155)' }}><IconCheck2 size={16} /></IconBtn>
            <IconBtn title={window.AT.reject} onClick={() => gorentMutate(() => api.post(`/buildings/${b.id}/reject`))} style={{ color: 'oklch(0.55 0.16 25)' }}><IconX2 size={16} /></IconBtn>
          </>
        )}
        <IconBtn title={window.AT.edit} onClick={() => setEditing(b)}><IconEdit size={16} /></IconBtn>
        <IconBtn title={window.AT.delete} style={{ color: 'oklch(0.55 0.16 25)' }} onClick={() => window.confirm(`"${b.name}" binosini o'chirasizmi?`) && gorentMutate(() => api.del(`/buildings/${b.id}`))}><IconTrash size={16} /></IconBtn>
      </div>
    ) },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
        <StatusChips dict={window.PRODUCT_STATUS} value={status} setValue={setStatus} counts={counts} />
        <Btn kind="primary" sm onClick={() => setEditing({})}><IconPlus size={15} /> Bino qo'shish</Btn>
      </div>
      <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} onRow={(b) => setEditing(b)} empty="Hozircha binolar yo'q" />
    </div>
  );
}

// ─── Takliflar — offerings: this building supports a catalog product ─
// An offering pins a building-level PRICE onto a global product; units under
// it can override that price (empty price = "bino narxi").
function AddOfferingForm({ building, onDone }) {
  const offered = new Set((building.offerings || []).map((o) => o.productId || o.product?.id));
  const available = (window.PRODUCTS || []).filter((p) => !offered.has(p.id));
  const [f, setF] = React.useState(() => ({ productId: (available[0] || {}).id || '', price: '', qty: 1, m2: '' }));
  const [err, setErr] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const Label = ({ children }) => <div style={{ font: `600 12px ${window.GO.font}`, color: 'var(--g-ink-2)', marginBottom: 5 }}>{children}</div>;
  const product = available.find((p) => p.id === f.productId);
  const spec = window.unitTypeMeta(product?.type);
  // The auto-created default unit must satisfy the type spec (m² for virtual
  // offices / area products; stock only for fungible types).
  const m2Missing = spec.m2 === 'required' && !(Number(f.m2) >= 1);

  const submit = async () => {
    if (!f.productId || !f.price || m2Missing) return;
    setErr(null); setBusy(true);
    try {
      await api.post('/offerings', {
        buildingId: building.id, productId: f.productId, price: Number(f.price),
        qty: spec.fungible ? (Number(f.qty) || 1) : 1,
        ...(f.m2 !== '' ? { m2: Number(f.m2) } : {}),
      });
      if (window.__gorentRefresh) await window.__gorentRefresh();
      onDone();
    } catch (e) {
      // 409 — the building already offers this product.
      setErr(e && e.message ? e.message : 'Xatolik yuz berdi');
      setBusy(false);
    }
  };

  if (!available.length) {
    return (
      <div style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid var(--g-line)', background: 'var(--g-bg)', font: `400 12.5px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>
        Katalogdagi barcha mahsulotlar bu binoda allaqachon taklif qilingan.
      </div>
    );
  }
  return (
    <div style={{ padding: 14, borderRadius: 12, border: '1px solid var(--g-line)', background: 'var(--g-bg)' }}>
      <div style={{ font: `700 13px ${window.GO.font}`, color: 'var(--g-ink)', marginBottom: 12 }}>Yangi taklif</div>
      <div style={{ display: 'grid', gridTemplateColumns: `2fr 1fr${spec.fungible ? ' 1fr' : ''}${spec.m2 === 'required' ? ' 1fr' : ''}`, gap: 10, marginBottom: 12 }}>
        <div>
          <Label>Katalog mahsuloti</Label>
          <select className="adm-select" style={{ width: '100%' }} value={f.productId} onChange={(e) => set('productId', e.target.value)}>
            {available.map((p) => <option key={p.id} value={p.id}>{p.name} · {window.unitTypeMeta(p.type).short}</option>)}
          </select>
        </div>
        <div>
          <Label>Narx ({window.priceUnitLabel(product)})</Label>
          <input className="adm-input" type="number" value={f.price} onChange={(e) => set('price', e.target.value)} placeholder={spec.priceBasis === 'per_m2' ? '150000' : '2500000'} />
        </div>
        {spec.fungible && (
          <div>
            <Label>Soni (birlik zaxirasi)</Label>
            <input className="adm-input" type="number" min={1} value={f.qty} onChange={(e) => set('qty', e.target.value)} />
          </div>
        )}
        {spec.m2 === 'required' && (
          <div>
            <Label>Maydoni (m²) — majburiy</Label>
            <input className="adm-input" type="number" min={1} value={f.m2} onChange={(e) => set('m2', e.target.value)} placeholder="18" />
          </div>
        )}
      </div>
      {err && (
        <div style={{ marginBottom: 10, font: `500 12.5px ${window.GO.font}`, color: 'oklch(0.5 0.16 25)', background: 'oklch(0.96 0.04 25)', padding: '9px 12px', borderRadius: 9 }}>{err}</div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Btn kind="ghost" sm onClick={onDone}>{window.AT.cancel}</Btn>
        <Btn kind="primary" sm onClick={submit} disabled={busy || !f.productId || !f.price || m2Missing}><IconCheck size={14} /> {busy ? 'Saqlanmoqda…' : window.AT.save}</Btn>
      </div>
    </div>
  );
}

// One offering row: product + building-level price (inline edit), status,
// approve/reject (platform), delete, plus unit management underneath.
function OfferingRow({ offering: o, role, building }) {
  const [priceEdit, setPriceEdit] = React.useState(false);
  const [price, setPrice] = React.useState(o.price ?? '');
  const [unitEditor, setUnitEditor] = React.useState(null); // null | 'new' | unit
  const [busy, setBusy] = React.useState(false);
  const product = o.product || {};
  const units = o.units || [];
  const tm = window.unitTypeMeta(product.type);
  const isPlatform = role === 'platform';

  const savePrice = async () => {
    if (price === '' || Number(price) <= 0) return;
    setBusy(true);
    const ok = await gorentMutate(() => api.patch(`/offerings/${o.id}`, { price: Number(price) }));
    setBusy(false);
    if (ok) setPriceEdit(false);
  };

  return (
    <div style={{ borderRadius: 13, border: '1px solid var(--g-line)', background: 'var(--g-card)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
        <span style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, display: 'grid', placeItems: 'center',
          background: `oklch(0.95 0.04 ${tm.hue})`, color: `oklch(0.45 0.14 ${tm.hue})`, font: `700 11px ${window.GO.font}` }}>{String(tm.short).slice(0, 2)}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font: `600 13px ${window.GO.font}`, color: 'var(--g-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name || '—'} <span style={{ color: 'var(--g-ink-4)', fontWeight: 400 }}>· {tm.short}</span></div>
          <div style={{ font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 2 }}>{units.length} ta birlik · {window.catShort(product.cat)}</div>
        </div>
        {priceEdit ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
            <input className="adm-input" type="number" value={price} onChange={(e) => setPrice(e.target.value)} style={{ width: 130 }} autoFocus />
            <Btn kind="primary" sm onClick={savePrice} disabled={busy || price === '' || Number(price) <= 0}><IconCheck size={14} /></Btn>
            <Btn kind="ghost" sm onClick={() => { setPriceEdit(false); setPrice(o.price ?? ''); }}><IconClose size={14} /></Btn>
          </div>
        ) : (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <button onClick={() => setPriceEdit(true)} title="Narxni tahrirlash" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'transparent', border: 0, cursor: 'pointer', padding: 0, font: `600 13px ${window.GO.font}`, color: 'var(--g-ink)' }}>
              {window.fmtCompactSom(o.price || 0)} so'm/{window.periodLabel(product.period)} <IconEdit size={12} />
            </button>
            <div style={{ marginTop: 3 }}><StatusPill s={o.status} size="sm" /></div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          {/* Marketplace visibility for this offering (effective only when the
              building itself is opted in). */}
          <IconBtn
            title={o.listed !== false ? "Marketplace'da ko'rinadi — yashirish" : "Marketplace'dan yashirilgan — ko'rsatish"}
            onClick={() => gorentMutate(() => api.patch(`/offerings/${o.id}`, { listed: o.listed === false }))}
            style={{ width: 28, height: 28, color: o.listed !== false ? 'oklch(0.52 0.13 155)' : 'var(--g-ink-4)' }}
          ><IconEye size={14} /></IconBtn>
          {isPlatform && o.status === 'pending' && (
            <>
              <IconBtn title={window.AT.approve} onClick={() => gorentMutate(() => api.post(`/offerings/${o.id}/approve`))} style={{ width: 28, height: 28, color: 'oklch(0.52 0.13 155)' }}><IconCheck2 size={14} /></IconBtn>
              <IconBtn title={window.AT.reject} onClick={() => gorentMutate(() => api.post(`/offerings/${o.id}/reject`))} style={{ width: 28, height: 28, color: 'oklch(0.55 0.16 25)' }}><IconX2 size={14} /></IconBtn>
            </>
          )}
          <IconBtn title={window.AT.delete} onClick={() => window.confirm(`"${product.name}" taklifini o'chirasizmi? Uning birliklari ham o'chadi.`) && gorentMutate(() => api.del(`/offerings/${o.id}`))} style={{ width: 28, height: 28, color: 'oklch(0.55 0.16 25)' }}><IconTrash size={14} /></IconBtn>
        </div>
      </div>

      {/* Units under this offering */}
      <div style={{ padding: '10px 14px 12px', borderTop: '1px solid var(--g-line)', background: 'var(--g-bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ font: `600 12px ${window.GO.font}`, color: 'var(--g-ink-2)' }}>Birliklar ({units.length} ta)</div>
          <Btn kind="ghost" sm onClick={() => setUnitEditor('new')}><IconPlus size={13} /> Birlik qo'shish</Btn>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {units.length === 0 && unitEditor !== 'new' && (
            <div style={{ padding: '12px 12px', borderRadius: 10, background: 'var(--g-card)', font: `400 12px ${window.GO.font}`, color: 'var(--g-ink-4)', textAlign: 'center' }}>
              Hozircha birliklar yo'q.
            </div>
          )}
          {units.map((u) => unitEditor && unitEditor !== 'new' && unitEditor.id === u.id ? (
            <UnitEditor key={u.id} unit={u} offering={o} onDone={() => setUnitEditor(null)} />
          ) : (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: 'var(--g-card)', border: '1px solid var(--g-line)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</div>
                <div style={{ font: `400 11px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 1 }}>
                  {u.qty} ta · {u.capacity ? `${u.capacity} ${window.T.people}` : '—'} · {u.m2 ? `${u.m2} m²` : '—'}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ font: `600 12px ${window.GO.font}`, color: 'var(--g-ink)' }}>
                  {u.price != null
                    ? <>{window.fmtCompactSom(u.price)} so'm/{window.periodLabel(product.period)}</>
                    : <span style={{ color: 'var(--g-ink-3)' }}>Bino narxi · {window.fmtCompactSom(o.price || 0)} so'm/{window.periodLabel(product.period)}</span>}
                </div>
                <div style={{ marginTop: 2 }}><StatusPill s={u.status} size="sm" /></div>
              </div>
              <div style={{ display: 'flex', gap: 2 }}>
                <IconBtn title={window.AT.edit} onClick={() => setUnitEditor(u)} style={{ width: 26, height: 26 }}><IconEdit size={13} /></IconBtn>
                <IconBtn title={window.AT.delete} onClick={() => window.confirm(`"${u.name}" birligini o'chirasizmi?`) && gorentMutate(() => api.del(`/units/${u.id}`))} style={{ width: 26, height: 26, color: 'oklch(0.55 0.16 25)' }}><IconTrash size={13} /></IconBtn>
              </div>
            </div>
          ))}
          {unitEditor === 'new' && <UnitEditor unit={null} offering={o} onDone={() => setUnitEditor(null)} />}
        </div>
      </div>
    </div>
  );
}

function BuildingOfferings({ building, role }) {
  const [adding, setAdding] = React.useState(false);
  // Re-resolve from the live dataset so offering/unit CRUD refreshes show up.
  const live = (window.BUILDINGS || []).find((x) => x.id === building.id) || building;
  const offerings = live.offerings || [];
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ font: `700 15px ${window.GO.font}`, color: 'var(--g-ink)' }}>Takliflar</div>
          <div style={{ font: `400 12px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 2 }}>Bu bino qo'llab-quvvatlaydigan katalog mahsulotlari va bino narxlari</div>
        </div>
        <Btn kind="primary" sm onClick={() => setAdding(true)}><IconPlus size={14} /> Taklif qo'shish</Btn>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {offerings.length === 0 && !adding && (
          <div style={{ padding: '18px 14px', borderRadius: 12, background: 'var(--g-bg)', font: `400 12.5px ${window.GO.font}`, color: 'var(--g-ink-4)', textAlign: 'center' }}>
            Hozircha takliflar yo'q — katalogdan mahsulot tanlab, bino narxini belgilang.
          </div>
        )}
        {offerings.map((o) => <OfferingRow key={o.id} offering={o} role={role} building={live} />)}
        {adding && <AddOfferingForm building={live} onDone={() => setAdding(false)} />}
      </div>
    </Card>
  );
}

function BuildingForm({ building, role, onClose, onCreated }) {
  const isEdit = !!building;
  const [f, setF] = React.useState(() => building ? {
    name: building.name, address: building.address || '', city: building.city || 'Toshkent',
    district: building.district || window.DISTRICTS_TASHKENT[0], ownerName: building.ownerName || '',
    ownerInn: building.ownerInn || '', ownerPhone: building.ownerPhone || '',
    kadastrNumber: building.kadastrNumber || '', status: building.status || 'draft',
    totalM2: building.totalM2 ?? '', floors: building.floors ?? '', facilities: building.facilities || [],
    marketplace: !!building.marketplace,
  } : {
    name: '', address: '', city: 'Toshkent', district: window.DISTRICTS_TASHKENT[0],
    ownerName: '', ownerInn: '', ownerPhone: '', kadastrNumber: '', status: 'draft',
    totalM2: '', floors: '', facilities: [],
    marketplace: false, // default: private SaaS usage
  });
  const toggleFacility = (id) => setF((s) => ({
    ...s, facilities: s.facilities.includes(id) ? s.facilities.filter((x) => x !== id) : [...s.facilities, id],
  }));
  const [kadastrFile, setKadastrFile] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const Label = ({ children }) => <div style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink-2)', marginBottom: 7 }}>{children}</div>;

  const submit = async () => {
    if (!f.name.trim() || !f.address.trim() || !f.ownerName.trim()) { window.alert("Bino nomi, manzil va egasi to'ldirilishi shart"); return; }
    setBusy(true);
    try {
      const payload = {
        name: f.name.trim(), address: f.address.trim(), city: f.city, district: f.district,
        ownerName: f.ownerName.trim(),
        ownerInn: f.ownerInn.trim() || null,
        ownerPhone: f.ownerPhone.trim() || null,
        kadastrNumber: f.kadastrNumber.trim() || null,
        totalM2: f.totalM2 === '' ? null : Number(f.totalM2),
        floors: f.floors === '' ? null : Number(f.floors),
        facilities: f.facilities,
        status: f.status,
        marketplace: f.marketplace,
      };
      const saved = isEdit ? await api.patch(`/buildings/${building.id}`, payload) : await api.post('/buildings', payload);
      if (kadastrFile) await api.upload(`/buildings/${saved.id}/kadastr`, kadastrFile);
      if (window.__gorentRefresh) await window.__gorentRefresh();
      // On create, continue into edit mode so Takliflar can be added now.
      if (!isEdit && onCreated) { setBusy(false); onCreated(saved.id); }
      else onClose();
    } catch (e) { window.alert(e.message); setBusy(false); }
  };

  const viewKadastr = async () => {
    // Open the tab synchronously (inside the click) so it isn't popup-blocked
    // after the await; then point it at the fetched blob for inline preview.
    const w = window.open('', '_blank');
    try {
      const url = await api.fileBlobUrl(`/buildings/${building.id}/kadastr`);
      if (w) w.location = url; else window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      if (w) w.close();
      window.alert(e.message);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <button onClick={onClose} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--g-ink-3)', font: `600 13px ${window.GO.font}`, marginBottom: 16, padding: 0 }}>
        <IconChevL size={16} /> {window.AT.back}
      </button>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Card>
          <div style={{ font: `700 15px ${window.GO.font}`, color: 'var(--g-ink)', marginBottom: 16 }}>{isEdit ? 'Binoni tahrirlash' : 'Yangi bino'}</div>
          <div style={{ marginBottom: 14 }}>
            <Label>Bino nomi</Label>
            <input className="adm-input" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Yunusobod biznes minorasi" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <Label>Manzil</Label>
            <input className="adm-input" value={f.address} onChange={(e) => set('address', e.target.value)} placeholder="Amir Temur shoh ko'chasi, 108" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <div>
              <Label>Shahar</Label>
              <select className="adm-select" style={{ width: '100%' }} value={f.city} onChange={(e) => set('city', e.target.value)}>
                {window.CITIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label>Tuman</Label>
              <select className="adm-select" style={{ width: '100%' }} value={f.district} onChange={(e) => set('district', e.target.value)}>
                {window.DISTRICTS_TASHKENT.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <Label>Holat</Label>
              <select className="adm-select" style={{ width: '100%' }} value={f.status} onChange={(e) => set('status', e.target.value)}>
                {Object.entries(window.PRODUCT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ font: `700 15px ${window.GO.font}`, color: 'var(--g-ink)', marginBottom: 16 }}>Bino xususiyatlari</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <Label>Umumiy maydon (m²)</Label>
              <input className="adm-input" type="number" min={0} value={f.totalM2} onChange={(e) => set('totalM2', e.target.value)} placeholder="3200" />
            </div>
            <div>
              <Label>Qavatlar soni</Label>
              <input className="adm-input" type="number" min={0} value={f.floors} onChange={(e) => set('floors', e.target.value)} placeholder="9" />
            </div>
          </div>
          {isEdit && (() => {
            const used = building.usedM2 || 0;
            const total = Number(f.totalM2) || 0;
            const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
            return (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', font: `600 12px ${window.GO.font}`, color: 'var(--g-ink-2)', marginBottom: 6 }}>
                  <span>Band maydon (hozir)</span>
                  <span>{used} m²{total > 0 ? ` / ${total} m² · ${pct}%` : ''}</span>
                </div>
                <div style={{ height: 8, borderRadius: 999, background: 'var(--g-line)', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: 'var(--g-brand)' }} />
                </div>
                <div style={{ font: `400 11px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 5 }}>
                  Faol/tasdiqlangan bandlovlardagi birliklar maydoni (qty × m²). Virtual ofislar hisobga olinmaydi.
                </div>
              </div>
            );
          })()}
          <Label>Qulayliklar</Label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(window.AMENITIES || []).map((a) => {
              const on = f.facilities.includes(a.id);
              return (
                <button key={a.id} type="button" onClick={() => toggleFacility(a.id)}
                  style={{
                    padding: '7px 13px', borderRadius: 999, cursor: 'pointer',
                    border: `1.5px solid ${on ? 'var(--g-brand)' : 'var(--g-line)'}`,
                    background: on ? 'var(--g-brand)' : 'var(--g-surface)',
                    color: on ? '#fff' : 'var(--g-ink-2)', font: `600 12.5px ${window.GO.font}`,
                  }}>
                  {a.name}
                </button>
              );
            })}
          </div>
        </Card>

        <Card>
          <div style={{ font: `700 15px ${window.GO.font}`, color: 'var(--g-ink)', marginBottom: 16 }}>Bino egasi</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <div>
              <Label>Egasi (F.I.Sh. yoki tashkilot)</Label>
              <input className="adm-input" value={f.ownerName} onChange={(e) => set('ownerName', e.target.value)} placeholder="Aziza Rashidova" />
            </div>
            <div>
              <Label>Egasining INN (STIR)</Label>
              <input className="adm-input" value={f.ownerInn} onChange={(e) => set('ownerInn', e.target.value.replace(/\D/g, '').slice(0, 9))} placeholder="123456789" />
            </div>
            <div>
              <Label>Telefon raqami</Label>
              <input className="adm-input" value={f.ownerPhone} onChange={(e) => set('ownerPhone', e.target.value)} placeholder="+998901234567" />
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ font: `700 15px ${window.GO.font}`, color: 'var(--g-ink)', marginBottom: 16 }}>Kadastr hujjati</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'end' }}>
            <div>
              <Label>Kadastr raqami</Label>
              <input className="adm-input" value={f.kadastrNumber} onChange={(e) => set('kadastrNumber', e.target.value)} placeholder="10:09:03:04:01:0001" />
            </div>
            <div>
              <Label>Kadastr skani (PDF/rasm, ≤10MB)</Label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setKadastrFile(e.target.files?.[0] || null)}
                  style={{ font: `400 12px ${window.GO.font}`, flex: 1, minWidth: 0 }} />
                {isEdit && building?.kadastrFile && <Btn kind="ghost" sm onClick={viewKadastr}><IconEye size={14} /> Ko'rish</Btn>}
              </div>
            </div>
          </div>
        </Card>

        {/* Marketplace opt-in — off by default: the owner just uses the SaaS
            privately; on: building + listed offerings appear on the public
            marketplace API (owner/kadastr details are never exposed there). */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
            <div>
              <div style={{ font: `700 15px ${window.GO.font}`, color: 'var(--g-ink)' }}>Marketplace</div>
              <div style={{ font: `400 12.5px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 4, maxWidth: 520 }}>
                Yoqilsa — bino va uning ko'rsatilgan takliflari ochiq marketplace'da e'lon qilinadi.
                O'chiq bo'lsa, tizim faqat ichki boshqaruv (SaaS) uchun ishlaydi. Egasi va kadastr ma'lumotlari hech qachon oshkor qilinmaydi.
              </div>
            </div>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 9, cursor: 'pointer', font: `600 13px ${window.GO.font}`, color: f.marketplace ? 'oklch(0.52 0.13 155)' : 'var(--g-ink-3)', whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={f.marketplace} onChange={(e) => set('marketplace', e.target.checked)} style={{ width: 17, height: 17, accentColor: 'oklch(0.52 0.13 155)' }} />
              {f.marketplace ? "Marketplace'da" : 'Yopiq (faqat SaaS)'}
            </label>
          </div>
        </Card>

        {/* Takliflar — supported catalog products at this building's price */}
        {isEdit && <BuildingOfferings building={building} role={role} />}

        <div style={{ display: 'flex', gap: 10 }}>
          <Btn kind="primary" style={{ flex: 1, justifyContent: 'center' }} onClick={submit} disabled={busy}><IconCheck size={16} /> {busy ? 'Saqlanmoqda…' : window.AT.save}</Btn>
          <Btn kind="ghost" style={{ justifyContent: 'center' }} onClick={onClose}>{window.AT.cancel}</Btn>
        </div>
      </div>
    </div>
  );
}

// ═══ REVENUE & PAYOUTS ══════════════════════════════════════
function RevenueScreen({ search, role }) {
  const platformFee = Math.round(window.totalRevenue * 0.12);
  const columns = [
    { key: 'id', label: 'To\u2019lov ID', render: (p) => <span style={{ font: `600 12px ui-monospace, monospace`, color: 'var(--g-ink-2)' }}>{p.id}</span> },
    { key: 'host', label: 'Mezbon', render: (p) => <PersonCell name={p.host.name} sub={p.host.org} hue={p.host.hue} /> },
    { key: 'method', label: 'Usul', render: (p) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, font: `500 12.5px ${window.GO.font}`, color: 'var(--g-ink-2)' }}><IconCard size={15} /> {p.host.payout}</span> },
    { key: 'fee', label: 'Komissiya', align: 'right', render: (p) => <span style={{ font: `500 13px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>{window.fmtCompactSom(p.fee)}</span> },
    { key: 'amount', label: 'To\u2019lov summasi', align: 'right', render: (p) => <MoneyCell n={p.amount} /> },
    { key: 'date', label: 'Sana', render: (p) => <span style={{ font: `500 13px ${window.GO.font}`, color: 'var(--g-ink-2)' }}>{p.date}</span> },
    { key: 'status', label: window.AT.status, render: (p) => <StatusPill s={p.status} dict={window.PAYOUT_STATUS} /> },
  ];
  let rows = window.PAYOUTS;
  if (search) rows = rows.filter((p) => (p.id + p.host.name).toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 18 }}>
        <StatCard icon={<IconWallet size={17} />} label="Yalpi aylanma" value={window.fmtCompactSom(window.totalRevenue)} unit="so'm" spark={window.revenueSeries.map((d) => d.value)} />
        <StatCard icon={<IconChart size={17} />} label="Platforma komissiyasi" value={window.fmtCompactSom(platformFee)} unit="so'm" spark={window.revenueSeries.map((d) => d.value * 0.12)} />
        <StatCard icon={<IconCheck2 size={17} />} label="To'langan" value={window.fmtCompactSom(window.PAYOUTS.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0))} unit="so'm" />
        <StatCard icon={<IconClock size={17} />} label="Kutilayotgan" value={window.fmtCompactSom(window.PAYOUTS.filter((p) => p.status !== 'paid').reduce((s, p) => s + p.amount, 0))} unit="so'm" delta={-3} deltaInvert />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 16, marginBottom: 18 }}>
        <Card>
          <SectionHead title="Oylik aylanma" sub="Daromad va platforma komissiyasi · so'm" />
          <BarChart data={window.revenueSeries} h={200} unit=" so'm" fmt={(v) => window.fmtSom(v)} />
        </Card>
        <Card>
          <SectionHead title="To'lov holati" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <Donut size={132} thickness={20} centerLabel={window.PAYOUTS.length + ''} centerSub="to'lov" segments={[
              { value: window.PAYOUTS.filter((p) => p.status === 'paid').length, color: 'oklch(0.6 0.13 155)' },
              { value: window.PAYOUTS.filter((p) => p.status === 'pending').length, color: 'oklch(0.78 0.13 75)' },
              { value: window.PAYOUTS.filter((p) => p.status === 'hold').length, color: 'oklch(0.62 0.16 25)' },
            ]} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Object.entries(window.PAYOUT_STATUS).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: `oklch(0.62 0.14 ${v.hue})` }} />
                  <span style={{ flex: 1, font: `500 12.5px ${window.GO.font}`, color: 'var(--g-ink-2)' }}>{v.label}</span>
                  <span style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink)' }}>{window.PAYOUTS.filter((p) => p.status === k).length}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Monthly payout statements (hisobotlar) — generated per host per period */}
      <PayoutStatementsPanel role={role} />

      <SectionHead title="To'lovlar tarixi" right={<Btn kind="ghost" sm><IconDownload size={15} /> {window.AT.export}</Btn>} />
      <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} />
    </div>
  );
}

// ═══ COMPANIES (ijarachi kompaniyalar) ═════════════════════
const COMPANY_DOC = { sent: { label: 'Yuklangan', hue: 155 }, pending: { label: "Yo'q", hue: 35 } };

function CompanyDocCell({ has, num }) {
  return (
    <div>
      <StatusPill s={has ? 'sent' : 'pending'} dict={COMPANY_DOC} size="sm" />
      {num && <div style={{ font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 4 }}>{num}</div>}
    </div>
  );
}

function CompaniesScreen({ search }) {
  const [editing, setEditing] = React.useState(null); // null | {} (new) | company (edit)

  let rows = window.COMPANIES || [];
  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter((c) => `${c.name} ${c.inn || ''} ${c.pinfl || ''}`.toLowerCase().includes(q));
  }

  if (editing) return <CompanyForm company={editing.id ? editing : null} onClose={() => setEditing(null)} />;

  const columns = [
    { key: 'name', label: 'Ijarachi', render: (c) => (
      <div>
        <div style={{ font: `600 13.5px ${window.GO.font}`, color: 'var(--g-ink)', display: 'flex', alignItems: 'center', gap: 7 }}>
          {c.name}
          {c.type === 'individual' && <span style={{ font: `600 10px ${window.GO.font}`, color: 'oklch(0.5 0.1 200)', background: 'oklch(0.95 0.03 200)', padding: '1px 6px', borderRadius: 5 }}>YaTT</span>}
          {/* Excluded tenants are hidden from the invoice screens, so this is
              the one place the decision stays visible. */}
          {c.ediExempt && (
            <span
              title={c.ediExemptReason || 'ESF yaratilmaydi'}
              style={{ font: `600 10px ${window.GO.font}`, color: 'oklch(0.48 0.14 55)', background: 'oklch(0.95 0.05 55)', padding: '1px 6px', borderRadius: 5 }}
            >ESF yo‘q</span>
          )}
        </div>
        <div style={{ font: `400 12px ui-monospace, monospace`, color: 'var(--g-ink-4)' }}>{window.taxLabel(c) || '—'}</div>
      </div>
    ) },
    { key: 'phones', label: 'Telefon', render: (c) => <span style={{ font: `500 12.5px ${window.GO.font}`, color: 'var(--g-ink-2)' }}>{(c.phones || []).join(', ') || '—'}</span> },
    { key: 'passport', label: 'Direktor pasporti', render: (c) => <CompanyDocCell has={!!c.directorPassportFile} num={c.directorPassport} /> },
    { key: 'guvohnoma', label: 'Guvohnoma', render: (c) => <CompanyDocCell has={!!c.guvohnomaFile} num={c.guvohnoma} /> },
    // A note nobody can see is a note nobody reads: flagged in the row, with
    // the text on hover, so it does not sit hidden behind an edit click.
    { key: 'notes', label: 'Izoh', render: (c) => (
      c.notes
        ? <span title={c.notes} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, maxWidth: 220, font: `400 12px ${window.GO.font}`, color: 'var(--g-ink-3)' }}>
            <span style={{ color: 'var(--g-ink-4)', display: 'flex', flexShrink: 0 }}><IconDoc size={13} /></span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.notes}</span>
          </span>
        : <span style={{ color: 'var(--g-ink-4)' }}>—</span>
    ) },
    { key: 'actions', label: '', align: 'right', render: (c) => <Btn kind="ghost" sm onClick={() => setEditing(c)}><IconEdit size={14} /> Tahrirlash</Btn> },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 18 }}>
        <Btn kind="primary" sm onClick={() => setEditing({})}><IconPlus size={15} /> Kompaniya qo'shish</Btn>
      </div>
      <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} empty="Hozircha kompaniyalar yo'q" />
    </div>
  );
}

function CompanyForm({ company, onClose }) {
  const isEdit = !!company;
  const [f, setF] = React.useState(() => company ? {
    name: company.name, type: company.type || 'business', inn: company.inn || '', pinfl: company.pinfl || '',
    phones: company.phones?.length ? company.phones : [''],
    directorPassport: company.directorPassport || '', guvohnoma: company.guvohnoma || '',
    address: company.address || '', vatRegCode: company.vatRegCode || '', notes: company.notes || '',
    ediExempt: !!company.ediExempt, ediExemptReason: company.ediExemptReason || '',
  } : { name: '', type: 'business', inn: '', pinfl: '', phones: [''], directorPassport: '', guvohnoma: '', address: '', vatRegCode: '', notes: '', ediExempt: false, ediExemptReason: '' });
  const [files, setFiles] = React.useState({ passport: null, guvohnoma: null });
  const [busy, setBusy] = React.useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const Label = ({ children }) => <div style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink-2)', marginBottom: 7 }}>{children}</div>;

  const setPhone = (i, v) => setF((s) => { const p = [...s.phones]; p[i] = v; return { ...s, phones: p }; });
  const addPhone = () => setF((s) => ({ ...s, phones: [...s.phones, ''] }));
  const removePhone = (i) => setF((s) => ({ ...s, phones: s.phones.length > 1 ? s.phones.filter((_, idx) => idx !== i) : s.phones }));

  const isIndividual = f.type === 'individual';

  // Pull the tenant's details from the tax registry instead of retyping them.
  // Whatever comes back fills only the EMPTY fields — a lookup must never
  // overwrite something an operator has already corrected by hand.
  const [lookupBusy, setLookupBusy] = React.useState(false);
  const [lookupNote, setLookupNote] = React.useState(null);
  const taxId = isIndividual ? f.pinfl : f.inn;
  const canLookup = isIndividual ? /^\d{14}$/.test(f.pinfl) : /^\d{9}$/.test(f.inn);
  const lookup = async () => {
    setLookupBusy(true); setLookupNote(null);
    try {
      const r = await api.get(`/companies/lookup?taxId=${taxId}`);
      setF((s) => ({
        ...s,
        name: s.name.trim() || r.name || '',
        address: s.address.trim() || r.address || '',
        vatRegCode: s.vatRegCode.trim() || r.vatRegCode || '',
      }));
      const got = ['name', 'address', 'vatRegCode'].filter((k) => r[k]);
      setLookupNote(got.length
        ? `Topildi: ${got.length} ta maydon${r.mode === 'mock' ? ' (mock)' : ''}`
        : 'Reyestrda maʼlumot topilmadi');
    } catch (e) { setLookupNote(e?.message || 'Topilmadi'); }
    setLookupBusy(false);
  };

  const submit = async () => {
    if (!f.name.trim()) { window.alert('Ijarachi nomi talab qilinadi'); return; }
    if (isIndividual ? !/^\d{14}$/.test(f.pinfl) : !/^\d{9}$/.test(f.inn)) {
      window.alert(isIndividual ? '14 xonali PINFL talab qilinadi' : '9 xonali INN talab qilinadi');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        name: f.name.trim(), type: f.type,
        ...(isIndividual ? { pinfl: f.pinfl } : { inn: f.inn }),
        phones: f.phones.map((p) => p.trim()).filter(Boolean),
        directorPassport: f.directorPassport.trim() || null,
        guvohnoma: f.guvohnoma.trim() || null,
        address: f.address.trim() || null,
        vatRegCode: f.vatRegCode.trim() || null,
        notes: f.notes.trim() || null,
        ediExempt: f.ediExempt,
        ediExemptReason: f.ediExempt ? (f.ediExemptReason.trim() || null) : null,
      };
      const saved = isEdit ? await api.patch(`/companies/${company.id}`, payload) : await api.post('/companies', payload);
      if (files.passport) await api.upload(`/companies/${saved.id}/files/passport`, files.passport);
      if (files.guvohnoma) await api.upload(`/companies/${saved.id}/files/guvohnoma`, files.guvohnoma);
      if (window.__gorentRefresh) await window.__gorentRefresh();
      onClose();
    } catch (e) { window.alert(e.message); setBusy(false); }
  };

  const viewFile = async (kind) => {
    // Open the tab synchronously (inside the click) so it isn't popup-blocked
    // after the await; then point it at the fetched blob for inline preview.
    const w = window.open('', '_blank');
    try {
      const url = await api.fileBlobUrl(`/companies/${company.id}/files/${kind}`);
      if (w) w.location = url; else window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      if (w) w.close();
      window.alert(e.message);
    }
  };

  // One KYC document row: reference number + scan upload (+ view existing scan).
  const DocRow = ({ kind, label, numKey, hasFile }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'end' }}>
      <div>
        <Label>{label} raqami</Label>
        <input className="adm-input" value={f[numKey]} onChange={(e) => set(numKey, e.target.value)} placeholder="—" />
      </div>
      <div>
        <Label>{label} skani (PDF/rasm)</Label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFiles((s) => ({ ...s, [kind]: e.target.files?.[0] || null }))}
            style={{ font: `400 12px ${window.GO.font}`, flex: 1, minWidth: 0 }} />
          {isEdit && hasFile && <Btn kind="ghost" sm onClick={() => viewFile(kind)}><IconEye size={14} /> Ko'rish</Btn>}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <button onClick={onClose} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--g-ink-3)', font: `600 13px ${window.GO.font}`, marginBottom: 16, padding: 0 }}>
        <IconChevL size={16} /> Orqaga
      </button>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Card>
          <div style={{ font: `700 15px ${window.GO.font}`, color: 'var(--g-ink)', marginBottom: 16 }}>{isEdit ? 'Kompaniyani tahrirlash' : 'Yangi kompaniya'}</div>
          <div style={{ marginBottom: 14 }}>
            <Label>Ijarachi turi</Label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                ['business', 'Yuridik shaxs', 'INN'],
                ['individual', 'Jismoniy shaxs / YaTT', 'PINFL'],
              ].map(([val, label, tag]) => (
                <button key={val} type="button" onClick={() => set('type', val)}
                  style={{
                    flex: 1, padding: '10px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                    border: `1.5px solid ${f.type === val ? 'var(--g-brand)' : 'var(--g-line)'}`,
                    background: f.type === val ? 'oklch(0.96 0.04 285)' : 'var(--g-surface)',
                    font: `600 12.5px ${window.GO.font}`, color: f.type === val ? 'var(--g-brand)' : 'var(--g-ink-2)',
                  }}>
                  {label} <span style={{ font: `400 11px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>· {tag}</span>
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <Label>{isIndividual ? 'F.I.Sh. (ijarachi)' : 'Kompaniya nomi'}</Label>
              <input className="adm-input" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder={isIndividual ? 'Bekzod Yusupov' : 'Epam Systems'} />
            </div>
            {isIndividual ? (
              <div>
                <Label>PINFL (JSHSHIR)</Label>
                <input className="adm-input" value={f.pinfl} onChange={(e) => set('pinfl', e.target.value.replace(/\D/g, '').slice(0, 14))} placeholder="30112197450012" />
              </div>
            ) : (
              <div>
                <Label>INN (STIR)</Label>
                <input className="adm-input" value={f.inn} onChange={(e) => set('inn', e.target.value.replace(/\D/g, '').slice(0, 9))} placeholder="123456789" />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <Btn kind="soft" sm disabled={!canLookup || lookupBusy} onClick={lookup}>
              {lookupBusy ? 'Qidirilmoqda…' : 'didox dan toʻldirish'}
            </Btn>
            <span style={{ font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>
              {lookupNote || 'Nomi, manzili va QQS kodini soliq reyestridan oladi (boʻsh maydonlarni).'}
            </span>
          </div>

          {/* Both print on the ESF as the buyer's details. Without them the
              «Манзил» and registration-code lines go out blank. */}
          <div style={{ marginTop: 14 }}>
            <Label>Yuridik manzil</Label>
            <input className="adm-input" value={f.address} onChange={(e) => set('address', e.target.value)}
              placeholder="Toshkent sh., Yunusobod tumani, 5-mavze, 12-uy" />
            <div style={{ marginTop: 5, font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>
              Hisob-fakturada xaridorning manzili sifatida chiqadi.
            </div>
          </div>
          {/* Internal only — never reaches an ESF, a contract, or the tenant. */}
          <div style={{ marginTop: 14 }}>
            <Label>Ichki izohlar</Label>
            <textarea className="adm-input" rows={3} style={{ resize: 'vertical', lineHeight: 1.45 }}
              value={f.notes} onChange={(e) => set('notes', e.target.value)}
              placeholder="Kim bilan gaplashildi, nima kelishildi, nimaga e'tibor berish kerak…" />
            <div style={{ marginTop: 5, font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>
              Faqat ichki foydalanish uchun — hisob-fakturada ham, shartnomada ham chiqmaydi.
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <Label>QQS ro'yxatdan o'tish kodi</Label>
            <input className="adm-input" value={f.vatRegCode}
              onChange={(e) => set('vatRegCode', e.target.value.replace(/\D/g, '').slice(0, 20))}
              placeholder="20208000007510207001" />
            <div style={{ marginTop: 5, font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>
              Ijarachining kodi (bizniki emas) — QQS to'lovchi bo'lsa.
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ font: `700 15px ${window.GO.font}`, color: 'var(--g-ink)' }}>Telefon raqamlari</div>
            <Btn kind="ghost" sm onClick={addPhone}><IconPlus size={14} /> Qo'shish</Btn>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {f.phones.map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: 8 }}>
                <input className="adm-input" style={{ flex: 1 }} value={p} onChange={(e) => setPhone(i, e.target.value)} placeholder="+998901234567" />
                {f.phones.length > 1 && <Btn kind="ghost" sm onClick={() => removePhone(i)}><IconTrash size={14} /></Btn>}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div style={{ font: `700 15px ${window.GO.font}`, color: 'var(--g-ink)', marginBottom: 16 }}>Hujjatlar (KYC)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <DocRow kind="passport" label="Direktor pasporti" numKey="directorPassport" hasFile={!!company?.directorPassportFile} />
            <DocRow kind="guvohnoma" label="Guvohnoma" numKey="guvohnoma" hasFile={!!company?.guvohnomaFile} />
          </div>
        </Card>

        <Card>
          <div style={{ font: `700 15px ${window.GO.font}`, color: 'var(--g-ink)', marginBottom: 4 }}>Elektron hujjat aylanishi</div>
          <div style={{ font: `400 12px ${window.GO.font}`, color: 'var(--g-ink-4)', marginBottom: 12 }}>
            didox / soliq bilan avtomatik hujjat almashinuvi.
          </div>
          <Row
            title="ESF yaratilmasin"
            sub="Bu ijarachining bandlovlari uchun oylik hisob-faktura (ESF) yaratilmaydi va didox'ga yuborilmaydi."
            last={!f.ediExempt}
          >
            <Toggle on={f.ediExempt} onClick={() => set('ediExempt', !f.ediExempt)} />
          </Row>
          {f.ediExempt && (
            <div style={{ paddingTop: 12 }}>
              <Label>Sababi</Label>
              <input
                className="adm-input"
                value={f.ediExemptReason}
                onChange={(e) => set('ediExemptReason', e.target.value)}
                placeholder="Masalan: naqd to‘lov, ESF talab qilinmaydi"
              />
              <div style={{
                marginTop: 10, padding: '9px 12px', borderRadius: 9,
                background: 'color-mix(in oklch, oklch(0.7 0.15 55) 12%, transparent)',
                font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-2)',
              }}>
                Ijara hisoblanishi davom etadi — ijarachi «Qarzdorlik» ro‘yxatida qoladi va
                to‘lov eslatmalarini oladi. Faqat ESF yaratilmaydi.
              </div>
            </div>
          )}
        </Card>

        <div style={{ display: 'flex', gap: 10 }}>
          <Btn kind="primary" style={{ flex: 1, justifyContent: 'center' }} onClick={submit} disabled={busy}><IconCheck size={16} /> {busy ? 'Saqlanmoqda…' : window.AT.save}</Btn>
          <Btn kind="ghost" style={{ justifyContent: 'center' }} onClick={onClose}>{window.AT.cancel}</Btn>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CompaniesScreen, CompanyForm });

// ═══ INVOICES (ESF / didox.uz) ═════════════════════════════
const INVOICE_STATUS = {
  ready_to_sign: { label: "Imzolashga tayyor", hue: 70 },
  sent:          { label: "Yuborilgan", hue: 155 },
  error:         { label: "Xatolik", hue: 25 },
};
// Payment status derived from invoice.payments (Σ amount vs invoice.amount).
const INVOICE_PAY_STATUS = {
  unpaid:  { label: "To'lanmagan", hue: 25 },
  partial: { label: "Qisman",      hue: 70 },
  paid:    { label: "To'langan",   hue: 155 },
};
function invoicePaidSum(inv) { return (inv.payments || []).reduce((s, p) => s + (p.amount || 0), 0); }
function invoicePayKey(inv) {
  const paid = invoicePaidSum(inv);
  return paid <= 0 ? 'unpaid' : paid < inv.amount ? 'partial' : 'paid';
}

function currentInvoicePeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function InvoicesScreen({ search }) {
  const [period, setPeriod] = React.useState(currentInvoicePeriod());
  const [generating, setGenerating] = React.useState(false);
  const [signingIds, setSigningIds] = React.useState(() => new Set());
  const [selected, setSelected] = React.useState(() => new Set());
  const [preview, setPreview] = React.useState(null); // GET /invoices/preview result
  const [previewBusy, setPreviewBusy] = React.useState(false);
  const busy = signingIds.size > 0;

  // Month-end review BEFORE generating: which bookings would be invoiced,
  // with rent + attached charges and any already-existing invoice.
  const loadPreview = async () => {
    setPreviewBusy(true);
    try {
      setPreview(await api.get(`/invoices/preview?period=${encodeURIComponent(period)}`));
    } catch (e) {
      window.alert(e && e.message ? e.message : 'Xatolik yuz berdi');
    }
    setPreviewBusy(false);
  };

  let rows = window.INVOICES || [];
  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter((inv) => `${inv.period} ${inv.booking?.id} ${inv.booking?.customer} ${inv.booking?.companyRef?.name}`.toLowerCase().includes(q));
  }
  const signable = rows.filter((r) => r.status === 'ready_to_sign');
  const selectedList = signable.filter((r) => selected.has(r.id));
  const allSelected = signable.length > 0 && signable.every((r) => selected.has(r.id));
  const someSelected = !allSelected && signable.some((r) => selected.has(r.id));

  const toggleOne = (id) => setSelected((prev) => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(signable.map((r) => r.id)));

  const generate = async () => {
    setGenerating(true);
    await gorentMutate(() => api.post('/invoices/generate', { period }));
    setGenerating(false);
  };

  // Signs one or many drafts in a single E-IMZO session: the agent + key are
  // resolved once, then each invoice is fetched, signed locally, and submitted.
  // Per-invoice failures are collected and reported without aborting the batch.
  const signInvoices = async (list) => {
    if (!list.length) return;
    setSigningIds(new Set(list.map((inv) => inv.id)));
    try {
      // Ask for the certificates directly rather than probing isAvailable():
      // the boolean collapses "agent not running" and "this domain has no
      // E-IMZO API key" into one message, and the second is by far the more
      // likely — and the one the operator can actually act on.
      const certs = await eimzo.listCertificates();
      if (!certs.length) throw new Error("E-IMZO sertifikatlari topilmadi.");
      // An ESF must be signed by the SELLER's own key. Taking certs[0] picked
      // whichever certificate E-IMZO listed first — on a machine holding
      // several keys that is usually somebody's personal certificate, not the
      // company's. Match on the STIR the invoices are issued under.
      const { stir } = await api.get('/didox/status');
      if (!stir) throw new Error("Kompaniya STIR sozlanmagan (DIDOX_STIR) — imzolash mumkin emas.");
      const picked = eimzo.pickCertificate(certs, stir);
      const cert = picked.raw;
      const failures = [];
      for (const inv of list) {
        try {
          const { base64 } = await api.get(`/invoices/${inv.id}/tosign`);
          const signature = await eimzo.signBase64(base64, cert);
          await api.post(`/invoices/${inv.id}/sign`, { signature });
        } catch (e) {
          failures.push(`${inv.booking?.companyRef?.name || inv.id}: ${e.message}`);
        }
      }
      if (window.__gorentRefresh) await window.__gorentRefresh();
      setSelected(new Set());
      if (failures.length) window.alert(`Ba'zi hisob-fakturalar imzolanmadi:\n\n${failures.join('\n')}`);
    } catch (e) {
      window.alert(e.message || "Imzolashda xatolik yuz berdi");
    } finally {
      setSigningIds(new Set());
    }
  };

  const columns = [
    { key: 'sel', w: 40, label: (
      <input type="checkbox" checked={allSelected} disabled={signable.length === 0 || busy}
        ref={(el) => { if (el) el.indeterminate = someSelected; }}
        onChange={toggleAll} style={{ cursor: 'pointer', width: 15, height: 15 }} />
    ), render: (inv) => inv.status === 'ready_to_sign'
      ? <input type="checkbox" checked={selected.has(inv.id)} disabled={busy} onChange={() => toggleOne(inv.id)} style={{ cursor: 'pointer', width: 15, height: 15 }} />
      : null },
    { key: 'period', label: 'Davr', render: (inv) => <span style={{ font: `600 12.5px ui-monospace, monospace`, color: 'var(--g-ink-2)' }}>{inv.period}</span> },
    { key: 'booking', label: 'Bandlov / Xaridor', render: (inv) => <PersonCell name={inv.booking?.companyRef?.name || inv.booking?.customer || inv.bookingId} sub={inv.booking?.id} hue={nameHue(inv.booking?.companyRef?.name || inv.booking?.customer)} /> },
    { key: 'amount', label: 'Summa', align: 'right', render: (inv) => <MoneyCell n={inv.amount} /> },
    { key: 'pay', label: "To'lov", render: (inv) => {
      const paidSum = invoicePaidSum(inv);
      return (
        <div>
          <StatusPill s={invoicePayKey(inv)} dict={INVOICE_PAY_STATUS} size="sm" />
          {paidSum > 0 && paidSum < inv.amount && (
            <div style={{ font: `400 11px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 4 }}>{window.fmtSom(paidSum)} / {window.fmtSom(inv.amount)}</div>
          )}
        </div>
      );
    } },
    { key: 'status', label: window.AT.status, render: (inv) => (
      <div>
        <StatusPill s={inv.status} dict={INVOICE_STATUS} size="sm" />
        {inv.status === 'error' && inv.error && <div style={{ font: `400 11px ${window.GO.font}`, color: 'oklch(0.55 0.18 25)', marginTop: 4, maxWidth: 240 }}>{inv.error}</div>}
      </div>
    ) },
    { key: 'actions', label: '', align: 'right', render: (inv) => {
      if (inv.status === 'ready_to_sign') {
        return <Btn kind="primary" sm disabled={busy} onClick={() => signInvoices([inv])}><IconShieldCheck size={14} /> {signingIds.has(inv.id) ? 'Imzolanmoqda…' : 'E-IMZO bilan imzolash'}</Btn>;
      }
      if (inv.status === 'error') {
        return <Btn kind="ghost" sm disabled={busy} onClick={() => gorentMutate(() => api.post('/invoices/generate', { period: inv.period }))}><IconRefresh size={14} /> Qayta urinish</Btn>;
      }
      return null;
    } },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Label_>Davr</Label_>
          <input className="adm-input" style={{ width: 130 }} value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="2026-06" />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn kind="ghost" sm disabled={previewBusy || busy} onClick={loadPreview}><IconEye size={15} /> {previewBusy ? 'Yuklanmoqda…' : 'Oy yakuni'}</Btn>
          <Btn kind="primary" sm disabled={generating || busy} onClick={generate}><IconDoc size={15} /> {generating ? 'Yaratilmoqda…' : "Oylik hisob-fakturalarni yaratish"}</Btn>
        </div>
      </div>

      {/* Month-end preview panel — review rent + charges before generation */}
      {preview && (
        <Card pad={0} style={{ marginBottom: 16, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '16px 20px', borderBottom: '1px solid var(--g-line)', flexWrap: 'wrap' }}>
            <div>
              <div style={{ font: `700 15px ${window.GO.font}`, color: 'var(--g-ink)' }}>Oy yakuni · {preview.period}</div>
              <div style={{ font: `400 12px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 2 }}>{preview.count} ta hisob-faktura · jami {window.fmtSom(preview.total)} so'm</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn kind="ghost" sm onClick={() => setPreview(null)}>Yopish</Btn>
              <Btn kind="primary" sm disabled={generating} onClick={async () => {
                setGenerating(true);
                const ok = await gorentMutate(() => api.post('/invoices/generate', { period: preview.period }));
                setGenerating(false);
                if (ok) setPreview(null);
              }}><IconCheck2 size={14} /> {generating ? 'Yaratilmoqda…' : 'Tasdiqlash va yaratish'}</Btn>
            </div>
          </div>
          <div className="adm-scroll" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
              <thead>
                <tr style={{ background: 'var(--g-bg)' }}>
                  {['Bandlov / Mijoz', 'Joy', 'Ijara', 'Xarajatlar', 'Jami', 'Mavjud'].map((h, i) => (
                    <th key={h} style={{ textAlign: i >= 2 && i <= 4 ? 'right' : 'left', padding: '11px 16px', font: `600 11px ${window.GO.font}`, color: 'var(--g-ink-4)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', borderBottom: '1px solid var(--g-line)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(preview.rows || []).map((r, i) => (
                  <tr key={r.bookingId} style={{ borderBottom: i < preview.rows.length - 1 ? '1px solid var(--g-line)' : 0 }}>
                    <td style={{ padding: '11px 16px' }}>
                      <div style={{ font: `600 13px ${window.GO.font}`, color: 'var(--g-ink)' }}>{r.company?.name || r.customer}</div>
                      <div style={{ font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 1 }}>{r.customer}{r.company && window.taxLabel(r.company) ? ` · ${window.taxLabel(r.company)}` : ''} · <span style={{ fontFamily: 'ui-monospace, monospace' }}>{r.bookingId}</span></div>
                    </td>
                    <td style={{ padding: '11px 16px', font: `500 12.5px ${window.GO.font}`, color: 'var(--g-ink-2)', whiteSpace: 'nowrap' }}>{r.building} · {r.unit}</td>
                    <td style={{ padding: '11px 16px', textAlign: 'right', font: `500 13px ${window.GO.font}`, color: 'var(--g-ink-2)', whiteSpace: 'nowrap' }}>{window.fmtSom(r.rent)}</td>
                    <td style={{ padding: '11px 16px', textAlign: 'right' }}>
                      {(r.charges || []).length === 0
                        ? <span style={{ font: `400 12px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>—</span>
                        : (r.charges || []).map((ch) => (
                            <div key={ch.id} style={{ font: `400 12px ${window.GO.font}`, color: 'var(--g-ink-3)', whiteSpace: 'nowrap' }}>
                              {ch.title} <span style={{ fontWeight: 600, color: 'var(--g-ink-2)' }}>{window.fmtSom(ch.amount)}</span>
                            </div>
                          ))}
                    </td>
                    <td style={{ padding: '11px 16px', textAlign: 'right', font: `700 13px ${window.GO.font}`, color: 'var(--g-ink)', whiteSpace: 'nowrap' }}>{window.fmtSom(r.total)} so'm</td>
                    <td style={{ padding: '11px 16px' }}>
                      {r.existingInvoice
                        ? <div>
                            <StatusPill s="x" dict={{ x: { label: 'Mavjud', hue: 70 } }} size="sm" />
                            <div style={{ font: `400 11px ui-monospace, monospace`, color: 'var(--g-ink-4)', marginTop: 3 }}>{r.existingInvoice.id}</div>
                          </div>
                        : <span style={{ font: `400 12px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Held back for want of a live contract. An ESF is issued UNDER a
              contract, so these cannot be billed — and an operator has to see
              that before the run, not wonder next month why a tenant was
              missed. */}
          {!!(preview.blocked || []).length && (
            <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 10, background: 'oklch(0.97 0.03 70)', border: '1px solid oklch(0.88 0.07 70)' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', font: `700 13px ${window.GO.font}`, color: 'oklch(0.45 0.13 70)', marginBottom: 6 }}>
                <IconWarn size={15} /> Shartnomasi yo'q — {preview.blocked.length} ta bandlov hisob-fakturasiz qoladi
              </div>
              {preview.blocked.map((b) => (
                <div key={b.bookingId} style={{ font: `400 12.5px ${window.GO.font}`, color: 'oklch(0.42 0.1 70)', marginTop: 2 }}>
                  <span style={{ fontFamily: 'ui-monospace, monospace' }}>{b.bookingId}</span>
                  {' · '}{b.company || b.customer} · {b.building} — <b>{b.reason}</b>
                </div>
              ))}
              <div style={{ marginTop: 7, font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>
                Shartnoma tuzilgach, «Oylik hisob-fakturalarni yaratish» qayta ishga tushiriladi.
              </div>
            </div>
          )}
        </Card>
      )}

      {selectedList.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 14px', marginBottom: 12, background: 'var(--g-brand-soft)', border: '1px solid var(--g-line)', borderRadius: 10 }}>
          <span style={{ font: `600 13px ${window.GO.font}`, color: 'var(--g-brand-ink)' }}>{selectedList.length} ta hisob-faktura tanlandi</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn kind="ghost" sm disabled={busy} onClick={() => setSelected(new Set())}>Bekor qilish</Btn>
            <Btn kind="primary" sm disabled={busy} onClick={() => signInvoices(selectedList)}><IconShieldCheck size={14} /> {busy ? 'Imzolanmoqda…' : `E-IMZO bilan imzolash (${selectedList.length} ta)`}</Btn>
          </div>
        </div>
      )}

      <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} empty="Bu davr uchun hisob-fakturalar yo'q" />
    </div>
  );
}

function Label_({ children }) {
  return <span style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink-2)' }}>{children}</span>;
}

// ═══ REVIEWS ════════════════════════════════════════════════
function ReviewsScreen({ search }) {
  const [filter, setFilter] = React.useState('all');
  const dict = { published: { label: 'Nashr etilgan', hue: 155 }, pending: { label: 'Kutilmoqda', hue: 70 }, flagged: { label: 'Belgilangan', hue: 25 } };
  let rows = window.REVIEWS.filter((r) => filter === 'all' || r.state === filter);
  if (search) rows = rows.filter((r) => (r.author + r.text + (r.building?.name || '')).toLowerCase().includes(search.toLowerCase()));
  const counts = { all: window.REVIEWS.length };
  Object.keys(dict).forEach((k) => counts[k] = window.REVIEWS.filter((r) => r.state === k).length);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, marginBottom: 18, flexWrap: 'wrap' }}>
        <StatusChips dict={dict} value={filter} setValue={setFilter} counts={counts} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, font: `500 13px ${window.GO.font}`, color: 'var(--g-ink-3)' }}>
          <IconStar size={15} /> O'rtacha baho: <b style={{ color: 'var(--g-ink)' }}>{window.avgRating}</b>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {rows.map((r) => (
          <Card key={r.id} style={{ display: 'flex', flexDirection: 'column', gap: 12, borderColor: r.state === 'flagged' ? 'oklch(0.85 0.07 25)' : 'var(--g-line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <Avatar name={r.author} size={38} hue={r.hue} />
                <div>
                  <div style={{ font: `600 13.5px ${window.GO.font}`, color: 'var(--g-ink)' }}>{r.author}</div>
                  <div style={{ font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>{r.date} · {r.id}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 2 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} style={{ color: i < r.rating ? 'var(--g-brand)' : 'var(--g-line)', display: 'flex' }}>{i < r.rating ? <IconStar size={14} /> : <IconStarO size={14} />}</span>
                ))}
              </div>
            </div>
            <div style={{ font: `400 13.5px ${window.GO.font}`, color: 'var(--g-ink-2)', lineHeight: 1.5 }}>"{r.text}"</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, font: `400 12px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>
              <IconBuilding size={13} /> <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.building?.name || '—'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid var(--g-line)' }}>
              <StatusPill s={r.state} dict={dict} size="sm" />
              <div style={{ display: 'flex', gap: 7 }}>
                {r.state !== 'published' && <Btn kind="soft" sm onClick={() => gorentMutate(() => api.post(`/reviews/${r.id}/approve`))}><IconCheck2 size={14} /> Tasdiqlash</Btn>}
                {r.state !== 'flagged' && <Btn kind="ghost" sm onClick={() => gorentMutate(() => api.post(`/reviews/${r.id}/flag`))}><IconFlag size={14} /> Belgilash</Btn>}
                <Btn kind="danger" sm onClick={() => window.confirm(`"${r.author}" sharhini o'chirasizmi?`) && gorentMutate(() => api.del(`/reviews/${r.id}`))}><IconTrash size={14} /> O'chirish</Btn>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { BookingsScreen, HostsScreen, BuildingsScreen, BuildingForm, RevenueScreen, InvoicesScreen, ReviewsScreen, StatusChips });

// ============================================================
// src/admin-money.jsx
// ============================================================

// admin-money.jsx — Gorent Admin: money loop — Qarzdorlik (debtors), payments,
// extra charges, Shartnomalar (contracts) and monthly payout statements.

// ─── Small centered modal ───────────────────────────────────
function GoModal({ open, onClose, title, width = 460, children }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 95, display: 'grid', placeItems: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(20,16,12,0.45)' }} />
      <div className="adm-scroll" style={{ position: 'relative', width, maxWidth: '94vw', maxHeight: '90vh', overflowY: 'auto',
        background: 'var(--g-card)', border: '1px solid var(--g-line)', borderRadius: 16, boxShadow: window.GO.shadowLg, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ font: `700 15px ${window.GO.font}`, color: 'var(--g-ink)' }}>{title}</div>
          <IconBtn title="Yopish" onClick={onClose}><IconClose size={16} /></IconBtn>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Record-payment form (reusable) ─────────────────────────
// POST /payments {bookingId, amount, method, paidAt, note?}. `defaultAmount`
// prefills the outstanding balance when opened from a debtor row.
function PaymentForm({ bookingId, defaultAmount, onDone, onCancel }) {
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const [f, setF] = React.useState(() => ({
    amount: defaultAmount && defaultAmount > 0 ? defaultAmount : '',
    method: 'bank', date: today(), note: '',
  }));
  const [err, setErr] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const Label = ({ children }) => <div style={{ font: `600 12px ${window.GO.font}`, color: 'var(--g-ink-2)', marginBottom: 5 }}>{children}</div>;
  const canSubmit = Number(f.amount) >= 1 && !!f.date;

  const submit = async () => {
    if (!canSubmit) return;
    setErr(null); setBusy(true);
    try {
      await api.post('/payments', {
        bookingId,
        amount: Number(f.amount),
        method: f.method,
        paidAt: new Date(`${f.date}T12:00:00`).toISOString(),
        ...(f.note.trim() ? { note: f.note.trim() } : {}),
      });
      onDone();
    } catch (e) {
      setErr(e && e.message ? e.message : 'Xatolik yuz berdi');
      setBusy(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div>
          <Label>Summa (so'm)</Label>
          <input className="adm-input" type="number" min={1} value={f.amount} onChange={(e) => set('amount', e.target.value)} placeholder="1000000" />
        </div>
        <div>
          <Label>Usul</Label>
          <select className="adm-select" style={{ width: '100%' }} value={f.method} onChange={(e) => set('method', e.target.value)}>
            {Object.entries(window.PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div>
          <Label>Sana</Label>
          <DateField value={f.date} onChange={(v) => set('date', v)} />
        </div>
        <div>
          <Label>Izoh (ixtiyoriy)</Label>
          <input className="adm-input" value={f.note} onChange={(e) => set('note', e.target.value)} placeholder="—" />
        </div>
      </div>
      {err && (
        <div style={{ marginBottom: 10, font: `500 12.5px ${window.GO.font}`, color: 'oklch(0.5 0.16 25)', background: 'oklch(0.96 0.04 25)', padding: '9px 12px', borderRadius: 9 }}>{err}</div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        {onCancel && <Btn kind="ghost" sm onClick={onCancel}>{window.AT.cancel}</Btn>}
        <Btn kind="primary" sm onClick={submit} disabled={busy || !canSubmit}><IconCheck size={14} /> {busy ? 'Saqlanmoqda…' : "To'lovni saqlash"}</Btn>
      </div>
    </div>
  );
}

// ═══ QARZDORLIK (accrual receivables) ═══════════════════════
function MoneyStatCard({ icon, label, value, unit = "so'm", color = 'var(--g-ink)' }) {
  return (
    <Card pad={18} style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'var(--g-brand-soft)', color: 'var(--g-brand-ink)' }}>{icon}</div>
        <div style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink-3)' }}>{label}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
        <div style={{ font: `700 27px ${window.GO.font}`, color, letterSpacing: '-0.03em' }}>{value}</div>
        {unit && <div style={{ font: `500 12.5px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>{unit}</div>}
      </div>
    </Card>
  );
}

// ── Qarzdorlik → Qora ro'yxat ───────────────────────────────
// Tenants we will not rent to again. Entries are never deleted: lifting one
// keeps the row so the history of who was blocked, why, and who cleared them
// survives the people involved.
const BL_PAGE_SIZE = 50;

function BlacklistPanel({ search }) {
  const [data, setData] = React.useState(null);
  const [facets, setFacets] = React.useState({ regions: [], districts: [] });
  const [err, setErr] = React.useState(null);
  const [f, setF] = React.useState({ status: 'active', origin: 'all', region: '', district: '' });
  const [page, setPage] = React.useState(1);
  const [lifting, setLifting] = React.useState(null); // entry → lift modal
  const setFilter = (k, v) => setF((s) => ({ ...s, [k]: v, ...(k === 'region' ? { district: '' } : {}) }));

  // The header search box drives this, debounced: an 8000-row list is queried
  // in the database, not filtered in the browser.
  const [q, setQ] = React.useState(search || '');
  React.useEffect(() => {
    const t = setTimeout(() => setQ(search || ''), 300);
    return () => clearTimeout(t);
  }, [search]);
  // Any change of what is being asked for starts again at page 1, or the
  // pager can leave you looking at an empty page 40 of a 3-row result.
  React.useEffect(() => { setPage(1); }, [q, f.status, f.origin, f.region, f.district]);

  const load = React.useCallback(async () => {
    setErr(null);
    const p = new URLSearchParams({ page: String(page), pageSize: String(BL_PAGE_SIZE), status: f.status });
    if (q.trim()) p.set('search', q.trim());
    if (f.origin !== 'all') p.set('origin', f.origin);
    if (f.region) p.set('region', f.region);
    if (f.district) p.set('district', f.district);
    try { setData(await api.get(`/blacklist?${p.toString()}`)); }
    catch (e) { setErr(e?.message || 'Yuklab bo‘lmadi'); }
  }, [page, q, f.status, f.origin, f.region, f.district]);
  React.useEffect(() => { load(); }, [load]);

  // Loaded once: the choices come from the whole list, not the current page.
  const loadFacets = React.useCallback(async () => {
    try { setFacets(await api.get('/blacklist/facets')); } catch { /* filters just stay empty */ }
  }, []);
  React.useEffect(() => { loadFacets(); }, [loadFacets]);

  const reload = React.useCallback(async () => { await load(); await loadFacets(); }, [load, loadFacets]);

  if (err) return <Card><div style={{ font: `400 13px ${window.GO.font}`, color: 'oklch(0.5 0.16 25)' }}>{err}</div></Card>;
  if (!data) return <Card><div style={{ font: `400 13px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>Yuklanmoqda…</div></Card>;

  const rows = data.rows || [];
  const districts = facets.districts.filter((d) => !f.region || d.region === f.region).map((d) => d.district);
  const from = data.total ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = Math.min(data.page * data.pageSize, data.total);

  const columns = [
    // An imported subject has no Company behind it — the printed name and tax
    // id are all there is, so they carry the row.
    { key: 'who', label: 'Ijarachi', render: (r) => (
      <div style={{ minWidth: 0 }}>
        <div style={{ font: `600 13px ${window.GO.font}`, color: 'var(--g-ink)' }}>
          {r.company?.name || r.name || (r.phone ? `+${r.phone}` : '—')}
        </div>
        <div style={{ font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 1 }}>
          {r.company ? window.taxLabel(r.company) : r.taxId ? `STIR/JSHSHIR ${r.taxId}` : 'telefon bo‘yicha'}
          {r.phone ? ` · +${r.phone}` : ''}
          {r.region ? ` · ${r.region}${r.district ? `, ${r.district}` : ''}` : ''}
        </div>
      </div>
    ) },
    { key: 'reason', label: 'Sabab', render: (r) => (
      <div style={{ minWidth: 0 }}>
        <div style={{ font: `500 13px ${window.GO.font}`, color: 'var(--g-ink-2)' }}>{r.reason}</div>
        {(r.note || r.source) && (
          <div style={{ font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 1 }}>{r.note || r.source}</div>
        )}
      </div>
    ) },
    { key: 'amount', label: 'Qarz', align: 'right', render: (r) => (
      r.amount ? <MoneyCell n={r.amount} /> : <span style={{ color: 'var(--g-ink-4)' }}>—</span>
    ) },
    { key: 'when', label: 'Qo‘shilgan', align: 'right', render: (r) => (
      <div style={{ whiteSpace: 'nowrap' }}>
        <div style={{ font: `500 12.5px ${window.GO.font}`, color: 'var(--g-ink-2)' }}>{fmtDate(r.createdAt)}</div>
        {r.createdBy && <div style={{ font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 1 }}>{r.createdBy}</div>}
      </div>
    ) },
    { key: 'act', label: '', align: 'right', render: (r) => (
      <div onClick={(e) => e.stopPropagation()}>
        {r.liftedAt ? (
          <span title={r.liftReason || ''} style={{ font: `600 11.5px ${window.GO.font}`, color: 'oklch(0.5 0.13 155)', whiteSpace: 'nowrap' }}>
            {fmtDate(r.liftedAt)} da bekor qilingan
          </span>
        ) : (
          <Btn kind="ghost" sm onClick={() => setLifting(r)}>Ro'yxatdan chiqarish</Btn>
        )}
      </div>
    ) },
  ];

  return (
    <div>
      <BlacklistImport onDone={reload} />

      <div style={{ font: `400 12.5px ${window.GO.font}`, color: 'var(--g-ink-3)', marginBottom: 12 }}>
        Bu ijarachilarga yangi bandlov yaratib bo‘lmaydi. Qo‘shish uchun «Sobiq ijarachilar» ro‘yxatidan
        yoki yuqoridagi CSV importdan foydalaning. Qidiruv yuqoridagi qidiruv maydoni orqali —
        nomi, STIR/JSHSHIR, viloyat yoki sabab bo‘yicha.
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
        <select className="adm-select" style={{ width: 'auto' }} value={f.status} onChange={(e) => setFilter('status', e.target.value)}>
          <option value="active">Amaldagilar</option>
          <option value="lifted">Bekor qilinganlar</option>
          <option value="all">Hammasi</option>
        </select>
        <select className="adm-select" style={{ width: 'auto' }} value={f.origin} onChange={(e) => setFilter('origin', e.target.value)}>
          <option value="all">Barcha manbalar</option>
          <option value="imported">Import qilingan</option>
          <option value="manual">Qo‘lda qo‘shilgan</option>
        </select>
        <select className="adm-select" style={{ width: 'auto' }} value={f.region} onChange={(e) => setFilter('region', e.target.value)}>
          <option value="">Barcha viloyatlar</option>
          {facets.regions.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        {!!districts.length && (
          <select className="adm-select" style={{ width: 'auto' }} value={f.district} onChange={(e) => setFilter('district', e.target.value)}>
            <option value="">Barcha tumanlar</option>
            {districts.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
        {(q.trim() || f.region || f.district || f.origin !== 'all' || f.status !== 'active') && (
          <Btn kind="ghost" sm onClick={() => setF({ status: 'active', origin: 'all', region: '', district: '' })}>
            Filtrlarni tozalash
          </Btn>
        )}
        <div style={{ marginLeft: 'auto', font: `500 12.5px ${window.GO.font}`, color: 'var(--g-ink-3)', whiteSpace: 'nowrap' }}>
          {data.total ? `${from}–${to} / ${data.total} ta` : '0 ta'}
        </div>
      </div>

      <DataTable columns={columns} rows={rows} rowKey={(r) => r.id}
        empty={q.trim() || f.region ? 'Hech narsa topilmadi' : "Qora ro'yxat bo'sh"} />

      {data.pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 14 }}>
          <Btn kind="ghost" sm disabled={data.page <= 1} onClick={() => setPage(data.page - 1)}>← Oldingi</Btn>
          <span style={{ font: `500 12.5px ${window.GO.font}`, color: 'var(--g-ink-3)' }}>
            {data.page} / {data.pages}
          </span>
          <Btn kind="ghost" sm disabled={data.page >= data.pages} onClick={() => setPage(data.page + 1)}>Keyingi →</Btn>
        </div>
      )}

      <GoModal open={!!lifting} onClose={() => setLifting(null)} title="Qora ro'yxatdan chiqarish">
        {lifting && <LiftBlacklistForm entry={lifting} onCancel={() => setLifting(null)} onDone={async () => { setLifting(null); await load(); }} />}
      </GoModal>
    </div>
  );
}

// Bulk import of the official risky-taxpayer list (soliq's table, saved from
// Excel as CSV). Always previews first: these files run to thousands of rows,
// and the operator should see the count and the rejects before anything lands.
function BlacklistImport({ onDone }) {
  const [file, setFile] = React.useState(null);
  const [source, setSource] = React.useState('');
  const [preview, setPreview] = React.useState(null);
  const [err, setErr] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const inputRef = React.useRef(null);

  const qs = (dryRun) => {
    const q = new URLSearchParams();
    if (dryRun) q.set('dryRun', 'true');
    if (source.trim()) q.set('source', source.trim());
    return q.toString();
  };

  const pick = async (f) => {
    setFile(f); setPreview(null); setErr(null);
    if (!f) return;
    setBusy(true);
    try { setPreview(await api.upload(`/blacklist/import?${qs(true)}`, f)); }
    catch (e) { setErr(e?.message || 'Faylni o‘qib bo‘lmadi'); }
    finally { setBusy(false); }
  };

  const run = async () => {
    setBusy(true); setErr(null);
    try {
      const res = await api.upload(`/blacklist/import?${qs(false)}`, file);
      setFile(null); setPreview(null);
      if (inputRef.current) inputRef.current.value = '';
      onDone(res);
    } catch (e) { setErr(e?.message || 'Import bajarilmadi'); }
    finally { setBusy(false); }
  };

  return (
    <Card style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
        <span style={{ color: 'var(--g-brand-ink)', display: 'flex' }}><IconDoc size={16} /></span>
        <div style={{ font: `700 14px ${window.GO.font}`, color: 'var(--g-ink)' }}>Ro'yxatni CSV dan yuklash</div>
      </div>
      <div style={{ font: `400 12.5px ${window.GO.font}`, color: 'var(--g-ink-3)', marginBottom: 12 }}>
        Ustunlar: <b>Вилоят · Туман · СТИР/ЖШШИР · Субъект номи</b> (lotincha sarlavhalar ham bo'ladi).
        Allaqachon ro'yxatdagilar takrorlanmaydi.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ font: `600 12px ${window.GO.font}`, color: 'var(--g-ink-2)', marginBottom: 5 }}>CSV fayl</div>
          <input ref={inputRef} type="file" accept=".csv,text/csv,text/plain"
            onChange={(e) => pick(e.target.files?.[0] || null)} style={{ font: `400 12.5px ${window.GO.font}` }} />
        </div>
        <div>
          <div style={{ font: `600 12px ${window.GO.font}`, color: 'var(--g-ink-2)', marginBottom: 5 }}>Manba (ixtiyoriy)</div>
          <input className="adm-input" value={source} onChange={(e) => setSource(e.target.value)}
            placeholder="Soliq ro'yxati 10.11.2025" />
        </div>
      </div>

      {err && <div style={{ marginBottom: 10, font: `500 12.5px ${window.GO.font}`, color: 'oklch(0.5 0.16 25)' }}>{err}</div>}

      {preview && (
        <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--g-surface-2, oklch(0.97 0.005 250))', border: '1px solid var(--g-line)' }}>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', font: `500 12.5px ${window.GO.font}`, color: 'var(--g-ink-2)' }}>
            <span>O'qildi: <b>{preview.parsed}</b></span>
            <span style={{ color: 'oklch(0.45 0.15 25)' }}>Qo'shiladi: <b>{preview.created}</b></span>
            <span style={{ color: 'var(--g-ink-3)' }}>Takror: <b>{preview.skipped}</b></span>
            <span style={{ color: preview.invalid ? 'oklch(0.48 0.14 55)' : 'var(--g-ink-3)' }}>Xato satr: <b>{preview.invalid}</b></span>
            {!!preview.matchedCompanies && <span style={{ color: 'oklch(0.45 0.12 155)' }}>Mavjud ijarachi: <b>{preview.matchedCompanies}</b></span>}
          </div>
          {/* The raw text matters more than the count: it is the only way to
              tell a genuinely broken row from one this parser mishandled. */}
          {!!preview.invalidRows?.length && (
            <div style={{ marginTop: 8, font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>
              {preview.invalidRows.slice(0, 5).map((r) => (
                <div key={r.line} style={{ marginBottom: 3 }}>
                  satr {r.line}: {r.reason}
                  {r.raw && (
                    <div style={{ fontFamily: 'ui-monospace, monospace', color: 'var(--g-ink-3)', wordBreak: 'break-all' }}>
                      {r.raw}
                    </div>
                  )}
                </div>
              ))}
              {preview.invalidRows.length > 5 && <div>…yana {preview.invalidRows.length - 5} ta</div>}
            </div>
          )}
          {!!preview.sample?.length && (
            <div style={{ marginTop: 8, font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>
              Masalan: {preview.sample.slice(0, 3).map((s) => `${s.name || s.taxId} (${s.taxId})`).join(' · ')}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <Btn kind="primary" sm disabled={busy || !preview.created} onClick={run}>
              {busy ? 'Yuklanmoqda…' : `${preview.created} ta yozuvni qo'shish`}
            </Btn>
          </div>
        </div>
      )}
      {busy && !preview && <div style={{ font: `400 12.5px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>O'qilmoqda…</div>}
    </Card>
  );
}

function LiftBlacklistForm({ entry, onDone, onCancel }) {
  const [reason, setReason] = React.useState('');
  const [err, setErr] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const submit = async () => {
    setErr(null); setBusy(true);
    try {
      await api.post(`/blacklist/${entry.id}/lift`, reason.trim() ? { reason: reason.trim() } : {});
      onDone();
    } catch (e) { setErr(e?.message || 'Xatolik'); setBusy(false); }
  };
  return (
    <div>
      <div style={{ font: `400 12.5px ${window.GO.font}`, color: 'var(--g-ink-3)', marginBottom: 14 }}>
        <b>{entry.company?.name || `+${entry.phone}`}</b> yana bandlov yarata oladi. Yozuv tarixda saqlanib qoladi.
      </div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ font: `600 12px ${window.GO.font}`, color: 'var(--g-ink-2)', marginBottom: 5 }}>Sabab</div>
        <input className="adm-input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Qarz to'landi" />
      </div>
      {err && <div style={{ marginBottom: 10, font: `500 12.5px ${window.GO.font}`, color: 'oklch(0.5 0.16 25)' }}>{err}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Btn kind="ghost" sm onClick={onCancel}>{window.AT.cancel}</Btn>
        <Btn kind="primary" sm onClick={submit} disabled={busy}>{busy ? 'Saqlanmoqda…' : 'Chiqarish'}</Btn>
      </div>
    </div>
  );
}

// Add a former tenant to the blacklist, prefilled from their debt row.
function BlacklistForm({ row, onDone, onCancel }) {
  const [f, setF] = React.useState({ reason: '', note: '' });
  const [err, setErr] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const canSubmit = f.reason.trim().length >= 3;

  const submit = async () => {
    if (!canSubmit) return;
    setErr(null); setBusy(true);
    try {
      await api.post('/blacklist', {
        // Both identities, so the same person can't return under a new company.
        ...(row.company?.id ? { companyId: row.company.id } : {}),
        ...(row.phone ? { phone: row.phone } : {}),
        reason: f.reason.trim(),
        ...(f.note.trim() ? { note: f.note.trim() } : {}),
        ...(row.outstanding > 0 ? { amount: row.outstanding } : {}),
      });
      onDone();
    } catch (e) { setErr(e?.message || 'Xatolik'); setBusy(false); }
  };

  return (
    <div>
      <div style={{ font: `400 12.5px ${window.GO.font}`, color: 'var(--g-ink-3)', marginBottom: 14 }}>
        <b>{row.company?.name || row.customer}</b>{row.phone ? ` · +${row.phone}` : ''} — yangi bandlov yaratish taqiqlanadi.
        {row.outstanding > 0 && <> Qarz: <b>{window.fmtSom(row.outstanding)} so'm</b>.</>}
      </div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ font: `600 12px ${window.GO.font}`, color: 'var(--g-ink-2)', marginBottom: 5 }}>Sabab</div>
        <input className="adm-input" value={f.reason} onChange={(e) => set('reason', e.target.value)} placeholder="Qarzini to'lamay chiqib ketgan" />
      </div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ font: `600 12px ${window.GO.font}`, color: 'var(--g-ink-2)', marginBottom: 5 }}>Izoh (sud ishi raqami va h.k.)</div>
        <input className="adm-input" value={f.note} onChange={(e) => set('note', e.target.value)} placeholder="—" />
      </div>
      {err && <div style={{ marginBottom: 10, font: `500 12.5px ${window.GO.font}`, color: 'oklch(0.5 0.16 25)' }}>{err}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Btn kind="ghost" sm onClick={onCancel}>{window.AT.cancel}</Btn>
        <Btn kind="primary" sm onClick={submit} disabled={busy || !canSubmit}>{busy ? 'Saqlanmoqda…' : "Qora ro'yxatga qo'shish"}</Btn>
      </div>
    </div>
  );
}

// ── Qarzdorlik → Eslatmalar ─────────────────────────────────
// Dry run for the automated debtor SMS: exactly who would be texted, what
// they'd be told, and what has actually gone out. Deliberately readable with
// the feature switched OFF — that's the point of it.
function RemindersPanel() {
  const [data, setData] = React.useState(null);
  const [log, setLog] = React.useState(null);
  const [err, setErr] = React.useState(null);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    setErr(null);
    try {
      const [preview, messages] = await Promise.all([
        api.get('/sms/reminders/preview'),
        api.get('/sms/messages?kind=payment_reminder').catch(() => []),
      ]);
      setData(preview);
      setLog(messages);
    } catch (e) {
      setErr(e?.message || 'Yuklab bo‘lmadi');
    }
  }, []);
  React.useEffect(() => { load(); }, [load]);

  const runNow = async () => {
    setBusy(true);
    try {
      await api.post('/sms/reminders/run', {});
      // The sweep is a background job — give the worker a moment, then refresh.
      await new Promise((r) => setTimeout(r, 2500));
      await load();
    } catch (e) {
      setErr(e?.message || 'Ishga tushmadi');
    } finally {
      setBusy(false);
    }
  };

  if (err) return <Card><div style={{ font: `400 13px ${window.GO.font}`, color: 'oklch(0.5 0.16 25)' }}>{err}</div></Card>;
  if (!data) return <Card><div style={{ font: `400 13px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>Yuklanmoqda…</div></Card>;

  const live = data.smsEnabled && data.remindersEnabled;
  const sent = (log || []).filter((m) => m.status === 'sent').length;
  const failed = (log || []).filter((m) => m.status === 'failed').length;

  const columns = [
    { key: 'cust', label: 'Mijoz', render: (r) => <PersonCell name={r.customer} sub={`+${r.phone}`} hue={nameHue(r.customer)} /> },
    { key: 'place', label: 'Joy', render: (r) => (
      <div style={{ minWidth: 0 }}>
        <div style={{ font: `500 13px ${window.GO.font}`, color: 'var(--g-ink)', whiteSpace: 'nowrap' }}>{r.building} · {r.unit}</div>
        <div style={{ font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 1, fontFamily: 'ui-monospace, monospace' }}>{r.bookingId}</div>
      </div>
    ) },
    { key: 'late', label: 'Kechikish', align: 'right', render: (r) => (
      <div style={{ whiteSpace: 'nowrap' }}>
        <div style={{ font: `700 13px ${window.GO.font}`, color: 'oklch(0.5 0.16 25)' }}>{r.daysOverdue} kun</div>
        <div style={{ font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 1 }}>{fmtDate(r.overdueSince)} dan</div>
      </div>
    ) },
    { key: 'stage', label: 'Bosqich', align: 'right', render: (r) => (
      <span style={{
        display: 'inline-block', padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap',
        font: `700 11.5px ${window.GO.font}`,
        color: r.stage >= 14 ? 'oklch(0.45 0.17 25)' : r.stage >= 7 ? 'oklch(0.48 0.14 55)' : 'var(--g-ink-2)',
        background: `color-mix(in oklch, oklch(0.6 0.16 ${r.stage >= 14 ? 25 : r.stage >= 7 ? 55 : 250}) 14%, transparent)`,
      }}>{r.stage} kun</span>
    ) },
    { key: 'out', label: 'Qarz', align: 'right', render: (r) => (
      <div style={{ font: `700 13.5px ${window.GO.font}`, color: 'oklch(0.5 0.16 25)', whiteSpace: 'nowrap' }}>
        {window.fmtSom(r.outstanding)} <span style={{ font: `400 11.5px ${window.GO.font}` }}>so'm</span>
      </div>
    ) },
    { key: 'host', label: 'Mezbon', align: 'right', render: (r) => (
      <span style={{ font: `400 12px ${window.GO.font}`, color: r.hostPhone ? 'var(--g-ink-3)' : 'var(--g-ink-4)', whiteSpace: 'nowrap' }}>
        {r.hostPhone ? `+${r.hostPhone}` : '—'}
      </span>
    ) },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ color: 'var(--g-brand-ink)', display: 'flex' }}><IconMessage size={16} /></span>
              <div style={{ font: `700 15px ${window.GO.font}`, color: 'var(--g-ink)' }}>Avtomatik to'lov eslatmalari</div>
              <span style={{
                padding: '3px 9px', borderRadius: 999, font: `700 11px ${window.GO.font}`,
                color: live ? 'oklch(0.42 0.13 155)' : 'var(--g-ink-3)',
                background: live ? 'color-mix(in oklch, oklch(0.6 0.14 155) 16%, transparent)' : 'var(--g-line)',
              }}>{live ? 'YOQILGAN' : "O'CHIRILGAN"}</span>
            </div>
            <div style={{ font: `400 12.5px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 6, maxWidth: 620 }}>
              {live
                ? <>Har kuni 10:00 da tekshiriladi. Eslatma {(data.thresholds || []).join(' / ')} kun kechikkanda yuboriladi va to'lov kelishi bilan to'xtaydi.</>
                : <>Hozir hech kimga SMS yuborilmaydi. Quyidagi ro'yxat — yoqilsa kim xabar olishi. <b>Sozlamalar → Platforma → SMS bildirishnomalari</b> bo'limidan yoqiladi.</>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn kind="ghost" sm onClick={load} disabled={busy}><IconRefresh size={14} /> Yangilash</Btn>
            <Btn kind="primary" sm onClick={runNow} disabled={busy}>{busy ? 'Ishlamoqda…' : 'Hozir tekshirish'}</Btn>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginTop: 18 }}>
          <MiniStat label="Eslatma kutayotgan" value={String(data.count)} unit="ta" />
          <MiniStat label="Jami qarz" value={window.fmtCompactSom(data.outstanding)} />
          <MiniStat label="Yuborilgan" value={String(sent)} unit="ta" />
          <MiniStat label="Xatolik" value={String(failed)} unit="ta" tone={failed ? 'bad' : undefined} />
        </div>
      </Card>

      <DataTable
        columns={columns}
        rows={data.rows || []}
        rowKey={(r) => r.bookingId}
        empty={`Eslatma kerak bo'lgan ijarachi yo'q (eng kam qarz: ${window.fmtSom(data.minAmount || 0)} so'm)`}
      />

      {!!(log || []).length && (
        <Card>
          <div style={{ font: `700 14px ${window.GO.font}`, color: 'var(--g-ink)', marginBottom: 12 }}>Yuborilgan xabarlar</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 340, overflowY: 'auto' }}>
            {(log || []).slice(0, 50).map((m) => (
              <div key={m.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', paddingBottom: 10, borderBottom: '1px solid var(--g-line)' }}>
                <span style={{
                  marginTop: 3, width: 7, height: 7, borderRadius: 999, flexShrink: 0,
                  background: m.status === 'sent' ? 'oklch(0.6 0.14 155)' : m.status === 'failed' ? 'oklch(0.6 0.16 25)' : 'oklch(0.7 0.1 250)',
                }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ font: `400 12.5px ${window.GO.font}`, color: 'var(--g-ink-2)' }}>{m.message}</div>
                  <div style={{ font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 3 }}>
                    +{m.phone} · <span style={{ fontFamily: 'ui-monospace, monospace' }}>{m.bookingId || '—'}</span>
                    {m.sentAt ? ` · ${fmtDate(m.sentAt)}` : ''}
                    {m.status === 'failed' && <span style={{ color: 'oklch(0.5 0.16 25)' }}> · {m.error}</span>}
                    {m.status === 'queued' && ' · navbatda'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function MiniStat({ label, value, unit, tone }) {
  return (
    <div>
      <div style={{ font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>{label}</div>
      <div style={{ font: `700 19px ${window.GO.font}`, color: tone === 'bad' ? 'oklch(0.5 0.16 25)' : 'var(--g-ink)', marginTop: 3 }}>
        {value}{unit && <span style={{ font: `400 12px ${window.GO.font}`, color: 'var(--g-ink-4)' }}> {unit}</span>}
      </div>
    </div>
  );
}

function DebtorsScreen({ search }) {
  const data = window.DEBTORS || { totals: { outstanding: 0, prepaid: 0, uninvoiced: 0, debtorCount: 0 }, rows: [] };
  const totals = data.totals || { outstanding: 0, prepaid: 0, uninvoiced: 0, debtorCount: 0 };
  const [paying, setPaying] = React.useState(null); // debtor row → record-payment modal
  const [blacklisting, setBlacklisting] = React.useState(null); // former debtor → blacklist modal
  // Two separate collection problems, never mixed: tenants still in the space
  // (chase with a reminder) and tenants who left owing money (a legal matter).
  const [tab, setTab] = React.useState('current');
  // Reminders are platform-only (they expose every host's tenants).
  const isPlatform = (api.currentUser() || {}).role === 'platform';
  const former = tab === 'former';

  let rows = (data.rows || []).filter((r) => (r.group === 'former') === former);
  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter((r) => `${r.customer} ${r.company?.name || ''} ${r.building} ${r.unit}`.toLowerCase().includes(q));
  }
  const groupTotals = (former ? totals.former : totals.current) || { outstanding: 0, count: 0, maxDaysOverdue: 0 };

  const columns = [
    { key: 'cust', label: 'Mijoz', render: (r) => (
      <PersonCell name={r.customer} sub={`${r.company?.name ? r.company.name + ' · ' : ''}+${r.phone}`} hue={nameHue(r.customer)} />
    ) },
    { key: 'place', label: 'Joy', render: (r) => (
      <div style={{ minWidth: 0 }}>
        <div style={{ font: `500 13px ${window.GO.font}`, color: 'var(--g-ink)', whiteSpace: 'nowrap' }}>{r.building} · {r.unit}</div>
        <div style={{ font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 1 }}>{r.product} · <span style={{ fontFamily: 'ui-monospace, monospace' }}>{r.bookingId}</span></div>
      </div>
    ) },
    { key: 'period', label: former ? 'Ijara muddati' : 'Muddat', render: (r) => (
      <div style={{ minWidth: 0 }}>
        <span style={{ font: `500 13px ${window.GO.font}`, color: 'var(--g-ink-2)', whiteSpace: 'nowrap' }}>{fmtDate(r.start)} – {fmtDate(r.end)}</span>
        {former && r.bookingStatus === 'cancelled' && (
          <div style={{ font: `500 11.5px ${window.GO.font}`, color: 'oklch(0.5 0.16 25)', marginTop: 1 }}>shartnoma bekor qilingan</div>
        )}
      </div>
    ) },
    // How long the money has been owed, counted from the invoice date. Shown
    // only for former tenants: it is the figure a claim is built on.
    ...(former ? [{ key: 'overdue', label: 'Kechikish', align: 'right', render: (r) => (
      r.daysOverdue > 0
        ? <div style={{ whiteSpace: 'nowrap' }}>
            <div style={{ font: `700 13.5px ${window.GO.font}`, color: 'oklch(0.5 0.16 25)' }}>{r.daysOverdue} kun</div>
            {r.overdueSince && <div style={{ font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 1 }}>{fmtDate(r.overdueSince)} dan</div>}
          </div>
        : <span style={{ color: 'var(--g-ink-4)' }}>—</span>
    ) }] : []),
    // "Kutilgan" is what has been INVOICED. Rent that has accrued but has not
    // been billed yet hangs underneath it, so it is visible without being
    // counted as debt the tenant has been asked to pay.
    { key: 'expected', label: 'Hisob-faktura qilingan', align: 'right', render: (r) => (
      <div style={{ whiteSpace: 'nowrap' }}>
        <MoneyCell n={r.expected} />
        {/* An EDI-exempt tenant is billed on paper, so their figure is the
            accrued rent — say so, or the column header lies about it. */}
        {r.company?.ediExempt
          ? <div title="Ijarachi ESF dan chiqarilgan — hisob-faktura o'rniga hisoblangan ijara" style={{ font: `500 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 1 }}>
              hisoblangan (ESF yo'q)
            </div>
          : r.uninvoiced > 0 && (
            <div title="Hisoblangan, lekin hali hisob-faktura qilinmagan" style={{ font: `500 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 1 }}>
              +{window.fmtSom(r.uninvoiced)} hisoblanmoqda
            </div>
          )}
      </div>
    ) },
    { key: 'paid', label: "To'langan", align: 'right', render: (r) => <MoneyCell n={r.paid} /> },
    { key: 'outstanding', label: 'Qoldiq', align: 'right', render: (r) => r.outstanding > 0
      ? <div style={{ font: `700 13.5px ${window.GO.font}`, color: 'oklch(0.5 0.16 25)', whiteSpace: 'nowrap' }}>{window.fmtSom(r.outstanding)} <span style={{ font: `400 11.5px ${window.GO.font}` }}>so'm</span></div>
      : <div style={{ font: `700 13.5px ${window.GO.font}`, color: 'oklch(0.5 0.13 155)', whiteSpace: 'nowrap' }}>{window.fmtSom(Math.abs(r.outstanding))} <span style={{ font: `400 11.5px ${window.GO.font}` }}>so'm oldindan</span></div> },
    { key: 'act', label: '', align: 'right', render: (r) => (
      <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        {/* Blocking a tenant is a platform decision, and only makes sense for
            someone who has already left owing money. */}
        {former && isPlatform && r.outstanding > 0 && (
          <Btn kind="ghost" sm onClick={() => setBlacklisting(r)}>Qora ro'yxatga</Btn>
        )}
        <Btn kind="primary" sm onClick={() => setPaying(r)}><IconPlus size={14} /> To'lov kiritish</Btn>
      </div>
    ) },
  ];

  return (
    <div>
      {(
        <div style={{ display: 'flex', gap: 4, marginBottom: 18, borderBottom: '1px solid var(--g-line)' }}>
          {[
            { id: 'current', label: `Joriy ijarachilar${totals.current?.count ? ` · ${totals.current.count}` : ''}` },
            { id: 'former', label: `Sobiq ijarachilar${totals.former?.count ? ` · ${totals.former.count}` : ''}` },
            ...(isPlatform ? [{ id: 'reminders', label: 'Eslatmalar' }, { id: 'blacklist', label: "Qora ro'yxat" }] : []),
          ].map((t) => {
            const on = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: '11px 16px', border: 0, borderBottom: `2px solid ${on ? 'var(--g-brand)' : 'transparent'}`, cursor: 'pointer',
                background: 'transparent', color: on ? 'var(--g-ink)' : 'var(--g-ink-3)', font: `600 13.5px ${window.GO.font}`, marginBottom: -1,
              }}>{t.label}</button>
            );
          })}
        </div>
      )}

      {tab === 'blacklist' && isPlatform ? <BlacklistPanel search={search} /> :
       tab === 'reminders' && isPlatform ? <RemindersPanel /> : (
      <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 18 }}>
        <MoneyStatCard icon={<IconWarn size={17} />} label={former ? 'Undirilmagan qarz' : 'Jami qarz'} value={window.fmtCompactSom(groupTotals.outstanding)} color="oklch(0.5 0.16 25)" />
        <MoneyStatCard icon={<IconUsers size={17} />} label="Qarzdorlar soni" value={String(groupTotals.count)} unit="ta" />
        {former
          // For a former tenant the age of the debt is what matters (limitation
          // periods, escalation), not rent that has yet to be billed.
          ? <MoneyStatCard icon={<IconClock size={17} />} label="Eng eski qarz" value={String(groupTotals.maxDaysOverdue || 0)} unit="kun" />
          /* Accrued but not yet billed — becomes debt at the month-end run. */
          : <MoneyStatCard icon={<IconDoc size={17} />} label="Hisob-faktura kutilmoqda" value={window.fmtCompactSom(totals.uninvoiced || 0)} />}
        <MoneyStatCard icon={<IconWallet size={17} />} label="Oldindan to'lovlar" value={window.fmtCompactSom(totals.prepaid)} color="oklch(0.5 0.13 155)" />
      </div>

      {former && (
        <div style={{ font: `400 12.5px ${window.GO.font}`, color: 'var(--g-ink-3)', margin: '-4px 0 14px' }}>
          Ijara muddati tugagan yoki bekor qilingan, lekin qarzi qolgan ijarachilar — yuridik ish yuritish uchun.
        </div>
      )}

      <DataTable columns={columns} rows={rows} rowKey={(r) => r.bookingId}
        empty={former ? "Sobiq ijarachilarda qarz yo'q 🎉" : "Qarzdorlik yo'q 🎉"} />
      </>
      )}

      <GoModal open={!!blacklisting} onClose={() => setBlacklisting(null)} title="Qora ro'yxatga qo'shish">
        {blacklisting && (
          <BlacklistForm
            row={blacklisting}
            onCancel={() => setBlacklisting(null)}
            onDone={() => { setBlacklisting(null); setTab('blacklist'); }}
          />
        )}
      </GoModal>

      <GoModal open={!!paying} onClose={() => setPaying(null)} title={paying ? `To'lov kiritish · ${paying.bookingId}` : ''}>
        {paying && (
          <>
            <div style={{ font: `400 12.5px ${window.GO.font}`, color: 'var(--g-ink-3)', marginBottom: 14 }}>
              {paying.customer}{paying.company?.name ? ` · ${paying.company.name}` : ''} — {paying.building} · {paying.unit}
              {paying.outstanding > 0 && <span style={{ color: 'oklch(0.5 0.16 25)', fontWeight: 600 }}> · qarz {window.fmtSom(paying.outstanding)} so'm</span>}
            </div>
            <PaymentForm
              bookingId={paying.bookingId}
              defaultAmount={paying.outstanding > 0 ? paying.outstanding : undefined}
              onCancel={() => setPaying(null)}
              onDone={async () => { setPaying(null); if (window.__gorentRefresh) await window.__gorentRefresh(); }}
            />
          </>
        )}
      </GoModal>
    </div>
  );
}

// ═══ BOOKING DRAWER: payments + charges + contract ══════════
function ChargeForm({ bookingId, onDone, onCancel }) {
  const [f, setF] = React.useState({ type: 'utility', title: '', amount: '', period: '' });
  const [err, setErr] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const Label = ({ children }) => <div style={{ font: `600 12px ${window.GO.font}`, color: 'var(--g-ink-2)', marginBottom: 5 }}>{children}</div>;
  const canSubmit = !!f.title.trim() && Number(f.amount) >= 1;

  const submit = async () => {
    if (!canSubmit) return;
    setErr(null); setBusy(true);
    try {
      await api.post('/charges', {
        bookingId, type: f.type, title: f.title.trim(), amount: Number(f.amount),
        ...(f.period ? { period: f.period } : {}),
      });
      onDone();
    } catch (e) {
      setErr(e && e.message ? e.message : 'Xatolik yuz berdi');
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: 12, borderRadius: 12, border: '1px solid var(--g-line)', background: 'var(--g-bg)', marginBottom: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div>
          <Label>Turi</Label>
          <select className="adm-select" style={{ width: '100%' }} value={f.type} onChange={(e) => set('type', e.target.value)}>
            {Object.entries(window.CHARGE_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div>
          <Label>Nomi</Label>
          <input className="adm-input" value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="Elektr energiyasi" />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div>
          <Label>Summa (so'm)</Label>
          <input className="adm-input" type="number" min={1} value={f.amount} onChange={(e) => set('amount', e.target.value)} placeholder="250000" />
        </div>
        <div>
          <Label>Davr (ixtiyoriy)</Label>
          <input className="adm-input" type="month" value={f.period} onChange={(e) => set('period', e.target.value)} />
        </div>
      </div>
      {err && (
        <div style={{ marginBottom: 10, font: `500 12.5px ${window.GO.font}`, color: 'oklch(0.5 0.16 25)', background: 'oklch(0.96 0.04 25)', padding: '9px 12px', borderRadius: 9 }}>{err}</div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Btn kind="ghost" sm onClick={onCancel}>{window.AT.cancel}</Btn>
        <Btn kind="primary" sm onClick={submit} disabled={busy || !canSubmit}><IconCheck size={14} /> {busy ? 'Saqlanmoqda…' : window.AT.save}</Btn>
      </div>
    </div>
  );
}

function ChargeTypeChip({ type }) {
  const m = window.CHARGE_TYPES[type] || { label: type, hue: 250 };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 999,
      background: `oklch(0.95 0.04 ${m.hue})`, color: `oklch(0.42 0.12 ${m.hue})`, font: `600 10.5px ${window.GO.font}`, whiteSpace: 'nowrap' }}>{m.label}</span>
  );
}

function BookingMoneySections({ b }) {
  const [payments, setPayments] = React.useState(null);
  const [charges, setCharges] = React.useState(null);
  const [contract, setContract] = React.useState(undefined); // undefined=loading · null=none
  const [showPay, setShowPay] = React.useState(false);
  const [showCharge, setShowCharge] = React.useState(false);
  const [contractBusy, setContractBusy] = React.useState(false);

  const load = React.useCallback(() => {
    api.get(`/payments?booking=${encodeURIComponent(b.id)}`).then(setPayments).catch(() => setPayments([]));
    api.get(`/charges?booking=${encodeURIComponent(b.id)}`).then(setCharges).catch(() => setCharges([]));
  }, [b.id]);
  React.useEffect(() => { load(); }, [load]);

  // Contract is only possible for monthly + company bookings.
  const canContract = (b.unit?.offering?.product?.period === 'month') && !!b.companyRef;
  React.useEffect(() => {
    if (!canContract) { setContract(null); return; }
    setContract(undefined);
    api.get(`/contracts?search=${encodeURIComponent(b.id)}`)
      .then((list) => setContract((list || []).find((c) => c.bookingId === b.id) || null))
      .catch(() => setContract(null));
  }, [b.id, canContract]);

  // Payments/charges change receivables — refresh local lists now, refresh the
  // global datasets (debtors badge) in the background.
  const refreshAll = () => { load(); if (window.__gorentRefresh) window.__gorentRefresh(); };

  const delPayment = async (p) => {
    if (!window.confirm(`${p.id} to'lovini o'chirasizmi? (tuzatish)`)) return;
    try { await api.del(`/payments/${p.id}`); refreshAll(); } catch (e) { window.alert(e.message); }
  };
  const delCharge = async (c) => {
    if (!window.confirm(`"${c.title}" xarajatini o'chirasizmi?`)) return;
    try { await api.del(`/charges/${c.id}`); refreshAll(); } catch (e) { window.alert(e.message); }
  };
  const refundCharge = async (c) => {
    if (!window.confirm(`"${c.title}" kafolat pulini qaytarasizmi?`)) return;
    try { await api.post(`/charges/${c.id}/refund`, {}); refreshAll(); } catch (e) { window.alert(e.message); }
  };
  const createContract = async () => {
    setContractBusy(true);
    try {
      const c = await api.post('/contracts', { bookingId: b.id });
      setContract(c);
    } catch (e) { window.alert(e.message); }
    setContractBusy(false);
  };

  const muted = (text) => (
    <div style={{ padding: '11px 12px', borderRadius: 11, background: 'var(--g-bg)', font: `400 12.5px ${window.GO.font}`, color: 'var(--g-ink-4)', textAlign: 'center' }}>{text}</div>
  );

  return (
    <>
      {/* To'lovlar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink-2)' }}>To'lovlar{payments ? ` (${payments.length} ta)` : ''}</div>
          <Btn kind="ghost" sm onClick={() => setShowPay((v) => !v)}><IconPlus size={13} /> To'lov</Btn>
        </div>
        {showPay && (
          <div style={{ padding: 12, borderRadius: 12, border: '1px solid var(--g-line)', background: 'var(--g-bg)', marginBottom: 10 }}>
            <PaymentForm bookingId={b.id} onCancel={() => setShowPay(false)} onDone={() => { setShowPay(false); refreshAll(); }} />
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {!payments && muted('Yuklanmoqda…')}
          {payments && payments.length === 0 && !showPay && muted("Hozircha to'lovlar yo'q.")}
          {(payments || []).map((p) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 11, background: 'var(--g-bg)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: `600 13px ${window.GO.font}`, color: p.amount < 0 ? 'oklch(0.5 0.16 25)' : 'var(--g-ink)' }}>
                  {p.amount < 0 ? '−' : ''}{window.fmtSom(Math.abs(p.amount))} so'm
                  {p.amount < 0 && <span style={{ font: `600 11px ${window.GO.font}`, marginLeft: 6 }}>qaytarildi</span>}
                </div>
                <div style={{ font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {(window.PAYMENT_METHODS[p.method] || {}).label || p.method} · {fmtDate(p.paidAt)}{p.invoiceId ? ` · ${p.invoiceId}` : ''}{p.note ? ` · ${p.note}` : ''}
                </div>
              </div>
              <span style={{ font: `500 11px ui-monospace, monospace`, color: 'var(--g-ink-4)', flexShrink: 0 }}>{p.id}</span>
              <IconBtn title="O'chirish (tuzatish)" onClick={() => delPayment(p)} style={{ width: 28, height: 28, color: 'oklch(0.55 0.16 25)' }}><IconTrash size={14} /></IconBtn>
            </div>
          ))}
        </div>
      </div>

      {/* Qo'shimcha xarajatlar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink-2)' }}>Qo'shimcha xarajatlar{charges ? ` (${charges.length} ta)` : ''}</div>
          <Btn kind="ghost" sm onClick={() => setShowCharge((v) => !v)}><IconPlus size={13} /> Xarajat</Btn>
        </div>
        {showCharge && <ChargeForm bookingId={b.id} onCancel={() => setShowCharge(false)} onDone={() => { setShowCharge(false); refreshAll(); }} />}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {!charges && muted('Yuklanmoqda…')}
          {charges && charges.length === 0 && !showCharge && muted("Hozircha xarajatlar yo'q.")}
          {(charges || []).map((c) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 11, background: 'var(--g-bg)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{ font: `600 13px ${window.GO.font}`, color: 'var(--g-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    textDecoration: c.refundedAt ? 'line-through' : 'none' }}>{c.title}</span>
                  <ChargeTypeChip type={c.type} />
                  {c.refundedAt && <span style={{ font: `600 11px ${window.GO.font}`, color: 'oklch(0.5 0.13 155)' }}>qaytarilgan</span>}
                </div>
                <div style={{ font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 2 }}>
                  {c.period ? `${c.period} · ` : ''}<span style={{ fontFamily: 'ui-monospace, monospace' }}>{c.id}</span>{c.invoiceId ? ` · ${c.invoiceId}` : ''}{c.note ? ` · ${c.note}` : ''}
                </div>
              </div>
              <span style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink)', flexShrink: 0, textDecoration: c.refundedAt ? 'line-through' : 'none' }}>{window.fmtSom(c.amount)} so'm</span>
              {c.type === 'deposit' && !c.refundedAt && (
                <Btn kind="soft" sm onClick={() => refundCharge(c)}>Qaytarish</Btn>
              )}
              <IconBtn title={window.AT.delete} onClick={() => delCharge(c)} style={{ width: 28, height: 28, color: 'oklch(0.55 0.16 25)' }}><IconTrash size={14} /></IconBtn>
            </div>
          ))}
        </div>
      </div>

      {/* Shartnoma — monthly + company bookings only */}
      {canContract && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink-2)', marginBottom: 10 }}>Shartnoma</div>
          {contract === undefined ? muted('Yuklanmoqda…') : contract ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 11, background: 'var(--g-bg)' }}>
              <span style={{ color: 'var(--g-ink-3)', display: 'flex' }}><IconDoc size={17} /></span>
              <span style={{ flex: 1, font: `600 13px ui-monospace, monospace`, color: 'var(--g-ink)' }}>{contract.number}</span>
              <StatusPill s={contract.derivedStatus || contract.status} dict={window.CONTRACT_STATUS} size="sm" />
            </div>
          ) : (
            <Btn kind="ghost" sm onClick={createContract} disabled={contractBusy}><IconDoc size={14} /> {contractBusy ? 'Yaratilmoqda…' : 'Shartnoma tuzish'}</Btn>
          )}
        </div>
      )}
    </>
  );
}

// ═══ SHARTNOMALAR (rental contracts) ════════════════════════
function contractMonthly(c) {
  const bk = c.booking || {};
  return bk.months ? Math.round((bk.total || 0) / bk.months) : (bk.total || 0);
}

// Print-ready contract HTML is auth-gated — fetch as blob, open in a tab that
// was created synchronously (inside the click) so it isn't popup-blocked.
async function openContractDocument(c) {
  const w = window.open('', '_blank');
  try {
    const url = await api.fileBlobUrl(`/contracts/${c.id}/document`);
    if (w) w.location = url; else window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (e) {
    if (w) w.close();
    window.alert(e.message);
  }
}

// Renew modal — suggested price = current monthly × (1 + indexation%).
function ContractRenewModal({ c, onClose, onDone }) {
  const monthly = contractMonthly(c);
  const suggested = Math.round(monthly * (1 + (Number(c.indexationPct) || 0) / 100));
  const [months, setMonths] = React.useState(12);
  const [price, setPrice] = React.useState('');
  const [err, setErr] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const Label = ({ children }) => <div style={{ font: `600 12px ${window.GO.font}`, color: 'var(--g-ink-2)', marginBottom: 5 }}>{children}</div>;
  const effPrice = price === '' ? suggested : Number(price) || 0;
  const total = (Number(months) || 0) * effPrice;

  const submit = async () => {
    if (!(Number(months) >= 1)) return;
    setErr(null); setBusy(true);
    try {
      await api.post(`/contracts/${c.id}/renew`, {
        months: Number(months),
        ...(price !== '' ? { price: Number(price) } : {}),
      });
      onDone();
    } catch (e) {
      // 409/400 — availability conflict / invalid state; message shown inline.
      setErr(e && e.message ? e.message : 'Xatolik yuz berdi');
      setBusy(false);
    }
  };

  return (
    <GoModal open onClose={onClose} title={`Uzaytirish · ${c.id}`}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div>
          <Label>Muddat (oy)</Label>
          <input className="adm-input" type="number" min={1} max={36} value={months} onChange={(e) => setMonths(e.target.value)} />
        </div>
        <div>
          <Label>Oylik narx (so'm) — ixtiyoriy</Label>
          <input className="adm-input" type="number" min={1} value={price} onChange={(e) => setPrice(e.target.value)} placeholder={String(suggested)} />
          <div style={{ font: `400 11px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 4 }}>
            Taklif: {window.fmtSom(suggested)} so'm{c.indexationPct ? ` (indeksatsiya ${c.indexationPct}%)` : ''}
          </div>
        </div>
      </div>
      <div style={{ padding: '11px 13px', borderRadius: 11, background: 'var(--g-bg)', marginBottom: 12 }}>
        {[
          ['Yangi oylik', `${window.fmtSom(effPrice)} so'm`],
          ['Muddat', `${Number(months) || 0} oy`],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7, font: `400 12.5px ${window.GO.font}`, color: 'var(--g-ink-3)' }}>
            <span>{k}</span><span style={{ fontWeight: 600, color: 'var(--g-ink-2)' }}>{v}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--g-line)', font: `700 13.5px ${window.GO.font}`, color: 'var(--g-ink)' }}>
          <span>Jami</span><span>{window.fmtSom(total)} so'm</span>
        </div>
      </div>
      {err && (
        <div style={{ marginBottom: 10, font: `500 12.5px ${window.GO.font}`, color: 'oklch(0.5 0.16 25)', background: 'oklch(0.96 0.04 25)', padding: '9px 12px', borderRadius: 9 }}>{err}</div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Btn kind="ghost" sm onClick={onClose}>{window.AT.cancel}</Btn>
        <Btn kind="primary" sm onClick={submit} disabled={busy || !(Number(months) >= 1)}><IconRefresh size={14} /> {busy ? 'Uzaytirilmoqda…' : 'Uzaytirish'}</Btn>
      </div>
    </GoModal>
  );
}

function ContractDetailDrawer({ c, onClose, onChanged }) {
  const [renewOpen, setRenewOpen] = React.useState(false);
  const [soliq, setSoliq] = React.useState('');
  const [soliqBusy, setSoliqBusy] = React.useState(false);
  // didox's own id for this contract, which the ESF carries as ContractId.
  const [didoxId, setDidoxId] = React.useState('');
  const [didoxBusy, setDidoxBusy] = React.useState(false);
  React.useEffect(() => {
    setSoliq(c ? (c.soliqRegNumber || '') : '');
    setDidoxId(c ? (c.didoxContractId || '') : '');
    setRenewOpen(false);
  }, [c && c.id]);
  if (!c) return <Drawer open={false} onClose={onClose} width={560}><div /></Drawer>;

  const bk = c.booking || {};
  const unit = bk.unit || {};
  const building = unit.offering?.building || {};
  const product = unit.offering?.product || {};
  const monthly = contractMonthly(c);
  const derived = c.derivedStatus || c.status;

  const act = async (fn, confirmMsg) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    try { await fn(); onChanged(); } catch (e) { window.alert(e.message); }
  };
  const saveSoliq = async () => {
    setSoliqBusy(true);
    try { await api.patch(`/contracts/${c.id}`, { soliqRegNumber: soliq.trim() || null }); onChanged(); }
    catch (e) { window.alert(e.message); }
    setSoliqBusy(false);
  };
  const saveDidoxId = async () => {
    setDidoxBusy(true);
    try { await api.patch(`/contracts/${c.id}`, { didoxContractId: didoxId.trim() || null }); onChanged(); }
    catch (e) { window.alert(e.message); }
    setDidoxBusy(false);
  };
  const terminate = async () => {
    const note = window.prompt(`${c.number} shartnomasini bekor qilasizmi? Bandlov ham bekor qilinadi. Izoh (ixtiyoriy):`);
    if (note === null) return;
    try {
      await api.post(`/contracts/${c.id}/terminate`, note.trim() ? { note: note.trim() } : {});
      onChanged(); onClose();
    } catch (e) { window.alert(e.message); }
  };

  return (
    <Drawer open onClose={onClose} width={560}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--g-line)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onClose} className="adm-iconbtn" style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--g-bg-2)', border: 0, display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--g-ink)' }}><IconClose size={17} /></button>
          <div>
            <div style={{ font: `700 16px ui-monospace, monospace`, color: 'var(--g-ink)' }}>{c.number}</div>
            <div style={{ font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>Ijara shartnomasi</div>
          </div>
        </div>
        <StatusPill s={derived} dict={window.CONTRACT_STATUS} />
      </div>

      <div className="adm-scroll" style={{ flex: 1, overflowY: 'auto', padding: 22 }}>
        {/* Ijarachi */}
        <div style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink-2)', marginBottom: 10 }}>Ijarachi</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <Avatar name={bk.companyRef?.name || bk.customer} size={42} hue={nameHue(bk.companyRef?.name || bk.customer)} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: `600 13.5px ${window.GO.font}`, color: 'var(--g-ink)' }}>{bk.companyRef?.name || bk.customer}</div>
            <div style={{ font: `400 12px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>
              {bk.companyRef && window.taxLabel(bk.companyRef) ? `${window.taxLabel(bk.companyRef)} · ` : ''}{bk.customer}{bk.phone ? ` · +${bk.phone}` : ''}
            </div>
          </div>
        </div>

        {/* Joy */}
        <div style={{ display: 'flex', gap: 13, padding: 14, borderRadius: 13, background: 'var(--g-bg)', marginBottom: 20 }}>
          <div style={{ width: 48, height: 48, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}><PhotoPlaceholder hue={nameHue(building.name)} label="" radius={10} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: `600 13.5px ${window.GO.font}`, color: 'var(--g-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{unit.name || '—'} · {building.name || '—'}</div>
            <div style={{ font: `400 12px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 3 }}>{product.name || '—'}{building.district ? ` · ${building.district}` : ''} · <span style={{ fontFamily: 'ui-monospace, monospace' }}>{c.bookingId}</span></div>
          </div>
        </div>

        {/* Muddat + narx */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          {[
            ['Boshlanish', fmtDate(c.startsAt)],
            ['Tugash', fmtDate(endMinusDay(c.endsAt))],
            ['Oylik ijara', `${window.fmtSom(monthly)} so'm`],
            ['Indeksatsiya', c.indexationPct != null ? `${c.indexationPct}%` : '—'],
          ].map(([k, v]) => (
            <div key={k} style={{ background: 'var(--g-bg)', borderRadius: 11, padding: '11px 13px' }}>
              <div style={{ font: `400 11px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>{k}</div>
              <div style={{ font: `600 13.5px ${window.GO.font}`, color: 'var(--g-ink)', marginTop: 3 }}>{v}</div>
            </div>
          ))}
        </div>
        {derived === 'expiring' && (
          <div style={{ marginTop: -12, marginBottom: 20, font: `600 12.5px ${window.GO.font}`, color: 'oklch(0.5 0.16 25)' }}>
            Muddati tugashiga {c.daysLeft} kun qoldi
          </div>
        )}

        {/* Meta rows */}
        <div style={{ border: '1px solid var(--g-line)', borderRadius: 13, padding: '4px 16px', marginBottom: 20 }}>
          {[
            ['Imzolangan', c.signedAt ? fmtDate(c.signedAt) : '—'],
            ...(c.terminatedAt ? [['Bekor qilingan', fmtDate(c.terminatedAt)]] : []),
            ...(c.renewedFrom ? [['Avvalgi shartnoma', c.renewedFrom.id || c.renewedFromId]] : []),
            ...(c.renewedTo ? [['Yangi shartnoma', c.renewedTo.id]] : []),
            ...(c.note ? [['Izoh', c.note]] : []),
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, padding: '10px 0', borderBottom: '1px solid var(--g-line)', font: `400 13px ${window.GO.font}`, color: 'var(--g-ink-3)' }}>
              <span>{k}</span><span style={{ fontWeight: 600, color: 'var(--g-ink)', textAlign: 'right' }}>{v}</span>
            </div>
          ))}
          {/* Soliq registration number — editable */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0' }}>
            <span style={{ font: `400 13px ${window.GO.font}`, color: 'var(--g-ink-3)', flexShrink: 0 }}>Soliq ro'yxat raqami</span>
            <input className="adm-input" style={{ flex: 1 }} value={soliq} onChange={(e) => setSoliq(e.target.value)} placeholder="ijara.soliq.uz raqami" />
            <Btn kind="soft" sm onClick={saveSoliq} disabled={soliqBusy || (soliq || '') === (c.soliqRegNumber || '')}>{soliqBusy ? '…' : window.AT.save}</Btn>
          </div>
          {/* didox contract id — what the ESF sends as ContractId, linking the
              invoice to this contract on didox's side. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 0 10px' }}>
            <span style={{ font: `400 13px ${window.GO.font}`, color: 'var(--g-ink-3)', flexShrink: 0 }}>didox shartnoma ID</span>
            <input className="adm-input" style={{ flex: 1, fontFamily: 'ui-monospace, monospace' }} value={didoxId}
              onChange={(e) => setDidoxId(e.target.value)} placeholder="didox.uz hujjat IDsi" />
            <Btn kind="soft" sm onClick={saveDidoxId} disabled={didoxBusy || (didoxId || '') === (c.didoxContractId || '')}>{didoxBusy ? '…' : window.AT.save}</Btn>
          </div>
          <div style={{ font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)', paddingBottom: 10 }}>
            Hisob-fakturada <b>ContractId</b> sifatida yuboriladi — didox shartnomani shu ID orqali biriktiradi.
            didox.uz da shartnoma hujjatini ochib, «Хужжат IDси» dan nusxalang.
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, padding: '16px 22px', borderTop: '1px solid var(--g-line)', background: 'var(--g-card)', flexShrink: 0 }}>
        <Btn kind="ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => openContractDocument(c)}><IconDoc size={16} /> Hujjat</Btn>
        {c.status === 'draft' && (
          <Btn kind="primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => act(() => api.post(`/contracts/${c.id}/activate`))}><IconCheck2 size={16} /> Faollashtirish</Btn>
        )}
        {c.status === 'active' && (
          <Btn kind="primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setRenewOpen(true)}><IconRefresh size={16} /> Uzaytirish</Btn>
        )}
        {['draft', 'active'].includes(c.status) && (
          <Btn kind="danger" style={{ justifyContent: 'center' }} onClick={terminate}><IconX2 size={16} /></Btn>
        )}
      </div>

      {renewOpen && <ContractRenewModal c={c} onClose={() => setRenewOpen(false)} onDone={() => { setRenewOpen(false); onChanged(); }} />}
    </Drawer>
  );
}

function ContractsScreen({ search }) {
  const [contracts, setContracts] = React.useState(null);
  const [status, setStatus] = React.useState('all');
  const [detailId, setDetailId] = React.useState(null);

  const load = React.useCallback(() => {
    api.get('/contracts').then(setContracts).catch((e) => { console.error(e); setContracts([]); });
  }, []);
  React.useEffect(() => { load(); }, [load]);

  const all = contracts || [];
  let rows = all.filter((c) => status === 'all' || (c.derivedStatus || c.status) === status);
  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter((c) => `${c.number} ${c.bookingId} ${c.booking?.customer || ''} ${c.booking?.companyRef?.name || ''} ${c.booking?.unit?.name || ''} ${c.booking?.unit?.offering?.building?.name || ''}`.toLowerCase().includes(q));
  }
  const counts = { all: all.length };
  Object.keys(window.CONTRACT_STATUS).forEach((k) => counts[k] = all.filter((c) => (c.derivedStatus || c.status) === k).length);

  const columns = [
    { key: 'id', label: '№', render: (c) => <span style={{ font: `600 12px ui-monospace, monospace`, color: 'var(--g-ink-2)' }}>{c.number}</span> },
    { key: 'tenant', label: 'Ijarachi', render: (c) => (
      <PersonCell name={c.booking?.companyRef?.name || c.booking?.customer || '—'} sub={c.booking?.customer} hue={nameHue(c.booking?.companyRef?.name || c.booking?.customer)} />
    ) },
    { key: 'place', label: 'Joy', render: (c) => (
      <div style={{ minWidth: 0 }}>
        <div style={{ font: `500 13px ${window.GO.font}`, color: 'var(--g-ink)', whiteSpace: 'nowrap' }}>{c.booking?.unit?.offering?.building?.name || '—'} · {c.booking?.unit?.name || '—'}</div>
        <div style={{ font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 1 }}>{c.booking?.unit?.offering?.product?.name || ''}</div>
      </div>
    ) },
    { key: 'period', label: 'Muddat', render: (c) => (
      <div>
        <div style={{ font: `500 13px ${window.GO.font}`, color: 'var(--g-ink)', whiteSpace: 'nowrap' }}>{fmtDate(c.startsAt)} – {fmtDate(endMinusDay(c.endsAt))}</div>
        {(c.derivedStatus || c.status) === 'expiring' && (
          <div style={{ font: `600 11.5px ${window.GO.font}`, color: 'oklch(0.5 0.16 25)', marginTop: 2 }}>{c.daysLeft} kun qoldi</div>
        )}
      </div>
    ) },
    { key: 'monthly', label: 'Oylik', align: 'right', render: (c) => <MoneyCell n={contractMonthly(c)} /> },
    { key: 'status', label: window.AT.status, render: (c) => <StatusPill s={c.derivedStatus || c.status} dict={window.CONTRACT_STATUS} /> },
    { key: 'act', label: '', align: 'right', render: (c) => (
      <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
        <IconBtn title="Hujjat" onClick={() => openContractDocument(c)}><IconDoc size={16} /></IconBtn>
        <IconBtn title={window.AT.view} onClick={() => setDetailId(c.id)}><IconEye size={16} /></IconBtn>
      </div>
    ) },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
        <StatusChips dict={window.CONTRACT_STATUS} value={status} setValue={setStatus} counts={counts} />
        <Btn kind="ghost" sm onClick={load}><IconRefresh size={15} /> Yangilash</Btn>
      </div>
      <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} onRow={(c) => setDetailId(c.id)}
        empty={contracts ? "Hozircha shartnomalar yo'q" : 'Yuklanmoqda…'} />
      <ContractDetailDrawer c={all.find((c) => c.id === detailId) || null} onClose={() => setDetailId(null)} onChanged={load} />
    </div>
  );
}

// ═══ PAYOUT STATEMENTS (hisobotlar) ═════════════════════════
function StatementDetailDrawer({ s, role, onClose, onApprove, onPay }) {
  if (!s) return <Drawer open={false} onClose={onClose} width={560}><div /></Drawer>;
  return (
    <Drawer open onClose={onClose} width={560}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--g-line)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onClose} className="adm-iconbtn" style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--g-bg-2)', border: 0, display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--g-ink)' }}><IconClose size={17} /></button>
          <div>
            <div style={{ font: `700 15px ui-monospace, monospace`, color: 'var(--g-ink)' }}>{s.id}</div>
            <div style={{ font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>Payout hisoboti · {s.period}</div>
          </div>
        </div>
        <StatusPill s={s.status} dict={window.STATEMENT_STATUS} />
      </div>

      <div className="adm-scroll" style={{ flex: 1, overflowY: 'auto', padding: 22 }}>
        <div style={{ marginBottom: 20 }}>
          <PersonCell name={s.host?.name || '—'} sub={s.host?.org} hue={s.host?.hue} />
        </div>

        <div style={{ border: '1px solid var(--g-line)', borderRadius: 13, padding: 16, marginBottom: 20 }}>
          {[
            ['Yalpi tushum', window.fmtSom(s.gross) + " so'm"],
            ['Platforma komissiyasi', '− ' + window.fmtSom(s.commission) + " so'm"],
            ['Mezbon xizmat haqi', '− ' + window.fmtSom(s.hostFee) + " so'm"],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 9, font: `400 13px ${window.GO.font}`, color: 'var(--g-ink-3)' }}>
              <span>{k}</span><span style={{ color: 'var(--g-ink-2)', fontWeight: 500 }}>{v}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 11, borderTop: '1px solid var(--g-line)', font: `700 14px ${window.GO.font}`, color: 'var(--g-ink)' }}>
            <span>Sof to'lov</span><span>{window.fmtSom(s.net)} so'm</span>
          </div>
        </div>

        {(s.approvedAt || s.paidAt || s.reference) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
            {[
              ...(s.approvedAt ? [['Tasdiqlangan', fmtDate(s.approvedAt)]] : []),
              ...(s.paidAt ? [["To'langan", fmtDate(s.paidAt)]] : []),
              ...(s.reference ? [["Ma'lumotnoma", s.reference]] : []),
            ].map(([k, v]) => (
              <div key={k} style={{ background: 'var(--g-bg)', borderRadius: 11, padding: '11px 13px' }}>
                <div style={{ font: `400 11px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>{k}</div>
                <div style={{ font: `600 13px ${window.GO.font}`, color: 'var(--g-ink)', marginTop: 3 }}>{v}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink-2)' }}>Qatorlar</div>
          <span style={{ font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>{(s.lines || []).length} ta to'lov</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(s.lines || []).length === 0 && (
            <div style={{ padding: '11px 12px', borderRadius: 11, background: 'var(--g-bg)', font: `400 12.5px ${window.GO.font}`, color: 'var(--g-ink-4)', textAlign: 'center' }}>Qatorlar yo'q.</div>
          )}
          {(s.lines || []).map((l, i) => (
            <div key={l.paymentId || i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 11, background: 'var(--g-bg)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: `600 12.5px ui-monospace, monospace`, color: 'var(--g-ink)' }}>{l.paymentId}</div>
                <div style={{ font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 2 }}>{l.bookingId} · {fmtDate(l.paidAt)} · {window.catShort(l.category)}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink)' }}>{window.fmtSom(l.amount)} so'm</div>
                <div style={{ font: `400 11px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 2 }}>{l.rate}% → {window.fmtSom(l.commission)} so'm</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {role === 'platform' && (s.status === 'draft' || s.status === 'approved') && (
        <div style={{ display: 'flex', gap: 10, padding: '16px 22px', borderTop: '1px solid var(--g-line)', background: 'var(--g-card)', flexShrink: 0 }}>
          {s.status === 'draft' && <Btn kind="primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => onApprove(s)}><IconCheck2 size={16} /> Tasdiqlash</Btn>}
          {s.status === 'approved' && <Btn kind="primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => onPay(s)}><IconCard size={16} /> To'lash</Btn>}
        </div>
      )}
    </Drawer>
  );
}

function PayoutStatementsPanel({ role }) {
  const [period, setPeriod] = React.useState(currentInvoicePeriod());
  const [rows, setRows] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [detailId, setDetailId] = React.useState(null);

  const load = React.useCallback(() => {
    api.get(`/payout-statements?period=${encodeURIComponent(period)}`).then(setRows).catch(() => setRows([]));
  }, [period]);
  React.useEffect(() => { setRows(null); load(); }, [load]);

  const generate = async () => {
    setBusy(true);
    try { await api.post('/payout-statements/generate', { period }); load(); }
    catch (e) { window.alert(e.message); }
    setBusy(false);
  };
  const approve = async (s) => {
    try { await api.post(`/payout-statements/${s.id}/approve`); load(); } catch (e) { window.alert(e.message); }
  };
  const pay = async (s) => {
    const ref = window.prompt("To'lov ma'lumotnomasi (reference, ixtiyoriy):", '');
    if (ref === null) return;
    try {
      await api.post(`/payout-statements/${s.id}/pay`, ref.trim() ? { reference: ref.trim() } : {});
      load();
    } catch (e) { window.alert(e.message); }
  };

  const list = rows || [];
  const columns = [
    { key: 'id', label: 'ID', render: (s) => <span style={{ font: `600 12px ui-monospace, monospace`, color: 'var(--g-ink-2)' }}>{s.id}</span> },
    { key: 'host', label: 'Mezbon', render: (s) => <PersonCell name={s.host?.name || '—'} sub={s.host?.org} hue={s.host?.hue} /> },
    { key: 'gross', label: 'Yalpi', align: 'right', render: (s) => <MoneyCell n={s.gross} /> },
    { key: 'fee', label: 'Komissiya', align: 'right', render: (s) => (
      <div>
        <div style={{ font: `500 13px ${window.GO.font}`, color: 'var(--g-ink-2)', whiteSpace: 'nowrap' }}>{window.fmtSom(s.commission)}</div>
        <div style={{ font: `400 11px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 1, whiteSpace: 'nowrap' }}>+ {window.fmtSom(s.hostFee)} xizmat haqi</div>
      </div>
    ) },
    { key: 'net', label: 'Sof', align: 'right', render: (s) => (
      <div style={{ font: `700 13.5px ${window.GO.font}`, color: 'var(--g-ink)', whiteSpace: 'nowrap' }}>{window.fmtSom(s.net)} <span style={{ font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>so'm</span></div>
    ) },
    { key: 'status', label: window.AT.status, render: (s) => <StatusPill s={s.status} dict={window.STATEMENT_STATUS} /> },
    { key: 'act', label: '', align: 'right', render: (s) => (
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
        {role === 'platform' && s.status === 'draft' && <Btn kind="soft" sm onClick={() => approve(s)}><IconCheck2 size={14} /> Tasdiqlash</Btn>}
        {role === 'platform' && s.status === 'approved' && <Btn kind="primary" sm onClick={() => pay(s)}><IconCard size={14} /> To'lash</Btn>}
        <IconBtn title={window.AT.view} onClick={() => setDetailId(s.id)}><IconEye size={16} /></IconBtn>
      </div>
    ) },
  ];

  return (
    <div style={{ marginBottom: 24 }}>
      <SectionHead
        title="Hisobotlar (payout)"
        sub="Davr bo'yicha mezbon hisobotlari — yalpi, komissiya va sof to'lov"
        right={(
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input className="adm-input" type="month" style={{ width: 150 }} value={period} onChange={(e) => setPeriod(e.target.value)} />
            {role === 'platform' && (
              <Btn kind="primary" sm onClick={generate} disabled={busy}><IconRefresh size={14} /> {busy ? 'Hisoblanmoqda…' : 'Hisoblash'}</Btn>
            )}
          </div>
        )}
      />
      <DataTable columns={columns} rows={list} rowKey={(r) => r.id} onRow={(s) => setDetailId(s.id)}
        empty={rows ? "Bu davr uchun hisobotlar yo'q" : 'Yuklanmoqda…'} />
      <StatementDetailDrawer s={list.find((x) => x.id === detailId) || null} role={role}
        onClose={() => setDetailId(null)} onApprove={approve} onPay={pay} />
    </div>
  );
}

Object.assign(window, {
  GoModal, PaymentForm, ChargeForm, BookingMoneySections, DebtorsScreen,
  ContractsScreen, ContractDetailDrawer, ContractRenewModal,
  PayoutStatementsPanel, StatementDetailDrawer,
});

// ============================================================
// src/admin-settings.jsx
// ============================================================

// admin-settings.jsx — Gorent Admin: Settings (Sozlamalar).
// Tabs: Platforma · Komissiya · To'lovlar · Integratsiyalar · Jamoa.

function Toggle({ on, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: 42, height: 24, borderRadius: 999, border: 0, cursor: 'pointer', flexShrink: 0,
      background: on ? 'var(--g-brand)' : 'var(--g-line)', position: 'relative', transition: 'background .16s',
    }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 18, height: 18, borderRadius: 999,
        background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left .16s' }} />
    </button>
  );
}

function Row({ title, sub, children, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18,
      padding: '15px 0', borderBottom: last ? 0 : '1px solid var(--g-line)' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ font: `600 13.5px ${window.GO.font}`, color: 'var(--g-ink)' }}>{title}</div>
        {sub && <div style={{ font: `400 12px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 3, maxWidth: 460 }}>{sub}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function FieldLabel({ children }) {
  return <div style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink-2)', marginBottom: 7 }}>{children}</div>;
}

// ── Platform tab ────────────────────────────────────────────
function PlatformTab() {
  const init = (window.SETTINGS && window.SETTINGS.platform) || {};
  const [s, setS] = React.useState({
    name: init.name ?? 'Gorent',
    supportEmail: init.supportEmail ?? 'yordam@gorent.uz',
    currency: init.currency ?? 'UZS',
    timezone: init.timezone ?? 'tas',
    instantBook: init.instantBook ?? true,
    autoVerify: init.autoVerify ?? false,
    newSignups: init.newSignups ?? true,
    maintenance: init.maintenance ?? false,
  });
  const set = (k, v) => setS((p) => ({ ...p, [k]: v }));
  const t = (k) => setS((p) => ({ ...p, [k]: !p[k] }));
  // Seller tax profile — decides whether every ESF carries VAT.
  const initCo = (window.SETTINGS && window.SETTINGS.company) || {};
  const [co, setCo] = React.useState({
    vatPayer: initCo.vatPayer ?? false,
    vatRate: initCo.vatRate ?? 12,
    vatRegCode: initCo.vatRegCode ?? '',
    vatRegStatus: initCo.vatRegStatus ?? 0,
    // Who the ESF says is selling. Left blank these fall back to the server's
    // env values — which is how an invoice went out with no seller name at all.
    name: initCo.name ?? '',
    address: initCo.address ?? '',
    account: initCo.account ?? '',
    mfo: initCo.mfo ?? '',
    director: initCo.director ?? '',
    accountant: initCo.accountant ?? '',
    // Rent is billed as a service, not as a count of pieces.
    packageCode: initCo.packageCode ?? '',
    packageName: initCo.packageName ?? 'xizmat',
    origin: initCo.origin ?? 5,
  });
  const [registry, setRegistry] = React.useState(null); // what didox reports
  // Fill the seller block from our own registry record. Overwrites here, unlike
  // the tenant form: this is one company's own details, and if the registry
  // disagrees with what was typed, the registry is what the tax office holds.
  const [coLookupBusy, setCoLookupBusy] = React.useState(false);
  const [coLookupNote, setCoLookupNote] = React.useState(null);
  const fillFromRegistry = async () => {
    setCoLookupBusy(true); setCoLookupNote(null);
    try {
      const r = await api.get('/settings/company-lookup');
      setCo((p) => ({
        ...p,
        name: r.name || p.name,
        address: r.address || p.address,
        account: r.account || p.account,
        mfo: r.mfo || p.mfo,
        director: r.director || p.director,
        // The registry is also the authority on whether VAT applies at all.
        vatPayer: r.vatPayer,
        vatRegCode: r.vatRegCode || '',
      }));
      setCoLookupNote(`${r.name || r.tin} — ${r.vatPayer ? 'QQS to‘lovchi' : 'QQSsiz'}${r.mode === 'mock' ? ' (mock)' : ''}. Saqlashni unutmang.`);
    } catch (e) { setCoLookupNote(e?.message || 'Topilmadi'); }
    setCoLookupBusy(false);
  };
  React.useEffect(() => {
    api.get('/settings/company-tax').then((r) => setRegistry(r.registry)).catch(() => setRegistry(null));
  }, []);
  const initN = (window.SETTINGS && window.SETTINGS.notifications) || {};
  const [n, setN] = React.useState({
    smsEnabled: initN.smsEnabled ?? false,
    smsOnBookingApproved: initN.smsOnBookingApproved ?? true,
    smsOnBookingRejected: initN.smsOnBookingRejected ?? true,
    smsOnPaymentReminder: initN.smsOnPaymentReminder ?? false,
    paymentReminderDays: initN.paymentReminderDays ?? [3, 7, 14],
    paymentReminderMinAmount: initN.paymentReminderMinAmount ?? 50000,
    paymentReminderNotifyHost: initN.paymentReminderNotifyHost ?? false,
  });
  const tn = (k) => setN((p) => ({ ...p, [k]: !p[k] }));
  const setN1 = (k, v) => setN((p) => ({ ...p, [k]: v }));
  // "3, 7, 14" ⇄ [3,7,14]. Kept as free text while editing so a half-typed
  // value doesn't fight the user; parsed on save.
  const [daysText, setDaysText] = React.useState((initN.paymentReminderDays ?? [3, 7, 14]).join(', '));
  const parsedDays = daysText.split(',').map((x) => parseInt(x.trim(), 10)).filter((x) => Number.isFinite(x) && x >= 0);
  const daysValid = parsedDays.length > 0;
  const save = () => gorentMutate(() => api.put('/settings', {
    platform: s,
    company: {
      ...co,
      vatRate: Number(co.vatRate) || 12,
      vatRegCode: co.vatPayer ? co.vatRegCode.trim() : '',
      origin: Number(co.origin) || 5,
    },
    notifications: { ...n, paymentReminderDays: daysValid ? [...new Set(parsedDays)].sort((a, b) => a - b) : n.paymentReminderDays },
  }));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <Card>
        <div style={{ font: `700 15px ${window.GO.font}`, color: 'var(--g-ink)', marginBottom: 6 }}>Umumiy</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 14 }}>
          <div>
            <FieldLabel>Platforma nomi</FieldLabel>
            <input className="adm-input" value={s.name} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div>
            <FieldLabel>Qo'llab-quvvatlash e-pochtasi</FieldLabel>
            <input className="adm-input" value={s.supportEmail} onChange={(e) => set('supportEmail', e.target.value)} />
          </div>
          <div>
            <FieldLabel>Asosiy valyuta</FieldLabel>
            <select className="adm-select" style={{ width: '100%' }} value={s.currency} onChange={(e) => set('currency', e.target.value)}>
              <option value="UZS">So'm (UZS)</option>
              <option value="USD">Dollar (USD)</option>
            </select>
          </div>
          <div>
            <FieldLabel>Vaqt mintaqasi</FieldLabel>
            <select className="adm-select" style={{ width: '100%' }} value={s.timezone} onChange={(e) => set('timezone', e.target.value)}>
              <option value="tas">(GMT+5) Toshkent</option>
            </select>
          </div>
        </div>
      </Card>
      <Card>
        <div style={{ font: `700 15px ${window.GO.font}`, color: 'var(--g-ink)' }}>Bandlov siyosati</div>
        <Row title="Tezkor band qilish" sub="Mezbon tasdig'isiz darhol band qilishga ruxsat berish.">
          <Toggle on={s.instantBook} onClick={() => t('instantBook')} />
        </Row>
        <Row title="E'lonlarni avtomatik tasdiqlash" sub="Yangi mahsulotlar moderatorsiz darhol nashr etiladi.">
          <Toggle on={s.autoVerify} onClick={() => t('autoVerify')} />
        </Row>
        <Row title="Yangi ro'yxatdan o'tishlar" sub="Yangi mezbon va mijozlar uchun ro'yxatdan o'tishni ochish.">
          <Toggle on={s.newSignups} onClick={() => t('newSignups')} />
        </Row>
        <Row title="Texnik xizmat rejimi" sub="Sayt vaqtincha faqat adminlar uchun ochiq bo'ladi." last>
          <Toggle on={s.maintenance} onClick={() => t('maintenance')} />
        </Row>
      </Card>

      {/* What the ESF prints as the seller, and how a rent line is described.
          These were server env values only, so a blank COMPANY_NAME sent real
          invoices out with no seller on them and nobody could fix it here. */}
      <Card>
        <div style={{ font: `700 15px ${window.GO.font}`, color: 'var(--g-ink)' }}>Hisob-fakturada yetkazib beruvchi</div>
        <div style={{ font: `400 12px ${window.GO.font}`, color: 'var(--g-ink-4)', margin: '4px 0 12px' }}>
          Hisob-fakturada «Етказиб берувчи» sifatida chiqadi. Bo'sh qoldirilsa, serverdagi qiymat ishlatiladi.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Btn kind="soft" sm disabled={coLookupBusy} onClick={fillFromRegistry}>
            {coLookupBusy ? 'Olinmoqda…' : 'didox dan toʻldirish'}
          </Btn>
          <span style={{ font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>
            {coLookupNote || 'Nomi, manzili, hisob raqami va rahbarni soliq reyestridan oladi.'}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[
            ['name', 'Kompaniya nomi', 'Alraqam Rent MChJ'],
            ['address', 'Manzil', 'Toshkent sh., Yashnobod tumani…'],
            ['account', 'Hisob raqami (X/R)', '20208000607205498001'],
            ['mfo', 'MFO', '00083'],
            ['director', 'Rahbar', 'ABDURAHMONOV ABDUFATTOH'],
            ['accountant', 'Bosh hisobchi', '—'],
          ].map(([k, label, ph]) => (
            <div key={k}>
              <FieldLabel>{label}</FieldLabel>
              <input className="adm-input" value={co[k]} placeholder={ph}
                onChange={(e) => setCo((p) => ({ ...p, [k]: e.target.value }))} />
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--g-line)' }}>
          <div>
            <FieldLabel>O'lchov birligi</FieldLabel>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="adm-input" style={{ flex: 1 }} value={co.packageName}
                onChange={(e) => setCo((p) => ({ ...p, packageName: e.target.value }))} placeholder="xizmat (so'm)" />
              <input className="adm-input" style={{ width: 110, fontFamily: 'ui-monospace, monospace' }} value={co.packageCode}
                onChange={(e) => setCo((p) => ({ ...p, packageCode: e.target.value.replace(/\D/g, '') }))} placeholder="1494994" />
            </div>
            <div style={{ marginTop: 5, font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>
              Nomi va kodi — didox ma'lumotnomasidan, ikkalasi mos bo'lishi kerak (ijara: xizmat (so'm) · 1494994).
            </div>
          </div>
          <div>
            <FieldLabel>Tovarning kelib chiqishi (kod)</FieldLabel>
            <input className="adm-input" type="number" value={co.origin}
              onChange={(e) => setCo((p) => ({ ...p, origin: e.target.value }))} />
            <div style={{ marginTop: 5, font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>
              «Xizmat ko'rsatish» kodi — didox ma'lumotnomasidan.
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div style={{ font: `700 15px ${window.GO.font}`, color: 'var(--g-ink)' }}>Soliq (NDS)</div>
        <div style={{ font: `400 12px ${window.GO.font}`, color: 'var(--g-ink-4)', margin: '4px 0 2px' }}>
          Kompaniyangizning QQS (NDS) holati. Hisob-fakturalar shunga qarab yaratiladi.
        </div>
        <Row title="NDS to'lovchisi" sub="Yoqilsa, har bir ESF qatorida NDS ajratiladi. O'chirilsa — «NDSsiz»." last={!co.vatPayer}>
          <Toggle on={co.vatPayer} onClick={() => setCo((p) => ({ ...p, vatPayer: !p.vatPayer }))} />
        </Row>
        {co.vatPayer && (
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 18, padding: '14px 0 2px', borderTop: '1px solid var(--g-line)' }}>
            <div>
              <FieldLabel>NDS stavkasi (%)</FieldLabel>
              <input className="adm-input" type="number" min={0} max={100} value={co.vatRate}
                onChange={(e) => setCo((p) => ({ ...p, vatRate: e.target.value }))} />
            </div>
            <div>
              <FieldLabel>NDS ro'yxat raqami</FieldLabel>
              <input className="adm-input" value={co.vatRegCode}
                onChange={(e) => setCo((p) => ({ ...p, vatRegCode: e.target.value }))} placeholder="326040002521" />
            </div>
          </div>
        )}
        {/* Independent check: what the tax registry says, via didox. A mismatch
            here means every invoice would carry a tax that isn't owed. */}
        {registry && (
          <div style={{
            marginTop: 12, padding: '10px 12px', borderRadius: 10,
            font: `400 12px ${window.GO.font}`, color: 'var(--g-ink-2)',
            background: (co.vatPayer && !registry.vatRegCode)
              ? 'color-mix(in oklch, oklch(0.65 0.18 25) 13%, transparent)'
              : 'var(--g-bg)',
          }}>
            {registry.vatRegCode
              ? <>Soliq reyestri: NDS raqami <b>{registry.vatRegCode}</b>{registry.vatRegStatus ? ` · ${registry.vatRegStatus}` : ''}</>
              : <>Soliq reyestri: bu STIR uchun NDS ro'yxati topilmadi.</>}
            {co.vatPayer && !registry.vatRegCode && (
              <div style={{ marginTop: 5, fontWeight: 600 }}>
                ⚠ NDS yoqilgan, lekin reyestrda ro'yxat yo'q — hisob-fakturalarga to'lanmasligi kerak bo'lgan soliq qo'shiladi.
              </div>
            )}
          </div>
        )}
      </Card>

      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--g-brand-ink)', display: 'flex' }}><IconMessage size={16} /></span>
          <div style={{ font: `700 15px ${window.GO.font}`, color: 'var(--g-ink)' }}>SMS bildirishnomalari</div>
        </div>
        <div style={{ font: `400 12px ${window.GO.font}`, color: 'var(--g-ink-4)', margin: '4px 0 2px' }}>Eskiz.uz orqali mijozlarga avtomatik SMS xabarlar.</div>
        <Row title="SMS bildirishnomalar" sub="Asosiy kalit — barcha SMS xabarlarni yoqish yoki o'chirish.">
          <Toggle on={n.smsEnabled} onClick={() => tn('smsEnabled')} />
        </Row>
        <div style={{ opacity: n.smsEnabled ? 1 : 0.45, pointerEvents: n.smsEnabled ? 'auto' : 'none', transition: 'opacity .15s' }}>
          <Row title="Bandlov tasdiqlanganda" sub="Bandlov tasdiqlanganda mijozga SMS yuboriladi.">
            <Toggle on={n.smsEnabled && n.smsOnBookingApproved} onClick={() => tn('smsOnBookingApproved')} />
          </Row>
          <Row title="Bandlov bekor qilinganda" sub="Bandlov bekor qilinganda mijozga SMS yuboriladi.">
            <Toggle on={n.smsEnabled && n.smsOnBookingRejected} onClick={() => tn('smsOnBookingRejected')} />
          </Row>
          <Row title="To'lov eslatmalari" sub="Muddati o'tgan ijarachilarga avtomatik SMS. Har kuni 10:00 da tekshiriladi." last={!n.smsOnPaymentReminder}>
            <Toggle on={n.smsEnabled && n.smsOnPaymentReminder} onClick={() => tn('smsOnPaymentReminder')} />
          </Row>
          {n.smsOnPaymentReminder && (
            <div style={{ padding: '14px 0 2px', borderTop: '1px solid var(--g-line)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                <div>
                  <FieldLabel>Eslatma kunlari (kechikish, kun)</FieldLabel>
                  <input
                    className="adm-input"
                    value={daysText}
                    onChange={(e) => setDaysText(e.target.value)}
                    placeholder="3, 7, 14"
                    style={daysValid ? undefined : { borderColor: 'oklch(0.6 0.16 25)' }}
                  />
                  <div style={{ font: `400 11.5px ${window.GO.font}`, color: daysValid ? 'var(--g-ink-4)' : 'oklch(0.5 0.16 25)', marginTop: 5 }}>
                    {daysValid
                      ? `Faqat eng katta bosqich yuboriladi — ${[...new Set(parsedDays)].sort((a, b) => a - b).join(' / ')} kun.`
                      : "Kamida bitta kun kiriting (masalan: 3, 7, 14)."}
                  </div>
                </div>
                <div>
                  <FieldLabel>Eng kam qarz (so'm)</FieldLabel>
                  <input
                    className="adm-input"
                    type="number"
                    min={0}
                    value={n.paymentReminderMinAmount}
                    onChange={(e) => setN1('paymentReminderMinAmount', Math.max(0, Number(e.target.value) || 0))}
                  />
                  <div style={{ font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 5 }}>
                    Bundan kichik qarz uchun SMS yuborilmaydi.
                  </div>
                </div>
              </div>
              <Row title="Mezbonga ham xabar berish" sub="Bino egasiga qarzdor haqida nusxa yuboriladi (mezbon telefoni kiritilgan bo'lsa)." last>
                <Toggle on={n.paymentReminderNotifyHost} onClick={() => tn('paymentReminderNotifyHost')} />
              </Row>
            </div>
          )}
        </div>
        {n.smsEnabled && n.smsOnPaymentReminder && (
          <div style={{
            marginTop: 14, padding: '10px 12px', borderRadius: 10,
            background: 'color-mix(in oklch, oklch(0.7 0.15 55) 10%, transparent)',
            font: `400 12px ${window.GO.font}`, color: 'var(--g-ink-2)',
          }}>
            Bu haqiqiy mijozlarga SMS yuboradi. Yoqishdan oldin <b>Qarzdorlik → Eslatmalar</b> bo'limida kimga
            yuborilishini tekshiring.
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
          <Btn kind="primary" onClick={save} disabled={!daysValid}>O'zgarishlarni saqlash</Btn>
        </div>
      </Card>
    </div>
  );
}

// ── Commission tab ──────────────────────────────────────────
function CommissionTab() {
  const initC = (window.SETTINGS && window.SETTINGS.commission) || {};
  const [fees, setFees] = React.useState(initC.perCategory || { private: 12, shared: 12, coworking: 15, virtual: 8 });
  const [hostFee, setHostFee] = React.useState(initC.hostFee ?? 3);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <Card>
        <div style={{ font: `700 15px ${window.GO.font}`, color: 'var(--g-ink)', marginBottom: 4 }}>Toifa bo'yicha komissiya</div>
        <div style={{ font: `400 12px ${window.GO.font}`, color: 'var(--g-ink-4)', marginBottom: 8 }}>
          Har bir bandlovdan platforma oladigan ulush (mijoz to'lovidan).
        </div>
        {window.CATEGORIES.map((c, i) => (
          <Row key={c.id} title={c.name} sub={c.sub} last={i === window.CATEGORIES.length - 1}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, width: 280 }}>
              <input type="range" min="0" max="25" value={fees[c.id]} onChange={(e) => setFees((p) => ({ ...p, [c.id]: +e.target.value }))}
                style={{ flex: 1, accentColor: 'var(--g-brand)' }} />
              <div style={{ width: 70, position: 'relative' }}>
                <input className="adm-input" style={{ textAlign: 'right', paddingRight: 26, padding: '8px 26px 8px 10px' }}
                  value={fees[c.id]} onChange={(e) => setFees((p) => ({ ...p, [c.id]: Math.min(25, +e.target.value || 0) }))} />
                <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', font: `500 12px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>%</span>
              </div>
            </div>
          </Row>
        ))}
      </Card>
      <Card>
        <div style={{ font: `700 15px ${window.GO.font}`, color: 'var(--g-ink)' }}>Qo'shimcha to'lovlar</div>
        <Row title="Mezbon xizmat haqi" sub="Mezbon daromadidan ushlab qolinadigan ulush.">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Segmented value={String(hostFee)} onChange={(v) => setHostFee(+v)} options={[{ value: '0', label: '0%' }, { value: '3', label: '3%' }, { value: '5', label: '5%' }]} />
          </div>
        </Row>
        <Row title="To'lov tizimi to'lovi" sub="UZCARD / Humo ekvayringi — mijozga o'tkaziladi." last>
          <span style={{ font: `600 13px ${window.GO.font}`, color: 'var(--g-ink-3)' }}>1.0%</span>
        </Row>
        <div style={{ display: 'flex', justifycontent: 'flex-end', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
          <Btn kind="ghost">Bekor qilish</Btn>
          <Btn kind="primary" onClick={() => gorentMutate(() => api.put('/settings', { commission: { perCategory: fees, hostFee } }))}>O'zgarishlarni saqlash</Btn>
        </div>
      </Card>
    </div>
  );
}

// ── Payouts tab ─────────────────────────────────────────────
function PayoutsTab() {
  const initP = (window.SETTINGS && window.SETTINGS.payouts) || {};
  const [schedule, setSchedule] = React.useState(initP.schedule || 'weekly');
  const [threshold, setThreshold] = React.useState(window.fmtSom(initP.threshold ?? 500000));
  const [holdDays, setHoldDays] = React.useState(String(initP.holdDays ?? 1));
  const save = () => gorentMutate(() => api.put('/settings', { payouts: { schedule, threshold: Number(String(threshold).replace(/\D/g, '')) || 0, holdDays: Number(holdDays) } }));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <Card>
        <div style={{ font: `700 15px ${window.GO.font}`, color: 'var(--g-ink)', marginBottom: 14 }}>To'lov jadvali</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[['daily', 'Har kuni', 'Har ish kuni'], ['weekly', 'Har hafta', 'Dushanba kunlari'], ['monthly', 'Har oy', "Oyning 1-sanasi"]].map(([v, t, sub]) => {
            const on = schedule === v;
            return (
              <button key={v} onClick={() => setSchedule(v)} style={{
                textAlign: 'left', padding: 16, borderRadius: 13, cursor: 'pointer',
                border: `1.5px solid ${on ? 'var(--g-brand)' : 'var(--g-line)'}`, background: on ? 'var(--g-brand-soft)' : 'var(--g-card)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ font: `700 14px ${window.GO.font}`, color: on ? 'var(--g-brand-ink)' : 'var(--g-ink)' }}>{t}</span>
                  <span style={{ width: 16, height: 16, borderRadius: 999, border: `2px solid ${on ? 'var(--g-brand)' : 'var(--g-line)'}`, background: on ? 'var(--g-brand)' : 'transparent', display: 'grid', placeItems: 'center' }}>
                    {on && <span style={{ width: 6, height: 6, borderRadius: 999, background: '#fff' }} />}
                  </span>
                </div>
                <div style={{ font: `400 12px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 5 }}>{sub}</div>
              </button>
            );
          })}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 18 }}>
          <div>
            <FieldLabel>Minimal to'lov chegarasi</FieldLabel>
            <div style={{ position: 'relative' }}>
              <input className="adm-input" value={threshold} onChange={(e) => setThreshold(window.fmtSom(Number(e.target.value.replace(/\D/g, '')) || 0))} style={{ paddingRight: 50 }} />
              <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', font: `500 12px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>so'm</span>
            </div>
          </div>
          <div>
            <FieldLabel>Ushlab turish muddati</FieldLabel>
            <select className="adm-select" style={{ width: '100%' }} value={holdDays} onChange={(e) => setHoldDays(e.target.value)}>
              <option value="0">Bandlovdan keyin darhol</option>
              <option value="1">1 kun</option>
              <option value="3">3 kun</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
          <Btn kind="primary" onClick={save}>O'zgarishlarni saqlash</Btn>
        </div>
      </Card>
      <Card>
        <div style={{ font: `700 15px ${window.GO.font}`, color: 'var(--g-ink)' }}>To'lov usullari</div>
        {[['UZCARD ekvayring', 'Faol · 1.0% to\u2019lov', true], ['Humo ekvayring', 'Faol · 1.0% to\u2019lov', true], ['Bank o\u2019tkazmasi (korporativ)', 'Yuridik shaxslar uchun', true], ['Payme / Click', 'Ulanmagan', false]].map(([t, sub, on], i, arr) => (
          <Row key={t} title={t} sub={sub} last={i === arr.length - 1}>
            {on ? <StatusPill s="active" dict={{ active: { label: 'Faol', hue: 155 } }} /> : <Btn kind="ghost" sm><IconLink size={14} /> Ulash</Btn>}
          </Row>
        ))}
      </Card>
    </div>
  );
}

// ── Integrations tab ────────────────────────────────────────
function IntegrationsTab() {
  const items = window.INTEGRATIONS || [];
  return (
    <div>
      <Card style={{ marginBottom: 18, background: 'var(--g-brand-soft)', borderColor: 'transparent', display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ color: 'var(--g-brand-ink)', display: 'flex' }}><IconShieldCheck size={22} /></span>
        <div>
          <div style={{ font: `600 13.5px ${window.GO.font}`, color: 'var(--g-brand-ink)' }}>Rasmiy davlat integratsiyalari ulangan</div>
          <div style={{ font: `400 12px ${window.GO.font}`, color: 'var(--g-ink-2)', marginTop: 2 }}>
            Virtual ofis hujjatlari didox.uz va ijara.soliq.uz orqali rasmiy sinxronlanadi.
          </div>
        </div>
      </Card>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {items.map((it) => (
          <Card key={it.key} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <ConnTile c={it} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: `600 14px ${window.GO.font}`, color: 'var(--g-ink)' }}>{it.name}</div>
                <div style={{ font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>{it.domain}</div>
              </div>
              <StatusPill s={it.status === 'connected' ? 'connected' : 'off'} dict={window.CONN_STATUS || { connected: { label: 'Ulangan', hue: 155 }, off: { label: 'Ulanmagan', hue: 35 } }} size="sm" />
            </div>
            <div style={{ font: `400 12.5px ${window.GO.font}`, color: 'var(--g-ink-3)', lineHeight: 1.5, minHeight: 36 }}>{it.desc}</div>
            <div style={{ display: 'flex', gap: 8, paddingTop: 10, borderTop: '1px solid var(--g-line)' }}>
              {it.status === 'connected'
                ? <><Btn kind="ghost" sm style={{ flex: 1, justifyContent: 'center' }} onClick={() => gorentMutate(() => api.post(`/integrations/${it.key}/sync`))}>Sinxronlash</Btn><Btn kind="quiet" sm onClick={() => gorentMutate(() => api.post(`/integrations/${it.key}/disconnect`))}>Uzish</Btn></>
                : <Btn kind="primary" sm style={{ flex: 1, justifyContent: 'center' }} onClick={() => gorentMutate(() => api.post(`/integrations/${it.key}/connect`))}><IconLink size={14} /> Ulash</Btn>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Team tab ────────────────────────────────────────────────
function TeamTab() {
  const [users, setUsers] = React.useState(null);
  const [err, setErr] = React.useState(null);
  const [showForm, setShowForm] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const blank = { name: '', email: '', password: '', role: 'platform', org: 'Gorent' };
  const [f, setF] = React.useState(blank);
  const me = api.currentUser();
  const roleHue = (r) => (r === 'platform' ? 155 : 268);

  const load = React.useCallback(() => {
    api.get('/users').then(setUsers).catch((e) => setErr(e.message));
  }, []);
  React.useEffect(() => { load(); }, [load]);

  const create = async () => {
    setBusy(true); setErr(null);
    try {
      await api.post('/users', f);
      setF(blank); setShowForm(false); load();
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };
  const del = async (u) => {
    if (!window.confirm(`"${u.name}" foydalanuvchisi o'chirilsinmi?`)) return;
    try { await api.del('/users/' + u.id); load(); } catch (e) { window.alert(e.message); }
  };
  const setRole = async (u, role) => {
    try { await api.patch('/users/' + u.id, { role }); load(); } catch (e) { window.alert(e.message); }
  };

  return (
    <Card pad={0}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px' }}>
        <div>
          <div style={{ font: `700 15px ${window.GO.font}`, color: 'var(--g-ink)' }}>Jamoa a'zolari</div>
          <div style={{ font: `400 12px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 2 }}>{users ? `${users.length} ta foydalanuvchi · rollar va ruxsatlar` : 'Yuklanmoqda…'}</div>
        </div>
        <Btn kind="primary" sm onClick={() => { setShowForm((v) => !v); setErr(null); }}><IconPlus size={15} /> A'zo qo'shish</Btn>
      </div>

      {showForm && (
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--g-line)', background: 'var(--g-bg)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <input className="adm-input" placeholder="Ism" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input className="adm-input" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <input className="adm-input" type="password" placeholder="Parol (kamida 6 belgi)" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
          <select className="adm-select" style={{ width: '100%' }} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
            <option value="platform">Platforma admini</option>
            <option value="host">Mezbon</option>
          </select>
          {err && <div style={{ gridColumn: '1 / -1', font: `500 12px ${window.GO.font}`, color: 'oklch(0.5 0.16 25)' }}>{err}</div>}
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Btn kind="ghost" sm onClick={() => { setShowForm(false); setErr(null); setF(blank); }}>Bekor</Btn>
            <Btn kind="primary" sm onClick={create} {...(busy ? { disabled: true } : {})}>{busy ? '…' : "Qo'shish"}</Btn>
          </div>
        </div>
      )}

      {!users && !err && <div style={{ padding: '20px', font: `400 13px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>Yuklanmoqda…</div>}
      {err && !showForm && <div style={{ padding: '20px', font: `500 13px ${window.GO.font}`, color: 'oklch(0.5 0.16 25)' }}>{err}</div>}
      {users && users.map((u) => {
        const isMe = me && u.id === me.id;
        return (
          <div key={u.id} className="adm-row" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 20px', borderTop: '1px solid var(--g-line)' }}>
            <Avatar name={u.name} size={38} hue={roleHue(u.role)} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: `600 13.5px ${window.GO.font}`, color: 'var(--g-ink)' }}>{u.name} {isMe && <span style={{ font: `500 11px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>(siz)</span>}</div>
              <div style={{ font: `400 12px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>{u.email}</div>
            </div>
            <select className="adm-select" value={u.role} onChange={(e) => setRole(u, e.target.value)} style={{ padding: '6px 26px 6px 10px' }}>
              <option value="platform">Platforma</option>
              <option value="host">Mezbon</option>
            </select>
            {isMe
              ? <span style={{ width: 32, display: 'inline-block' }} />
              : <IconBtn title="O'chirish" onClick={() => del(u)} style={{ color: 'oklch(0.55 0.16 25)' }}><IconTrash size={16} /></IconBtn>}
          </div>
        );
      })}
    </Card>
  );
}

function AuditTab() {
  const [rows, setRows] = React.useState(null);
  const [err, setErr] = React.useState(null);
  const [entity, setEntity] = React.useState('all');
  const [actor, setActor] = React.useState('');

  const load = React.useCallback(() => {
    const q = new URLSearchParams({ limit: '100' });
    if (entity !== 'all') q.set('entity', entity);
    if (actor) q.set('actor', actor);
    api.get('/audit?' + q.toString()).then(setRows).catch((e) => setErr(e.message));
  }, [entity, actor]);
  React.useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const methodHue = { POST: 200, PUT: 70, PATCH: 70, DELETE: 25, GET: 250 };
  const fmtTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('uz-UZ') + ' ' + d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
  };
  const entities = ['all', 'buildings', 'products', 'units', 'bookings', 'hosts', 'reviews', 'users', 'settings', 'integrations', 'notifications'];

  const columns = [
    { key: 'at', label: 'Vaqt', render: (r) => <span style={{ font: `400 12.5px ${window.GO.font}`, color: 'var(--g-ink-3)', whiteSpace: 'nowrap' }}>{fmtTime(r.at)}</span> },
    { key: 'actor', label: 'Foydalanuvchi', render: (r) => (
      <div>
        <div style={{ font: `600 13px ${window.GO.font}`, color: 'var(--g-ink)' }}>{r.actorEmail || '—'}</div>
        <div style={{ font: `400 11px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>{r.actorRole}</div>
      </div>
    ) },
    { key: 'action', label: 'Amal', render: (r) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ font: `700 10.5px ui-monospace, monospace`, color: `oklch(0.45 0.14 ${methodHue[r.method] || 250})`, background: `oklch(0.96 0.04 ${methodHue[r.method] || 250})`, padding: '3px 7px', borderRadius: 6 }}>{r.method}</span>
        <span style={{ font: `500 12.5px ${window.GO.font}`, color: 'var(--g-ink-2)' }}>{r.entity}{r.entityId ? ' · ' + r.entityId : ''}</span>
      </div>
    ) },
    { key: 'status', label: 'Holat', align: 'center', render: (r) => {
      const hue = r.status < 300 ? 155 : r.status < 500 ? 70 : 25;
      return <span style={{ font: `600 11.5px ${window.GO.font}`, color: `oklch(0.42 0.12 ${hue})`, background: `oklch(0.95 0.04 ${hue})`, padding: '3px 9px', borderRadius: 999 }}>{r.status}</span>;
    } },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <select className="adm-select" value={entity} onChange={(e) => setEntity(e.target.value)}>
            {entities.map((x) => <option key={x} value={x}>{x === 'all' ? "Barcha bo'limlar" : x}</option>)}
          </select>
          <SearchInput value={actor} onChange={setActor} placeholder="Foydalanuvchi (email)" width={220} />
        </div>
        <Btn kind="ghost" sm onClick={load}><IconRefresh size={15} /> Yangilash</Btn>
      </div>
      {err
        ? <Card pad={20} style={{ color: 'oklch(0.5 0.16 25)', font: `500 13px ${window.GO.font}` }}>{err}</Card>
        : <DataTable columns={columns} rows={rows || []} rowKey={(r) => r.id} empty={rows ? 'Yozuvlar topilmadi' : 'Yuklanmoqda…'} />}
    </div>
  );
}

function SettingsScreen() {
  const tabs = [
    { id: 'platform', label: "Platforma" },
    { id: 'commission', label: "Komissiya" },
    { id: 'payouts', label: "To'lovlar" },
    { id: 'integrations', label: "Integratsiyalar" },
    { id: 'team', label: "Jamoa" },
    { id: 'audit', label: "Audit jurnali" },
  ];
  const [tab, setTab] = React.useState('platform');
  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 22, borderBottom: '1px solid var(--g-line)' }}>
        {tabs.map((t) => {
          const on = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '11px 16px', border: 0, borderBottom: `2px solid ${on ? 'var(--g-brand)' : 'transparent'}`, cursor: 'pointer',
              background: 'transparent', color: on ? 'var(--g-ink)' : 'var(--g-ink-3)', font: `600 13.5px ${window.GO.font}`, marginBottom: -1,
            }}>{t.label}</button>
          );
        })}
      </div>
      <div style={{ maxWidth: 880 }}>
        {tab === 'platform' && <PlatformTab />}
        {tab === 'commission' && <CommissionTab />}
        {tab === 'payouts' && <PayoutsTab />}
        {tab === 'integrations' && <IntegrationsTab />}
        {tab === 'team' && <TeamTab />}
        {tab === 'audit' && <AuditTab />}
      </div>
    </div>
  );
}

Object.assign(window, { SettingsScreen });

// ============================================================
// src/admin-app.jsx
// ============================================================

// admin-app.jsx — Gorent Admin: shell, routing, tweaks, mount.

const ADMIN_TWEAKS = /*EDITMODE-BEGIN*/{
  "dashboardLayout": "A",
  "primaryColor": "#7863fc",
  "density": "regular",
  "defaultRole": "platform",
  "sidebar": "dark"
}/*EDITMODE-END*/;

const ADMIN_BRAND_PRESETS = {
  "#7863fc": { deep: "#181235", soft: "#ece9fe", ink: "#4a39c9" },  // violet (brand)
  "#0E8C73": { deep: "#073a32", soft: "#e1f1ec", ink: "#0a5a4a" },  // emerald
  "#3C4FB8": { deep: "#1a2358", soft: "#e4e8f7", ink: "#202b6e" },  // indigo
  "#B5471F": { deep: "#4a1a0d", soft: "#fbe6dd", ink: "#6e2a14" },  // terracotta
};

const SECTION_META = {
  overview:  { title: () => window.AT.navOverview,  sub: () => "Bugungi ko'rsatkichlar · 03.06.2026" },
  products:  { title: () => window.AT.navProducts,  sub: () => `${window.PRODUCTS.length} ta katalog mahsuloti · 4 toifa` },
  bookings:  { title: () => window.AT.navBookings,  sub: () => `${window.BOOKINGS.length} ta bandlov` },
  contracts: { title: () => "Shartnomalar", sub: () => "Ijara shartnomalari · uzaytirish va bekor qilish" },
  debtors:   { title: () => "Qarzdorlik", sub: () => `${((window.DEBTORS || {}).totals || {}).debtorCount || 0} ta qarzdor mijoz` },
  hosts:     { title: () => window.AT.navHosts,     sub: () => `${window.HOSTS.length} ta mezbon` },
  buildings: { title: () => window.AT.navBuildings, sub: () => `${(window.BUILDINGS || []).length} ta bino` },
  companies: { title: () => "Kompaniyalar", sub: () => `${(window.COMPANIES || []).length} ta ijarachi kompaniya` },
  revenue:   { title: () => "Daromad va to'lovlar", sub: () => "Aylanma, komissiya va mezbon to'lovlari" },
  invoices:  { title: () => "Hisob-fakturalar", sub: () => "Oylik ESF hisob-fakturalari · didox.uz" },
  reviews:   { title: () => "Sharhlar va moderatsiya", sub: () => `${window.REVIEWS.length} ta sharh` },
  settings:  { title: () => window.AT.navSettings, sub: () => "Platforma, komissiya, to'lovlar va integratsiyalar" },
};

function AdminApp() {
  const [t, setTweak] = useTweaks(ADMIN_TWEAKS);
  React.useEffect(() => { window.__tweaks = t; }, [t]);

  // Section ↔ URL sync. Keeps the URL in sync with navigation so refresh and
  // back/forward work, and sections are bookmarkable/shareable.
  const SECTIONS = ['overview','buildings','products','bookings','contracts','debtors','hosts','companies','revenue','invoices','reviews','settings'];
  const routeFromPath = () => {
    const parts = window.location.pathname.replace(/^\/+/, '').split('/').filter(Boolean);
    const section = SECTIONS.includes(parts[0]) ? parts[0] : 'overview';
    if (section === 'bookings') {
      if (parts[1] === 'add') return { section, sub: 'add' };
      if (parts[1] === 'edit' && parts[2]) return { section, sub: 'edit', id: parts[2] };
      if (parts[1]) return { section, sub: 'detail', id: parts[1] };
    }
    if (section === 'hosts') {
      if (parts[1] === 'add') return { section, sub: 'add' };
      if (parts[1] === 'edit' && parts[2]) return { section, sub: 'edit', id: parts[2] };
    }
    return { section };
  };
  const [route, setRouteRaw] = React.useState(routeFromPath);
  const setRoute = React.useCallback((r) => {
    setRouteRaw(r);
    let target;
    if (r.section === 'bookings' && r.sub) {
      if (r.sub === 'add') target = '/bookings/add';
      else if (r.sub === 'edit' && r.id) target = `/bookings/edit/${r.id}`;
      else if (r.sub === 'detail' && r.id) target = `/bookings/${r.id}`;
      else target = '/bookings';
    } else if (r.section === 'hosts' && r.sub) {
      if (r.sub === 'add') target = '/hosts/add';
      else if (r.sub === 'edit' && r.id) target = `/hosts/edit/${r.id}`;
      else target = '/hosts';
    } else {
      const section = r.section || 'overview';
      target = '/' + (section === 'overview' ? '' : section);
    }
    if (window.location.pathname !== target) window.history.pushState(r, '', target);
  }, []);
  React.useEffect(() => {
    const onPop = () => setRouteRaw(routeFromPath());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  // Re-fetch all data after a mutation and force a re-render. Bound globally so
  // any component can trigger a refresh via gorentMutate() without prop drilling.
  const [, setDataVersion] = React.useState(0);
  React.useEffect(() => {
    window.__gorentRefresh = async () => { await api.bootstrap(); setDataVersion((v) => v + 1); };
    return () => { delete window.__gorentRefresh; };
  }, []);
  const [role, setRole] = React.useState(t.defaultRole || 'platform');
  const [search, setSearch] = React.useState('');
  const [formOpen, setFormOpen] = React.useState(null); // null | {product?}

  React.useEffect(() => { setRole(t.defaultRole || 'platform'); }, [t.defaultRole]);
  React.useEffect(() => { setSearch(''); setFormOpen(null); }, [route.section]);

  // Apply brand CSS vars
  const preset = ADMIN_BRAND_PRESETS[t.primaryColor] || ADMIN_BRAND_PRESETS["#0E8C73"];
  React.useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty('--g-brand', t.primaryColor);
    r.style.setProperty('--g-brand-deep', t.sidebar === 'dark' ? preset.deep : t.primaryColor);
    r.style.setProperty('--g-brand-soft', preset.soft);
    r.style.setProperty('--g-brand-ink', preset.ink);
  }, [t.primaryColor, t.sidebar]);

  // Inject hover CSS once
  React.useEffect(() => {
    if (document.getElementById('adm-ui-css')) return;
    const s = document.createElement('style'); s.id = 'adm-ui-css'; s.textContent = window.ADMIN_UI_CSS;
    document.head.appendChild(s);
  }, []);

  // Server-computed pending counts (overview.counts); computed fallback pre-refresh.
  const counts = window.COUNTS || {
    pendingBuildings: (window.BUILDINGS || []).filter((b) => b.status === 'pending').length,
    // pendingProducts = pending OFFERINGS (a building's pending product listing).
    pendingProducts: (window.BUILDINGS || []).reduce((n, b) => n + (b.offerings || []).filter((o) => o.status === 'pending').length, 0),
    pendingBookings: window.BOOKINGS.filter((b) => b.status === 'pending').length,
    pendingReviews: window.REVIEWS.filter((r) => r.state === 'flagged' || r.state === 'pending').length,
  };

  const meta = SECTION_META[route.section];

  // Sidebar light theme override
  const sidebarBg = t.sidebar === 'light' ? 'var(--g-card)' : 'var(--g-brand-deep)';

  function renderSection() {
    if (formOpen !== undefined && formOpen !== null) {
      return <ProductForm product={formOpen.product} onClose={() => setFormOpen(null)} onSave={() => setFormOpen(null)} />;
    }
    switch (route.section) {
      case 'overview':  return <Overview variant={t.dashboardLayout} setLayout={(v) => setTweak('dashboardLayout', v)} setRoute={setRoute} />;
      case 'products':  return <ProductsScreen search={search} role={role} openForm={(p) => setFormOpen({ product: p })} />;
      case 'bookings':
        if (route.sub === 'add') return <BookingForm booking={null} onClose={() => setRoute({ section: 'bookings' })} onSave={() => setRoute({ section: 'bookings' })} />;
        if (route.sub === 'edit') return <BookingForm booking={window.BOOKINGS.find((b) => b.id === route.id) || null} onClose={() => setRoute({ section: 'bookings' })} onSave={() => setRoute({ section: 'bookings' })} />;
        return <BookingsScreen search={search} role={role} route={route} setRoute={setRoute} />;
      case 'hosts':
        if (route.sub === 'add') return <HostForm host={null} onClose={() => setRoute({ section: 'hosts' })} onSave={() => setRoute({ section: 'hosts' })} />;
        if (route.sub === 'edit') return <HostForm host={window.HOSTS.find((h) => h.id === route.id) || null} onClose={() => setRoute({ section: 'hosts' })} onSave={() => setRoute({ section: 'hosts' })} />;
        return <HostsScreen search={search} route={route} setRoute={setRoute} />;
      case 'buildings': return <BuildingsScreen search={search} role={role} />;
      case 'contracts': return <ContractsScreen search={search} />;
      case 'debtors':   return <DebtorsScreen search={search} />;
      case 'companies': return <CompaniesScreen search={search} />;
      case 'revenue':   return <RevenueScreen search={search} role={role} />;
      case 'invoices':  return <InvoicesScreen search={search} />;
      case 'reviews':   return <ReviewsScreen search={search} />;
      case 'settings':  return <SettingsScreen />;
      default: return null;
    }
  }

  const isBookingsSub = route.section === 'bookings' && route.sub;
  const isHostsSub = route.section === 'hosts' && route.sub;
  const topActions = formOpen
    ? null
    : isBookingsSub || isHostsSub
    ? null
    : route.section === 'products'
    ? (role === 'platform' ? <Btn kind="primary" sm onClick={() => setFormOpen({ product: null })}><IconPlus size={15} /> {window.AT.addProduct}</Btn> : null)
    : route.section === 'bookings'
    ? <Btn kind="primary" sm onClick={() => setRoute({ section: 'bookings', sub: 'add' })}><IconPlus size={15} /> Bandlov qo'shish</Btn>
    : route.section === 'hosts'
    ? <Btn kind="primary" sm onClick={() => setRoute({ section: 'hosts', sub: 'add' })}><IconPlus size={15} /> Mezbon qo'shish</Btn>
    : null;

  const formTitle = formOpen ? (formOpen.product ? "Mahsulotni tahrirlash" : "Yangi mahsulot") : null;
  const pageTitle = formTitle
    || (route.section === 'bookings' && route.sub === 'add' ? "Yangi bandlov"
      : route.section === 'bookings' && route.sub === 'edit' ? "Bandlovni tahrirlash"
      : route.section === 'bookings' && route.sub === 'detail' ? (route.id || 'Bandlov')
      : route.section === 'hosts' && route.sub === 'add' ? "Yangi mezbon"
      : route.section === 'hosts' && route.sub === 'edit' ? "Mezbonni tahrirlash"
      : meta.title());
  const pageSub = formOpen ? "Barcha maydonlarni to'ldiring"
    : (isBookingsSub || isHostsSub) ? ""
    : meta.sub();

  return (
    <div data-density={t.density} style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--g-bg)' }}>
      <ThemedSidebar bg={sidebarBg} theme={t.sidebar} route={route} setRoute={setRoute} role={role} counts={counts} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100%' }}>
        <Topbar
          title={pageTitle}
          sub={pageSub}
          role={role} onRole={setRole}
          search={search} setSearch={setSearch}
          actions={topActions}
          onNavigate={(section) => setRoute({ section })}
        />
        <div className="adm-scroll" style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
          <div style={{ maxWidth: 1320, margin: '0 auto' }}>
            {renderSection()}
          </div>
        </div>
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Boshqaruv paneli">
          <TweakRadio label="Ko'rinish varianti" value={t.dashboardLayout} options={['A', 'B', 'C']}
            onChange={(v) => setTweak('dashboardLayout', v)} />
          <div style={{ font: `400 11px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: -4 }}>A · Klassik · B · Bento · C · Fokus</div>
        </TweakSection>
        <TweakSection label="Brend">
          <TweakColor label="Asosiy rang" value={t.primaryColor}
            options={Object.keys(ADMIN_BRAND_PRESETS)} onChange={(v) => setTweak('primaryColor', v)} />
          <TweakRadio label="Yon panel" value={t.sidebar} options={['dark', 'light']}
            onChange={(v) => setTweak('sidebar', v)} />
        </TweakSection>
        <TweakSection label="Ko'rinish">
          <TweakRadio label="Boshlang'ich rol" value={t.defaultRole} options={['platform', 'host']}
            onChange={(v) => setTweak('defaultRole', v)} />
          <TweakRadio label="Zichlik" value={t.density} options={['compact', 'regular', 'comfy']}
            onChange={(v) => setTweak('density', v)} />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

// Sidebar wrapper that can be light or dark themed.
function ThemedSidebar({ bg, theme, ...props }) {
  if (theme === 'light') {
    return <div className="adm-sidebar-light"><LightSidebar {...props} /></div>;
  }
  return <Sidebar {...props} />;
}

// Light variant reuses Sidebar markup but on cream — implemented by swapping a class.
function LightSidebar(props) {
  return (
    <div style={{ '--side-fg': 'var(--g-ink)' }}>
      <SidebarLightInner {...props} />
    </div>
  );
}

function SidebarLightInner({ route, setRoute, role, counts }) {
  const badge = { buildings: counts.pendingBuildings, products: counts.pendingProducts, bookings: counts.pendingBookings, reviews: counts.pendingReviews, debtors: ((window.DEBTORS || {}).totals || {}).debtorCount || 0 };
  return (
    <div style={{ width: 244, flexShrink: 0, background: 'var(--g-card)', borderRight: '1px solid var(--g-line)', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '20px 18px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src="/assets/gorent-symbol.svg" alt="Gorent" style={{ width: 30, height: 30, display: 'block' }} />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
          <span style={{ font: `700 19px ${window.GO.font}`, letterSpacing: '-0.03em', color: 'var(--g-ink)' }}>gorent</span>
          <span style={{ font: `500 10px ui-monospace, monospace`, letterSpacing: '0.14em', color: 'var(--g-brand-ink)', textTransform: 'uppercase', background: 'var(--g-brand-soft)', padding: '2px 6px', borderRadius: 5 }}>admin</span>
        </div>
      </div>
      <div className="adm-scroll" style={{ flex: 1, overflowY: 'auto', padding: '6px 12px' }}>
        <div style={{ font: `600 10px ui-monospace, monospace`, letterSpacing: '0.14em', color: 'var(--g-ink-4)', padding: '10px 10px 8px', textTransform: 'uppercase' }}>Menyu</div>
        {window.NAV.map((n) => {
          const active = route.section === n.id; const b = badge[n.id];
          return (
            <button key={n.id} onClick={() => setRoute({ section: n.id })} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: '10px', marginBottom: 2, border: 0, borderRadius: 10, cursor: 'pointer', textAlign: 'left',
              background: active ? 'var(--g-brand-soft)' : 'transparent', color: active ? 'var(--g-brand-ink)' : 'var(--g-ink-3)', font: `${active ? 600 : 500} 13.5px ${window.GO.font}`,
            }}>
              <span style={{ display: 'flex', color: active ? 'var(--g-brand)' : 'var(--g-ink-4)' }}><n.icon size={18} /></span>
              <span style={{ flex: 1 }}>{n.label()}</span>
              {b > 0 && <span style={{ minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999, background: 'var(--g-brand)', color: '#fff', font: `700 10.5px ${window.GO.font}`, display: 'grid', placeItems: 'center' }}>{b}</span>}
            </button>
          );
        })}
      </div>
      <div style={{ padding: 12, borderTop: '1px solid var(--g-line)' }}>
        <button onClick={() => setRoute({ section: 'settings' })} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: '10px', marginBottom: 4, border: 0, borderRadius: 10, cursor: 'pointer', textAlign: 'left',
          background: route.section === 'settings' ? 'var(--g-brand-soft)' : 'transparent', color: route.section === 'settings' ? 'var(--g-brand-ink)' : 'var(--g-ink-3)', font: `${route.section === 'settings' ? 600 : 500} 13.5px ${window.GO.font}`,
        }}>
          <span style={{ display: 'flex', color: route.section === 'settings' ? 'var(--g-brand)' : 'var(--g-ink-4)' }}><IconSettings size={18} /></span> {window.AT.navSettings}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px' }}>
          <Avatar name={role === 'host' ? "Aziza Rashidova" : "Admin Operator"} size={34} hue={155} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{role === 'host' ? "Aziza Rashidova" : "Admin Operator"}</div>
            <div style={{ font: `400 11px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>{role === 'host' ? "AR Estate · mezbon" : "Platforma · super-admin"}</div>
          </div>
          <button title="Chiqish" onClick={() => window.__gorentLogout()} className="adm-iconbtn" style={{ color: 'var(--g-ink-4)', display: 'flex', background: 'transparent', border: 0, cursor: 'pointer', padding: 4 }}><IconLogout size={16} /></button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AdminApp });

// ============================================================
// Mutations — call the API, then refresh all data + re-render
// ============================================================
async function gorentMutate(fn) {
  try {
    await fn();
    if (window.__gorentRefresh) await window.__gorentRefresh();
    return true;
  } catch (e) {
    console.error('Gorent mutation failed', e);
    window.alert(e && e.message ? e.message : "Amalni bajarib bo‘lmadi");
    return false;
  }
}
window.gorentMutate = gorentMutate;

// ============================================================
// Auth gate — login → bootstrap data from API → render AdminApp
// ============================================================

function CenterShell({ children }) {
  return (
    <div style={{ minHeight: '100vh', width: '100vw', display: 'grid', placeItems: 'center', background: 'var(--g-bg)', padding: 24 }}>
      {children}
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [email, setEmail] = React.useState('operator@gorent.uz');
  const [password, setPassword] = React.useState('gorent123');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      await api.login(email, password);
      onLogin();
    } catch (ex) {
      setErr(ex.status === 401 ? "Email yoki parol noto'g'ri" : (ex.message || 'Ulanishda xatolik'));
      setBusy(false);
    }
  };

  const fill = (em) => { setEmail(em); setPassword('gorent123'); };

  return (
    <CenterShell>
      <div style={{ width: 380, maxWidth: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, justifyContent: 'center', marginBottom: 22 }}>
          <img src="/assets/gorent-symbol.svg" alt="Gorent" style={{ width: 34, height: 34 }} />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
            <span style={{ font: `700 22px ${window.GO.font}`, letterSpacing: '-0.03em', color: 'var(--g-ink)' }}>gorent</span>
            <span style={{ font: `500 10px ui-monospace, "JetBrains Mono", monospace`, letterSpacing: '0.14em', color: 'var(--g-brand-ink)', textTransform: 'uppercase', background: 'var(--g-brand-soft)', padding: '2px 6px', borderRadius: 5 }}>admin</span>
          </div>
        </div>
        <Card style={{ boxShadow: '0 24px 60px -24px rgba(0,0,0,0.18)' }}>
          <div style={{ font: `700 18px ${window.GO.font}`, color: 'var(--g-ink)', letterSpacing: '-0.02em' }}>Tizimga kirish</div>
          <div style={{ font: `400 13px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 4, marginBottom: 20 }}>Boshqaruv paneliga kirish uchun hisobingizga kiring.</div>
          <form onSubmit={submit}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink-2)', marginBottom: 7 }}>Email</div>
              <input className="adm-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@gorent.uz" autoComplete="username" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink-2)', marginBottom: 7 }}>Parol</div>
              <input className="adm-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
            </div>
            {err && (
              <div style={{ font: `500 12.5px ${window.GO.font}`, color: 'oklch(0.5 0.16 25)', background: 'oklch(0.96 0.04 25)', padding: '9px 12px', borderRadius: 10, marginBottom: 14 }}>{err}</div>
            )}
            <Btn kind="primary" style={{ width: '100%', justifyContent: 'center' }} {...(busy ? { disabled: true } : {})}>
              {busy ? 'Kirilmoqda…' : 'Kirish'}
            </Btn>
          </form>
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--g-line)' }}>
            <div style={{ font: `500 11px ${window.GO.font}`, color: 'var(--g-ink-4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Demo hisoblar</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn kind="soft" sm onClick={() => fill('operator@gorent.uz')} style={{ flex: 1, justifyContent: 'center' }}>Platforma admini</Btn>
              <Btn kind="soft" sm onClick={() => fill('aziza@gorent.uz')} style={{ flex: 1, justifyContent: 'center' }}>Mezbon</Btn>
            </div>
          </div>
        </Card>
      </div>
    </CenterShell>
  );
}

function StatusScreen({ title, sub, children }) {
  return (
    <CenterShell>
      <div style={{ textAlign: 'center' }}>
        <img src="/assets/gorent-symbol.svg" alt="Gorent" style={{ width: 38, height: 38, marginBottom: 16, opacity: 0.9 }} />
        <div style={{ font: `700 16px ${window.GO.font}`, color: 'var(--g-ink)' }}>{title}</div>
        {sub && <div style={{ font: `400 13px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 6, maxWidth: 360 }}>{sub}</div>}
        {children}
      </div>
    </CenterShell>
  );
}

function Root() {
  const [authed, setAuthed] = React.useState(api.isAuthed());
  const [ready, setReady] = React.useState(false);
  const [error, setError] = React.useState(null);

  const load = React.useCallback(() => {
    setReady(false); setError(null);
    api.bootstrap()
      .then(() => setReady(true))
      .catch((ex) => {
        if (ex.status === 401) { api.clearToken(); setAuthed(false); }
        else setError(ex.message || 'Maʼlumotlarni yuklab boʻlmadi');
      });
  }, []);

  React.useEffect(() => { if (authed) load(); }, [authed, load]);

  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;
  if (error) {
    return (
      <StatusScreen title="Serverga ulanib boʻlmadi" sub={`${error}. API ishga tushganini tekshiring (${api.BASE}).`}>
        <div style={{ marginTop: 18, display: 'flex', gap: 8, justifyContent: 'center' }}>
          <Btn kind="primary" sm onClick={load}>Qayta urinish</Btn>
          <Btn kind="ghost" sm onClick={() => { api.clearToken(); setAuthed(false); }}>Chiqish</Btn>
        </div>
      </StatusScreen>
    );
  }
  if (!ready) return <StatusScreen title="Yuklanmoqda…" sub="Maʼlumotlar serverdan olinmoqda." />;
  return <AdminApp />;
}

const adminRoot = ReactDOM.createRoot(document.getElementById('root'));
adminRoot.render(<Root />);
