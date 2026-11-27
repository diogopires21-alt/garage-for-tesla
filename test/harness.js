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
// imitação simples do ha-form do HA: só para ver o editor do cartão no simulador
class HaForm extends HTMLElement {
  set hass(h) { this._h = h; } set data(d) { this._d = d; this._r(); } set schema(s) { this._s = s; this._r(); }
  _r() {
    if (!this._s || !this._d || !this._h) return;
    const flat = []; for (const f of this._s) f.type === 'grid' ? flat.push(...f.schema) : flat.push(f);
    this.innerHTML = '';
    for (const f of flat) {
      const w = document.createElement('label'); w.className = 'hf';
      const lab = document.createElement('span'); lab.className = 'hl'; lab.textContent = this.computeLabel ? this.computeLabel(f) : f.name; w.appendChild(lab);
      const sel = f.selector || {}, v = this._d[f.name];
      const set = val => { const d = { ...this._d }; if (val === '' || val == null) delete d[f.name]; else d[f.name] = val; this._d = d; this.dispatchEvent(new CustomEvent('value-changed', { detail: { value: d } })); };
      let el;
      if (sel.device) {
        el = document.createElement('select'); const flt = sel.device.filter || {};
        const ok = id => { const d = this._h.devices[id]; if (flt.manufacturer && d.manufacturer !== flt.manufacturer) return false; if (flt.integration) return Object.values(this._h.entities).some(e => e.device_id === id && e.platform === flt.integration); return true; };
        el.innerHTML = '<option value="">—</option>' + Object.keys(this._h.devices).filter(ok).map(id => `<option value="${id}"${id === v ? ' selected' : ''}>${this._h.devices[id].name_by_user || this._h.devices[id].name}</option>`).join('');
        el.onchange = () => set(el.value);
      } else if (sel.select && sel.select.multiple) {
        el = document.createElement('div'); el.className = 'hm';
        el.innerHTML = sel.select.options.map(o => `<span>${(v || []).includes(o.value) ? '☑' : '☐'} ${o.label}</span>`).join('');
      } else if (sel.select) {
        el = document.createElement('select');
        el.innerHTML = sel.select.options.map(o => `<option value="${o.value}"${o.value === v ? ' selected' : ''}>${o.label}</option>`).join('');
        el.onchange = () => set(el.value);
      } else if (sel.boolean) {
        el = document.createElement('input'); el.type = 'checkbox'; el.checked = !!v; el.onchange = () => set(el.checked);
      } else { el = document.createElement('input'); el.value = v || ''; el.onchange = () => set(el.value); }
      w.appendChild(el);
      const hp = this.computeHelper ? this.computeHelper(f) : '';
      if (hp) { const h = document.createElement('small'); h.className = 'hh'; h.textContent = hp; w.appendChild(h); }
      this.appendChild(w);
    }
  }
}
customElements.define('ha-form', HaForm);

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
// integ: tessie (por omissão) | custom (Tesla Custom) | teslamate (só TeslaMate) | fleet_tm (Tesla Fleet + TeslaMate)
let INTEG = q.get('integ') || 'tessie', CUSTOM = INTEG === 'custom';   // no mockup muda com a opção "Integração"
const TC_STATE = { charging: 'Charging', complete: 'Complete', stopped: 'Stopped', disconnected: 'Disconnected' };
const FRONT_COOL_HEAT = ['Off', 'Heat Low', 'Heat Medium', 'Heat High', 'Auto', 'Cool Low', 'Cool Medium', 'Cool High'];
const mkE = () => [
  ['sensor.' + P + 'nivel_da_bateria', 'charge_state_usable_battery_level', q.get('bat') || '78', { unit_of_measurement: '%' }],
  ['sensor.' + P + 'autonomia_da_bateria', 'charge_state_battery_range', q.get('rng') || '412', { unit_of_measurement: 'km' }],
  ...(CUSTOM ? [] : [['sensor.' + P + 'a_carregar', 'charge_state_charging_state', q.get('chg') || 'disconnected', {}]]),
  ['sensor.' + P + 'potencia_do_carregador', 'charge_state_charger_power', '10.8', { unit_of_measurement: 'kW' }],
  ['sensor.' + P + 'taxa_de_carregamento', 'charge_state_charge_rate', '62', { unit_of_measurement: 'km/h' }],
  CUSTOM ? ['sensor.' + P + 'energy_added', null, q.get('kwh') || '22.4', { unit_of_measurement: 'kWh' }] : ['sensor.' + P + 'energia_de_carga_adicionada', 'charge_state_charge_energy_added', q.get('kwh') || '22.4', { unit_of_measurement: 'kWh' }],
  // como o Tessie/Teslemetry/Tesla Fleet: hora de fim (timestamp); ?ttf=min → formato antigo em minutos
  CUSTOM
    ? ['sensor.' + P + 'time_charge_complete', null, new Date(Date.now() + 59 * 60000 + 30000).toISOString().replace(/\.\d+Z$/, '+00:00'), { device_class: 'timestamp' }]
    : q.get('ttf') === 'min'
    ? ['sensor.' + P + 'tempo_ate_a_carga_completa', 'charge_state_minutes_to_full_charge', '85', { unit_of_measurement: 'min' }]
    : ['sensor.' + P + 'tempo_ate_a_carga_completa', 'charge_state_minutes_to_full_charge', new Date(Date.now() + 59 * 60000 + 30000).toISOString().replace(/\.\d+Z$/, '+00:00'), { device_class: 'timestamp' }],
  CUSTOM
    ? ['binary_sensor.' + P + 'charger', null, q.get('chg') && q.get('chg') !== 'disconnected' ? 'on' : 'off', { device_class: 'plug', charging_state: TC_STATE[q.get('chg') || 'disconnected'] || 'Disconnected' }]
    : ['binary_sensor.' + P + 'cabo_de_carregamento', 'charge_state_conn_charge_cable', q.get('chg') && q.get('chg') !== 'disconnected' ? 'on' : 'off', {}],
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
  // ?integ=custom imita a Tesla Custom Integration: sem TURN_ON/TURN_OFF, só set_hvac_mode (issue #1); por omissão imita o Tessie
  q.get('integ') === 'custom'
    ? ['climate.' + P + 'hvac_climate_system', 'primary', q.get('clim') || 'off', { hvac_modes: ['heat_cool', 'off'], supported_features: 25, temperature: 21, min_temp: 15, max_temp: 28, target_temp_step: .5, current_temperature: 19.5 }]
    : ['climate.' + P + 'climatizacao', 'primary', q.get('clim') || 'off', { hvac_modes: ['heat_cool', 'off'], supported_features: 401, temperature: 21, min_temp: 15, max_temp: 28, target_temp_step: .5, current_temperature: 19.5 }],
  ['switch.' + P + 'modo_de_descongelacao', 'climate_state_defrost_mode', 'off', {}],
  // Tesla Custom (carros mais novos): sem interruptor do volante, só o nível (select), e bancos da frente com ventilação (opções Heat/Cool, com maiúsculas); sem translation_key
  ...(CUSTOM ? [
    ['select.' + P + 'heated_steering_wheel', null, q.get('wheel') ? 'High' : 'Off', { options: ['Off', 'Low', 'High', 'Auto'] }],
    ['select.' + P + 'heated_seat_left', null, q.get('sfl') || 'Heat Low', { options: FRONT_COOL_HEAT }],
    ['select.' + P + 'heated_seat_right', null, q.get('sfr') || 'Off', { options: FRONT_COOL_HEAT }],
  ] : [
    ['switch.' + P + 'aquecedor_do_volante', 'climate_state_steering_wheel_heater', q.get('wheel') ? 'on' : 'off', {}],
    ['select.' + P + 'aquecedor_do_assento_esquerdo', 'climate_state_seat_heater_left', q.get('sfl') || 'low', { options: ['off', 'low', 'medium', 'high'] }],
    ['select.' + P + 'aquecedor_do_assento_direito', 'climate_state_seat_heater_right', q.get('sfr') || 'off', { options: ['off', 'low', 'medium', 'high'] }],
    // Tessie/Teslemetry: ventilação dos bancos da frente numa entidade à parte
    ['select.' + P + 'ventilacao_do_assento_esquerdo', 'climate_state_seat_fan_front_left', q.get('cfl') || 'off', { options: ['off', 'low', 'medium', 'high'] }],
    ['select.' + P + 'ventilacao_do_assento_direito', 'climate_state_seat_fan_front_right', q.get('cfr') || 'off', { options: ['off', 'low', 'medium', 'high'] }],
  ]),
  ['select.' + P + 'aquecedor_do_assento_traseiro_da_esquerda', 'climate_state_seat_heater_rear_left', q.get('srl') || 'off', { options: ['off', 'low', 'medium', 'high'] }],
  ['select.' + P + 'aquecedor_do_assento_traseiro_da_direita', 'climate_state_seat_heater_rear_right', q.get('srr') || 'off', { options: ['off', 'low', 'medium', 'high'] }],
  CUSTOM ? ['switch.' + P + 'charger', null, q.get('chg') === 'charging' ? 'on' : 'off', {}] : ['switch.' + P + 'carregar', 'charge_state_charging_state', q.get('chg') === 'charging' ? 'on' : 'off', {}],
  ['cover.' + P + 'porta_da_porta_de_carregamento', 'charge_state_charge_port_door_open', q.get('port') ? 'open' : 'closed', {}],
  ['number.' + P + 'limite_de_carga', 'charge_state_charge_limit_soc', '80', { min: 50, max: 100, step: 1, unit_of_measurement: '%' }],
  ['number.' + P + 'corrente_de_carga', 'charge_state_charge_current_request', '16', { min: 5, max: 32, step: 1, unit_of_measurement: 'A' }],
  // frunk: em todas as integrações só abre (supported_features 1 = OPEN); bagageira: Tessie abre e fecha (3), Tesla Custom sem porta elétrica só abre (1)
  ['cover.' + P + 'bagageira_dianteira', 'vehicle_state_ft', q.get('frunk') ? 'open' : 'closed', { supported_features: 1 }],
  ['cover.' + P + 'bagageira', 'vehicle_state_rt', q.get('trunk') ? 'open' : 'closed', { supported_features: CUSTOM ? 1 : 3 }],
  ['cover.' + P + 'janelas_de_ventilacao', 'windows', 'closed', {}],
  ['button.' + P + 'piscar_as_luzes', 'flash_lights', 'unknown', {}],
  ['button.' + P + 'buzina', 'honk', 'unknown', {}],
  ['button.' + P + 'acordar', 'wake', 'unknown', {}],
  ['button.' + P + 'homelink', 'trigger_homelink', 'unknown', {}],
  ['button.' + P + 'reproduzir_peido', 'boombox', 'unknown', {}],
];

