import { CSS } from './styles.js';
import { SLOTS, SECTIONS, DEFAULT_SHORTCUTS, HIDDEN_BY_DEFAULT, TAG_KEYS, COLORS, MODELS, DEFAULT_MODEL, detectEntities, findTeslaVehicle } from './slots.js';
import { t, lang } from './i18n.js';
import './editor.js';
import { CarScene } from './scene.js';

export const VERSION = '1.1.4';
const modelInfo = key => MODELS[key] || MODELS[DEFAULT_MODEL];
const modelUrl = m => new URL('./' + m.file, import.meta.url).href;
const BAD = new Set(['unavailable', 'unknown', '', null, undefined]);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// mistura de cores (#rrggbb)
function mix(a, b, k) {
  const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join('');
}
// fundo do palco a condizer com a pintura
function hsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0;
  if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
  return [h, s];
}
function bgFor(paint, dark) {
  if (dark) {
    if (!paint.vivid) return { center: '#2e2f33', mid: '#1c1d20', edge: '#0e0e10' };
    return { center: mix(paint.hex, '#1a1a1c', .38), mid: mix(paint.hex, '#0e0e10', .72), edge: '#09090a' };
  }
  if (!paint.vivid) return { center: '#f7f8fa', mid: '#e8eaed', edge: '#d3d6db' };
  // cores fortes no tema claro: a própria cor, viva (nada de rosa/azul-bebé)
  // saturação contida e luz baixa: lê-se vermelho (ou azul) sem gritar e sem ir para o rosa
  const [h, s] = hsl(paint.hex), S = Math.min(54, Math.round(s * 100));
  return { center: `hsl(${h} ${S}% 42%)`, mid: `hsl(${h} ${S - 4}% 33%)`, edge: `hsl(${h} ${S - 8}% 22%)`, vivid: true };
}

const TYRE_SVG = `<svg viewBox="0 0 34 70" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="5" y="3" width="24" height="64" rx="11"/><path d="M8 22h18M8 50h18" opacity=".6"/><rect x="1" y="12" width="4" height="10" rx="2" fill="currentColor"/><rect x="29" y="12" width="4" height="10" rx="2" fill="currentColor"/><rect x="1" y="48" width="4" height="10" rx="2" fill="currentColor"/><rect x="29" y="48" width="4" height="10" rx="2" fill="currentColor"/></svg>`;

class GarageForTeslaCard extends HTMLElement {
  static getConfigElement() { return document.createElement('garage-for-tesla-card-editor'); }
  static getStubConfig(hass) { const id = findTeslaVehicle(hass); return id ? { device_id: id, color: 'pearl_white' } : { color: 'pearl_white' }; }

  constructor() { super(); this.attachShadow({ mode: 'open' }); this._rows = []; this._busy = new Set(); this._optim = {}; this._seatMode = {}; }   // _seatMode: bancos com ventilação, 'heat' ou 'cool' (o que acontece ao escolher um nível)

  setConfig(config) {
    if (!config) throw new Error('Invalid configuration');
    const mkey = c => c ? [c.car_model, c.model_url, c.model_buffer && c.model_buffer.byteLength].join('|') : '';
    const reload = this._built && mkey(this._config) !== mkey(config);
    this._config = Object.assign({ color: 'pearl_white', theme: 'auto' }, config);
    this._structKey = null;
    if (reload) this._reloadModel();
    if (this._hass) this._render();
  }
  getCardSize() { return 12; }
  getGridOptions() { return { columns: 'full', rows: 'auto', min_rows: 8 }; }

  set hass(h) {
    this._hass = h;
    if (!this._config) return;
    if (!this._built) this._build();
    this._render();
  }
  get hass() { return this._hass; }

  connectedCallback() { clearInterval(this._tick); this._tick = setInterval(() => { if (this._built && this._hass && this._config) this._render(); }, 60000); if (this._scene) this._scene.start(); if (this._onWin) { addEventListener('resize', this._onWin); if (window.visualViewport) visualViewport.addEventListener('resize', this._onWin); this._layout(); } }
  disconnectedCallback() { clearInterval(this._tick); if (this._scene) this._scene.stop(); if (this._onWin) { removeEventListener('resize', this._onWin); if (window.visualViewport) visualViewport.removeEventListener('resize', this._onWin); } }

