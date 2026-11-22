// Banco de ensaio: simula o Home Assistant (ha-card, ha-icon, hass) para ver o cartão fora do HA
import mdi from './icons.js';
import { MODELS, COLORS } from '../src/slots.js';
import { t } from '../src/i18n.js';

const camel = n => 'mdi' + n.replace(/^mdi:/, '').split('-').filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join('');
class HaIcon extends HTMLElement {
  static get observedAttributes() { return ['icon']; }
  constructor() { super(); this.attachShadow({ mode: 'open' }); }
  connectedCallback() { this._r(); }
  attributeChangedCallback() { this._r(); }
  _r() { const d = mdi[camel(this.getAttribute('icon') || '')] || ''; this.shadowRoot.innerHTML = `<style>:host{display:inline-flex;width:var(--mdc-icon-size,24px);height:var(--mdc-icon-size,24px)}svg{width:100%;height:100%;fill:currentColor}</style><svg viewBox="0 0 24 24"><path d="${d}"/></svg>`; }
}
customElements.define('ha-icon', HaIcon);
customElements.define('ha-card', class extends HTMLElement { connectedCallback() { this.style.display = 'block'; } });

const q = new URLSearchParams(location.search);
const demo = document.getElementById('demo');
// no mockup publicado o .glb vai embutido (o alojamento não serve .glb)
// cada modelo num ficheiro à parte (car-model-<chave>.js), carregado só quando é escolhido
const GLB = window.CAR_GLB_B64S || (window.CAR_GLB_B64S = {});
if (window.CAR_GLB_B64) GLB.model3_highland = window.CAR_GLB_B64;
const MOCK = !!window.CAR_GLB_B64;
const bufs = {};
const glbFor = key => new Promise(res => {
  if (!MOCK) return res({});
  const done = () => res({ model_buffer: bufs[key] ||= Uint8Array.from(atob(GLB[key]), c => c.charCodeAt(0)).buffer });
  if (GLB[key]) return done();
  const sc = document.createElement('script'); sc.src = './car-model-' + key + '.js'; sc.onload = done; document.head.appendChild(sc);
});
let extra = {};
const MODEL = q.get('model') || 'model3_highland';
const DEV = 'dev_kitt';
const P = 'k_i_t_t_';
// [domínio.object_id, translation_key, estado, atributos]
const E = [
  ['sensor.' + P + 'nivel_da_bateria', 'charge_state_usable_battery_level', q.get('bat') || '78', { unit_of_measurement: '%' }],
  ['sensor.' + P + 'autonomia_da_bateria', 'charge_state_battery_range', q.get('rng') || '412', { unit_of_measurement: 'km' }],
  ['sensor.' + P + 'a_carregar', 'charge_state_charging_state', q.get('chg') || 'disconnected', {}],
  ['sensor.' + P + 'potencia_do_carregador', 'charge_state_charger_power', '10.8', { unit_of_measurement: 'kW' }],
  ['sensor.' + P + 'taxa_de_carregamento', 'charge_state_charge_rate', '62', { unit_of_measurement: 'km/h' }],
  // como o Tessie/Teslemetry/Tesla Fleet: hora de fim (timestamp); ?ttf=min → formato antigo em minutos
  q.get('ttf') === 'min'
    ? ['sensor.' + P + 'tempo_ate_a_carga_completa', 'charge_state_minutes_to_full_charge', '85', { unit_of_measurement: 'min' }]
    : ['sensor.' + P + 'tempo_ate_a_carga_completa', 'charge_state_minutes_to_full_charge', new Date(Date.now() + 59 * 60000 + 30000).toISOString().replace(/\.\d+Z$/, '+00:00'), { device_class: 'timestamp' }],
  ['binary_sensor.' + P + 'cabo_de_carregamento', 'charge_state_conn_charge_cable', q.get('chg') && q.get('chg') !== 'disconnected' ? 'on' : 'off', {}],
  ['sensor.' + P + 'odometro', 'vehicle_state_odometer', '23418', { unit_of_measurement: 'km' }],
  ['sensor.' + P + 'temperatura_interior', 'climate_state_inside_temp', '19.5', { unit_of_measurement: '°C' }],
  ['sensor.' + P + 'temperatura_exterior', 'climate_state_outside_temp', '14', { unit_of_measurement: '°C' }],
  ['sensor.' + P + 'pressao_do_pneu_dianteiro_esquerdo', 'vehicle_state_tpms_pressure_fl', '2.9', { unit_of_measurement: 'bar' }],
  ['sensor.' + P + 'pressao_do_pneu_dianteiro_direito', 'vehicle_state_tpms_pressure_fr', '2.9', { unit_of_measurement: 'bar' }],
  ['sensor.' + P + 'pressao_do_pneu_traseiro_esquerdo', 'vehicle_state_tpms_pressure_rl', q.get('tw') ? '2.4' : '2.9', { unit_of_measurement: 'bar' }],
  ['sensor.' + P + 'pressao_do_pneu_traseiro_direito', 'vehicle_state_tpms_pressure_rr', '3.0', { unit_of_measurement: 'bar' }],
  ['binary_sensor.' + P + 'aviso_de_pressao_do_pneu_traseiro_esquerdo', 'vehicle_state_tpms_soft_warning_rl', q.get('tw') ? 'on' : 'off', {}],
  ['sensor.' + P + 'estado_da_caixa', 'drive_state_shift_state', 'p', {}],
  ['sensor.' + P + 'velocidade', 'drive_state_speed', '0', { unit_of_measurement: 'km/h' }],
  ['device_tracker.' + P + 'localizacao', 'location', 'home', {}],
  ['binary_sensor.' + P + 'estado', 'state', 'on', {}],
  ['update.' + P + 'atualizacao', 'update', 'off', {}],
  ['binary_sensor.' + P + 'porta_da_frente_do_condutor', 'vehicle_state_df', q.get('door') ? 'on' : 'off', {}],
  ['binary_sensor.' + P + 'porta_traseira_do_condutor', 'vehicle_state_dr', q.get('doors') ? 'on' : 'off', {}],
  ['binary_sensor.' + P + 'porta_da_frente_do_passageiro', 'vehicle_state_pf', q.get('doors') ? 'on' : 'off', {}],
  ['binary_sensor.' + P + 'porta_traseira_do_passageiro', 'vehicle_state_pr', q.get('doors') ? 'on' : 'off', {}],
  ['lock.' + P + 'fechadura', 'vehicle_state_locked', q.get('lock') || 'locked', {}],
  ['switch.' + P + 'modo_sentinela', 'vehicle_state_sentry_mode', 'on', {}],
  ['switch.' + P + 'modo_valet', 'vehicle_state_valet_mode', 'off', {}],
  ['climate.' + P + 'climatizacao', 'primary', q.get('clim') || 'off', { temperature: 21, min_temp: 15, max_temp: 28, target_temp_step: .5, current_temperature: 19.5 }],
  ['switch.' + P + 'modo_de_descongelacao', 'climate_state_defrost_mode', 'off', {}],
  ['switch.' + P + 'aquecedor_do_volante', 'climate_state_steering_wheel_heater', q.get('wheel') ? 'on' : 'off', {}],
  ['select.' + P + 'aquecedor_do_assento_esquerdo', 'climate_state_seat_heater_left', q.get('sfl') || 'low', { options: ['off', 'low', 'medium', 'high'] }],
  ['select.' + P + 'aquecedor_do_assento_direito', 'climate_state_seat_heater_right', q.get('sfr') || 'off', { options: ['off', 'low', 'medium', 'high'] }],
  ['select.' + P + 'aquecedor_do_assento_traseiro_da_esquerda', 'climate_state_seat_heater_rear_left', q.get('srl') || 'off', { options: ['off', 'low', 'medium', 'high'] }],
  ['select.' + P + 'aquecedor_do_assento_traseiro_da_direita', 'climate_state_seat_heater_rear_right', q.get('srr') || 'off', { options: ['off', 'low', 'medium', 'high'] }],
  ['switch.' + P + 'carregar', 'charge_state_charging_state', q.get('chg') === 'charging' ? 'on' : 'off', {}],
  ['cover.' + P + 'porta_da_porta_de_carregamento', 'charge_state_charge_port_door_open', q.get('port') ? 'open' : 'closed', {}],
  ['number.' + P + 'limite_de_carga', 'charge_state_charge_limit_soc', '80', { min: 50, max: 100, step: 1, unit_of_measurement: '%' }],
  ['number.' + P + 'corrente_de_carga', 'charge_state_charge_current_request', '16', { min: 5, max: 32, step: 1, unit_of_measurement: 'A' }],
  ['cover.' + P + 'bagageira_dianteira', 'vehicle_state_ft', q.get('frunk') ? 'open' : 'closed', {}],
  ['cover.' + P + 'bagageira', 'vehicle_state_rt', q.get('trunk') ? 'open' : 'closed', {}],
  ['cover.' + P + 'janelas_de_ventilacao', 'windows', 'closed', {}],
  ['button.' + P + 'piscar_as_luzes', 'flash_lights', 'unknown', {}],
  ['button.' + P + 'buzina', 'honk', 'unknown', {}],
  ['button.' + P + 'acordar', 'wake', 'unknown', {}],
  ['button.' + P + 'homelink', 'trigger_homelink', 'unknown', {}],
  ['button.' + P + 'reproduzir_peido', 'boombox', 'unknown', {}],
];

