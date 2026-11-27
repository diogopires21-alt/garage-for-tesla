// Mapa de "slots": o que o cartão sabe mostrar/controlar e como encontrar a entidade certa.
// tk = translation_key usada pelas integrações oficiais (Tessie, Teslemetry, Tesla Fleet)
// re = expressão para o object_id (fallback, ex.: Tesla Custom Integration / alandtse)
// kind: 'info' = métrica (aparece no carro/cabeçalho), 'action' = comando (menu e atalhos)

export const SLOTS = {
  // ---------- informação ----------
  battery:       { d: 'sensor', kind: 'info', tk: ['charge_state_usable_battery_level', 'charge_state_battery_level'], re: /(_battery(_level)?|usable_battery_level|nivel_da_bateria)$/, tm: ['usable_battery_level', 'battery_level'] },
  range:         { d: 'sensor', kind: 'info', tk: ['charge_state_battery_range', 'charge_state_est_battery_range'], re: /(_range|battery_range|autonomia_da_bateria)$/, tm: ['rated_battery_range', 'rated_battery_range_km', 'est_battery_range', 'est_battery_range_km'] },
  charging:      { d: 'sensor', kind: 'info', tk: ['charge_state_charging_state'], re: /(charging_state|_charging|a_carregar)$/, tm: ['charging_state'] },
  charge_power:  { d: 'sensor', kind: 'info', tk: ['charge_state_charger_power'], re: /(charger_power|charging_power|potencia_do_carregador)$/, tm: ['charger_power'] },
  charge_rate:   { d: 'sensor', kind: 'info', tk: ['charge_state_charge_rate'], re: /(charge_rate|charging_rate|taxa_de_carregamento)$/ },
  time_to_full:  { d: 'sensor', kind: 'info', tk: ['charge_state_minutes_to_full_charge'], re: /(minutes_to_full|time_to_full|time_charge_complete|tempo_ate_a_carga_completa)/, tm: ['time_to_full_charge'] },
  energy_added:  { d: 'sensor', kind: 'info', tk: ['charge_state_charge_energy_added'], re: /(energy_added|energia_de_carga_adicionada)$/, tm: ['charge_energy_added'] },
  cable:         { d: 'binary_sensor', kind: 'info', tk: ['charge_state_conn_charge_cable'], re: /(charge_cable|charger|cabo_de_carregamento)$/, tm: ['plugged_in'] },
  odometer:      { d: 'sensor', kind: 'info', tk: ['vehicle_state_odometer'], re: /(odometer|odometro)$/, tm: ['odometer'] },
  inside_temp:   { d: 'sensor', kind: 'info', tk: ['climate_state_inside_temp'], re: /(temperature_inside|inside_temp|temperatura_interior)$/, tm: ['inside_temp'] },
  outside_temp:  { d: 'sensor', kind: 'info', tk: ['climate_state_outside_temp'], re: /(temperature_outside|outside_temp|temperatura_exterior)$/, tm: ['outside_temp'] },
  tpms_fl:       { d: 'sensor', kind: 'info', tk: ['vehicle_state_tpms_pressure_fl'], re: /(tpms_front_left|tpms_pressure_fl|pneu_dianteiro_esquerdo)$/, tm: ['tpms_pressure_fl'] },
  tpms_fr:       { d: 'sensor', kind: 'info', tk: ['vehicle_state_tpms_pressure_fr'], re: /(tpms_front_right|tpms_pressure_fr|pneu_dianteiro_direito)$/, tm: ['tpms_pressure_fr'] },
  tpms_rl:       { d: 'sensor', kind: 'info', tk: ['vehicle_state_tpms_pressure_rl'], re: /(tpms_rear_left|tpms_pressure_rl|pneu_traseiro_esquerdo)$/, tm: ['tpms_pressure_rl'] },
  tpms_rr:       { d: 'sensor', kind: 'info', tk: ['vehicle_state_tpms_pressure_rr'], re: /(tpms_rear_right|tpms_pressure_rr|pneu_traseiro_direito)$/, tm: ['tpms_pressure_rr'] },
  tpms_warn_fl:  { d: 'binary_sensor', kind: 'info', tk: ['vehicle_state_tpms_soft_warning_fl'], tm: ['tpms_soft_warning_fl'] },
  tpms_warn_fr:  { d: 'binary_sensor', kind: 'info', tk: ['vehicle_state_tpms_soft_warning_fr'], tm: ['tpms_soft_warning_fr'] },
  tpms_warn_rl:  { d: 'binary_sensor', kind: 'info', tk: ['vehicle_state_tpms_soft_warning_rl'], tm: ['tpms_soft_warning_rl'] },
  tpms_warn_rr:  { d: 'binary_sensor', kind: 'info', tk: ['vehicle_state_tpms_soft_warning_rr'], tm: ['tpms_soft_warning_rr'] },
  shift:         { d: 'sensor', kind: 'info', tk: ['drive_state_shift_state'], re: /(shift_state|estado_da_caixa)$/, tm: ['shift_state'] },
  speed:         { d: 'sensor', kind: 'info', tk: ['drive_state_speed'], re: /(_speed|velocidade)$/, tm: ['speed'] },
  location:      { d: 'device_tracker', kind: 'info', tk: ['location'], re: /(location|localizacao)$/, not: /(route|rota|origin|destination)/, tm: ['location'] },
  online:        { d: 'binary_sensor', kind: 'info', tk: ['state'], re: /(_online|_status|_estado)$/ },
  update:        { d: 'update', kind: 'info', tk: ['update'], re: /(software_update|_update|atualizacao)$/, tm: ['update'] },
  door_df:       { d: 'binary_sensor', kind: 'info', tk: ['vehicle_state_df'], tm: ['driver_front_door_open'] },
  door_dr:       { d: 'binary_sensor', kind: 'info', tk: ['vehicle_state_dr'], tm: ['driver_rear_door_open'] },
  door_pf:       { d: 'binary_sensor', kind: 'info', tk: ['vehicle_state_pf'], tm: ['passenger_front_door_open'] },
  door_pr:       { d: 'binary_sensor', kind: 'info', tk: ['vehicle_state_pr'], tm: ['passenger_rear_door_open'] },

  // TeslaMate (só leitura): o estado do que noutras integrações é um comando; usado só quando não há o comando
  ro_state:      { d: 'sensor', kind: 'info', tm: ['state'] },
  ro_locked:     { d: 'binary_sensor', kind: 'info', tm: ['locked'] },   // on = destrancado
  ro_sentry:     { d: 'binary_sensor', kind: 'info', tm: ['sentry_mode'] },
  ro_climate:    { d: 'binary_sensor', kind: 'info', tm: ['is_climate_on'] },
  ro_frunk:      { d: 'binary_sensor', kind: 'info', tm: ['frunk_open'] },
  ro_trunk:      { d: 'binary_sensor', kind: 'info', tm: ['trunk_open'] },
  ro_port:       { d: 'binary_sensor', kind: 'info', tm: ['charge_port_door_open'] },
  ro_limit:      { d: 'sensor', kind: 'info', tm: ['charge_limit_soc'] },
  // ---------- ações ----------
  lock:          { d: 'lock', kind: 'action', tk: ['vehicle_state_locked'], re: /(_doors|_lock|fechadura)$/, not: /(charge|cabo|cable|latch)/, icon: 'mdi:lock', iconOff: 'mdi:lock-open-variant', confirmOff: true, sec: 'security' },
  sentry:        { d: 'switch', kind: 'action', tk: ['vehicle_state_sentry_mode'], re: /(sentry_mode|modo_sentinela)$/, icon: 'mdi:shield-car', sec: 'security' },
  valet:         { d: 'switch', kind: 'action', tk: ['vehicle_state_valet_mode'], re: /(valet_mode|modo_valet)$/, icon: 'mdi:car-key', confirm: true, sec: 'security' },
  climate:       { d: 'climate', kind: 'action', tk: ['primary', 'driver_temp'], re: /(hvac_climate_system|climatizacao|_climate)$/, not: /(overheat|sobreaquecimento)/, icon: 'mdi:fan', sec: 'climate' },
  defrost:       { d: 'switch', kind: 'action', tk: ['climate_state_defrost_mode'], re: /(defrost|descongelacao)/, icon: 'mdi:car-defrost-front', sec: 'climate' },
  steering_heat: { d: 'switch', kind: 'action', tk: ['climate_state_steering_wheel_heater'], re: /(heated_steering|steering_wheel_heater|aquecedor_do_volante)$/, icon: 'mdi:steering', sec: 'climate' },
  steering_level:{ d: 'select', kind: 'action', tk: ['climate_state_steering_wheel_heat_level'], re: /(heated_steering_wheel)$/, icon: 'mdi:steering', sec: 'climate' },
  seat_fl:       { d: 'select', kind: 'action', tk: ['climate_state_seat_heater_left'], re: /(heated_seat_left|seat_heater_left|aquecedor_do_assento_esquerdo)$/, icon: 'mdi:car-seat-heater', sec: 'climate' },
  seat_fr:       { d: 'select', kind: 'action', tk: ['climate_state_seat_heater_right'], re: /(heated_seat_right|seat_heater_right|aquecedor_do_assento_direito)$/, icon: 'mdi:car-seat-heater', sec: 'climate' },
  seat_rl:       { d: 'select', kind: 'action', tk: ['climate_state_seat_heater_rear_left'], re: /(heated_seat_rear_left|seat_heater_rear_left|assento_traseiro_da_esquerda)$/, icon: 'mdi:car-seat-heater', sec: 'climate' },
  seat_rr:       { d: 'select', kind: 'action', tk: ['climate_state_seat_heater_rear_right'], re: /(heated_seat_rear_right|seat_heater_rear_right|assento_traseiro_da_direita)$/, icon: 'mdi:car-seat-heater', sec: 'climate' },
  // ventilação dos bancos da frente quando vem à parte (Tessie, Teslemetry): usada pela linha do banco (Aquecer/Ventilar), não tem linha própria
  seat_fl_cool:  { d: 'select', kind: 'info', tk: ['climate_state_seat_fan_front_left'] },
  seat_fr_cool:  { d: 'select', kind: 'info', tk: ['climate_state_seat_fan_front_right'] },
  charge:        { d: 'switch', kind: 'action', tk: ['charge_state_charging_state', 'charge_state_charge_enable_request'], re: /(_charger|_charge|_carregar)$/, icon: 'mdi:ev-station', sec: 'charging' },
  charge_port:   { d: 'cover', kind: 'action', tk: ['charge_state_charge_port_door_open'], re: /(charger_door|charge_port|porta_de_carregamento)/, icon: 'mdi:ev-plug-type2', sec: 'charging' },
  charge_limit:  { d: 'number', kind: 'action', tk: ['charge_state_charge_limit_soc'], re: /(charge_limit|limite_de_carga)$/, icon: 'mdi:battery-charging-80', sec: 'charging' },
  charge_amps:   { d: 'number', kind: 'action', tk: ['charge_state_charge_current_request'], re: /(charging_amps|charge_current|corrente_de_carga)$/, icon: 'mdi:current-ac', sec: 'charging' },
  frunk:         { d: 'cover', kind: 'action', tk: ['vehicle_state_ft'], re: /(frunk|bagageira_dianteira)$/, icon: 'mdi:car-select', confirm: true, sec: 'access' },
  trunk:         { d: 'cover', kind: 'action', tk: ['vehicle_state_rt'], re: /(_trunk|_bagageira)$/, icon: 'mdi:car-back', confirm: true, sec: 'access' },
  windows:       { d: 'cover', kind: 'action', tk: ['windows'], re: /(windows|janelas_de_ventilacao)$/, icon: 'mdi:car-door', sec: 'access' },
  flash:         { d: 'button', kind: 'action', tk: ['flash_lights'], re: /(flash_lights|piscar_as_luzes)$/, icon: 'mdi:car-light-high', sec: 'actions' },
  honk:          { d: 'button', kind: 'action', tk: ['honk'], re: /(_horn|_honk|buzina)$/, icon: 'mdi:bullhorn', sec: 'actions' },
  wake:          { d: 'button', kind: 'action', tk: ['wake'], re: /(wake_up|_wake|acordar)$/, icon: 'mdi:sleep-off', sec: 'actions' },
  homelink:      { d: 'button', kind: 'action', tk: ['trigger_homelink', 'homelink'], re: /(homelink)$/, icon: 'mdi:garage-variant', sec: 'actions' },
  boombox:       { d: 'button', kind: 'action', tk: ['boombox'], re: /(boombox|reproduzir_peido)$/, icon: 'mdi:volume-high', sec: 'actions' },
  keyless:       { d: 'button', kind: 'action', tk: ['enable_keyless_driving'], re: /(keyless|conducao_sem_chave|remote_start)/, icon: 'mdi:key-wireless', confirm: true, sec: 'actions' },
};