  // ---------- estrutura ----------
  _build() {
    this._built = true;
    const sr = this.shadowRoot;
    sr.innerHTML = `<style>${CSS}</style>
      <ha-card><div class="root dark">
        <section class="stage">
          <canvas aria-label="3D"></canvas>
          <div class="loading">…</div>
          <header class="hdr">
            <div class="name"></div>
            <div class="batt"><span class="cell"><span class="fill"></span></span><ha-icon class="bolt" icon="mdi:lightning-bolt"></ha-icon><span class="pct"></span><span class="rng"></span></div>
            <div class="line status"></div>
            <div class="line temps"></div>
            <div class="alerts"></div>
          </header>
          <div class="tags"></div>
          <footer class="foot">
            <div class="odo"></div>
            <div class="shortcuts"></div>
            <div class="tyres"></div>
          </footer>
          <div class="toast"></div>
          <button class="menubtn"><ha-icon icon="mdi:tune-variant"></ha-icon><span></span></button>
        </section>
        <div class="mscrim"></div><aside class="menu" aria-label="Controlos"></aside>
        <div class="scrim"><div class="sheet" role="alertdialog" aria-modal="true"><div class="hd"><span class="sic"><ha-icon></ha-icon></span><div class="m"><b></b><p></p></div></div><div class="bt"><button class="no"></button><button class="yes"></button></div></div></div>
      </div></ha-card>`;
    const $ = s => sr.querySelector(s);
    this.$ = { root: $('.root'), stage: $('.stage'), canvas: $('canvas'), loading: $('.loading'), name: $('.name'), batt: $('.batt'), fill: $('.fill'), pct: $('.pct'), rng: $('.rng'),
      status: $('.status'), temps: $('.temps'), alerts: $('.alerts'), tags: $('.tags'), odo: $('.odo'), shortcuts: $('.shortcuts'), tyres: $('.tyres'), menu: $('.menu'),
      scrim: $('.scrim'), toast: $('.toast'), foot: $('.foot') };
    this.$.scrim.querySelector('.no').onclick = () => this._closeConfirm(false);
    this.$.scrim.querySelector('.yes').onclick = () => this._closeConfirm(true);
    this.$.scrim.onclick = e => { if (e.target === this.$.scrim) this._closeConfirm(false); };
    this.$.scrim.addEventListener('keydown', e => { if (e.key === 'Escape') this._closeConfirm(false); });
    sr.querySelector('.menubtn').onclick = () => this._menu(true);
    sr.querySelector('.mscrim').onclick = () => this._menu(false);
    this._initScene();
    this._ro = new ResizeObserver(() => this._layout());
    this._ro.observe(this.$.root);
    this._onWin = () => this._layout();
  }

  // outro modelo escolhido no editor: nova cena num canvas novo (o contexto WebGL antigo fica livre)
  _reloadModel() {
    if (this._scene) { this._scene.dispose(); this._scene = null; }
    const c = document.createElement('canvas'); c.setAttribute('aria-label', '3D');
    this.$.canvas.replaceWith(c); this.$.canvas = c;
    this.$.loading.classList.remove('done'); this.$.tags.classList.remove('show');
    this._initScene();
  }

  _initScene() {
    try {
      const mi = modelInfo(this._config.car_model);
      this._scene = new CarScene(this.$.canvas, this._config.model_url || modelUrl(mi), { ...(mi.scene || {}), paintName: mi.paint, length: mi.length, buffer: this._config.model_buffer,
        onReady: () => { this.$.loading.classList.add('done'); this.$.tags.classList.add('show'); this._syncScene(); },
        onError: () => { this.$.loading.textContent = 'Model failed to load'; },
        onFrame: () => this._placeTags(),
      });
      if (this._scene.failed) { this.$.loading.textContent = 'WebGL not available'; return; }
      this._layout(); this._syncScene();
      if (this.isConnected) this._scene.start();
    } catch (e) { console.error('Garage for Tesla', e); this.$.loading.textContent = String(e.message || e); }
  }

  _layout() {
    const r = this.$.root, w = r.clientWidth;
    const narrow = w > 0 && w < 860;
    r.classList.toggle('narrow', narrow); if (!narrow) r.classList.remove('menu-open');
    if (this._config && this._config.height) r.style.setProperty('--gft-h', this._config.height);
    else if (narrow) r.style.setProperty('--gft-fit', this._fitHeight() || '');
    if (this._scene) { const hd = this.shadowRoot.querySelector('.hdr'); this._scene.setInsets(this.$.foot.offsetHeight + 8, narrow ? hd.offsetHeight + 40 : 0, narrow, narrow ? 0 : this.$.menu.offsetWidth + 16); }
  }

  // telemóvel: altura = espaço que se vê mesmo (no iPhone a barra de estado e a barra do gesto de baixo ficam por cima da página)
  _fitHeight() {
    const vh = (window.visualViewport && visualViewport.height) || innerHeight, top = this.$.root.getBoundingClientRect().top + (scrollY || 0);
    if (!(top >= 0 && top < vh * .5)) return null;
    if (!this._safe) { this._safe = document.createElement('div'); this._safe.style.cssText = 'position:fixed;left:0;bottom:0;width:0;height:env(safe-area-inset-bottom,0px);visibility:hidden;pointer-events:none'; document.body.appendChild(this._safe); }
    const h = Math.floor(vh - top - this._safe.offsetHeight - 8);
    return h >= 480 ? h + 'px' : null;
  }

  // ---------- dados ----------
  _ent(key) { const o = this._config.entities && this._config.entities[key]; return o || this._map[key]; }
  _st(key) {
    const id = this._ent(key), s = id ? this._hass.states[id] : undefined, o = this._optim[key];
    if (!o || !s) return s;
    // estado pedido pelo utilizador enquanto o HA não confirma (a Tesla Custom só lê o carro de 11 em 11 min, issue #1)
    const confirmed = o.on ? s.state !== 'off' && !BAD.has(s.state) : s.state === 'off';
    if (confirmed || Date.now() > o.until) { delete this._optim[key]; return s; }
    return { ...s, state: o.state };
  }
  _ok(key) { const s = this._st(key); return s && !BAD.has(s.state) ? s : null; }
  _num(key) { const s = this._ok(key); const n = s ? parseFloat(s.state) : NaN; return isNaN(n) ? null : n; }
  _unit(key) { const s = this._st(key); return (s && s.attributes.unit_of_measurement) || ''; }
  _fmt(n, d = 0) { try { return new Intl.NumberFormat(this._hass.locale && this._hass.locale.language || 'en', { minimumFractionDigits: d, maximumFractionDigits: d }).format(n); } catch (e) { return n.toFixed(d); } }
  _fs(stateObj) { try { return this._hass.formatEntityState ? this._hass.formatEntityState(stateObj) : stateObj.state; } catch (e) { return stateObj.state; } }
  _t(k) { return t(this._hass, k); }
  _dark() {
    const th = this._config.theme;
    if (th === 'dark') return true; if (th === 'light') return false;
    return !!(this._hass.themes && this._hass.themes.darkMode);
  }
  _paint() {   // só cores que existiram para o modelo escolhido; senão a primeira da lista dele
    const list = modelInfo(this._config.car_model).colors || Object.keys(COLORS);
    return COLORS[list.includes(this._config.color) ? this._config.color : list[0]] || COLORS.pearl_white;
  }