const states = {}, entities = {};
for (const [id, tk, st, attrs] of E) {
  states[id] = { entity_id: id, state: st, attributes: attrs, last_changed: '', last_updated: '' };
  entities[id] = { entity_id: id, device_id: DEV, translation_key: tk, platform: 'tessie' };
}
const log = [];
window.__calls = log;
const card = document.createElement('garage-for-tesla-card');
let hass;
function push() {
  hass = { states: { ...states }, entities, devices: { [DEV]: { id: DEV, name: 'K.I.T.T.', name_by_user: q.get('name') || 'K.I.T.T.', manufacturer: 'Tesla', model: 'Model 3' } },
    locale: { language: q.get('lang') || 'pt-PT' }, language: q.get('lang') || 'pt-PT', themes: { darkMode: q.get('theme') !== 'light' },
    formatEntityState: s => s.state === 'home' ? 'Casa' : s.state,
    callService: async (d, s, data) => {
      log.push([d, s, data]); await new Promise(r => setTimeout(r, 500));
      const id = data.entity_id, cur = states[id]; if (!cur) return;
      const set = v => { states[id] = { ...cur, state: v }; };
      if (d === 'lock') set(s === 'lock' ? 'locked' : 'unlocked');
      if (d === 'switch') set(s === 'turn_on' ? 'on' : 'off');
      if (d === 'cover') set(s === 'open_cover' ? 'open' : 'closed');
      if (d === 'climate') { if (s === 'set_temperature') states[id] = { ...cur, attributes: { ...cur.attributes, temperature: data.temperature } }; else set(s === 'turn_on' ? 'heat_cool' : 'off'); }
      if (d === 'select') set(data.option);
      if (d === 'number') set(String(data.value));
      push();
    } };
  card.hass = hass;
}
extra = await glbFor(MODEL);
card.setConfig({ car_model: MODEL, color: q.get('color') || 'pearl_white', interior: q.get('int') || 'white', theme: q.get('theme') || 'auto', ...extra, ...(q.get('h') ? { height: q.get('h') } : {}) });
push();
document.getElementById('app').appendChild(card);
window.__card = card;

