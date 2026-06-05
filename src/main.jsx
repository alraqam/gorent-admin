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
  navCustomers: "Mijozlar",
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

// ─── Category meta (admin coloring) ─────────────────────────
const CAT_META = {
  private:   { hue: 24,  accent: "oklch(0.62 0.13 24)" },
  shared:    { hue: 158, accent: "oklch(0.58 0.12 158)" },
  coworking: { hue: 200, accent: "oklch(0.58 0.12 220)" },
  virtual:   { hue: 290, accent: "oklch(0.55 0.13 290)" },
};
function catName(id) { return (window.CATEGORIES.find((c) => c.id === id) || {}).name || id; }
function catShort(id) { return (window.CATEGORIES.find((c) => c.id === id) || {}).short || id; }

// ─── Deterministic pseudo-random (stable across reloads) ────
function seeded(n) { let x = Math.sin(n * 9973) * 10000; return x - Math.floor(x); }

// ─── PRODUCTS — extend LISTINGS with admin fields ───────────
const HOST_IDS = {}; // title host name -> hostId map filled below
const PRODUCTS = window.LISTINGS.map((l, i) => {
  const r = seeded(i + 1);
  const statusPool = ['active', 'active', 'active', 'pending', 'paused', 'active', 'draft'];
  const status = i === 2 ? 'pending' : i === 5 ? 'paused' : i === 10 ? 'pending' : i === 8 ? 'draft' : 'active';
  const bookings = Math.round(6 + r * 40);
  const occ = Math.round(45 + seeded(i + 7) * 50);
  const monthsLive = Math.round(2 + seeded(i + 3) * 22);
  const revenue = Math.round(l.price * (0.6 + seeded(i + 11) * 1.8) * (status === 'active' ? 1 : 0.4));
  const views = Math.round(200 + seeded(i + 5) * 5400);
  const created = new Date(2025, (i * 2) % 12, 3 + (i % 20));
  return {
    ...l, status, bookings, occ, revenue, views, monthsLive,
    createdLabel: `${String(created.getDate()).padStart(2,'0')}.${String(created.getMonth()+1).padStart(2,'0')}.${created.getFullYear()}`,
    created,
  };
});

// ─── HOSTS — aggregate from products ────────────────────────
const HOST_SEED = [
  { name: "Aziza Rashidova",  org: "AR Estate",        city: "Toshkent",  hue: 38,  joined: "2022", payout: "Bank · UZCARD", verified: true,  super: true },
  { name: "Sanjar Muradov",   org: "Sun Tower MCHJ",   city: "Toshkent",  hue: 165, joined: "2024", payout: "Humo", verified: true,  super: false },
  { name: "Diyora To'rayeva", org: "Olmazor Spaces",   city: "Toshkent",  hue: 220, joined: "2023", payout: "Bank o'tkazma", verified: true,  super: false },
  { name: "Asaxiy Business",  org: "Asaxiy B2B",       city: "Toshkent",  hue: 280, joined: "2021", payout: "Bank · UZCARD", verified: true,  super: true },
  { name: "Otabek Saidov",    org: "Loft Group",       city: "Toshkent",  hue: 12,  joined: "2024", payout: "UZCARD", verified: false, super: false },
  { name: "Rustam Aliyev",    org: "IT Park Residency",city: "Toshkent",  hue: 158, joined: "2020", payout: "Bank o'tkazma", verified: true,  super: true },
  { name: "Plaza Group",      org: "Plaza Holding",    city: "Toshkent",  hue: 295, joined: "2019", payout: "Bank · korporativ", verified: true, super: true },
  { name: "Nodir Pulatov",    org: "Tashkent City Mgmt", city: "Toshkent", hue: 24, joined: "2023", payout: "UZCARD", verified: true, super: true },
];
// Map a couple product hosts to seed hosts by index for variety
const HOSTS = HOST_SEED.map((h, i) => {
  const owned = PRODUCTS.filter((p, pi) => pi % HOST_SEED.length === i);
  const revenue = owned.reduce((s, p) => s + p.revenue, 0);
  const bookings = owned.reduce((s, p) => s + p.bookings, 0);
  const ratingAvg = owned.length ? (owned.reduce((s, p) => s + p.rating, 0) / owned.length) : 4.8;
  return {
    id: 'H' + String(i + 1).padStart(2, '0'),
    ...h, listings: owned.length, revenue, bookings,
    rating: Number(ratingAvg.toFixed(2)),
    pending: owned.filter((p) => p.status === 'pending').length,
  };
});

// ─── BOOKINGS ───────────────────────────────────────────────
const CUSTOMER_NAMES = [
  "Bekzod Yusupov", "Madina Karimova", "Jasur Toshpo'latov", "Nigora Saidova",
  "Akmal Rahimov", "Kamola Ergasheva", "Shoxruh Nazarov", "Dilnoza Abdullayeva",
  "Farrux Komilov", "Sevara Yo'ldosheva", "Ulug'bek Sodiqov", "Gulnoza Mirzayeva",
  "Temur Abdurahmonov", "Laylo Hamidova", "Sardor Qodirov", "Malika Ismoilova",
];
const COMPANIES = [
  "Epam Systems", "Uzum Market", "TBC Bank UZ", "Click Evolution", "Payme",
  "Artel Electronics", "IMAN Invest", "Workly", "Billz", "MyTaxi UZ",
  "Korzinka", "Beeline Uz", "Anorbank", "Davr Mobile", "Express24",
];
const BOOKINGS = Array.from({ length: 22 }, (_, i) => {
  const r = seeded(i + 31);
  const p = PRODUCTS[Math.floor(seeded(i + 41) * PRODUCTS.length)];
  const statusPool = ['active', 'confirmed', 'confirmed', 'pending', 'completed', 'active', 'cancelled', 'completed'];
  const status = statusPool[Math.floor(r * statusPool.length)];
  const months = 1 + Math.floor(seeded(i + 51) * 11);
  const total = p.price * months;
  const day = 1 + Math.floor(seeded(i + 61) * 27);
  const mon = Math.floor(seeded(i + 71) * 6);
  const customer = CUSTOMER_NAMES[i % CUSTOMER_NAMES.length];
  const company = COMPANIES[i % COMPANIES.length];
  return {
    id: 'GR-' + String(48210 + i * 7),
    product: p, customer, company,
    cust_hue: (i * 47) % 360,
    status, months, total,
    start: `${String(day).padStart(2,'0')}.0${mon + 1}.2026`,
    nights: months,
  };
});

// ─── REVIEWS (moderation queue) ─────────────────────────────
const REVIEW_TEXTS = [
  "Joy juda qulay, hammasi tavsifga mos. Tavsiya qilaman.",
  "Wi-Fi tez, yig'ilish xonasi toza. Mezbon javobgar.",
  "Narxi biroz baland, lekin joylashuv ajoyib.",
  "Konditsioner ishlamadi, lekin tezda tuzatishdi.",
  "Reseption xizmati zo'r, mehmonlar uchun qulay.",
  "Avtoturargoh kichik, ertalab joy topish qiyin.",
  "Hujjatlar tez rasmiylashtirildi, virtual manzil ishladi.",
  "Stol va kreslolar yangi, ish uchun ideal muhit.",
];
const REVIEWS = Array.from({ length: 14 }, (_, i) => {
  const r = seeded(i + 83);
  const p = PRODUCTS[Math.floor(seeded(i + 91) * PRODUCTS.length)];
  const flagged = i === 1 || i === 6 || i === 9;
  const stateP = ['published', 'published', 'pending', 'published', 'flagged'];
  const state = flagged ? 'flagged' : (i % 4 === 2 ? 'pending' : 'published');
  return {
    id: 'RV' + String(1200 + i),
    product: p, author: CUSTOMER_NAMES[(i + 3) % CUSTOMER_NAMES.length],
    hue: (i * 53) % 360,
    rating: state === 'flagged' ? 1 + Math.floor(r * 2) : 4 + Math.floor(r * 2),
    text: REVIEW_TEXTS[i % REVIEW_TEXTS.length],
    date: `${String(2 + (i % 26)).padStart(2,'0')}.0${(i % 5) + 1}.2026`,
    state,
  };
});