// TeslaMate (descoberta automática por MQTT): sensor.tesla_<nome>, sem translation_key, só leitura
const TM = 'dev_tm', TP = 'tesla_';
const mkTM = () => {
  const chg = q.get('chg') || 'disconnected', on = chg !== 'disconnected';
  return [
    ['sensor.' + TP + 'battery_level', '79', { unit_of_measurement: '%', device_class: 'battery' }],
    ['sensor.' + TP + 'usable_battery_level', q.get('bat') || '78', { unit_of_measurement: '%', device_class: 'battery' }],
    ['sensor.' + TP + 'rated_battery_range', q.get('rng') || '409', { unit_of_measurement: 'km' }],
    ['sensor.' + TP + 'est_battery_range', '371', { unit_of_measurement: 'km' }],
    ['sensor.' + TP + 'state', chg === 'charging' ? 'Charging' : 'Online', {}],
    ['sensor.' + TP + 'charging_state', { charging: 'Charging', complete: 'Complete', stopped: 'Stopped' }[chg] || 'Disconnected', {}],
    ['binary_sensor.' + TP + 'charging_state', chg === 'charging' ? 'on' : 'off', { device_class: 'battery_charging' }],
    ['sensor.' + TP + 'charger_power', chg === 'charging' ? '11' : '0', { unit_of_measurement: 'kW' }],
    ['sensor.' + TP + 'charge_energy_added', q.get('kwh') || '22.4', { unit_of_measurement: 'kWh' }],
    ['sensor.' + TP + 'charge_limit_soc', '80', { unit_of_measurement: '%' }],
    ['sensor.' + TP + 'time_to_full_charge', '1.25', { unit_of_measurement: 'h', device_class: 'duration' }],
    ['binary_sensor.' + TP + 'plugged_in', on ? 'on' : 'off', { device_class: 'plug' }],
    ['binary_sensor.' + TP + 'charge_port_door_open', q.get('port') || on ? 'on' : 'off', { device_class: 'opening' }],
    ['sensor.' + TP + 'odometer', '23421', { unit_of_measurement: 'km' }],
    ['sensor.' + TP + 'inside_temp', '19.5', { unit_of_measurement: '°C' }],
    ['sensor.' + TP + 'outside_temp', '14', { unit_of_measurement: '°C' }],
    ['sensor.' + TP + 'tpms_pressure_fl', '2.9', { unit_of_measurement: 'bar' }],
    ['sensor.' + TP + 'tpms_pressure_fr', '2.9', { unit_of_measurement: 'bar' }],
    ['sensor.' + TP + 'tpms_pressure_rl', q.get('tw') ? '2.4' : '2.9', { unit_of_measurement: 'bar' }],
    ['sensor.' + TP + 'tpms_pressure_rr', '3.0', { unit_of_measurement: 'bar' }],
    ['binary_sensor.' + TP + 'tpms_soft_warning_fl', 'off', {}],
    ['binary_sensor.' + TP + 'tpms_soft_warning_fr', 'off', {}],
    ['binary_sensor.' + TP + 'tpms_soft_warning_rl', q.get('tw') ? 'on' : 'off', {}],
    ['binary_sensor.' + TP + 'tpms_soft_warning_rr', 'off', {}],
    ['sensor.' + TP + 'shift_state', 'P', {}],
    ['sensor.' + TP + 'speed', 'unknown', { unit_of_measurement: 'km/h' }],
    ['device_tracker.' + TP + 'location', 'home', { latitude: 38.7, longitude: -9.1 }],
    ['device_tracker.' + TP + 'active_route_location', 'unknown', {}],
    ['sensor.' + TP + 'location', '38.7,-9.1', {}],
    ['sensor.' + TP + 'since', '2026-11-27T08:00:00+00:00', { device_class: 'timestamp' }],
    ['sensor.' + TP + 'display_name', 'K.I.T.T.', {}],
    ['binary_sensor.' + TP + 'healthy', 'off', { device_class: 'problem' }],
    ['update.' + TP + 'update', 'off', {}],
    ['binary_sensor.' + TP + 'locked', q.get('lock') === 'unlocked' ? 'on' : 'off', { device_class: 'lock' }],
    ['binary_sensor.' + TP + 'sentry_mode', 'on', {}],
    ['binary_sensor.' + TP + 'is_climate_on', q.get('clim') && q.get('clim') !== 'off' ? 'on' : 'off', {}],
    ['binary_sensor.' + TP + 'frunk_open', q.get('frunk') ? 'on' : 'off', { device_class: 'door' }],
    ['binary_sensor.' + TP + 'trunk_open', q.get('trunk') ? 'on' : 'off', { device_class: 'door' }],
    ['binary_sensor.' + TP + 'doors_open', q.get('door') || q.get('doors') ? 'on' : 'off', { device_class: 'door' }],
    ['binary_sensor.' + TP + 'driver_front_door_open', q.get('door') ? 'on' : 'off', { device_class: 'door' }],
    ['binary_sensor.' + TP + 'driver_rear_door_open', q.get('doors') ? 'on' : 'off', { device_class: 'door' }],
    ['binary_sensor.' + TP + 'passenger_front_door_open', q.get('doors') ? 'on' : 'off', { device_class: 'door' }],
    ['binary_sensor.' + TP + 'passenger_rear_door_open', q.get('doors') ? 'on' : 'off', { device_class: 'door' }],
    ['binary_sensor.' + TP + 'windows_open', 'off', { device_class: 'window' }],
  ];
};