// barra de demonstração (só no mockup publicado)
if (demo) {
  const C = { model: MODEL, theme: 'dark', color: 'pearl_white', interior: 'white', chg: false, mobile: false };
  const PT = { language: 'pt-PT', locale: { language: 'pt-PT' } };
  const colOpts = () => MODELS[C.model].colors.map(k => `<option value="${k}"${k === C.color ? ' selected' : ''}>${t(PT, k)}</option>`).join('');
  demo.innerHTML = `<b>Mockup · Garage for Tesla</b><span class="sp"></span>
    <label>Modelo <select id="dModel">${Object.entries(MODELS).map(([k, m]) => `<option value="${k}">${m.name.replace('Model', 'Model')}</option>`).join('')}</select></label>
    <label>Tema <select id="dTheme"><option value="dark">Escuro</option><option value="light">Claro</option></select></label>
    <label>Cor <select id="dColor">${colOpts()}</select></label>
    <label>Interior <select id="dInt"><option value="white">Branco</option><option value="black">Preto</option></select></label>
    <label><input type="checkbox" id="dChg"> A carregar</label>
    <label><input type="checkbox" id="dTw"> Aviso de pneu</label>
    <label><input type="checkbox" id="dDoor"> Porta aberta</label>
    <label><input type="checkbox" id="dMob"> Telemóvel</label>`;
  const app = document.getElementById('app');
  const apply = () => {
    card.setConfig({ car_model: C.model, color: C.color, interior: C.interior, theme: C.theme, ...extra });
    const chg = C.chg ? 'charging' : 'disconnected';
    states['sensor.' + P + 'a_carregar'] = { ...states['sensor.' + P + 'a_carregar'], state: chg };
    states['binary_sensor.' + P + 'cabo_de_carregamento'] = { ...states['binary_sensor.' + P + 'cabo_de_carregamento'], state: C.chg ? 'on' : 'off' };
    states['switch.' + P + 'carregar'] = { ...states['switch.' + P + 'carregar'], state: C.chg ? 'on' : 'off' };
    states['binary_sensor.' + P + 'aviso_de_pressao_do_pneu_traseiro_esquerdo'] = { ...states['binary_sensor.' + P + 'aviso_de_pressao_do_pneu_traseiro_esquerdo'], state: C.tw ? 'on' : 'off' };
    states['sensor.' + P + 'pressao_do_pneu_traseiro_esquerdo'] = { ...states['sensor.' + P + 'pressao_do_pneu_traseiro_esquerdo'], state: C.tw ? '2.4' : '2.9' };
    states['binary_sensor.' + P + 'porta_da_frente_do_condutor'] = { ...states['binary_sensor.' + P + 'porta_da_frente_do_condutor'], state: C.door ? 'on' : 'off' };
    app.classList.toggle('mobile', C.mobile);
    document.body.classList.toggle('light', C.theme === 'light');
    push();
  };
  demo.querySelector('#dModel').onchange = async e => {
    const sel = e.target; sel.disabled = true; C.model = sel.value;
    if (!MODELS[C.model].colors.includes(C.color)) C.color = MODELS[C.model].colors[0];
    demo.querySelector('#dColor').innerHTML = colOpts();
    extra = await glbFor(C.model); sel.disabled = false; apply();
  };
  demo.querySelector('#dTheme').onchange = e => { C.theme = e.target.value; apply(); };
  demo.querySelector('#dColor').onchange = e => { C.color = e.target.value; apply(); };
  demo.querySelector('#dInt').onchange = e => { C.interior = e.target.value; apply(); };
  demo.querySelector('#dChg').onchange = e => { C.chg = e.target.checked; apply(); };
  demo.querySelector('#dTw').onchange = e => { C.tw = e.target.checked; apply(); };
  demo.querySelector('#dDoor').onchange = e => { C.door = e.target.checked; apply(); };
  demo.querySelector('#dMob').onchange = e => { C.mobile = e.target.checked; apply(); };
  apply();
}
