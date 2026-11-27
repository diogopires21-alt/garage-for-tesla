const STR = {
  en: {
    sc_climate: 'Climate', sc_windows: 'Windows', sec_security: 'Security', sec_climate: 'Climate', sec_charging: 'Charging', sec_access: 'Doors & windows', sec_actions: 'Quick actions',
    lock: 'Doors', sentry: 'Sentry Mode', valet: 'Valet Mode', climate: 'Climate', defrost: 'Defrost', steering_heat: 'Heated steering wheel', steering_level: 'Steering wheel heat',
    seat_fl: 'Driver seat', seat_fr: 'Passenger seat', seat_rl: 'Rear left seat', seat_rr: 'Rear right seat',
    charge: 'Charging', charge_port: 'Charge port', charge_limit: 'Charge limit', charge_amps: 'Charge current',
    frunk: 'Frunk', trunk: 'Trunk', windows: 'Vent windows', flash: 'Flash', honk: 'Honk', wake: 'Wake up', homelink: 'HomeLink', boombox: 'Boombox', keyless: 'Keyless driving',
    locked: 'Locked', unlocked: 'Unlocked', on: 'On', off: 'Off', open: 'Open', closed: 'Closed', vented: 'Vented',
    s_open: 'Open', s_close: 'Close', s_vent: 'Vent', s_unlock: 'Unlock', s_lock: 'Lock', press: 'Run',
    parked: 'Parked', driving: 'Driving', charging_s: 'Charging', plugged: 'Plugged in', complete: 'Charge complete', asleep: 'Asleep', offline: 'Offline', home: 'Home', away: 'Away',
    until: 'until', left: 'left', inside: 'Inside', outside: 'Outside', odometer: 'Odometer', tyres: 'Tyres',
    confirm: 'Confirm', cancel: 'Cancel', close: 'Close', confirm_q: 'Are you sure?',
    m_lock: 'Anyone next to the car will be able to open it.', m_frunk: 'The frunk has to be closed by hand.', m_trunk: '', v_unlock: 'Unlock', v_open: 'Open', v_ok: 'Confirm', v_enable: 'Enable', c_lock: 'Unlock the car?', c_frunk: 'Open the frunk?', c_trunk: 'Open the trunk?', c_valet: 'Change Valet Mode?', c_keyless: 'Enable keyless driving?',
    door_open: 'door open', doors_open: 'doors open', update: 'Software update available', no_car: 'No Tesla found. Pick your car in the card settings.',
    model_credit: '3D model', failed: 'Command failed', hand_trunk: 'The trunk has to be closed by hand.', seat_heat: 'Heat', seat_cool: 'Ventilate', seat_mode: 'Heat or ventilate', done_ok: 'Done', temp: 'Temperature',
    s_off: 'Off', s_low: 'Low', s_med: 'Medium', s_high: 'High', amps: 'A',
    ed_device: 'Car', ed_car_model: '3D model', ed_interior: 'Interior', int_white: 'White', int_black: 'Black', ed_name: 'Name (optional)', ed_color: 'Paint colour', ed_theme: 'Theme', ed_shortcuts: 'Shortcuts (bottom row)', ed_menu: 'Controls in the menu',
    ed_teslamate: 'TeslaMate data (optional)', ed_teslamate_help: 'Battery, charging, doors and tyres come from TeslaMate, which updates more often. The buttons still use the car above.', ed_auto_car: 'Found automatically', ed_readonly: 'read only, no buttons',
    ed_charger: 'Charger next to the car', wc_plugged: 'Only while plugged in', wc_always: 'Always', wc_off: 'Never',
    ed_charger_help: 'Wall Connector when charging at a normal (AC) charger, Supercharger when fast charging. "Always" also shows the Wall Connector, with the cable coiled, when the car is unplugged.',
    ed_auto: 'Follow Home Assistant', ed_light: 'Light', ed_dark: 'Dark', ed_height: 'Height (optional, e.g. 720px)', ed_feedback: 'Show "Suggest an idea" and "Report a problem"', fb_idea: 'Suggest an idea', fb_bug: 'Report a problem',
    pearl_white: 'Pearl White', stealth_grey: 'Stealth Grey', quicksilver: 'Quicksilver', diamond_black: 'Diamond Black', solid_black: 'Solid Black', ultra_red: 'Ultra Red', deep_blue: 'Deep Blue', marine_blue: 'Marine Blue', red_multicoat: 'Red Multi-Coat', midnight_silver: 'Midnight Silver', silver_metallic: 'Silver Metallic', glacier_blue: 'Glacier Blue', frost_blue: 'Frost Blue', coastal_blue: 'Coastal Blue', midnight_cherry: 'Midnight Cherry Red',
  },
  pt: {
    sc_climate: 'Clima', sc_windows: 'Janelas', sec_security: 'Segurança', sec_climate: 'Clima', sec_charging: 'Carregamento', sec_access: 'Portas e janelas', sec_actions: 'Ações rápidas',
    lock: 'Portas', sentry: 'Modo Sentinela', valet: 'Modo Valet', climate: 'Climatização', defrost: 'Descongelar', steering_heat: 'Volante aquecido', steering_level: 'Aquecimento do volante',
    seat_fl: 'Banco do condutor', seat_fr: 'Banco do passageiro', seat_rl: 'Banco traseiro esq.', seat_rr: 'Banco traseiro dir.',
    charge: 'Carregamento', charge_port: 'Porta de carga', charge_limit: 'Limite de carga', charge_amps: 'Corrente de carga',
    frunk: 'Frunk', trunk: 'Bagageira', windows: 'Ventilar janelas', flash: 'Luzes', honk: 'Buzina', wake: 'Acordar', homelink: 'HomeLink', boombox: 'Boombox', keyless: 'Condução sem chave',
    locked: 'Trancado', unlocked: 'Destrancado', on: 'Ligado', off: 'Desligado', open: 'Aberto', closed: 'Fechado', vented: 'Ventiladas',
    s_open: 'Abrir', s_close: 'Fechar', s_vent: 'Ventilar', s_unlock: 'Destrancar', s_lock: 'Trancar', press: 'Executar',
    parked: 'Estacionado', driving: 'A conduzir', charging_s: 'A carregar', plugged: 'Cabo ligado', complete: 'Carga concluída', asleep: 'A dormir', offline: 'Sem ligação', home: 'Em casa', away: 'Fora de casa',
    until: 'até', left: 'restantes', inside: 'Dentro', outside: 'Fora', odometer: 'Odómetro', tyres: 'Pneus',
    confirm: 'Confirmar', cancel: 'Cancelar', close: 'Fechar', confirm_q: 'Tens a certeza?',
    m_lock: 'Qualquer pessoa junto ao carro o pode abrir.', m_frunk: 'O frunk tem de ser fechado à mão.', m_trunk: '', v_unlock: 'Destrancar', v_open: 'Abrir', v_ok: 'Confirmar', v_enable: 'Ativar', c_lock: 'Destrancar o carro?', c_frunk: 'Abrir o frunk?', c_trunk: 'Abrir a bagageira?', c_valet: 'Mudar o Modo Valet?', c_keyless: 'Ativar a condução sem chave?',
    door_open: 'porta aberta', doors_open: 'portas abertas', update: 'Há uma atualização de software', no_car: 'Não encontrei nenhum Tesla. Escolhe o carro nas definições do cartão.',
    model_credit: 'Modelo 3D', failed: 'O comando falhou', hand_trunk: 'A bagageira tem de ser fechada à mão.', seat_heat: 'Aquecer', seat_cool: 'Ventilar', seat_mode: 'Aquecer ou ventilar', done_ok: 'Feito', temp: 'Temperatura',
    s_off: 'Desligado', s_low: 'Baixo', s_med: 'Médio', s_high: 'Alto', amps: 'A',
    ed_device: 'Carro', ed_car_model: 'Modelo 3D', ed_interior: 'Interior', int_white: 'Branco', int_black: 'Preto', ed_name: 'Nome (opcional)', ed_color: 'Cor da pintura', ed_theme: 'Tema', ed_shortcuts: 'Atalhos (fila de baixo)', ed_menu: 'Controlos no menu',
    ed_teslamate: 'Dados do TeslaMate (opcional)', ed_teslamate_help: 'A bateria, a carga, as portas e os pneus passam a vir do TeslaMate, que atualiza mais vezes. Os botões continuam a usar o carro acima.', ed_auto_car: 'Encontrado sozinho', ed_readonly: 'só leitura, sem botões',
    ed_charger: 'Carregador ao lado do carro', wc_plugged: 'Só com o cabo ligado', wc_always: 'Sempre', wc_off: 'Nunca',
    ed_charger_help: 'Wall Connector nas cargas normais e Supercharger nas cargas rápidas. "Sempre" mostra também o Wall Connector, com o cabo enrolado, quando o carro não está ligado.',
    ed_auto: 'Igual ao Home Assistant', ed_light: 'Claro', ed_dark: 'Escuro', ed_height: 'Altura (opcional, ex.: 720px)', ed_feedback: 'Mostrar "Dar sugestão" e "Reportar problema"', fb_idea: 'Dar sugestão', fb_bug: 'Reportar problema',
    pearl_white: 'Branco Pérola', stealth_grey: 'Cinzento Stealth', quicksilver: 'Quicksilver', diamond_black: 'Preto Diamante', solid_black: 'Preto Sólido', ultra_red: 'Vermelho Ultra', deep_blue: 'Azul Profundo', marine_blue: 'Azul Marinho', red_multicoat: 'Vermelho Multicamada', midnight_silver: 'Prateado Meia-Noite', silver_metallic: 'Prateado Metalizado', glacier_blue: 'Azul Glaciar', frost_blue: 'Azul Gelo', coastal_blue: 'Azul Costeiro', midnight_cherry: 'Vermelho Cereja Meia-Noite',
  },
};

export function lang(hass) {
  const l = ((hass && (hass.locale && hass.locale.language || hass.language)) || 'en').toLowerCase();
  return l.startsWith('pt') ? 'pt' : 'en';
}
export function t(hass, key) {
  const L = STR[lang(hass)];
  return (L && L[key]) || STR.en[key] || key;
}