export const SECTIONS = ['security', 'climate', 'charging', 'access', 'actions'];
export const DEFAULT_SHORTCUTS = ['climate', 'flash', 'honk', 'windows', 'sentry'];
// comandos que já estão presos ao carro em 3D (não se repetem nos atalhos nem no menu)
export const TAG_KEYS = ['lock', 'frunk', 'trunk', 'charge_port'];
export const HIDDEN_BY_DEFAULT = ['boombox', 'keyless', 'steering_level'];

export const ACTION_KEYS = Object.keys(SLOTS).filter(k => SLOTS[k].kind === 'action');

// Modelos 3D disponíveis. Para juntar um novo: pôr o .glb em dist/ e acrescentar aqui.
// paint = nome do material da pintura no .glb; length = comprimento real em metros
export const MODELS = {
  model3_highland: {
    name: 'Model 3 (2024+)', file: 'garage-for-tesla-model3-highland.glb', paint: 'Paint', length: 4.72,
    colors: ['pearl_white', 'stealth_grey', 'quicksilver', 'diamond_black', 'solid_black', 'ultra_red', 'deep_blue', 'marine_blue'],
    credit: { title: '2024 Tesla Model 3', author: 'RBLXSupercars', url: 'https://sketchfab.com/3d-models/2024-tesla-model-3-fd22be415215453693d67e33aa7812d0', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/' },
  },
  model3_classic: {
    name: 'Model 3 (2017–2023)', file: 'garage-for-tesla-model3-classic.glb', paint: 'Paint', length: 4.694,
    colors: ['pearl_white', 'midnight_silver', 'silver_metallic', 'solid_black', 'deep_blue', 'red_multicoat'],
    // zonas medidas no modelo (frações do comprimento, 0 = traseira): portas [fim de trás, pilar B, frente], capô a partir de frunkX
    scene: { trimName: null, regions: { door: [.21, .46, .72], frunkX: .72, trunkX: .17, doorSplit: 'mesh' }, steer: { mat: 'GlossyInterior' } },
    credit: { title: 'Tesla M3 model', author: 'wintrez', url: 'https://sketchfab.com/3d-models/tesla-m3-model-3a602469d7874d1397efa67182198705', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/' },
  },
  modely_juniper: {
    name: 'Model Y (2025+)', file: 'garage-for-tesla-modely-juniper.glb', paint: 'Paint', length: 4.797,
    colors: ['pearl_white', 'stealth_grey', 'quicksilver', 'diamond_black', 'solid_black', 'ultra_red', 'glacier_blue', 'deep_blue', 'marine_blue', 'frost_blue', 'coastal_blue'],
    // no Model Y a carroçaria vem em muitas peças pequenas (portas ~250 vértices); o capô escolhe-se acima de meia altura (o para-choques é maior)
    scene: { trimName: null, regions: { door: [.22, .45, .72], frunkX: .72, trunkX: .17, doorMin: 150, hoodY: .5 }, steer: { mat: 'black_base' }, seatSplit: .41 },   // assento de trás chega a .38: com o corte normal (.37) aquecia com os da frente
    credit: { title: '2025 Tesla Model Y', author: 'BloxBloger', url: 'https://sketchfab.com/3d-models/2025-tesla-model-y-619601e7800d418da5922c4fa7833f74', license: 'CC BY-NC 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-nc/4.0/', nc: true },
  },
  modely_classic: {
    name: 'Model Y (2020–2024)', file: 'garage-for-tesla-modely-classic.glb', paint: 'Paint', length: 4.751,
    // Midnight Cherry Red e Quicksilver: só os feitos em Berlim (Europa); Stealth Grey e Ultra Red: a partir de 2023/24
    colors: ['pearl_white', 'midnight_silver', 'stealth_grey', 'quicksilver', 'solid_black', 'deep_blue', 'red_multicoat', 'ultra_red', 'midnight_cherry'],
    scene: { trimName: null, regions: { door: [.22, .45, .72], frunkX: .72, trunkX: .17, doorMin: 150, hoodY: .5, frunkBox: [.76, .97, .58, 1, .15, .85] }, steer: { mat: 'interior' }, seatSplit: .41 },   // idem Juniper
    credit: { title: 'Tesla Model Y 2021', author: '763468712', url: 'https://sketchfab.com/3d-models/tesla-model-y-2021-c0a86cac582d4b33aba0fb1b1912d970', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/' },
  },
};
export const DEFAULT_MODEL = 'model3_highland';

// Todas as cores (aprox.); cada modelo lista em MODELS[...].colors só as que existiram para ele. paint: cor da pintura; m/r: metalizado/rugosidade
export const COLORS = {
  pearl_white:   { hex: '#eceef0', m: .08, r: .22, light: true },
  stealth_grey:  { hex: '#43464b', m: .45, r: .25 },
  quicksilver:   { hex: '#9da1a6', m: .70, r: .20, light: true },
  diamond_black: { hex: '#18191c', m: .55, r: .18 },
  solid_black:   { hex: '#111214', m: .15, r: .16 },
  ultra_red:     { hex: '#a3121c', m: .35, r: .2, vivid: true },
  red_multicoat: { hex: '#8c0f17', m: .35, r: .2, vivid: true },
  midnight_silver: { hex: '#50545a', m: .60, r: .22 },
  midnight_cherry: { hex: '#4a0c16', m: .55, r: .2, vivid: true },
  silver_metallic: { hex: '#b1b5b9', m: .75, r: .20, light: true },
  glacier_blue:  { hex: '#aebfcb', m: .25, r: .24, light: true },
  frost_blue:    { hex: '#8fa8bd', m: .60, r: .20, light: true },
  coastal_blue:  { hex: '#2f5f9a', m: .55, r: .22, vivid: true },
  deep_blue:     { hex: '#1f3b6c', m: .55, r: .22, vivid: true },
  marine_blue:   { hex: '#2b507c', m: .50, r: .22, vivid: true },
};

// Integração de cada dispositivo (pela plataforma das entidades dele)
const slug = x => String(x || '').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const devEnts = (hass, id) => Object.values((hass && hass.entities) || {}).filter(e => e.device_id === id);
// TeslaMate: carro "Tesla" criado por MQTT (descoberta automática ou o YAML antigo), sensores sensor.tesla_<nome>
export function isTeslaMate(hass, deviceId) {
  const ents = devEnts(hass, deviceId);
  return ents.some(e => e.platform === 'mqtt') && ents.some(e => /_(since|healthy|display_name|usable_battery_level)(_\d+)?$/.test(e.entity_id));
}
const PLATFORMS = { tessie: 'Tessie', teslemetry: 'Teslemetry', tesla_fleet: 'Tesla Fleet', tesla_custom: 'Tesla Custom', mqtt: 'MQTT' };
export function integrationName(hass, deviceId) {
  if (!deviceId) return '';
  if (isTeslaMate(hass, deviceId)) return 'TeslaMate';
  const p = devEnts(hass, deviceId).map(e => e.platform).find(Boolean);
  return p ? PLATFORMS[p] || p : '';
}

// Encontra a entidade de cada slot num dispositivo
export function detectEntities(hass, deviceId) {
  const out = {};
  if (!hass || !hass.entities || !deviceId) return out;
  const ents = devEnts(hass, deviceId);
  if (isTeslaMate(hass, deviceId)) {
    // nomes do TeslaMate: tesla_<nome> (ou <nome do carro>_<nome>), _2, _3… quando há mais de um carro
    const d = hass.devices && hass.devices[deviceId], pre = [...new Set(['tesla', slug(d && d.name_by_user), slug(d && d.name)].filter(Boolean))];
    for (const [key, s] of Object.entries(SLOTS)) {
      if (!s.tm) continue;
      const dom = ents.filter(e => e.entity_id.split('.')[0] === s.d);
      for (const n of s.tm) {
        const re = new RegExp(`^(${pre.join('|')})_${n}(_\\d+)?$`);
        const hit = dom.find(e => re.test(e.entity_id.split('.')[1]));
        if (hit) { out[key] = hit.entity_id; break; }
      }
    }
    return out;
  }
  for (const [key, s] of Object.entries(SLOTS)) {
    if (!s.tk && !s.re) continue;
    const dom = ents.filter(e => e.entity_id.split('.')[0] === s.d);
    let hit = s.tk && dom.find(e => s.tk.includes(e.translation_key));
    if (!hit && s.re) {
      hit = dom.find(e => {
        const oid = e.entity_id.split('.')[1];
        return s.re.test(oid) && !(s.not && s.not.test(oid));
      });
    }
    if (hit) out[key] = hit.entity_id;
  }
  return out;
}

// Primeiro carro Tesla no HA (para funcionar sem configuração)
export function findTeslaVehicle(hass) {
  if (!hass || !hass.devices) return null;
  const devs = Object.values(hass.devices).filter(d => /tesla/i.test(d.manufacturer || '') && !/wall|powerwall|gateway|energy|connector/i.test(d.model || ''));
  const ents = Object.values(hass.entities || {});
  const isCar = d => ents.some(e => e.device_id === d.id && (e.entity_id.startsWith('lock.') || e.entity_id.startsWith('climate.')));
  // sem carro com comandos: o carro do TeslaMate (só leitura)
  const car = devs.find(isCar) || devs.find(d => isTeslaMate(hass, d.id)) || null;
  return car ? car.id : null;
}
