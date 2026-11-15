import { SLOTS, COLORS, MODELS, DEFAULT_SHORTCUTS, HIDDEN_BY_DEFAULT, TAG_KEYS, detectEntities, findTeslaVehicle } from './slots.js';
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
    ];
  }

  _render() {
    if (!this._hass || !this._config) return;
    if (!this._form) {
      this._form = document.createElement('ha-form');
      this._form.computeLabel = s => t(this._hass, 'ed_' + (s.name === 'device_id' ? 'device' : s.name));
      this._form.addEventListener('value-changed', e => {
        const cfg = Object.assign({}, e.detail.value);
        for (const k of Object.keys(cfg)) if (cfg[k] === '' || cfg[k] == null) delete cfg[k];
        this._config = cfg;
        this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: cfg }, bubbles: true, composed: true }));
      });
      this.appendChild(this._form);
    }
    const h = this._hass, dev = this._config.device_id || findTeslaVehicle(h), found = detectEntities(h, dev);
    const data = Object.assign({ car_model: 'model3_highland', color: 'pearl_white', interior: 'white', theme: 'auto' }, this._config);
    if (!data.shortcuts) data.shortcuts = DEFAULT_SHORTCUTS.filter(k => found[k]);
    if (data.menu) data.menu = data.menu.filter(k => !TAG_KEYS.includes(k) && (k === 'climate' || !data.shortcuts.includes(k)));
    if (!data.menu) data.menu = Object.keys(SLOTS).filter(k => SLOTS[k].kind === 'action' && found[k] && !HIDDEN_BY_DEFAULT.includes(k) && !TAG_KEYS.includes(k) && (k === 'climate' || !data.shortcuts.includes(k)));
    this._form.hass = h; this._form.data = data; this._form.schema = this._schema();
  }
}
if (!customElements.get('garage-for-tesla-card-editor')) customElements.define('garage-for-tesla-card-editor', GarageForTeslaCardEditor);
