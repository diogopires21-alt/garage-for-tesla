import { SLOTS, COLORS, MODELS, DEFAULT_SHORTCUTS, HIDDEN_BY_DEFAULT, TAG_KEYS, detectEntities, findTeslaVehicle, integrationName, isTeslaMate } from './slots.js';
import { t } from './i18n.js';

class GarageForTeslaCardEditor extends HTMLElement {
  setConfig(config) { this._config = Object.assign({}, config); this._render(); }
  set hass(h) { this._hass = h; this._render(); }

  _schema() {
    const h = this._hass, dev = this._config.device_id || findTeslaVehicle(h);
    const found = detectEntities(h, dev);
    const actions = Object.keys(SLOTS).filter(k => SLOTS[k].kind === 'action' && found[k] && !TAG_KEYS.includes(k));
    const sc = this._config.shortcuts || DEFAULT_SHORTCUTS;
    const opt = k => ({ value: k, label: t(h, k) });
    return [
      { name: 'device_id', selector: { device: { filter: { manufacturer: 'Tesla' } } } },
      // só aparece quando há um carro do TeslaMate no HA e o carro escolhido não é ele
      ...(this._tmDevices(h).length && !isTeslaMate(h, dev) ? [{ name: 'teslamate_device_id', selector: { device: { filter: { integration: 'mqtt', manufacturer: 'Tesla' } } } }] : []),
      { name: 'name', selector: { text: {} } },
      { name: 'car_model', selector: { select: { mode: 'dropdown', options: Object.entries(MODELS).map(([k, m]) => ({ value: k, label: m.name })) } } },
      { type: 'grid', name: '', schema: [
        { name: 'color', selector: { select: { mode: 'dropdown', options: ((MODELS[this._config.car_model] || MODELS.model3_highland).colors || Object.keys(COLORS)).map(k => ({ value: k, label: t(h, k) })) } } },
        { name: 'interior', selector: { select: { mode: 'dropdown', options: [{ value: 'white', label: t(h, 'int_white') }, { value: 'black', label: t(h, 'int_black') }] } } },
        { name: 'theme', selector: { select: { mode: 'dropdown', options: [{ value: 'auto', label: t(h, 'ed_auto') }, { value: 'light', label: t(h, 'ed_light') }, { value: 'dark', label: t(h, 'ed_dark') }] } } },
      ] },
      { name: 'shortcuts', selector: { select: { multiple: true, mode: 'list', options: actions.map(opt) } } },
      { name: 'menu', selector: { select: { multiple: true, mode: 'list', options: actions.filter(k => k === 'climate' || !sc.includes(k)).map(opt) } } },
      { name: 'height', selector: { text: {} } },
      { name: 'feedback', selector: { boolean: {} } },
    ];
  }

  _tmDevices(h) { return Object.keys((h && h.devices) || {}).filter(id => /tesla/i.test(h.devices[id].manufacturer || '') && isTeslaMate(h, id)); }
  // por baixo do campo "Carro": nome e integração do carro que o cartão está a usar (ex.: "K.I.T.T. · Tessie")
  _helper(s) {
    const h = this._hass, c = this._config;
    if (s.name === 'device_id') {
      const id = c.device_id || findTeslaVehicle(h), d = id && h.devices && h.devices[id]; if (!d) return '';
      const txt = [d.name_by_user || d.name, integrationName(h, id)].filter(Boolean).join(' · ');
      return (c.device_id ? '' : t(h, 'ed_auto_car') + ': ') + txt + (isTeslaMate(h, id) ? ' · ' + t(h, 'ed_readonly') : '');
    }
    if (s.name === 'teslamate_device_id') return t(h, 'ed_teslamate_help');
    return '';
  }

  _render() {
    if (!this._hass || !this._config) return;
    if (!this._form) {
      this._form = document.createElement('ha-form');
      this._form.computeLabel = s => t(this._hass, 'ed_' + ({ device_id: 'device', teslamate_device_id: 'teslamate' }[s.name] || s.name));
      this._form.computeHelper = s => this._helper(s);
      this._form.addEventListener('value-changed', e => {
        const cfg = Object.assign({}, e.detail.value);
        for (const k of Object.keys(cfg)) if (cfg[k] === '' || cfg[k] == null) delete cfg[k];
        this._config = cfg;
        this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: cfg }, bubbles: true, composed: true }));
      });
      this.appendChild(this._form);
    }
    const h = this._hass, dev = this._config.device_id || findTeslaVehicle(h), found = detectEntities(h, dev);
    const data = Object.assign({ car_model: 'model3_highland', color: 'pearl_white', interior: 'white', theme: 'auto', feedback: true }, this._config);
    if (!data.shortcuts) data.shortcuts = DEFAULT_SHORTCUTS.filter(k => found[k]);
    if (data.menu) data.menu = data.menu.filter(k => !TAG_KEYS.includes(k) && (k === 'climate' || !data.shortcuts.includes(k)));
    if (!data.menu) data.menu = Object.keys(SLOTS).filter(k => SLOTS[k].kind === 'action' && found[k] && !(HIDDEN_BY_DEFAULT.includes(k) && !(k === 'steering_level' && !found.steering_heat)) && !TAG_KEYS.includes(k) && (k === 'climate' || !data.shortcuts.includes(k)));
    this._form.hass = h; this._form.data = data; this._form.schema = this._schema();
  }
}
if (!customElements.get('garage-for-tesla-card-editor')) customElements.define('garage-for-tesla-card-editor', GarageForTeslaCardEditor);