const states = {}, entities = {};
function setup() {   // (re)cria as entidades da integração escolhida
  for (const k in states) delete states[k]; for (const k in entities) delete entities[k];
  if (INTEG !== 'teslamate') for (const [id, tk, st, attrs] of mkE()) {
    states[id] = { entity_id: id, state: st, attributes: attrs, last_changed: '', last_updated: '' };
    entities[id] = { entity_id: id, device_id: DEV, translation_key: tk, platform: CUSTOM ? 'tesla_custom' : INTEG === 'fleet_tm' ? 'tesla_fleet' : 'tessie' };
  }
  if (INTEG === 'teslamate' || INTEG === 'fleet_tm') for (const [id, st, attrs] of mkTM()) {
    states[id] = { entity_id: id, state: st, attributes: attrs, last_changed: '', last_updated: '' };
    entities[id] = { entity_id: id, device_id: TM, platform: 'mqtt' };
  }
}
setup();
const log = [];
// ?lag=segundos: atraso da Tesla Custom a mostrar o novo estado do clima (no mockup, 30 s com a opção Tesla Custom)
let LAG = (+q.get('lag') || 0) * 1000, lagT;
window.__calls = log;
const card = document.createElement('garage-for-tesla-card');
let hass;
function push() {
  hass = { states: { ...states }, entities, config: { version: '2026.11.2' }, devices: {
      ...(INTEG !== 'teslamate' ? { [DEV]: { id: DEV, name: 'K.I.T.T.', name_by_user: q.get('name') || 'K.I.T.T.', manufacturer: 'Tesla', model: 'Model 3' } } : {}),
      ...(INTEG === 'teslamate' || INTEG === 'fleet_tm' ? { [TM]: { id: TM, name: 'K.I.T.T.', name_by_user: null, manufacturer: 'Tesla', model: 'Model 3 LR' } } : {}) },
    locale: { language: q.get('lang') || 'pt-PT' }, language: q.get('lang') || 'pt-PT', themes: { darkMode: q.get('theme') !== 'light' },
    formatEntityState: s => s.state === 'home' ? 'Casa' : s.state,
    callService: async (d, s, data) => {
      log.push([d, s, data]); await new Promise(r => setTimeout(r, 500));
      const id = data.entity_id, cur = states[id]; if (!cur) return;
      const set = v => { states[id] = { ...cur, state: v }; };
      if (d === 'lock') set(s === 'lock' ? 'locked' : 'unlocked');
      if (d === 'switch') set(s === 'turn_on' ? 'on' : 'off');
      if (d === 'cover') {
        const f = cur.attributes.supported_features; // recusa como o HA quando a entidade não aceita o comando
        if (f != null && ((s === 'open_cover' && !(f & 1)) || (s === 'close_cover' && !(f & 2)))) throw new Error(`Entity ${id} does not support action cover.${s}`);
        set(s === 'open_cover' ? 'open' : 'closed');
      }
      if (d === 'climate') {
        const f = cur.attributes.supported_features || 0; // recusa como o HA quando a entidade não aceita o comando
        if ((s === 'turn_on' && !(f & 128)) || (s === 'turn_off' && !(f & 256))) throw new Error(`Entity ${id} does not support action climate.${s}`);
        if (s === 'set_temperature') states[id] = { ...cur, attributes: { ...cur.attributes, temperature: data.temperature } };
        else if (s === 'set_hvac_mode' && LAG) { clearTimeout(lagT); lagT = setTimeout(() => { states[id] = { ...states[id], state: data.hvac_mode }; push(); }, LAG); } // Tesla Custom: o HA só sabe na leitura seguinte (fica o último pedido)
        else if (s === 'set_hvac_mode') set(data.hvac_mode); else set(s === 'turn_on' ? 'heat_cool' : 'off');
      }
      if (d === 'select') set(data.option);
      if (d === 'number') set(String(data.value));
      push();
    } };
  card.hass = hass;
}
extra = await glbFor(MODEL);
const tmCfg = () => INTEG === 'fleet_tm' ? { teslamate_device_id: TM } : {};
card.setConfig({ car_model: MODEL, color: q.get('color') || 'pearl_white', interior: q.get('int') || 'white', theme: q.get('theme') || 'auto', ...extra, ...tmCfg(), ...(q.get('fb') === '0' ? { feedback: false } : {}), ...(q.get('nocar') ? { device_id: 'none' } : {}), ...(q.get('h') ? { height: q.get('h') } : {}) });
push();
document.getElementById('app').appendChild(card);
window.__card = card;

