// Ligações "Dar sugestão" / "Reportar problema": abrem um formulário no GitHub já com os dados técnicos.
// Só vai o que está em details(): nunca o nome do carro, matrícula, localização ou nomes de entidades. Nada é enviado pelo cartão.
export const REPO = 'https://github.com/diogopires21-alt/garage-for-tesla';

// app do HA ou navegador (sem modelo do aparelho)
export function client(ua = navigator.userAgent) {
  const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS X|Macintosh/.test(ua) ? 'macOS' : /CrOS/.test(ua) ? 'ChromeOS' : /Linux/.test(ua) ? 'Linux' : '';
  let m, app = 'Browser';
  if (/Home ?Assistant/i.test(ua)) app = 'Home Assistant app';
  else if ((m = ua.match(/Edg\w*\/(\d+)/))) app = 'Edge ' + m[1];
  else if ((m = ua.match(/(?:Firefox|FxiOS)\/(\d+)/))) app = 'Firefox ' + m[1];
  else if ((m = ua.match(/(?:Chrome|CriOS)\/(\d+)/))) app = 'Chrome ' + m[1];
  else if ((m = ua.match(/Version\/(\d+).*Safari/))) app = 'Safari ' + m[1];
  return os ? app + ' · ' + os : app;
}

export function details(d) {
  return [['Card', d.version], ['3D model', d.model], ['Integration', d.integration], ['Home Assistant', d.ha], ['Opened in', d.client]]
    .map(([k, v]) => `${k}: ${v || 'unknown'}`).join('\n');
}

export function feedbackUrl(kind, d) {
  const p = new URLSearchParams(kind === 'bug' ? { template: 'problem.yml', info: details(d) } : { template: 'suggestion.yml', info: 'Card: ' + d.version });
  return `${REPO}/issues/new?${p.toString().replace(/\+/g, '%20')}`;
}