  _render() {
    const h = this._hass, c = this._config;
    this._device = c.device_id || findTeslaVehicle(h);
    this._map = detectEntities(h, this._device);
    const dark = this._dark(), paint = this._paint(), bg = bgFor(paint, dark), r = this.$.root;
    r.classList.toggle('dark', dark); r.classList.toggle('light', !dark);
    r.style.setProperty('--center', bg.center); r.style.setProperty('--mid', bg.mid); r.style.setProperty('--edge', bg.edge);
    this.$.stage.classList.toggle('vivid', !!bg.vivid);
    if (this._scene && !this._scene.failed) { this._scene.setTheme(dark); this._scene.setPaint(paint); this._scene.setInterior(c.interior === 'black' ? 'black' : 'white'); }

    if (!this._device || !Object.keys(this._map).length) {
      this.$.menu.innerHTML = `<div class="empty">${esc(this._t('no_car'))}</div>`; this._structKey = 'empty';
      this.$.name.textContent = c.name || 'Tesla';
      return;
    }
    // reconstrói menu/atalhos só quando muda a estrutura
    const sk = JSON.stringify([this._device, this._map, c.menu, c.shortcuts, c.entities, lang(h)]);
    if (sk !== this._structKey) { this._structKey = sk; this._buildMenu(); this._buildShortcuts(); this._buildTags(); }
    this._renderHeader(); this._renderFoot();
    this._rows.forEach(r => r.update()); this._scs.forEach(s => s.update()); this._tagEls.forEach(x => x.update());
    this._syncScene();
  }

  _syncScene() {
    if (!this._scene || this._scene.failed || !this._map) return;
    const { charging, plugged } = this._chargeInfo();
    const cl = this._ok('climate');
    const w = k => { const s = this._ok('tpms_warn_' + k); return !!(s && s.state === 'on'); };
    const op = k => { const x = this._ok(k); return !!(x && (x.state === 'open' || x.state === 'on')); };
    const se = this._ok('sentry');
    const LV = { off: 0, low: 1, medium: 2, med: 2, high: 3, '0': 0, '1': 1, '2': 2, '3': 3, 'heat low': 1, 'heat medium': 2, 'heat high': 3 }; // Heat …: Tesla Custom com bancos ventilados
    const lvl = k => { const x = this._ok(k); return x ? LV[String(x.state).toLowerCase()] || 0 : 0; };
    // ventilação: "Cool …" na mesma entidade (Tesla Custom) ou a entidade à parte ligada (Tessie/Teslemetry)
    const cool = k => { const x = this._ok(k), y = this._ok(k + '_cool'); return !!((x && /^cool /i.test(x.state)) || (y && String(y.state).toLowerCase() !== 'off')); };
    const sh = this._ok('steering_heat'), sl = this._ok('steering_level');
    const steerHeat = !!((sh && sh.state === 'on') || (sl && lvl('steering_level') > 0));
    this._scene.setCarState({ sentry: !!(se && se.state === 'on'), charging, plugged: !!plugged, climate: !!(cl && cl.state !== 'off'), tpmsWarn: { fl: w('fl'), fr: w('fr'), rl: w('rl'), rr: w('rr') },
      seatHeat: { fl: lvl('seat_fl'), fr: lvl('seat_fr'), rl: lvl('seat_rl'), rr: lvl('seat_rr') }, seatCool: { fl: cool('seat_fl'), fr: cool('seat_fr') }, steerHeat,
      open: { port: op('charge_port'), frunk: op('frunk'), trunk: op('trunk'), df: op('door_df'), dr: op('door_dr'), pf: op('door_pf'), pr: op('door_pr') } });
  }

  _chargeInfo() {
    const cs = this._ok('charging'), cable = this._ok('cable');
    // Tesla Custom: não há sensor do estado da carga; vem no atributo charging_state do sensor do cabo
    const raw = cs ? cs.state : cable && cable.attributes.charging_state, st = raw ? String(raw).toLowerCase() : '';
    const charging = st === 'charging' || st === 'starting';
    const plugged = charging || (cable ? cable.state === 'on' : !!(st && st !== 'disconnected'));
    const mins = this._minsToFull();
    return { st, charging, plugged, complete: st === 'complete', mins, power: this._num('charge_power'), powerU: this._unit('charge_power') || 'kW' };
  }
  // Tessie/Teslemetry/Tesla Fleet dão a HORA de fim (data); outras integrações dão minutos ou horas.
  _minsToFull() {
    const s = this._ok('time_to_full'); if (!s) return null;
    const v = String(s.state).trim();
    if (s.attributes.device_class === 'timestamp' || /^\d{4}-\d{2}-\d{2}[T ]/.test(v)) {
      const t = Date.parse(v); return isNaN(t) ? null : Math.max(0, (t - Date.now()) / 60000);
    }
    let m = parseFloat(v); if (isNaN(m)) return null;
    if (/^h/.test(this._unit('time_to_full'))) m *= 60;
    return m;
  }
  _dur(m) { if (m == null) return ''; m = Math.round(m); const hh = Math.floor(m / 60), mm = m % 60; return hh ? `${hh} h ${String(mm).padStart(2, '0')} min` : `${mm} min`; }