// editor do cartão num painel por cima (mockup: opção "Editor"; teste: ?ed=1)
const edPanel = document.createElement('div'); edPanel.id = 'edpanel'; edPanel.style.display = 'none';
const edCss = document.createElement('style');
edCss.textContent = `#edpanel{position:fixed;z-index:50;right:16px;top:64px;width:380px;max-width:calc(100vw - 32px);max-height:calc(100vh - 80px);overflow:auto;box-sizing:border-box;padding:16px 18px;border-radius:14px;background:#1c1c1e;color:#e6e6e6;font:14px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;box-shadow:0 10px 40px rgba(0,0,0,.5)}
#edpanel h3{margin:0 0 12px;font-size:16px}#edpanel .hf{display:block;margin-bottom:14px}#edpanel .hl{display:block;font-size:12px;color:#9aa0a8;margin-bottom:4px}
#edpanel select,#edpanel input:not([type=checkbox]){width:100%;box-sizing:border-box;padding:8px 10px;border-radius:8px;border:1px solid #3a3a3c;background:#2c2c2e;color:#fff;font:inherit}
#edpanel .hh{display:block;margin-top:5px;font-size:12px;color:#9aa0a8}#edpanel .hm{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:13px}
body.light #edpanel{background:#fff;color:#1b1d20}body.light #edpanel select,body.light #edpanel input:not([type=checkbox]){background:#fff;color:#111;border-color:#ccc}`;
document.head.appendChild(edCss); document.body.appendChild(edPanel);
let edCfg = null, edEl = null;
function showEditor() {
  if (!edEl) {
    edEl = document.createElement('garage-for-tesla-card-editor');
    edEl.addEventListener('config-changed', e => { edCfg = e.detail.config; card.setConfig({ ...edCfg, ...extra }); edEl.setConfig(edCfg); });
    edPanel.innerHTML = '<h3>Editor do cartão</h3>'; edPanel.appendChild(edEl);
  }
  const base = { car_model: card._config.car_model, color: card._config.color, interior: card._config.interior || 'white', theme: card._config.theme, ...tmCfg() };
  edEl.hass = hass; edEl.setConfig(base);
}
if (q.get('ed')) { edPanel.style.display = ''; showEditor(); }