// ─── PAYOUTS ────────────────────────────────────────────────
const PAYOUTS = HOSTS.map((h, i) => {
  const statusPool = ['paid', 'paid', 'pending', 'paid', 'hold', 'pending', 'paid', 'paid'];
  const amount = Math.round(h.revenue * (0.12 + seeded(i + 99) * 0.05)); // platform-side payout slice
  return {
    id: 'PO-' + String(9100 + i * 3),
    host: h, amount, fee: Math.round(amount * 0.12),
    status: statusPool[i % statusPool.length],
    date: `0${(i % 6) + 1}.06.2026`,
  };
});

// ─── KPI SERIES (12 months) ─────────────────────────────────
const MONTHS_UZ = ["Yan","Fev","Mar","Apr","May","Iyn","Iyl","Avg","Sen","Okt","Noy","Dek"];
const revenueSeries = MONTHS_UZ.map((m, i) => {
  const base = 180 + i * 22 + Math.sin(i / 1.6) * 30 + seeded(i + 5) * 24;
  return { label: m, value: Math.round(base) }; // in mln so'm
});
const bookingsSeries = MONTHS_UZ.map((m, i) => ({ label: m, value: Math.round(40 + i * 6 + seeded(i + 13) * 26) }));

// Category breakdowns
const byCategory = window.CATEGORIES.map((c) => {
  const items = PRODUCTS.filter((p) => p.cat === c.id);
  const rev = items.reduce((s, p) => s + p.revenue, 0);
  const bk = items.reduce((s, p) => s + p.bookings, 0);
  const occ = items.length ? Math.round(items.reduce((s, p) => s + p.occ, 0) / items.length) : 0;
  return { id: c.id, name: c.name, short: c.short, count: items.length, revenue: rev, bookings: bk, occ };
});

// ─── KPI headline figures ───────────────────────────────────
const totalRevenue = PRODUCTS.reduce((s, p) => s + p.revenue, 0);
const totalBookings = BOOKINGS.length;
const activeBookings = BOOKINGS.filter((b) => b.status === 'active' || b.status === 'confirmed').length;
const avgOccupancy = Math.round(PRODUCTS.reduce((s, p) => s + p.occ, 0) / PRODUCTS.length);
const pendingApproval = PRODUCTS.filter((p) => p.status === 'pending').length + REVIEWS.filter((r) => r.state === 'pending' || r.state === 'flagged').length;
const avgRating = Number((PRODUCTS.reduce((s, p) => s + p.rating, 0) / PRODUCTS.length).toFixed(2));

const KPIS = [
  { id: 'rev',  label: "Jami daromad",   value: fmtCompactSom(totalRevenue), unit: "so'm", delta: +12.4, spark: revenueSeries.map((d) => d.value) },
  { id: 'book', label: "Faol bandlovlar", value: String(activeBookings + 124), unit: "ta",   delta: +8.1,  spark: bookingsSeries.map((d) => d.value) },
  { id: 'occ',  label: "Bandlik darajasi", value: avgOccupancy + "%", unit: "", delta: +3.6, spark: [62,64,61,66,69,71,70,73,72,74,76,avgOccupancy] },
  { id: 'pend', label: "Tasdiqlash navbati", value: String(pendingApproval), unit: "ta", delta: -2, deltaInvert: true, spark: [9,7,8,6,7,5,6,5,4,5,4,pendingApproval] },
];

// ─── Formatters ─────────────────────────────────────────────
function fmtCompactSom(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(2).replace('.', ',') + " mlrd";
  if (n >= 1e6) return (n / 1e6).toFixed(0) + " mln";
  if (n >= 1e3) return (n / 1e3).toFixed(0) + " ming";
  return String(n);
}
function fmtSomFull(n) { return window.fmtSom(n) + " so'm"; }

// ─── NOTIFICATIONS (activity feed) ──────────────────────────
const NOTIFS = [
  { id: 'n1', type: 'approval', icon: 'box',   title: "Yangi e'lon tasdiqlash kutmoqda", body: PRODUCTS.find((p) => p.status === 'pending')?.title || "Yangi ofis", time: "5 daqiqa oldin", section: 'products', unread: true, hue: 70 },
  { id: 'n2', type: 'booking',  icon: 'cal',   title: "Yangi bandlov", body: BOOKINGS[0].customer + " · " + BOOKINGS[0].product.title, time: "23 daqiqa oldin", section: 'bookings', unread: true, hue: 200 },
  { id: 'n3', type: 'review',   icon: 'flag',  title: "Sharh belgilandi", body: "Moderatsiya talab qilinadi", time: "1 soat oldin", section: 'reviews', unread: true, hue: 25 },
  { id: 'n4', type: 'payout',   icon: 'wallet',title: "To'lov amalga oshirildi", body: PAYOUTS[0].host.name + " · " + fmtCompactSom(PAYOUTS[0].amount) + " so'm", time: "3 soat oldin", section: 'revenue', unread: false, hue: 155 },
  { id: 'n5', type: 'host',     icon: 'user',  title: "Yangi mezbon ro'yxatdan o'tdi", body: "Otabek Saidov · Loft Group", time: "Bugun, 09:14", section: 'hosts', unread: false, hue: 290 },
  { id: 'n6', type: 'booking',  icon: 'cal',   title: "Bandlov bekor qilindi", body: BOOKINGS.find((b) => b.status === 'cancelled')?.customer || "Mijoz", time: "Kecha, 18:40", section: 'bookings', unread: false, hue: 25 },
];

Object.assign(window, { NOTIFS });