  _renderHeader() {
    const $ = this.$, c = this._config;
    const dev = this._hass.devices && this._hass.devices[this._device];
    $.name.textContent = c.name || (dev && (dev.name_by_user || dev.name)) || 'Tesla';
    const b = this._num('battery'), rng = this._num('range'), ci = this._chargeInfo();
    $.fill.style.width = (b == null ? 0 : Math.max(4, Math.min(100, b))) + '%';
    $.pct.textContent = b == null ? '—' : this._fmt(b) + ' %';
    $.rng.textContent = rng == null ? '' : '· ' + this._fmt(rng) + ' ' + this._unit('range');
    $.batt.classList.toggle('charging', ci.charging); $.batt.classList.toggle('low', b != null && b <= 15 && !ci.charging);

    const bits = [];
    const sh = this._ok('shift'), shift = sh ? sh.state.toLowerCase() : '';
    const on = this._ok('online');
    if (/^[drn]$/.test(shift)) { const sp = this._num('speed'); bits.push(this._t('driving') + (sp != null ? ' · ' + this._fmt(sp) + ' ' + this._unit('speed') : '')); }
    else if (ci.charging) bits.push(this._t('charging_s') + (ci.mins != null ? ' · ' + this._dur(ci.mins) + ' ' + this._t('until') + ' ' + (this._num('charge_limit') != null ? this._fmt(this._num('charge_limit')) + ' %' : '100 %') : ''));
    else if (ci.complete && ci.plugged) bits.push(this._t('complete'));
    else if (ci.plugged) bits.push(this._t('plugged'));
    else if (on && on.state === 'off') bits.push(this._t('asleep'));
    else bits.push(this._t('parked'));
    const loc = this._ok('location');
    if (loc) bits.push(loc.state === 'home' ? this._t('home') : loc.state === 'not_home' ? this._t('away') : this._fs(loc));
    $.status.innerHTML = `<ha-icon icon="${ci.charging ? 'mdi:ev-station' : loc ? 'mdi:map-marker-outline' : 'mdi:car-outline'}"></ha-icon><span>${bits.map(esc).join(' <span class="dotsep">·</span> ')}</span>`;

    const ti = this._num('inside_temp'), to = this._num('outside_temp');
    $.temps.innerHTML = ti == null && to == null ? '' : `<ha-icon icon="mdi:thermometer"></ha-icon><span>${[ti != null ? this._t('inside') + ' ' + this._fmt(ti) + '°' : '', to != null ? this._t('outside') + ' ' + this._fmt(to) + '°' : ''].filter(Boolean).join(' <span class="dotsep">·</span> ')}</span>`;

    const al = [];
    const doors = { df: 'seat_fl', pf: 'seat_fr', dr: 'seat_rl', pr: 'seat_rr' };
    let openDoors = 0; for (const k of Object.keys(doors)) { const s = this._ok('door_' + k); if (s && s.state === 'on') openDoors++; }
    if (openDoors) al.push(`<span class="alert"><ha-icon icon="mdi:car-door"></ha-icon>${openDoors} ${esc(this._t(openDoors > 1 ? 'doors_open' : 'door_open'))}</span>`);
    for (const k of ['fl', 'fr', 'rl', 'rr']) { const s = this._ok('tpms_warn_' + k); if (s && s.state === 'on') { al.push(`<span class="alert"><ha-icon icon="mdi:car-tire-alert"></ha-icon>${esc(this._t('tyres'))}</span>`); break; } }
    const up = this._ok('update'); if (up && up.state === 'on') al.push(`<span class="alert info"><ha-icon icon="mdi:update"></ha-icon>${esc(this._t('update'))}</span>`);
    $.alerts.innerHTML = al.join('');
  }

  _renderFoot() {
    const $ = this.$;
    const od = this._num('odometer');
    $.odo.innerHTML = od == null ? '' : `<span class="cap">${esc(this._t('odometer'))}</span><span class="v">${this._fmt(od)} ${esc(this._unit('odometer'))}</span>`;
    const tp = k => this._num('tpms_' + k);
    if (['fl', 'fr', 'rl', 'rr'].every(k => tp(k) == null)) { $.tyres.innerHTML = ''; return; }
    const u = this._unit('tpms_fl'), d = /psi/i.test(u) ? 0 : 1;
    const v = k => { const n = tp(k); const w = this._ok('tpms_warn_' + k); return `<span class="${w && w.state === 'on' ? 'w' : ''}">${n == null ? '—' : this._fmt(n, d)}</span>`; };
    $.tyres.innerHTML = `<span class="cap">${esc(this._t('tyres'))} · ${esc(u)}</span><div class="tv">${v('fl')}${TYRE_SVG}${v('fr')}${v('rl')}${v('rr')}</div>`;
  }

