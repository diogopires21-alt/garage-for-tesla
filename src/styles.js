export const CSS = `
:host{display:block;height:100%}
ha-card{height:100%;overflow:hidden;border-radius:var(--ha-card-border-radius,16px);border:none;background:none}
*{box-sizing:border-box}
.root{
  --font:-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display","Helvetica Neue","Inter",var(--ha-font-family-body,Roboto),Arial,sans-serif;
  --ease:cubic-bezier(.25,.1,.25,1);--spring:cubic-bezier(.175,.885,.32,1.275);
  font-family:var(--font);-webkit-font-smoothing:antialiased;
  position:relative;display:grid;grid-template-columns:1fr;height:var(--gft-h,calc(100vh - var(--header-height,56px)));min-height:560px;
  color:var(--fg);background:var(--edge);overflow:hidden}
.root.dark{--fg:#fff;--fg2:rgba(235,235,245,.62);--fg3:rgba(235,235,245,.32);--panel:#151517;--row:#232326;--row2:#2e2e32;--sep:rgba(84,84,88,.55);
  --blue:#0A84FF;--green:#30D158;--orange:#FF9F0A;--red:#FF453A;--indigo:#5E5CE6;--gray:#8E8E93;--yellow:#FFD60A;--chip:rgba(36,36,40,.72);--chip-b:rgba(255,255,255,.08);--track:#39393d}
.root.light{--fg:#000;--fg2:rgba(60,60,67,.62);--fg3:rgba(60,60,67,.3);--panel:#f2f2f7;--row:#fff;--row2:#e9e9ee;--sep:rgba(60,60,67,.22);
  --blue:#007AFF;--green:#34C759;--orange:#FF9500;--red:#FF3B30;--indigo:#5856D6;--gray:#8E8E93;--yellow:#FFCC00;--chip:rgba(255,255,255,.78);--chip-b:rgba(0,0,0,.06);--track:#e9e9ea}
button{font:inherit;color:inherit;border:0;background:none;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent}
button:focus-visible{outline:3px solid color-mix(in srgb,var(--blue) 55%,transparent);outline-offset:2px}
ha-icon{--mdc-icon-size:22px;display:inline-flex}

/* ---------- palco ---------- */
.stage{position:relative;min-width:0;overflow:hidden;color:var(--fg);background:radial-gradient(ellipse 72% 62% at 50% 46%,var(--center) 0%,var(--mid) 45%,var(--edge) 100%);transition:background .8s var(--ease)}
canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;outline:none}
.loading{position:absolute;inset:0;display:grid;place-items:center;color:var(--fg2);font-size:15px;transition:opacity .5s}
.loading.done{opacity:0;pointer-events:none}

.hdr{position:absolute;left:32px;top:28px;right:32px;pointer-events:none;display:flex;flex-direction:column;gap:6px}
.hdr .name{font-size:34px;line-height:1.1;font-weight:700;letter-spacing:.2px;font-family:"SF Pro Display",var(--font)}
.batt{display:flex;align-items:center;gap:10px;font-size:17px;font-weight:600;margin-top:2px}
.batt .cell{position:relative;width:34px;height:15px;border-radius:5px;border:1.5px solid var(--fg3);padding:1.5px}
.batt .cell:after{content:"";position:absolute;right:-4.5px;top:4px;width:2.5px;height:5px;border-radius:0 2px 2px 0;background:var(--fg3)}
.batt .fill{display:block;height:100%;border-radius:2.5px;background:var(--fg);transition:width .6s var(--ease)}
.batt.charging .fill{background:var(--green)} .batt.low .fill{background:var(--red)}
.batt .rng{color:var(--fg2);font-weight:500}
.batt .bolt{color:var(--green);--mdc-icon-size:18px;display:none} .batt.charging .bolt{display:inline-flex}
.line{display:flex;align-items:center;gap:6px;font-size:15px;color:var(--fg2)}
.line ha-icon{--mdc-icon-size:16px;opacity:.85}
.dotsep{opacity:.5}
.alerts{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;pointer-events:auto}
.alert{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 12px;border-radius:99px;font-size:13px;font-weight:600;background:color-mix(in srgb,var(--orange) 18%,transparent);color:var(--orange)}
.alert.info{background:color-mix(in srgb,var(--blue) 16%,transparent);color:var(--blue)}
.alert ha-icon{--mdc-icon-size:15px}
.root.light .alert{color:#b25400}.root.light .tyres .tv span.w{color:#b25400}

/* etiquetas presas ao carro */
.tags{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .6s .3s}
.tags.show{opacity:1}
.tag{position:absolute;left:0;top:0;will-change:transform;transition:opacity .25s}
.tag.hide{opacity:0;pointer-events:none}
.tag .dot{position:absolute;left:-3px;top:-3px;width:6px;height:6px;border-radius:50%;background:var(--fg);box-shadow:0 0 0 3px color-mix(in srgb,var(--fg) 18%,transparent)}
.tag .stem{position:absolute;left:-.5px;bottom:0;width:1px;height:var(--h,34px);background:linear-gradient(to top,var(--fg),transparent);opacity:.55}
.tag .pill{position:absolute;bottom:var(--h,34px);left:0;transform:translateX(-50%);pointer-events:auto;display:flex;align-items:center;gap:8px;white-space:nowrap;
  min-height:40px;padding:7px 14px 7px 10px;border-radius:14px;background:var(--chip);border:1px solid var(--chip-b);
  -webkit-backdrop-filter:blur(18px) saturate(170%);backdrop-filter:blur(18px) saturate(170%);box-shadow:0 6px 20px rgba(0,0,0,.18);transition:transform .1s var(--ease),background .2s}
.tag .pill:active{transform:translateX(-50%) scale(.96)}
.tag .pill ha-icon{--mdc-icon-size:20px}
.tag .pill .t{display:flex;flex-direction:column;line-height:1.15;text-align:left}
.tag .pill b{font-size:13px;font-weight:600}
.tag .pill small{font-size:12px;color:var(--fg2)}
.tag .pill small:empty{display:none}
.tag.round .pill{padding:0;width:46px;height:46px;min-height:0;border-radius:50%;justify-content:center}
.tag.round .pill ha-icon{--mdc-icon-size:22px}
.tag.on .pill ha-icon{color:var(--green)}
.tag.warn .pill ha-icon{color:var(--orange)}
.tag.warn .dot{background:var(--orange);box-shadow:0 0 0 3px color-mix(in srgb,var(--orange) 35%,transparent)}
.tag.charging .pill ha-icon{color:var(--green)}
.tag.plugged .pill ha-icon{color:var(--blue)}

/* rodapé do palco */
.foot{position:absolute;left:0;right:var(--menu-w,0px);bottom:0;padding:0 32px 26px;display:grid;grid-template-columns:1fr auto 1fr;align-items:end;gap:16px;pointer-events:none}
.foot>*{pointer-events:auto}
.odo{display:flex;flex-direction:column;gap:2px}
.cap{font-size:12px;font-weight:600;letter-spacing:.4px;text-transform:uppercase;color:var(--fg2)}
.odo .v{font-size:20px;font-weight:600;font-variant-numeric:tabular-nums}
.odo .sub{font-size:13px;color:var(--fg2);margin-top:6px;display:flex;flex-direction:column;gap:2px}
.shortcuts{display:flex;gap:18px;justify-content:center}
.sc{display:flex;flex-direction:column;align-items:center;gap:7px;width:64px}
.sc .c{width:56px;height:56px;border-radius:50%;display:grid;place-items:center;background:var(--chip);border:1px solid var(--chip-b);
  -webkit-backdrop-filter:blur(18px) saturate(170%);backdrop-filter:blur(18px) saturate(170%);transition:transform .1s var(--ease),background .25s,color .25s}
.sc:active .c{transform:scale(.92)}
.sc.on .c{background:var(--blue);color:#fff;border-color:transparent}
.sc .l{font-size:12px;font-weight:500;color:var(--fg2);text-align:center;line-height:1.2}
.sc.busy .c{animation:pulse 1s infinite}
@keyframes pulse{50%{opacity:.55}}
.tyres{justify-self:end;display:flex;flex-direction:column;align-items:center;gap:8px}
.tyres .tv{display:grid;grid-template-columns:40px 34px 40px;grid-template-rows:auto auto;gap:8px 10px;align-items:center;font-size:14px;font-weight:600;font-variant-numeric:tabular-nums}
.tyres .tv svg{grid-row:1 / span 2;grid-column:2;width:34px;height:70px;color:var(--fg3)}
.tyres .tv>span:nth-of-type(odd){text-align:right}.tyres .tv span.w{color:var(--orange)}

/* tema claro com cor forte: palco com texto claro, etiquetas e botões continuam claros */
.stage.vivid{--fg:#fff;--fg2:rgba(255,255,255,.78);--fg3:rgba(255,255,255,.45);--chip:rgba(255,255,255,.88);--chip-b:rgba(0,0,0,.04)}
.stage.vivid .tag .pill,.stage.vivid .sc .c{color:#000}
.stage.vivid .tag .pill small{color:rgba(60,60,67,.65)}
.stage.vivid .sc.on .c{color:#fff}
.stage.vivid .alert{background:rgba(255,255,255,.9);color:#b25400}
.stage.vivid .alert.info{color:#0060df}
.root.light .stage.vivid .tyres .tv span.w{color:#ffd60a}

/* ---------- menu (à direita) ---------- */
.root{--menu-w:388px}
.stage{grid-column:1;grid-row:1}
/* menu flutuante em vidro fosco (estilo "liquid glass") */
.menu{grid-column:1;grid-row:1;justify-self:end;position:relative;z-index:3;width:356px;margin:16px 16px 16px 0;border-radius:28px;
  overflow-y:auto;overscroll-behavior:contain;scrollbar-width:none;padding:22px 16px 18px;display:flex;flex-direction:column;gap:18px;
  background:var(--glass);border:1px solid var(--glass-b);
  -webkit-backdrop-filter:blur(30px) saturate(190%);backdrop-filter:blur(30px) saturate(190%);
  box-shadow:inset 0 1px 0 var(--glass-hi),inset 0 -1px 0 rgba(0,0,0,.08),0 24px 60px rgba(0,0,0,.28)}
.menu::-webkit-scrollbar{display:none}
.root.dark{--glass:linear-gradient(160deg,rgba(255,255,255,.14),rgba(255,255,255,.05) 45%,rgba(255,255,255,.08));--glass-b:rgba(255,255,255,.16);--glass-hi:rgba(255,255,255,.28);--tile:rgba(255,255,255,.07);--tile-b:rgba(255,255,255,.08);--tile-on:rgba(255,255,255,.16)}
.root.light{--glass:linear-gradient(160deg,rgba(255,255,255,.72),rgba(255,255,255,.42) 45%,rgba(255,255,255,.55));--glass-b:rgba(255,255,255,.7);--glass-hi:rgba(255,255,255,.95);--tile:rgba(255,255,255,.55);--tile-b:rgba(0,0,0,.05);--tile-on:rgba(255,255,255,.9)}
.menu .grab{display:none}
.menu .mh{display:flex;align-items:center;justify-content:space-between;gap:10px}
.menu .mh .x{display:none;width:32px;height:32px;border-radius:50%;background:var(--tile);place-items:center}
.root.narrow .menu .mh .x{display:grid}
.menu .mh .x ha-icon{--mdc-icon-size:18px}
.menu h2{margin:0 6px;font-size:20px;font-weight:700;letter-spacing:.2px;font-family:"SF Pro Display",var(--font)}
.sec>.st{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600;color:var(--fg2);letter-spacing:.6px;text-transform:uppercase;margin:0 6px 8px}
.sec>.st:after{content:"";flex:1;height:1px;background:var(--glass-b)}
/* cada controlo é um "comprimido" de vidro; sem quadrados coloridos */
.grp{display:flex;flex-direction:column;gap:6px}
.row{position:relative;display:flex;flex-direction:column;justify-content:center;min-height:54px;padding:8px 12px 8px 56px;border-radius:18px;background:var(--tile);border:1px solid var(--tile-b);transition:background .25s}
.row.on{background:var(--tile-on)}
.row .ic{position:absolute;left:10px;top:9px;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;color:var(--fg2);background:var(--tile);transition:color .25s,background .25s}
.row.on .ic{color:#fff;background:var(--blue)}
/* tema claro: círculo cinzento visível sobre o vidro branco */
.root.light .row .ic{color:rgba(60,60,67,.75);background:rgba(120,120,128,.14);box-shadow:inset 0 0 0 1px rgba(0,0,0,.04)}
.root.light .row.on .ic{color:#fff;background:var(--blue);box-shadow:none}
.root.light .menu .mh .x{background:rgba(120,120,128,.14)}
.row .ic ha-icon{--mdc-icon-size:19px}
.row .top{display:flex;align-items:center;gap:10px;min-height:36px}
.row .tt{flex:1;min-width:0;display:flex;flex-direction:column}
.row .tt b{font-size:15px;font-weight:600;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.row .tt small{font-size:12.5px;color:var(--fg2);line-height:1.3}
.row.off-line{opacity:.5}
.sw{position:relative;width:46px;height:28px;border-radius:99px;background:var(--track);transition:background .25s var(--ease);flex:none}
.sw:after{content:"";position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 2px 6px rgba(0,0,0,.2);transition:transform .3s var(--spring)}
.sw.on{background:var(--blue)} .sw.on:after{transform:translateX(18px)}
.sw.busy{opacity:.6}
.root.dark .sw{background:rgba(255,255,255,.16)}
.cta{flex:none;height:32px;padding:0 14px;border-radius:99px;font-size:13.5px;font-weight:600;color:var(--fg);background:var(--tile-on);border:1px solid var(--tile-b);transition:transform .1s}
.cta:active{transform:scale(.96)} .cta.busy{opacity:.55}
.seg{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:4px;margin-top:8px}
.seg button{height:30px;border-radius:99px;font-size:12.5px;font-weight:600;color:var(--fg2);background:var(--tile);border:1px solid var(--tile-b)}
.seg button.on{background:var(--blue);color:#fff;border-color:transparent}
.seg button.mode{display:flex;align-items:center;justify-content:center;gap:5px}
.seg button.mode ha-icon{--mdc-icon-size:16px}
/* bancos com ventilação: o ícone é um botão (Aquecer/Ventilar), com setinhas no canto */
.row .ic.pick{cursor:pointer;box-shadow:inset 0 0 0 1.5px var(--blue)}
.row .ic.pick:after{content:"";position:absolute;right:-2px;bottom:-2px;width:13px;height:13px;border-radius:50%;background:var(--blue) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23fff' d='M21 9l-4-4v3h-7v2h7v3M7 11l-4 4 4 4v-3h7v-2H7v-3z'/%3E%3C/svg%3E") center/11px no-repeat}
.sl{display:flex;align-items:center;gap:10px;margin-top:6px}
.sl input{flex:1;-webkit-appearance:none;appearance:none;height:6px;border-radius:3px;background:linear-gradient(to right,var(--blue) var(--p,50%),var(--track) var(--p,50%));outline:none}
.root.dark .sl input{background:linear-gradient(to right,var(--blue) var(--p,50%),rgba(255,255,255,.16) var(--p,50%))}
.sl input::-webkit-slider-thumb{-webkit-appearance:none;width:24px;height:24px;border-radius:50%;background:#fff;box-shadow:0 2px 6px rgba(0,0,0,.25);cursor:pointer}
.sl input::-moz-range-thumb{width:24px;height:24px;border:0;border-radius:50%;background:#fff;box-shadow:0 2px 6px rgba(0,0,0,.25)}
.val{font-size:14px;font-weight:600;font-variant-numeric:tabular-nums;color:var(--fg2)}
.stp{display:flex;align-items:center;gap:4px;flex:none}
.stp button{width:34px;height:30px;border-radius:99px;background:var(--tile-on);border:1px solid var(--tile-b);display:grid;place-items:center;font-size:18px;line-height:1}
.stp .v{min-width:54px;text-align:center;font-size:17px;font-weight:600;font-variant-numeric:tabular-nums}
.credit{font-size:11px;line-height:1.5;color:var(--fg3);margin:0 6px}
.credit a{color:inherit}
.empty{padding:40px;color:var(--fg2);font-size:15px}

/* confirmação: cartão flutuante por cima dos atalhos */
.scrim{position:absolute;inset:0;z-index:5;display:grid;grid-template-columns:minmax(0,1fr) var(--menu-w,0px);background:rgba(0,0,0,.28);opacity:0;pointer-events:none;transition:opacity .25s var(--ease)}
.scrim.show{opacity:1;pointer-events:auto}
.sheet{grid-column:1;justify-self:center;align-self:end;margin-bottom:28px;width:min(420px,calc(100% - 32px));padding:18px;border-radius:24px;
  background:var(--panel);border:1px solid var(--chip-b);box-shadow:0 24px 60px rgba(0,0,0,.35),0 2px 8px rgba(0,0,0,.15);
  transform:translateY(24px);transition:transform .35s var(--spring)}
.scrim.show .sheet{transform:none}
.sheet .hd{display:flex;gap:14px;align-items:center}
.sheet .sic{flex:none;width:46px;height:46px;border-radius:14px;display:grid;place-items:center;color:var(--orange);background:color-mix(in srgb,var(--orange) 15%,transparent)}
.sheet .sic ha-icon{--mdc-icon-size:24px}
.sheet b{display:block;font-size:17px;font-weight:600;line-height:1.3}
.sheet p{margin:2px 0 0;font-size:14px;color:var(--fg2);line-height:1.35}
.sheet .bt{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px}
.sheet .bt button{height:46px;border-radius:14px;font-size:16px;font-weight:600;transition:transform .1s var(--ease),filter .2s}
.sheet .bt button:active{transform:scale(.97)}
.sheet .no{background:var(--row2);color:var(--fg)}
.sheet .yes{background:var(--fg);color:var(--panel)}
.sheet .yes:hover{filter:brightness(1.08)}
.root.narrow .scrim{grid-template-columns:1fr}
.root.narrow .sheet{align-self:center;margin:0}
.toast{position:absolute;left:50%;bottom:120px;transform:translate(-50%,10px);padding:10px 16px;border-radius:99px;background:var(--fg);color:var(--panel);font-size:14px;font-weight:600;opacity:0;transition:all .3s var(--ease);pointer-events:none;z-index:6}
.toast.show{opacity:1;transform:translate(-50%,0)}

/* ecrãs estreitos: menu por baixo */
.root.narrow{--menu-w:0px;grid-template-columns:1fr;grid-template-rows:1fr;height:var(--gft-h,var(--gft-fit,calc(100dvh - var(--header-height,56px))));min-height:480px}
.root.narrow .stage{height:auto}
/* telemóvel: o menu passa a uma folha que sobe de baixo, aberta pelo botão "Controlos" */
.root.narrow .menu{position:absolute;left:8px;right:8px;bottom:8px;width:auto;margin:0;height:min(80%,640px);z-index:4;border-radius:28px;
  padding-top:12px;box-shadow:0 -12px 40px rgba(0,0,0,.35);transform:translateY(105%);transition:transform .38s var(--ease);visibility:hidden}
.root.narrow.menu-open .menu{transform:none;visibility:visible}
.root.narrow .menu .grab{display:block;width:36px;height:5px;border-radius:3px;background:var(--fg3);margin:0 auto 6px}
.root.narrow .menu .mh{display:flex}
.mscrim{display:none}
.root.narrow .mscrim{display:block;position:absolute;inset:0;z-index:3;background:rgba(0,0,0,.3);opacity:0;pointer-events:none;transition:opacity .3s}
.root.narrow.menu-open .mscrim{opacity:1;pointer-events:auto}
.menubtn{display:none}
.root.narrow .menubtn{display:flex;position:absolute;top:18px;right:16px;z-index:2;align-items:center;gap:6px;height:40px;padding:0 14px 0 11px;border-radius:99px;
  font-size:14px;font-weight:600;color:var(--fg);background:var(--chip);border:1px solid var(--chip-b);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px)}
.stage.vivid .menubtn{color:#000}
.root.narrow .menubtn ha-icon{--mdc-icon-size:18px}
.root.narrow .hdr{left:20px;top:20px} .root.narrow .hdr .name{font-size:28px}
.root.narrow .foot{grid-template-columns:1fr 1fr;padding:0 20px 18px}
.root.narrow .shortcuts{grid-column:1 / -1;grid-row:1;gap:8px}
.root.narrow .sc{width:58px} .root.narrow .sc .c{width:50px;height:50px}
@media (prefers-reduced-motion:reduce){*{transition-duration:.01ms!important;animation-duration:.01ms!important}}
`;