Object.assign(window, {
  AT, PRODUCT_STATUS, BOOKING_STATUS, PAYOUT_STATUS, CAT_META,
  catName, catShort, PRODUCTS, HOSTS, BOOKINGS, REVIEWS, PAYOUTS,
  MONTHS_UZ, revenueSeries, bookingsSeries, byCategory,
  KPIS, totalRevenue, totalBookings, activeBookings, avgOccupancy, pendingApproval, avgRating,
  fmtCompactSom, fmtSomFull,
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
  IconExternal, IconFlag, IconCheck2, IconX2, IconPhone, IconArrowUp, IconRefresh, IconLink, IconDoc, IconShieldCheck,
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
  { id: 'products',  label: () => window.AT.navProducts,  icon: IconBox },
  { id: 'bookings',  label: () => window.AT.navBookings,  icon: IconCal },
  { id: 'hosts',     label: () => window.AT.navHosts,     icon: IconUsers },
  { id: 'customers', label: () => window.AT.navCustomers, icon: IconUser },
  { id: 'revenue',   label: () => window.AT.navRevenue,   icon: IconWallet },
  { id: 'reviews',   label: () => window.AT.navReviews,   icon: IconStar },
];

function Sidebar({ route, setRoute, role, counts }) {
  const badge = { products: counts.pendingProducts, bookings: counts.pendingBookings, reviews: counts.pendingReviews };
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
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
        <PhotoPlaceholder hue={p.hue} label="" radius={10} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ font: `600 13.5px ${window.GO.font}`, color: 'var(--g-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}>{p.title}</div>
        <div style={{ font: `400 12px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 1 }}>{p.id} · {p.district}, {p.city}</div>
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
        sub="Oxirgi 12 oy · mln so'm"
        right={<Segmented value="12m" onChange={() => {}} options={[
          { value: '3m', label: "3 oy" }, { value: '6m', label: "6 oy" }, { value: '12m', label: "12 oy" },
        ]} />}
      />
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 18 }}>
        <div style={{ font: `700 30px ${window.GO.font}`, color: 'var(--g-ink)', letterSpacing: '-0.03em' }}>{window.fmtSom(total)} <span style={{ fontSize: 16, color: 'var(--g-ink-4)', fontWeight: 500 }}>mln so'm</span></div>
        <Delta value={12.4} />
      </div>
      <BarChart data={data} h={tall ? 230 : 180} unit=" mln" fmt={(v) => window.fmtSom(v)} />
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
  return (
    <Card>
      <SectionHead title="Toifalar bandligi" sub="O'rtacha bandlik darajasi" />
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
          <Avatar name={b.customer} size={34} hue={b.cust_hue} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: `600 13px ${window.GO.font}`, color: 'var(--g-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.customer} <span style={{ color: 'var(--g-ink-4)', fontWeight: 400 }}>· {b.company}</span></div>
            <div style={{ font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.product.title}</div>
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

function ApprovalQueuePanel({ onGoProducts, onGoReviews }) {
  const pendP = window.PRODUCTS.filter((p) => p.status === 'pending');
  const flagged = window.REVIEWS.filter((r) => r.state === 'flagged' || r.state === 'pending');
  return (
    <Card>
      <SectionHead title="Tasdiqlash navbati" sub={`${pendP.length + flagged.length} ta amal kutilmoqda`} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {pendP.slice(0, 3).map((p) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, borderRadius: 12, background: 'var(--g-bg)' }}>
            <div style={{ width: 38, height: 38, borderRadius: 9, overflow: 'hidden', flexShrink: 0 }}><PhotoPlaceholder hue={p.hue} label="" radius={9} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
              <div style={{ font: `400 11px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>Yangi e'lon · {p.host}</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <IconBtn title="Tasdiqlash" onClick={() => gorentMutate(() => api.post(`/products/${p.id}/approve`))} style={{ background: 'oklch(0.95 0.05 155)', color: 'oklch(0.5 0.14 155)', width: 30, height: 30 }}><IconCheck2 size={15} /></IconBtn>
              <IconBtn title="Rad etish" onClick={() => gorentMutate(() => api.post(`/products/${p.id}/reject`))} style={{ background: 'oklch(0.96 0.04 25)', color: 'oklch(0.55 0.15 25)', width: 30, height: 30 }}><IconX2 size={15} /></IconBtn>
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

function TopProductsPanel() {
  const top = [...window.PRODUCTS].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const max = top[0].revenue;
  return (
    <Card>
      <SectionHead title="Eng daromadli mahsulotlar" sub="Joriy oy" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {top.map((p, i) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ font: `700 12px ui-monospace, monospace`, color: 'var(--g-ink-4)', width: 16 }}>{i + 1}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 5 }}>
                <span style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>{p.title}</span>
                <span style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink)', flexShrink: 0 }}>{window.fmtCompactSom(p.revenue)}</span>
              </div>
              <ProgressBar value={(p.revenue / max) * 100} color={CAT_COLORS[p.cat]} h={6} />
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
          Salom, Operator — bugun platformada <b style={{ color: 'var(--g-ink)' }}>{window.activeBookings + 124}</b> ta faol bandlov.
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

// admin-products.jsx — Gorent Admin: Products list + detail + add/edit form.

function CategoryFilterBar({ cat, setCat, status, setStatus, view, setView }) {
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
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="adm-select">
          <option value="all">{window.AT.status}: {window.AT.all}</option>
          {Object.entries(window.PRODUCT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <Segmented value={view} onChange={setView} options={[
          { value: 'table', label: '', icon: <IconList size={15} /> },
          { value: 'grid', label: '', icon: <IconGrid size={15} /> },
        ]} />
      </div>
    </div>
  );
}

// ─── Product grid card ──────────────────────────────────────
function ProductGridCard({ p, onClick }) {
  return (
    <Card pad={0} style={{ overflow: 'hidden', cursor: 'pointer' }} onClick={onClick} className="adm-prodcard">
      <div style={{ position: 'relative', aspectRatio: '16/10' }}>
        <PhotoPlaceholder hue={p.hue} label={`${p.city.toLowerCase()} · ${p.district.toLowerCase()}`} radius={0} />
        <div style={{ position: 'absolute', top: 10, left: 10 }}><CatTag cat={p.cat} /></div>
        <div style={{ position: 'absolute', top: 10, right: 10 }}><StatusPill s={p.status} /></div>
      </div>
      <div style={{ padding: 15 }}>
        <div style={{ font: `600 14px ${window.GO.font}`, color: 'var(--g-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
        <div style={{ font: `400 12px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 2 }}>{p.id} · {p.host}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 13 }}>
          <div>
            <div style={{ font: `700 15px ${window.GO.font}`, color: 'var(--g-ink)' }}>{window.fmtCompactSom(p.price)} <span style={{ font: `400 11px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>so'm/oy</span></div>
            <div style={{ display: 'flex', gap: 12, marginTop: 7 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, font: `500 11.5px ${window.GO.font}`, color: 'var(--g-ink-3)' }}><IconStar size={12} /> {p.rating.toFixed(2)}</span>
              <span style={{ font: `500 11.5px ${window.GO.font}`, color: 'var(--g-ink-3)' }}>{p.bookings} band</span>
              <span style={{ font: `500 11.5px ${window.GO.font}`, color: 'var(--g-ink-3)' }}>{p.occ}% band.</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── Products screen ────────────────────────────────────────
function ProductsScreen({ search, openForm, role }) {
  const [cat, setCat] = React.useState('all');
  const [status, setStatus] = React.useState('all');
  const [view, setView] = React.useState('table');
  const [detail, setDetail] = React.useState(null);

  let rows = window.PRODUCTS.filter((p) => (cat === 'all' || p.cat === cat) && (status === 'all' || p.status === status));
  if (role === 'host') rows = rows.filter((_, i) => i % window.HOSTS.length === 0); // host sees own subset
  if (search) rows = rows.filter((p) => (p.title + p.district + p.city + p.host + p.id).toLowerCase().includes(search.toLowerCase()));

  const columns = [
    { key: 'product', label: 'Mahsulot', render: (p) => <ProductCell p={p} /> },
    { key: 'cat', label: window.AT.category, render: (p) => <CatTag cat={p.cat} /> },
    { key: 'price', label: window.AT.price, render: (p) => <MoneyCell n={p.price} sub="oyiga" /> },
    { key: 'bookings', label: window.AT.bookings, align: 'center', render: (p) => <span style={{ font: `600 13px ${window.GO.font}`, color: 'var(--g-ink)' }}>{p.bookings}</span> },
    { key: 'occ', label: window.AT.occupancy, w: 120, render: (p) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 54 }}><ProgressBar value={p.occ} color={window.CAT_COLORS[p.cat]} h={5} /></div>
        <span style={{ font: `600 12px ${window.GO.font}`, color: 'var(--g-ink-3)' }}>{p.occ}%</span>
      </div>
    ) },
    { key: 'rating', label: window.AT.rating, align: 'center', render: (p) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink)' }}><IconStar size={12} /> {p.rating.toFixed(2)}</span> },
    { key: 'status', label: window.AT.status, render: (p) => <StatusPill s={p.status} /> },
    { key: 'act', label: '', align: 'right', render: (p) => (
      <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
        <IconBtn title={window.AT.view} onClick={() => setDetail(p)}><IconEye size={16} /></IconBtn>
        <IconBtn title={window.AT.edit} onClick={() => openForm(p)}><IconEdit size={16} /></IconBtn>
        <IconBtn title="Boshqa"><IconDots size={16} /></IconBtn>
      </div>
    ) },
  ];

  return (
    <div>
      <CategoryFilterBar cat={cat} setCat={setCat} status={status} setStatus={setStatus} view={view} setView={setView} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ font: `400 13px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>{rows.length} ta mahsulot</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn kind="ghost" sm><IconDownload size={15} /> {window.AT.export}</Btn>
          <Btn kind="primary" sm onClick={() => openForm(null)}><IconPlus size={15} /> {window.AT.addProduct}</Btn>
        </div>
      </div>

      {view === 'table'
        ? <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} onRow={(p) => setDetail(p)} />
        : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {rows.map((p) => <ProductGridCard key={p.id} p={p} onClick={() => setDetail(p)} />)}
          </div>}

      <ProductDetailDrawer p={detail} onClose={() => setDetail(null)} onEdit={(p) => { setDetail(null); openForm(p); }} />
    </div>
  );
}

// ─── Detail drawer ──────────────────────────────────────────
function ProductDetailDrawer({ p, onClose, onEdit }) {
  return (
    <Drawer open={!!p} onClose={onClose} width={580}>
      {p && (
        <>
          <div style={{ position: 'relative', height: 220, flexShrink: 0 }}>
            <PhotoPlaceholder hue={p.hue} label={`${p.city.toLowerCase()} · ${p.district.toLowerCase()}`} radius={0} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.25), transparent 40%)' }} />
            <button onClick={onClose} className="adm-iconbtn" style={{ position: 'absolute', top: 16, left: 16, width: 34, height: 34, borderRadius: 999, background: 'rgba(255,255,255,0.9)', border: 0, display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--g-ink)' }}><IconClose size={17} /></button>
            <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 8 }}><CatTag cat={p.cat} /><StatusPill s={p.status} /></div>
          </div>

          <div className="adm-scroll" style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
              <div>
                <div style={{ font: `700 19px ${window.GO.font}`, color: 'var(--g-ink)', letterSpacing: '-0.02em' }}>{p.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, font: `400 13px ${window.GO.font}`, color: 'var(--g-ink-3)' }}>
                  <IconPin size={14} /> {p.district}, {p.city} · <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{p.id}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ font: `700 20px ${window.GO.font}`, color: 'var(--g-ink)' }}>{window.fmtSom(p.price)}</div>
                <div style={{ font: `400 12px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>so'm / oy</div>
              </div>
            </div>

            {/* Mini stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 20 }}>
              {[
                { l: 'Bandlovlar', v: p.bookings },
                { l: 'Bandlik', v: p.occ + '%' },
                { l: 'Ko\u2019rishlar', v: window.fmtCompactSom(p.views) },
                { l: 'Baho', v: p.rating.toFixed(2) },
              ].map((s) => (
                <div key={s.l} style={{ background: 'var(--g-bg)', borderRadius: 12, padding: '13px 14px' }}>
                  <div style={{ font: `700 18px ${window.GO.font}`, color: 'var(--g-ink)', letterSpacing: '-0.02em' }}>{s.v}</div>
                  <div style={{ font: `500 11px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 2 }}>{s.l}</div>
                </div>
              ))}
            </div>

            {/* Specs */}
            <div style={{ marginTop: 22 }}>
              <div style={{ font: `600 13px ${window.GO.font}`, color: 'var(--g-ink)', marginBottom: 12 }}>Xususiyatlar</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
                {[
                  ['Toifa', window.catName(p.cat)],
                  ['Maydoni', p.cat === 'virtual' ? '—' : `${p.m2} m²`],
                  ['Sig\u2019imi', `${p.cap} ${window.T.people}`],
                  ['Mezbon', p.host],
                  ['Tasdiqlangan', p.verified ? 'Ha' : 'Yo\u2019q'],
                  ['Qo\u2019shilgan', p.createdLabel],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--g-line)', paddingBottom: 8 }}>
                    <span style={{ font: `400 13px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>{k}</span>
                    <span style={{ font: `600 13px ${window.GO.font}`, color: 'var(--g-ink)' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Amenities */}
            <div style={{ marginTop: 22 }}>
              <div style={{ font: `600 13px ${window.GO.font}`, color: 'var(--g-ink)', marginBottom: 12 }}>Imkoniyatlar</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {window.AMENITIES.slice(0, 6).map((a) => (
                  <span key={a.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 11px', borderRadius: 999, background: 'var(--g-bg-2)', font: `500 12px ${window.GO.font}`, color: 'var(--g-ink-2)' }}>
                    <IconCheck size={13} /> {a.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Official document integration — virtual office only */}
            {p.cat === 'virtual' && <VirtualOfficeIntegration p={p} />}
          </div>

          {/* Footer actions */}
          <div style={{ display: 'flex', gap: 10, padding: '16px 24px', borderTop: '1px solid var(--g-line)', background: 'var(--g-card)', flexShrink: 0 }}>
            {p.status === 'pending'
              ? <><Btn kind="primary" style={{ flex: 1 }} onClick={async () => { await gorentMutate(() => api.post(`/products/${p.id}/approve`)); onClose(); }}><IconCheck2 size={16} /> {window.AT.approve}</Btn><Btn kind="danger" style={{ flex: 1 }} onClick={async () => { await gorentMutate(() => api.post(`/products/${p.id}/reject`)); onClose(); }}><IconX2 size={16} /> {window.AT.reject}</Btn></>
              : <><Btn kind="ghost" style={{ flex: 1 }} onClick={() => onEdit(p)}><IconEdit size={16} /> {window.AT.edit}</Btn><Btn kind="primary" style={{ flex: 1 }}><IconExternal size={16} /> Saytda ochish</Btn></>}
          </div>
        </>
      )}
    </Drawer>
  );
}

// ─── Add / edit form (full page) ────────────────────────────
function ProductForm({ product, onClose, onSave }) {
  const isEdit = !!product;
  const [f, setF] = React.useState(() => product || {
    title: '', cat: 'private', city: 'Toshkent', district: 'Yunusobod', m2: '', cap: '', price: '', period: 'month', status: 'draft',
  });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const Label = ({ children }) => <div style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink-2)', marginBottom: 7 }}>{children}</div>;

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
              <Label>Sarlavha</Label>
              <input className="adm-input" value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="Masalan: Yunusobod biznes minorasi, 7-qavat" />
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
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
            </div>
          </Card>

          <Card>
            <div style={{ font: `700 15px ${window.GO.font}`, color: 'var(--g-ink)', marginBottom: 16 }}>O'lcham va narx</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 16 }}>
              <div>
                <Label>Maydoni (m²)</Label>
                <input className="adm-input" type="number" value={f.m2} onChange={(e) => set('m2', e.target.value)} placeholder="64" disabled={f.cat === 'virtual'} />
              </div>
              <div>
                <Label>Sig'imi (odam)</Label>
                <input className="adm-input" type="number" value={f.cap} onChange={(e) => set('cap', e.target.value)} placeholder="8" />
              </div>
              <div>
                <Label>To'lov davri</Label>
                <select className="adm-select" style={{ width: '100%' }} value={f.period} onChange={(e) => set('period', e.target.value)}>
                  <option value="month">Oyiga</option><option value="day">Kuniga</option><option value="hour">Soatiga</option><option value="desk">Stol/oy</option>
                </select>
              </div>
            </div>
            <div>
              <Label>Narx (so'm)</Label>
              <div style={{ position: 'relative' }}>
                <input className="adm-input" type="number" value={f.price} onChange={(e) => set('price', e.target.value)} placeholder="12500000" style={{ paddingRight: 70 }} />
                <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', font: `500 13px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>so'm</span>
              </div>
            </div>
          </Card>

          <Card>
            <div style={{ font: `700 15px ${window.GO.font}`, color: 'var(--g-ink)', marginBottom: 16 }}>Imkoniyatlar</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
              {window.AMENITIES.map((a, i) => {
                const on = i < 5;
                return (
                  <label key={a.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 13px', borderRadius: 10, cursor: 'pointer',
                    border: '1px solid', borderColor: on ? 'var(--g-brand)' : 'var(--g-line)', background: on ? 'var(--g-brand-soft)' : 'var(--g-card)',
                    color: on ? 'var(--g-brand-ink)' : 'var(--g-ink-3)', font: `500 12.5px ${window.GO.font}` }}>
                    <input type="checkbox" defaultChecked={on} style={{ accentColor: 'var(--g-brand)' }} /> {a.name}
                  </label>
                );
              })}
            </div>
          </Card>

          {/* Official document integration — virtual office only */}
          {f.cat === 'virtual' && <VirtualIntegrationForm />}
        </div>

        {/* Right: media + publish */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, position: 'sticky', top: 0 }}>
          <Card>
            <div style={{ font: `700 14px ${window.GO.font}`, color: 'var(--g-ink)', marginBottom: 14 }}>Rasmlar</div>
            <div style={{ aspectRatio: '4/3', borderRadius: 12, overflow: 'hidden', marginBottom: 10 }}>
              <PhotoPlaceholder hue={window.CAT_META[f.cat]?.hue || 30} label="asosiy rasm" radius={12} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ aspectRatio: '1', borderRadius: 9, border: '1.5px dashed var(--g-line)', display: 'grid', placeItems: 'center', color: 'var(--g-ink-4)', cursor: 'pointer' }}>
                  <IconPlus size={18} />
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div style={{ font: `700 14px ${window.GO.font}`, color: 'var(--g-ink)', marginBottom: 14 }}>Nashr</div>
            <Label>Holat</Label>
            <select className="adm-select" style={{ width: '100%', marginBottom: 14 }} value={f.status} onChange={(e) => set('status', e.target.value)}>
              {Object.entries(window.PRODUCT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 0', font: `500 13px ${window.GO.font}`, color: 'var(--g-ink-2)' }}>
              <input type="checkbox" defaultChecked style={{ accentColor: 'var(--g-brand)' }} /> Tezkor band qilish
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '4px 0 12px', font: `500 13px ${window.GO.font}`, color: 'var(--g-ink-2)' }}>
              <input type="checkbox" defaultChecked style={{ accentColor: 'var(--g-brand)' }} /> Tasdiqlangan ob'ekt
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 4 }}>
              <Btn kind="primary" onClick={async () => {
                const payload = {
                  title: f.title, cat: f.cat, city: f.city, district: f.district,
                  m2: f.m2 === '' || f.m2 == null ? undefined : Number(f.m2),
                  cap: f.cap === '' || f.cap == null ? undefined : Number(f.cap),
                  price: Number(f.price) || 0, period: f.period, status: f.status,
                };
                const ok = await gorentMutate(() => isEdit ? api.put(`/products/${product.id}`, payload) : api.post('/products', payload));
                if (ok) onSave();
              }} style={{ justifyContent: 'center' }}>{isEdit ? window.AT.save : 'Nashr qilish'}</Btn>
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

// admin-sections.jsx — Gorent Admin: Bookings, Hosts, Customers, Revenue, Reviews.

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
function BookingDetailDrawer({ b, onClose }) {
  if (!b) return <Drawer open={false} onClose={onClose} width={520}><div /></Drawer>;
  const fee = Math.round(b.total * 0.12);
  const payout = b.total - fee;
  const steps = [
    { label: "So'rov yuborilgan", date: b.start, done: true },
    { label: "Mezbon tasdiqladi", date: b.start, done: b.status !== 'pending' },
    { label: "To'lov amalga oshirildi", date: b.start, done: ['active', 'confirmed', 'completed'].includes(b.status) },
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
        {/* Product */}
        <div style={{ display: 'flex', gap: 13, padding: 14, borderRadius: 13, background: 'var(--g-bg)', marginBottom: 18 }}>
          <div style={{ width: 56, height: 56, borderRadius: 11, overflow: 'hidden', flexShrink: 0 }}><PhotoPlaceholder hue={b.product.hue} label="" radius={11} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: `600 14px ${window.GO.font}`, color: 'var(--g-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.product.title}</div>
            <div style={{ font: `400 12px ${window.GO.font}`, color: 'var(--g-ink-4)', margin: '3px 0 7px' }}>{b.product.district}, {b.product.city}</div>
            <CatTag cat={b.product.cat} />
          </div>
        </div>

        {/* Customer */}
        <div style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink-2)', marginBottom: 10 }}>Mijoz</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <Avatar name={b.customer} size={42} hue={b.cust_hue} />
          <div style={{ flex: 1 }}>
            <div style={{ font: `600 13.5px ${window.GO.font}`, color: 'var(--g-ink)' }}>{b.customer}</div>
            <div style={{ font: `400 12px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>{b.company} · +{b.phone}</div>
          </div>
          <IconBtn title="Xabar" style={{ border: '1px solid var(--g-line)' }}><IconMessage size={16} /></IconBtn>
          <IconBtn title={`+${b.phone}`} onClick={() => window.open(`tel:+${b.phone}`)} style={{ border: '1px solid var(--g-line)' }}><IconPhone size={16} /></IconBtn>
        </div>

        {/* Period + payment grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          {[['Boshlanish', b.start], ['Muddat', `${b.months} oy`], ['Oylik narx', window.fmtCompactSom(b.product.price) + " so'm"], ['To\u2019lov usuli', 'UZCARD']].map(([k, v]) => (
            <div key={k} style={{ background: 'var(--g-bg)', borderRadius: 11, padding: '11px 13px' }}>
              <div style={{ font: `400 11px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>{k}</div>
              <div style={{ font: `600 13.5px ${window.GO.font}`, color: 'var(--g-ink)', marginTop: 3 }}>{v}</div>
            </div>
          ))}
        </div>

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
          : <><Btn kind="ghost" style={{ flex: 1, justifyContent: 'center' }}><IconDownload size={16} /> Chek</Btn><Btn kind="primary" style={{ flex: 1, justifyContent: 'center' }}><IconExternal size={16} /> Mahsulotni ochish</Btn></>}
      </div>
    </Drawer>
  );
}

function BookingsScreen({ search, role }) {
  const [status, setStatus] = React.useState('all');
  const [detail, setDetail] = React.useState(null);
  let rows = window.BOOKINGS.filter((b) => status === 'all' || b.status === status);
  if (role === 'host') rows = rows.filter((_, i) => i % 2 === 0);
  if (search) rows = rows.filter((b) => (b.id + b.customer + b.company + b.product.title).toLowerCase().includes(search.toLowerCase()));
  const counts = { all: window.BOOKINGS.length };
  Object.keys(window.BOOKING_STATUS).forEach((k) => counts[k] = window.BOOKINGS.filter((b) => b.status === k).length);

  const columns = [
    { key: 'id', label: 'ID', render: (b) => <span style={{ fontFamily: 'ui-monospace, monospace', font: `600 12px ui-monospace, monospace`, color: 'var(--g-ink-2)' }}>{b.id}</span> },
    { key: 'cust', label: 'Mijoz', render: (b) => <PersonCell name={b.customer} sub={b.company} hue={b.cust_hue} /> },
    { key: 'prod', label: 'Mahsulot', render: (b) => (
      <div style={{ minWidth: 0 }}>
        <div style={{ font: `600 13px ${window.GO.font}`, color: 'var(--g-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>{b.product.title}</div>
        <div style={{ marginTop: 4 }}><CatTag cat={b.product.cat} /></div>
      </div>
    ) },
    { key: 'period', label: 'Muddat', render: (b) => (
      <div>
        <div style={{ font: `500 13px ${window.GO.font}`, color: 'var(--g-ink)' }}>{b.start}</div>
        <div style={{ font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>{b.months} oy</div>
      </div>
    ) },
    { key: 'total', label: 'Summa', align: 'right', render: (b) => <MoneyCell n={b.total} /> },
    { key: 'status', label: window.AT.status, render: (b) => <StatusPill s={b.status} dict={window.BOOKING_STATUS} /> },
    { key: 'act', label: '', align: 'right', render: (b) => (
      <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
        {b.status === 'pending' && <IconBtn title="Tasdiqlash" onClick={() => gorentMutate(() => api.post(`/bookings/${b.id}/approve`))} style={{ color: 'oklch(0.52 0.13 155)' }}><IconCheck2 size={16} /></IconBtn>}
        <IconBtn title="Ko'rish" onClick={() => setDetail(b)}><IconEye size={16} /></IconBtn>
        <IconBtn title="Boshqa"><IconDots size={16} /></IconBtn>
      </div>
    ) },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
        <StatusChips dict={window.BOOKING_STATUS} value={status} setValue={setStatus} counts={counts} />
        <Btn kind="ghost" sm><IconDownload size={15} /> {window.AT.export}</Btn>
      </div>
      <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} onRow={(b) => setDetail(b)} />
      <BookingDetailDrawer b={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

// ═══ HOSTS ══════════════════════════════════════════════════
function HostDetailDrawer({ h, onClose, openProduct }) {
  if (!h) return <Drawer open={false} onClose={onClose} width={560}><div /></Drawer>;
  const listings = window.PRODUCTS.filter((_, pi) => pi % window.HOSTS.length === window.HOSTS.indexOf(h));
  const payout = window.PAYOUTS.find((p) => p.host.id === h.id);
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
          </div>
          <IconBtn title="Xabar" style={{ border: '1px solid var(--g-line)' }}><IconMessage size={16} /></IconBtn>
        </div>

        {/* Stat tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 22 }}>
          {[
            { l: "E\u2019lonlar", v: h.listings },
            { l: 'Bandlovlar', v: h.bookings },
            { l: 'Baho', v: h.rating.toFixed(2) },
            { l: "Qo\u2019shilgan", v: h.joined },
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

        {/* Listings */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink-2)' }}>Mezbon e'lonlari</div>
          <span style={{ font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>{listings.length} ta</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {listings.map((p) => (
            <div key={p.id} className="adm-row" onClick={() => openProduct && openProduct(p)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, borderRadius: 12, background: 'var(--g-bg)', cursor: openProduct ? 'pointer' : 'default' }}>
              <div style={{ width: 42, height: 42, borderRadius: 9, overflow: 'hidden', flexShrink: 0 }}><PhotoPlaceholder hue={p.hue} label="" radius={9} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}><CatTag cat={p.cat} /><StatusPill s={p.status} size="sm" /></div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink)' }}>{window.fmtCompactSom(p.price)}</div>
                <div style={{ font: `400 11px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>{p.bookings} band</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, padding: '16px 22px', borderTop: '1px solid var(--g-line)', background: 'var(--g-card)', flexShrink: 0 }}>
        {h.verified
          ? <><Btn kind="ghost" style={{ flex: 1, justifyContent: 'center' }}><IconMessage size={16} /> Xabar yuborish</Btn><Btn kind="primary" style={{ flex: 1, justifyContent: 'center' }}><IconExternal size={16} /> Profilni ochish</Btn></>
          : <><Btn kind="primary" style={{ flex: 1, justifyContent: 'center' }} onClick={async () => { await gorentMutate(() => api.post(`/hosts/${h.id}/approve`)); onClose(); }}><IconCheck2 size={16} /> Mezbonni tasdiqlash</Btn><Btn kind="danger" style={{ flex: 1, justifyContent: 'center' }} onClick={async () => { await gorentMutate(() => api.post(`/hosts/${h.id}/reject`)); onClose(); }}><IconX2 size={16} /> Rad etish</Btn></>}
      </div>
    </Drawer>
  );
}

function HostsScreen({ search }) {
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
    { key: 'act', label: '', align: 'right', render: (h) => <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}><IconBtn onClick={() => setDetail(h)}><IconEye size={16} /></IconBtn><IconBtn><IconDots size={16} /></IconBtn></div> },
  ];
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 18 }}>
        <StatCard icon={<IconUsers size={17} />} label="Jami mezbonlar" value={String(window.HOSTS.length)} unit="ta" delta={6.2} />
        <StatCard icon={<IconShield size={17} />} label="Tasdiqlangan" value={String(window.HOSTS.filter((h) => h.verified).length)} unit="ta" delta={4.0} />
        <StatCard icon={<IconStar size={17} />} label="Yulduz mezbonlar" value={String(window.HOSTS.filter((h) => h.super).length)} unit="ta" delta={2.1} />
        <StatCard icon={<IconClock size={17} />} label="Tasdiq kutmoqda" value={String(window.HOSTS.filter((h) => !h.verified).length)} unit="ta" delta={-1} deltaInvert />
      </div>
      <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} onRow={(h) => setDetail(h)} />
      <HostDetailDrawer h={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

// ═══ CUSTOMERS ══════════════════════════════════════════════
function CustomerDetailDrawer({ c, onClose }) {
  if (!c) return <Drawer open={false} onClose={onClose} width={520}><div /></Drawer>;
  const myBookings = window.BOOKINGS.filter((b) => b.customer === c.name);
  const regular = c.bookings > 1;
  return (
    <Drawer open={!!c} onClose={onClose} width={520}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--g-line)', flexShrink: 0 }}>
        <button onClick={onClose} className="adm-iconbtn" style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--g-bg-2)', border: 0, display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--g-ink)' }}><IconClose size={17} /></button>
        {regular
          ? <span style={{ font: `600 11.5px ${window.GO.font}`, color: 'var(--g-brand-ink)', background: 'var(--g-brand-soft)', padding: '5px 12px', borderRadius: 999 }}>Doimiy mijoz</span>
          : <span style={{ font: `600 11.5px ${window.GO.font}`, color: 'var(--g-ink-3)', background: 'var(--g-bg-2)', padding: '5px 12px', borderRadius: 999 }}>Yangi mijoz</span>}
      </div>

      <div className="adm-scroll" style={{ flex: 1, overflowY: 'auto', padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <Avatar name={c.name} size={56} hue={c.hue} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: `700 18px ${window.GO.font}`, color: 'var(--g-ink)', letterSpacing: '-0.02em' }}>{c.name}</div>
            <div style={{ font: `400 13px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 3 }}>{c.company} · +{c.phone} · {c.city}</div>
          </div>
          <IconBtn title="Xabar" style={{ border: '1px solid var(--g-line)' }}><IconMessage size={16} /></IconBtn>
          <IconBtn title="Qo'ng'iroq" style={{ border: '1px solid var(--g-line)' }}><IconPhone size={16} /></IconBtn>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 22 }}>
          {[
            { l: 'Bandlovlar', v: c.bookings },
            { l: 'Sarflangan', v: window.fmtCompactSom(c.spent) },
            { l: "O\u2019rtacha chek", v: window.fmtCompactSom(Math.round(c.spent / c.bookings)) },
          ].map((s) => (
            <div key={s.l} style={{ background: 'var(--g-bg)', borderRadius: 12, padding: '13px 14px' }}>
              <div style={{ font: `700 17px ${window.GO.font}`, color: 'var(--g-ink)', letterSpacing: '-0.02em' }}>{s.v}</div>
              <div style={{ font: `500 11px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink-2)' }}>Bandlovlar tarixi</div>
          <span style={{ font: `400 11.5px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>{myBookings.length} ta</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {myBookings.map((b) => (
            <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, borderRadius: 12, background: 'var(--g-bg)' }}>
              <div style={{ width: 42, height: 42, borderRadius: 9, overflow: 'hidden', flexShrink: 0 }}><PhotoPlaceholder hue={b.product.hue} label="" radius={9} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.product.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <span style={{ font: `400 11px ui-monospace, monospace`, color: 'var(--g-ink-4)' }}>{b.id}</span>
                  <StatusPill s={b.status} dict={window.BOOKING_STATUS} size="sm" />
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ font: `600 12.5px ${window.GO.font}`, color: 'var(--g-ink)' }}>{window.fmtCompactSom(b.total)}</div>
                <div style={{ font: `400 11px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>{b.start}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, padding: '16px 22px', borderTop: '1px solid var(--g-line)', background: 'var(--g-card)', flexShrink: 0 }}>
        <Btn kind="ghost" style={{ flex: 1, justifyContent: 'center' }}><IconMessage size={16} /> Xabar yuborish</Btn>
        <Btn kind="primary" style={{ flex: 1, justifyContent: 'center' }}><IconExternal size={16} /> To'liq profil</Btn>
      </div>
    </Drawer>
  );
}

function CustomersScreen({ search }) {
  const [detail, setDetail] = React.useState(null);
  // Aggregate customers from bookings
  const map = {};
  window.BOOKINGS.forEach((b) => {
    if (!map[b.customer]) map[b.customer] = { name: b.customer, company: b.company, hue: b.cust_hue, bookings: 0, spent: 0, city: b.product.city };
    map[b.customer].bookings += 1; map[b.customer].spent += b.total;
  });
  let rows = Object.values(map);
  if (search) rows = rows.filter((c) => (c.name + c.company).toLowerCase().includes(search.toLowerCase()));
  const columns = [
    { key: 'cust', label: 'Mijoz', render: (c) => <PersonCell name={c.name} sub={c.company} hue={c.hue} /> },
    { key: 'city', label: 'Shahar', render: (c) => <span style={{ font: `500 13px ${window.GO.font}`, color: 'var(--g-ink-2)' }}>{c.city}</span> },
    { key: 'bookings', label: 'Bandlovlar', align: 'center', render: (c) => <span style={{ font: `600 13px ${window.GO.font}`, color: 'var(--g-ink)' }}>{c.bookings}</span> },
    { key: 'spent', label: 'Sarflangan', align: 'right', render: (c) => <MoneyCell n={c.spent} /> },
    { key: 'type', label: 'Toifa', render: (c) => c.bookings > 1
      ? <span style={{ font: `600 11.5px ${window.GO.font}`, color: 'var(--g-brand-ink)', background: 'var(--g-brand-soft)', padding: '4px 10px', borderRadius: 999 }}>Doimiy mijoz</span>
      : <span style={{ font: `600 11.5px ${window.GO.font}`, color: 'var(--g-ink-3)', background: 'var(--g-bg-2)', padding: '4px 10px', borderRadius: 999 }}>Yangi</span> },
    { key: 'act', label: '', align: 'right', render: (c) => <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}><IconBtn onClick={() => setDetail(c)}><IconEye size={16} /></IconBtn><IconBtn><IconMessage size={16} /></IconBtn></div> },
  ];
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 18 }}>
        <StatCard icon={<IconUser size={17} />} label="Jami mijozlar" value={String(rows.length + 318)} unit="ta" delta={11.3} />
        <StatCard icon={<IconHome size={17} />} label="Doimiy mijozlar" value={String(rows.filter((c) => c.bookings > 1).length + 42)} unit="ta" delta={5.4} />
        <StatCard icon={<IconCal size={17} />} label="O'rtacha muddat" value="4,2" unit="oy" delta={1.8} />
        <StatCard icon={<IconWallet size={17} />} label="O'rtacha chek" value={window.fmtCompactSom(Math.round(window.BOOKINGS.reduce((s, b) => s + b.total, 0) / window.BOOKINGS.length))} unit="so'm" delta={3.2} />
      </div>
      <DataTable columns={columns} rows={rows} rowKey={(r) => r.name} onRow={(c) => setDetail(c)} />
      <CustomerDetailDrawer c={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

// ═══ REVENUE & PAYOUTS ══════════════════════════════════════
function RevenueScreen({ search }) {
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
        <StatCard icon={<IconWallet size={17} />} label="Yalpi aylanma" value={window.fmtCompactSom(window.totalRevenue)} unit="so'm" delta={12.4} spark={window.revenueSeries.map((d) => d.value)} />
        <StatCard icon={<IconChart size={17} />} label="Platforma komissiyasi" value={window.fmtCompactSom(platformFee)} unit="so'm" delta={12.4} spark={window.revenueSeries.map((d) => d.value * 0.12)} />
        <StatCard icon={<IconCheck2 size={17} />} label="To'langan" value={window.fmtCompactSom(window.PAYOUTS.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0))} unit="so'm" delta={8.0} />
        <StatCard icon={<IconClock size={17} />} label="Kutilayotgan" value={window.fmtCompactSom(window.PAYOUTS.filter((p) => p.status !== 'paid').reduce((s, p) => s + p.amount, 0))} unit="so'm" delta={-3} deltaInvert />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 16, marginBottom: 18 }}>
        <Card>
          <SectionHead title="Oylik aylanma" sub="Daromad va platforma komissiyasi · mln so'm" />
          <BarChart data={window.revenueSeries} h={200} unit=" mln" fmt={(v) => window.fmtSom(v)} />
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

      <SectionHead title="To'lovlar tarixi" right={<Btn kind="ghost" sm><IconDownload size={15} /> {window.AT.export}</Btn>} />
      <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} />
    </div>
  );
}

// ═══ REVIEWS ════════════════════════════════════════════════
function ReviewsScreen({ search }) {
  const [filter, setFilter] = React.useState('all');
  const dict = { published: { label: 'Nashr etilgan', hue: 155 }, pending: { label: 'Kutilmoqda', hue: 70 }, flagged: { label: 'Belgilangan', hue: 25 } };
  let rows = window.REVIEWS.filter((r) => filter === 'all' || r.state === filter);
  if (search) rows = rows.filter((r) => (r.author + r.text + r.product.title).toLowerCase().includes(search.toLowerCase()));
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
              <IconBuilding size={13} /> <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.product.title}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid var(--g-line)' }}>
              <StatusPill s={r.state} dict={dict} size="sm" />
              <div style={{ display: 'flex', gap: 7 }}>
                {r.state !== 'published' && <Btn kind="soft" sm onClick={() => gorentMutate(() => api.post(`/reviews/${r.id}/approve`))}><IconCheck2 size={14} /> Tasdiqlash</Btn>}
                {r.state === 'flagged'
                  ? <Btn kind="danger" sm onClick={() => gorentMutate(() => api.del(`/reviews/${r.id}`))}><IconTrash size={14} /> O'chirish</Btn>
                  : <Btn kind="ghost" sm onClick={() => gorentMutate(() => api.post(`/reviews/${r.id}/flag`))}><IconFlag size={14} /> Belgilash</Btn>}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { BookingsScreen, HostsScreen, CustomersScreen, RevenueScreen, ReviewsScreen, StatusChips });

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
  const initN = (window.SETTINGS && window.SETTINGS.notifications) || {};
  const [n, setN] = React.useState({
    smsEnabled: initN.smsEnabled ?? false,
    smsOnBookingApproved: initN.smsOnBookingApproved ?? true,
    smsOnBookingRejected: initN.smsOnBookingRejected ?? true,
  });
  const tn = (k) => setN((p) => ({ ...p, [k]: !p[k] }));
  const save = () => gorentMutate(() => api.put('/settings', { platform: s, notifications: n }));
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
          <Row title="Bandlov bekor qilinganda" sub="Bandlov bekor qilinganda mijozga SMS yuboriladi." last>
            <Toggle on={n.smsEnabled && n.smsOnBookingRejected} onClick={() => tn('smsOnBookingRejected')} />
          </Row>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
          <Btn kind="primary" onClick={save}>O'zgarishlarni saqlash</Btn>
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
  const team = [
    { name: "Admin Operator", email: "operator@gorent.uz", role: "Super-admin", hue: 155 },
    { name: "Madina Yusupova", email: "madina@gorent.uz", role: "Moderator", hue: 320 },
    { name: "Jahongir Aliyev", email: "jahongir@gorent.uz", role: "Moliya", hue: 220 },
    { name: "Dilshod Karimov", email: "dilshod@gorent.uz", role: "Qo'llab-quvvatlash", hue: 35 },
  ];
  const roleHue = { 'Super-admin': 155, 'Moderator': 268, 'Moliya': 220, "Qo'llab-quvvatlash": 35 };
  return (
    <Card pad={0}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px' }}>
        <div>
          <div style={{ font: `700 15px ${window.GO.font}`, color: 'var(--g-ink)' }}>Jamoa a'zolari</div>
          <div style={{ font: `400 12px ${window.GO.font}`, color: 'var(--g-ink-4)', marginTop: 2 }}>{team.length} ta a'zo · rollar va ruxsatlar</div>
        </div>
        <Btn kind="primary" sm><IconPlus size={15} /> A'zo taklif qilish</Btn>
      </div>
      {team.map((m, i) => (
        <div key={m.email} className="adm-row" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 20px', borderTop: '1px solid var(--g-line)' }}>
          <Avatar name={m.name} size={38} hue={m.hue} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: `600 13.5px ${window.GO.font}`, color: 'var(--g-ink)' }}>{m.name}</div>
            <div style={{ font: `400 12px ${window.GO.font}`, color: 'var(--g-ink-4)' }}>{m.email}</div>
          </div>
          <span style={{ font: `600 11.5px ${window.GO.font}`, color: `oklch(0.42 0.12 ${roleHue[m.role]})`, background: `oklch(0.95 0.04 ${roleHue[m.role]})`, padding: '5px 12px', borderRadius: 999 }}>{m.role}</span>
          <IconBtn title="Boshqa"><IconDots size={16} /></IconBtn>
        </div>
      ))}
    </Card>
  );
}

function SettingsScreen() {
  const tabs = [
    { id: 'platform', label: "Platforma" },
    { id: 'commission', label: "Komissiya" },
    { id: 'payouts', label: "To'lovlar" },
    { id: 'integrations', label: "Integratsiyalar" },
    { id: 'team', label: "Jamoa" },
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
  products:  { title: () => window.AT.navProducts,  sub: () => `${window.PRODUCTS.length} ta ob'ekt · 4 toifa` },
  bookings:  { title: () => window.AT.navBookings,  sub: () => `${window.BOOKINGS.length} ta bandlov` },
  hosts:     { title: () => window.AT.navHosts,     sub: () => `${window.HOSTS.length} ta mezbon` },
  customers: { title: () => window.AT.navCustomers, sub: () => "Mijozlar bazasi va segmentlar" },
  revenue:   { title: () => "Daromad va to'lovlar", sub: () => "Aylanma, komissiya va mezbon to'lovlari" },
  reviews:   { title: () => "Sharhlar va moderatsiya", sub: () => `${window.REVIEWS.length} ta sharh` },
  settings:  { title: () => window.AT.navSettings, sub: () => "Platforma, komissiya, to'lovlar va integratsiyalar" },
};

function AdminApp() {
  const [t, setTweak] = useTweaks(ADMIN_TWEAKS);
  React.useEffect(() => { window.__tweaks = t; }, [t]);

  const [route, setRoute] = React.useState({ section: 'overview' });
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

  const counts = {
    pendingProducts: window.PRODUCTS.filter((p) => p.status === 'pending').length,
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
      case 'bookings':  return <BookingsScreen search={search} role={role} />;
      case 'hosts':     return <HostsScreen search={search} />;
      case 'customers': return <CustomersScreen search={search} />;
      case 'revenue':   return <RevenueScreen search={search} />;
      case 'reviews':   return <ReviewsScreen search={search} />;
      case 'settings':  return <SettingsScreen />;
      default: return null;
    }
  }

  const topActions = route.section === 'products'
    ? <Btn kind="primary" sm onClick={() => setFormOpen({ product: null })}><IconPlus size={15} /> {window.AT.addProduct}</Btn>
    : null;

  const formTitle = formOpen ? (formOpen.product ? "Mahsulotni tahrirlash" : "Yangi mahsulot") : null;

  return (
    <div data-density={t.density} style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--g-bg)' }}>
      <ThemedSidebar bg={sidebarBg} theme={t.sidebar} route={route} setRoute={setRoute} role={role} counts={counts} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100%' }}>
        <Topbar
          title={formTitle || meta.title()}
          sub={formOpen ? "Barcha maydonlarni to'ldiring" : meta.sub()}
          role={role} onRole={setRole}
          search={search} setSearch={setSearch}
          actions={formOpen ? null : topActions}
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
  const badge = { products: counts.pendingProducts, bookings: counts.pendingBookings, reviews: counts.pendingReviews };
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