  // ---------- etiquetas 3D ----------
  _buildTags() {
    const box = this.$.tags; box.innerHTML = ''; this._tagEls = [];
    const add = (anchor, key, opts) => {
      if (!this._ent(key)) return;
      const el = document.createElement('div'); el.className = 'tag' + (opts.round ? ' round' : ''); el.style.setProperty('--h', (opts.h || 34) + 'px');
      el.innerHTML = `<span class="stem"></span><span class="dot"></span><button class="pill"><ha-icon></ha-icon>${opts.round ? '' : '<span class="t"><b></b><small></small></span>'}</button>`;
      const btn = el.querySelector('.pill');
      btn.onclick = () => this._act(key);
      box.appendChild(el);
      const x = { el, anchor, update: () => opts.update(el, this._st(key)) };
      this._tagEls.push(x); return x;
    };
    add('lock', 'lock', { round: true, h: 30, update: (el, s) => {
      const locked = s && s.state === 'locked';
      el.querySelector('ha-icon').setAttribute('icon', locked ? 'mdi:lock' : 'mdi:lock-open-variant');
      el.classList.toggle('warn', !!s && !locked);
      el.querySelector('.pill').setAttribute('aria-label', this._t('lock') + ': ' + this._t(locked ? 'locked' : 'unlocked'));
    } });
    const cover = (k, label, icon) => (el, s) => {
      const open = s && s.state === 'open';
      el.querySelector('ha-icon').setAttribute('icon', icon);
      el.querySelector('b').textContent = this._t(label);
      el.querySelector('small').textContent = open ? this._t('open') : this._t('s_open');
      el.classList.toggle('warn', open);
    };
    add('frunk', 'frunk', { h: 46, update: cover('frunk', 'frunk', 'mdi:car-select') });
    add('trunk', 'trunk', { h: 112, update: cover('trunk', 'trunk', 'mdi:car-back') });
    const portKey = this._ent('charge_port') ? 'charge_port' : (this._ent('charging') ? 'charging' : null);
    if (portKey) add('port', portKey, { h: 40, update: (el) => {
      const ci = this._chargeInfo();
      el.querySelector('ha-icon').setAttribute('icon', ci.charging ? 'mdi:lightning-bolt' : ci.plugged ? 'mdi:ev-plug-type2' : 'mdi:ev-plug-type2');
      el.classList.toggle('charging', ci.charging); el.classList.toggle('plugged', ci.plugged && !ci.charging);
      const pp = this._ok('charge_port'); el.classList.toggle('warn', !ci.charging && !ci.plugged && !!pp && pp.state === 'open');
      const b = el.querySelector('b'), sm = el.querySelector('small');
      if (ci.charging) {
        b.textContent = (ci.power != null ? this._fmt(ci.power, ci.power < 10 ? 1 : 0) + ' ' + ci.powerU : this._t('charging_s'));
        sm.textContent = '';   // só a potência: o tempo que falta já está no cabeçalho
      } else if (ci.plugged) { b.textContent = this._t(ci.complete ? 'complete' : 'plugged'); sm.textContent = this._t('charge_port'); }
      else { const p = this._ok('charge_port'); b.textContent = this._t('charge_port'); sm.textContent = p && p.state === 'open' ? this._t('open') : this._t('s_open'); }
    } });
  }
  _placeTags() {
    if (!this._tagEls || !this._scene) return;
    for (const x of this._tagEls) {
      const p = this._scene.project(x.anchor);
      if (!p) { x.el.classList.add('hide'); continue; }
      x.el.classList.toggle('hide', !p.visible);
      x.el.style.transform = `translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px)`;
    }
  }

  // ---------- atalhos ----------
  _shortcutKeys() {
    return (this._config.shortcuts || DEFAULT_SHORTCUTS).filter(k => this._ent(k) && SLOTS[k] && SLOTS[k].kind === 'action' && !TAG_KEYS.includes(k)).slice(0, 6);
  }
  _buildShortcuts() {
    const box = this.$.shortcuts; box.innerHTML = ''; this._scs = [];
    const list = this._shortcutKeys();
    for (const k of list) {
      const el = document.createElement('button'); el.className = 'sc';
      el.innerHTML = `<span class="c"><ha-icon icon="${SLOTS[k].icon}"></ha-icon></span><span class="l"></span>`;
      el.onclick = () => this._act(k);
      box.appendChild(el);
      this._scs.push({ update: () => {
        const s = this._st(k);
        el.classList.toggle('on', this._isOn(k, s));
        el.classList.toggle('busy', this._busy.has(k));
        let label = ['climate', 'windows'].includes(k) ? this._t('sc_' + k) : this._t(k);
        if (k === 'climate' && s && s.state !== 'off' && s.attributes.temperature != null) label = this._fmt(s.attributes.temperature, 1) + '°';
        if (k === 'lock') { label = this._t(s && s.state === 'locked' ? 'locked' : 'unlocked'); el.querySelector('ha-icon').setAttribute('icon', s && s.state === 'locked' ? 'mdi:lock' : 'mdi:lock-open-variant'); }
        el.querySelector('.l').textContent = label; el.setAttribute('aria-label', this._t(k));
      } });
    }
  }
  _isOn(k, s) {
    if (!s) return false; const d = SLOTS[k].d;
    if (d === 'switch') return s.state === 'on';
    if (d === 'climate') return s.state !== 'off' && !BAD.has(s.state);
    if (d === 'cover') return s.state === 'open';
    if (d === 'lock') return s.state === 'unlocked';
    return false;
  }