// barra de demonstração (só no mockup publicado)
if (demo) {
  // imitação dos formulários de .github/ISSUE_TEMPLATE (os verdadeiros só existem depois de publicados)
  const FORMS = {
    'problem.yml': { name: 'Report a problem', intro: 'Thanks for helping!', f: [['What happened? *', 'What did you do, and what did the card show?', 4], ['What did you expect?', '', 2], ['Screenshot (optional)', 'Drag or paste an image here.', 2]] },
    'suggestion.yml': { name: 'Suggest an idea', intro: 'Thanks for the idea!', f: [['What would you like to see? *', '', 5]] },
  };
  card.shadowRoot.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('.fb a'); if (!a) return;
    e.preventDefault();
    const u = new URL(a.href), f = FORMS[u.searchParams.get('template')], dk = !document.body.classList.contains('light');
    const C = dk ? { bg: '#16181d', fg: '#e6e6e6', s: '#9aa0a8', l: '#343a43', i: '#0e1014' } : { bg: '#fff', fg: '#1b1d20', s: '#5b626b', l: '#cfd4da', i: '#fff' };
    const ta = (rows, v) => { const t = document.createElement('textarea'); t.rows = rows; t.value = v || ''; t.style.cssText = `width:100%;box-sizing:border-box;margin-top:6px;padding:8px 10px;border-radius:8px;border:1px solid ${C.l};background:${C.i};color:${C.fg};font:14px/1.45 inherit;font-family:inherit;resize:vertical`; return t; };
    const o = document.createElement('div'); o.id = 'fbmock'; o.style.cssText = 'position:fixed;inset:0;z-index:99;background:rgba(0,0,0,.55);overflow:auto;padding:24px 16px;box-sizing:border-box';
    const p = document.createElement('div'); p.style.cssText = `max-width:640px;margin:0 auto;padding:20px;box-sizing:border-box;border-radius:14px;background:${C.bg};color:${C.fg};font-size:14px;line-height:1.45`;
    p.innerHTML = `<div style="padding:8px 12px;border-radius:8px;margin-bottom:16px;background:rgba(255,159,10,.18);font-size:13px">Imitação só para o protótipo: no cartão a sério abre o formulário no GitHub. Nada é enviado daqui.</div><h2 style="margin:0 0 4px;font-size:20px">${f.name}</h2><p style="margin:0 0 16px;color:${C.s}">${f.intro} English or Portuguese, as you prefer. <i>(Podes escrever em português.)</i><br>This page is public: please leave out your licence plate, VIN and location.</p>`;
    const add = (l, d, t) => { const w = document.createElement('label'); w.style.cssText = 'display:block;margin-bottom:16px'; w.innerHTML = `<b>${l}</b>${d ? `<div style="color:${C.s};font-size:13px">${d}</div>` : ''}`; w.appendChild(t); p.appendChild(w); };
    add('Title *', '', ta(1)); f.f.forEach(([l, d, r]) => add(l, d, ta(r)));
    const info = u.searchParams.get('info') || ''; add('Card details', 'Filled in by the card. You can change or delete anything here.', ta(info.split('\n').length, info));
    const b = document.createElement('button'); b.textContent = 'Fechar'; b.style.cssText = `width:100%;height:44px;border:0;border-radius:10px;font:600 15px inherit;font-family:inherit;background:${C.fg};color:${C.bg};cursor:pointer`; b.onclick = () => o.remove(); p.appendChild(b);
    o.appendChild(p); document.body.appendChild(o);
  });
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
    <label><input type="checkbox" id="dUnl"> Destrancado</label>
    <label><input type="checkbox" id="dMob"> Telemóvel</label>
    <label>Integração <select id="dIntg"><option value="tessie">Tessie / Teslemetry / Fleet</option><option value="custom">Tesla Custom</option><option value="teslamate">Só TeslaMate</option><option value="fleet_tm">Tesla Fleet + TeslaMate</option></select></label>
    <label><input type="checkbox" id="dEd"> Editor</label>`;
  const app = document.getElementById('app');
  const apply = () => {
    card.setConfig({ car_model: C.model, color: C.color, interior: C.interior, theme: C.theme, ...extra, ...tmCfg() });
    const chg = C.chg ? 'charging' : 'disconnected';
    const put = (id, st) => { if (states[id]) states[id] = { ...states[id], state: st }; };
    if (INTEG !== 'teslamate') {
      const cab = 'binary_sensor.' + P + (CUSTOM ? 'charger' : 'cabo_de_carregamento'), sw = 'switch.' + P + (CUSTOM ? 'charger' : 'carregar');
      if (!CUSTOM) states['sensor.' + P + 'a_carregar'] = { ...states['sensor.' + P + 'a_carregar'], state: chg };
      states[cab] = { ...states[cab], state: C.chg ? 'on' : 'off', attributes: CUSTOM ? { ...states[cab].attributes, charging_state: TC_STATE[chg] } : states[cab].attributes };
      states[sw] = { ...states[sw], state: C.chg ? 'on' : 'off' };
      states['binary_sensor.' + P + 'aviso_de_pressao_do_pneu_traseiro_esquerdo'] = { ...states['binary_sensor.' + P + 'aviso_de_pressao_do_pneu_traseiro_esquerdo'], state: C.tw ? 'on' : 'off' };
      states['sensor.' + P + 'pressao_do_pneu_traseiro_esquerdo'] = { ...states['sensor.' + P + 'pressao_do_pneu_traseiro_esquerdo'], state: C.tw ? '2.4' : '2.9' };
      states['binary_sensor.' + P + 'porta_da_frente_do_condutor'] = { ...states['binary_sensor.' + P + 'porta_da_frente_do_condutor'], state: C.door ? 'on' : 'off' };
    }
    // TeslaMate: os mesmos interruptores do mockup
    put('sensor.' + TP + 'charging_state', C.chg ? 'Charging' : 'Disconnected'); put('binary_sensor.' + TP + 'charging_state', C.chg ? 'on' : 'off');
    put('sensor.' + TP + 'state', C.chg ? 'Charging' : 'Online'); put('sensor.' + TP + 'charger_power', C.chg ? '11' : '0');
    put('binary_sensor.' + TP + 'plugged_in', C.chg ? 'on' : 'off'); put('binary_sensor.' + TP + 'charge_port_door_open', C.chg ? 'on' : 'off');
    put('binary_sensor.' + TP + 'tpms_soft_warning_rl', C.tw ? 'on' : 'off'); put('sensor.' + TP + 'tpms_pressure_rl', C.tw ? '2.4' : '2.9');
    put('binary_sensor.' + TP + 'driver_front_door_open', C.door ? 'on' : 'off'); put('binary_sensor.' + TP + 'doors_open', C.door ? 'on' : 'off');
    put('lock.' + P + 'fechadura', C.unl ? 'unlocked' : 'locked'); put('binary_sensor.' + TP + 'locked', C.unl ? 'on' : 'off');
    edPanel.style.display = C.ed ? '' : 'none'; if (C.ed) showEditor();
    LAG = CUSTOM ? 30000 : 0;   // Tesla Custom: o HA só sabe do clima na leitura seguinte
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
  demo.querySelector('#dUnl').onchange = e => { C.unl = e.target.checked; apply(); };
  demo.querySelector('#dMob').onchange = e => { C.mobile = e.target.checked; apply(); };
  demo.querySelector('#dIntg').value = INTEG;
  demo.querySelector('#dIntg').onchange = e => { INTEG = e.target.value; CUSTOM = INTEG === 'custom'; setup(); apply(); };
  demo.querySelector('#dEd').onchange = e => { C.ed = e.target.checked; apply(); };
  apply();
}