  // ---------- menu ----------
  // cada comando aparece num só sítio: carro 3D > atalhos > menu
  // (a climatização nos atalhos deixa no menu só a temperatura)
  _menuKeys() {
    const c = this._config, sc = this._shortcutKeys();
    const base = Array.isArray(c.menu) ? c.menu.filter(k => SLOTS[k] && this._ent(k)) : Object.keys(SLOTS).filter(k => SLOTS[k].kind === 'action' && this._ent(k) && !this._hiddenByDefault(k));
    return base.filter(k => !TAG_KEYS.includes(k) && (k === 'climate' || !sc.includes(k)));
  }
  _buildMenu() {
    const menu = this.$.menu; this._rows = [];
    const keys = this._menuKeys();
    const title = lang(this._hass) === 'pt' ? 'Controlos' : 'Controls';
    menu.innerHTML = `<span class="grab"></span><div class="mh"><h2>${esc(title)}</h2><button class="x" aria-label="${esc(this._t('close'))}"><ha-icon icon="mdi:close"></ha-icon></button></div>`;
    menu.querySelector('.x').onclick = () => this._menu(false);
    this.shadowRoot.querySelector('.menubtn span').textContent = title;
    for (const sec of SECTIONS) {
      const ks = keys.filter(k => SLOTS[k].sec === sec);
      if (!ks.length) continue;
      const wrap = document.createElement('div'); wrap.className = 'sec sec-' + sec;
      wrap.innerHTML = `<div class="st">${esc(this._t('sec_' + sec))}</div><div class="grp"></div>`;
      const grp = wrap.querySelector('.grp');
      ks.forEach(k => this._rows.push(this._row(grp, k)));
      menu.appendChild(wrap);
    }
    const cr = document.createElement('div'); cr.className = 'credit';
    const mc = modelInfo(this._config.car_model).credit;
    cr.innerHTML = `Garage for Tesla ${VERSION} · ${lang(this._hass) === 'pt' ? 'Sem ligação à Tesla, Inc.' : 'Not affiliated with Tesla, Inc.'}<br>${esc(this._t('model_credit'))}: <a href="${esc(mc.url)}" target="_blank" rel="noopener">“${esc(mc.title)}”</a> · ${esc(mc.author)} · <a href="${esc(mc.licenseUrl)}" target="_blank" rel="noopener">${esc(mc.license)}</a>`;
    menu.appendChild(cr);
  }

  _row(grp, k) {
    const S = SLOTS[k], row = document.createElement('div'); row.className = 'row';
    const tempOnly = k === 'climate' && this._shortcutKeys().includes('climate');
    row.innerHTML = `<span class="ic"><ha-icon icon="${tempOnly ? 'mdi:thermometer' : (S.icon || 'mdi:car')}"></ha-icon></span><div class="top"><div class="tt"><b>${esc(this._t(tempOnly ? 'temp' : k))}</b><small></small></div></div>`;
    grp.appendChild(row);
    const top = row.querySelector('.top'), small = row.querySelector('small');
    const id = () => this._ent(k);
    let update = () => { };
    if (['switch', 'lock'].includes(S.d) || S.d === 'climate') {
      const sw = document.createElement('button'); sw.className = 'sw'; sw.setAttribute('role', 'switch'); if (!tempOnly) top.appendChild(sw);
      sw.onclick = () => this._act(k);
      let stp;
      if (S.d === 'climate') {
        stp = document.createElement('div'); stp.className = 'stp';
        stp.innerHTML = `<button class="m" aria-label="−">−</button><span class="v"></span><button class="p" aria-label="+">+</button>`;
        top.appendChild(stp);   // −/+ na mesma linha do título, à direita (como os interruptores)
        const step = d => { const s = this._st(k); if (!s) return; const a = s.attributes, cur = parseFloat(this._pendTemp != null ? this._pendTemp : a.temperature) || 21;
          const st = a.target_temp_step || .5, v = Math.min(a.max_temp || 28, Math.max(a.min_temp || 15, Math.round((cur + d * st) / st) * st));
          this._pendTemp = v; stp.querySelector('.v').textContent = this._fmt(v, 1) + '°';
          clearTimeout(this._tempT); this._tempT = setTimeout(() => { this._call('climate', 'set_temperature', { entity_id: id(), temperature: v }, k); this._pendTemp = null; }, 700); };
        stp.querySelector('.m').onclick = () => step(-1); stp.querySelector('.p').onclick = () => step(1);
      }
      update = () => {
        const s = this._st(k), on = S.d === 'lock' ? s && s.state === 'locked' : this._isOn(k, s);
        sw.classList.toggle('on', !!on); row.classList.toggle('on', !!on && !tempOnly); sw.classList.toggle('busy', this._busy.has(k)); sw.setAttribute('aria-checked', on ? 'true' : 'false');
        row.classList.toggle('off-line', !s || BAD.has(s.state));
        if (S.d === 'lock') small.textContent = this._t(on ? 'locked' : 'unlocked');
        else if (S.d === 'climate') { small.style.display = 'none'; /* a temperatura de dentro já está no cabeçalho */ if (stp && this._pendTemp == null && s) stp.querySelector('.v').textContent = s.attributes.temperature != null ? this._fmt(s.attributes.temperature, 1) + '°' : '—'; }
        else small.style.display = 'none';   // o interruptor já mostra se está ligado
      };
    } else if (S.d === 'cover' || S.d === 'button') {
      const b = document.createElement('button'); b.className = 'cta'; top.appendChild(b);
      b.onclick = () => this._act(k);
      update = () => {
        const s = this._st(k); b.classList.toggle('busy', this._busy.has(k));
        row.classList.toggle('off-line', !s || BAD.has(s.state) && S.d !== 'button');
        if (S.d === 'button') { b.textContent = this._t('press'); small.textContent = ''; small.style.display = 'none'; return; }
        const open = s && s.state === 'open';
        small.textContent = k === 'windows' ? (open ? this._t('vented') : this._t('closed')) : (open ? this._t('open') : this._t('closed'));
        b.textContent = open ? this._t('s_close') : (k === 'windows' ? this._t('s_vent') : this._t('s_open'));
      };
    } else if (S.d === 'select') {
      const seg = document.createElement('div'); seg.className = 'seg'; row.appendChild(seg); small.style.display = 'none';
      let opts = null, last = null, picking = false;
      // ventilação: ou vem na mesma entidade (Tesla Custom: "Heat Low"/"Cool Low"…) ou numa entidade à parte (Tessie/Teslemetry: seat_fl_cool)
      const ic = row.querySelector('.ic'), isCool = v => /^cool /i.test(v), isHeat = v => /^heat /i.test(v);
      const coolKey = { seat_fl: 'seat_fl_cool', seat_fr: 'seat_fr_cool' }[k], cool = () => coolKey ? this._ok(coolKey) : null;
      const isOn = x => !!x && !BAD.has(x.state) && String(x.state).toLowerCase() !== 'off';
      const mode = () => this._seatMode[k] || 'heat';
      const draw = s => {
        const all = s.attributes.options || [], joint = all.some(isCool), c = cool(), vent = joint || !!c;
        ic.classList.toggle('pick', vent); ic.setAttribute('role', vent ? 'button' : ''); ic.setAttribute('aria-label', vent ? this._t('seat_mode') : '');
        if (vent) ic.querySelector('ha-icon').setAttribute('icon', mode() === 'cool' ? 'mdi:car-seat-cooler' : 'mdi:car-seat-heater');
        seg.innerHTML = '';
        if (vent && picking) {   // escolha do modo: o banco fica com o ícone escolhido
          for (const [m, icn] of [['heat', 'mdi:car-seat-heater'], ['cool', 'mdi:car-seat-cooler']]) {
            const b = document.createElement('button'); b.className = 'mode' + (mode() === m ? ' on' : '');
            b.innerHTML = `<ha-icon icon="${icn}"></ha-icon>${esc(this._t('seat_' + m))}`;
            b.onclick = () => { this._seatMode[k] = m; picking = false; opts = null; update(); };
            seg.appendChild(b);
          }
          return;
        }
        const ek = !joint && c && mode() === 'cool' ? coolKey : k;   // entidade a que os botões falam
        const src = ek === k ? all : c.attributes.options || [];
        const o = joint ? src.filter(v => mode() === 'cool' ? !isHeat(v) : !isCool(v)) : src.slice();
        o.sort((a, b) => (/^auto$/i.test(a) ? 1 : 0) - (/^auto$/i.test(b) ? 1 : 0));   // "Auto" sempre no fim
        o.forEach((op, i) => {
          const b = document.createElement('button'); b.dataset.v = op; b.dataset.k = ek; b.textContent = this._segLabel(op, i, o);
          b.onclick = () => {
            this._call('select', 'select_option', { entity_id: this._ent(ek), option: op }, k);
            // entidades à parte: ligar uma desliga a outra (o banco não aquece e ventila ao mesmo tempo)
            const other = c && !joint ? (ek === k ? coolKey : k) : null, os = other && this._ok(other);
            if (String(op).toLowerCase() !== 'off' && isOn(os)) this._call('select', 'select_option', { entity_id: this._ent(other), option: (os.attributes.options || []).find(v => /^off$/i.test(v)) || 'off' }, k);
          };
          seg.appendChild(b);
        });
      };
      ic.onclick = () => { if (!ic.classList.contains('pick')) return; picking = !picking; opts = null; update(); };
      update = () => {
        const s = this._st(k); if (!s) return;
        const c = cool(), now = JSON.stringify([s.state, c && c.state]);
        if (now !== last) {   // segue o que o carro está a fazer
          last = now;
          if (isCool(s.state) || isOn(c)) this._seatMode[k] = 'cool'; else if (isHeat(s.state) || (c && isOn(s))) this._seatMode[k] = 'heat';
          opts = null;
        }
        const key = JSON.stringify([s.attributes.options, c && c.attributes.options, mode(), picking]);
        if (key !== opts) { opts = key; draw(s); }
        seg.querySelectorAll('button[data-v]').forEach(b => { const x = this._ok(b.dataset.k); b.classList.toggle('on', !!x && b.dataset.v === x.state); });
      };
    } else if (S.d === 'number') {
      const val = document.createElement('span'); val.className = 'val'; top.appendChild(val); small.style.display = 'none';
      const sl = document.createElement('div'); sl.className = 'sl'; sl.innerHTML = '<input type="range">'; row.appendChild(sl);
      const inp = sl.querySelector('input'); let drag = false;
      const paint = () => { const p = (inp.value - inp.min) / ((inp.max - inp.min) || 1) * 100; inp.style.setProperty('--p', p + '%'); val.textContent = this._fmt(+inp.value) + ' ' + this._unit(k); };
      inp.oninput = () => { drag = true; paint(); };
      inp.onchange = () => { drag = false; this._call('number', 'set_value', { entity_id: id(), value: +inp.value }, k); };
      update = () => {
        const s = this._st(k); if (!s || drag) return; const a = s.attributes;
        inp.min = a.min != null ? a.min : 0; inp.max = a.max != null ? a.max : 100; inp.step = a.step || 1;
        if (!BAD.has(s.state)) inp.value = s.state; paint();
      };
    }
    return { update };
  }
  // o nível do volante só fica escondido quando há o interruptor (na Tesla Custom os carros mais novos só têm o nível)
  _hiddenByDefault(k) { return HIDDEN_BY_DEFAULT.includes(k) && !(k === 'steering_level' && !this._ent('steering_heat')); }
  _segLabel(op, i, all) {
    const o = String(op).toLowerCase().replace(/^(heat|cool) /, '');   // Tesla Custom: "Heat Low", "Cool High"…
    if (o === 'off') return lang(this._hass) === 'pt' ? 'Desl.' : 'Off';
    // só dois níveis (volante: Low/High) → 1 e 2
    const two = all && !all.some(v => /medium$/i.test(String(v)));
    const m = { low: '1', medium: '2', high: two ? '2' : '3', '1': '1', '2': '2', '3': '3', auto: 'Auto' };
    return m[o] || String(op);
  }

  // ---------- comandos ----------
  _act(k) {
    const S = SLOTS[k], s = this._st(k), id = this._ent(k); if (!S || !id) return;
    const run = () => {
      switch (S.d) {
        case 'lock': { const locked = s && s.state === 'locked'; this._call('lock', locked ? 'unlock' : 'lock', { entity_id: id }, k); this._scene && this._scene.fx('lock'); break; }
        case 'switch': this._call('switch', s && s.state === 'on' ? 'turn_off' : 'turn_on', { entity_id: id }, k); break;
        case 'climate': this._climate(s, id, k); break;
        case 'cover': {
          const open = s && s.state === 'open', f = s && s.attributes.supported_features;
          // frunk (todas as integrações) e bagageira sem porta elétrica (Tesla Custom) só abrem: fecham-se à mão
          if (open && f != null && !(+f & 2)) { this._toast(this._t(k === 'frunk' ? 'm_frunk' : k === 'trunk' ? 'hand_trunk' : 'failed')); break; } // 2 = CLOSE
          this._call('cover', open ? 'close_cover' : 'open_cover', { entity_id: id }, k); break;
        }
        case 'button': this._call('button', 'press', { entity_id: id }, k);
          if (k === 'flash') this._scene && this._scene.fx('flash'); if (k === 'honk') this._scene && this._scene.fx('honk'); break;
        default: break;
      }
    };
    // pede confirmação para o que abre/destranca o carro
    let ask = null;
    if (k === 'lock' && s && s.state === 'locked') ask = { t: 'c_lock', m: 'm_lock', v: 'v_unlock', i: 'mdi:lock-open-variant' };
    else if ((k === 'frunk' || k === 'trunk') && !(s && s.state === 'open')) ask = { t: 'c_' + k, m: 'm_' + k, v: 'v_open', i: S.icon };
    else if (k === 'valet') ask = { t: 'c_valet', m: '', v: 'v_ok', i: S.icon };
    else if (k === 'keyless') ask = { t: 'c_keyless', m: '', v: 'v_enable', i: S.icon };
    if (ask && this._config.confirm !== false) this._confirm(ask, run); else run();
  }
  // liga/desliga o AC: turn_on/turn_off quando a entidade os aceita (Tessie, Teslemetry, Tesla Fleet);
  // senão set_hvac_mode, o único que a Tesla Custom Integration aceita (issue #1)
  async _climate(s, id, k) {
    const on = !!s && s.state !== 'off', a = (s && s.attributes) || {}, f = +a.supported_features || 0;
    const modes = a.hvac_modes || [];
    const mode = ['heat_cool', 'auto', 'cool', 'heat'].find(m => modes.includes(m)) || modes.find(m => m !== 'off') || 'heat_cool';
    // o botão muda logo e mantém o pedido até 12 min (pouco mais que um ciclo de leitura da Tesla Custom) ou até o HA confirmar
    this._optim[k] = { on: !on, state: on ? 'off' : mode, until: Date.now() + 12 * 60000 };
    const ok = f & (on ? 256 : 128) // 128 = TURN_ON, 256 = TURN_OFF
      ? await this._call('climate', on ? 'turn_off' : 'turn_on', { entity_id: id }, k)
      : await this._call('climate', 'set_hvac_mode', { entity_id: id, hvac_mode: on ? 'off' : mode }, k);
    if (!ok) { delete this._optim[k]; this._render(); } // o comando falhou: volta ao estado anterior
  }
  async _call(domain, service, data, key) {
    if (key) { this._busy.add(key); this._render(); }
    try { await this._hass.callService(domain, service, data); return true; }
    catch (e) { this._toast(this._t('failed') + (e && e.message ? ': ' + e.message : '')); return false; }
    finally { if (key) { this._busy.delete(key); this._render(); } }
  }
  _confirm(a, fn) {
    const sc = this.$.scrim, msg = a.m ? this._t(a.m) : '';
    sc.querySelector('b').textContent = this._t(a.t); sc.querySelector('p').textContent = msg; sc.querySelector('p').style.display = msg ? '' : 'none';
    sc.querySelector('.sic ha-icon').setAttribute('icon', a.i || 'mdi:help');
    sc.querySelector('.no').textContent = this._t('cancel'); sc.querySelector('.yes').textContent = this._t(a.v);
    this._pending = fn; sc.classList.add('show');
  }
  _closeConfirm(ok) { const fn = this._pending; this._pending = null; this.$.scrim.classList.remove('show'); if (ok && fn) fn(); }
  _menu(open) { this.$.root.classList.toggle('menu-open', !!open); }
  _toast(msg) { const el = this.$.toast; el.textContent = msg; el.classList.add('show'); clearTimeout(this._toastT); this._toastT = setTimeout(() => el.classList.remove('show'), 2800); }
}

if (!customElements.get('garage-for-tesla-card')) customElements.define('garage-for-tesla-card', GarageForTeslaCard);
window.customCards = window.customCards || [];
if (!window.customCards.some(c => c.type === 'garage-for-tesla-card')) {
  window.customCards.push({ type: 'garage-for-tesla-card', name: 'Garage for Tesla', description: '3D dashboard for your Tesla (Tessie, Teslemetry, Tesla Fleet, Tesla Custom).', preview: false, documentationURL: 'https://github.com/' });
}
console.info(`%c GARAGE FOR TESLA %c ${VERSION} `, 'background:#111;color:#fff;border-radius:4px 0 0 4px;padding:2px 6px', 'background:#e31937;color:#fff;border-radius:0 4px 4px 0;padding:2px 6px');
