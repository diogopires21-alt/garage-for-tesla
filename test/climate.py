"""Teste do botão do Clima (issue #1).
Uso: python3 test/climate.py prefixo_das_capturas
Cenários (todos com a Tesla Custom simulada, salvo o último):
  A. carregar e desligar logo a seguir, com o HA atrasado 20 s
  B. carregar e esperar que o HA confirme
  C. comando com erro: o botão volta atrás
  D. HA nunca confirma: ao fim dos 12 min o cartão volta a seguir o HA
  E. Tessie: liga e desliga como antes
Escreve, para cada passo, o que o botão mostra, o que o HA diz e os comandos enviados."""
import sys, json, asyncio
from playwright.async_api import async_playwright

ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
TAP = """() => { const c = window.__card; c.shadowRoot.querySelectorAll('.sc')[c._shortcutKeys().indexOf('climate')].click(); }"""
LOOK = """() => { const c = window.__card, i = c._shortcutKeys().indexOf('climate'), b = c.shadowRoot.querySelectorAll('.sc')[i];
  return { botao: b.classList.contains('on') ? 'LIGADO' : 'desligado', ha: c._hass.states[c._ent('climate')].state, toast: c.$.toast.classList.contains('show') ? c.$.toast.textContent : '' }; }"""
KEEP_TOAST = """() => { const c = window.__card; c._toast = function (m) { const el = this.$.toast; el.textContent = m; el.classList.add('show'); }; }"""

async def page(b, qs):
    pg = await b.new_page(viewport={'width': 1400, 'height': 820}, device_scale_factor=1)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(f'http://localhost:8765/test/index.html?theme=dark&color=ultra_red&{qs}')
    await pg.wait_for_timeout(8000)
    await pg.evaluate(KEEP_TOAST)
    return pg, errs

async def step(pg, label, shot=None):
    r = await pg.evaluate(LOOK)
    print(f'  {label:<42} botão: {r["botao"]:<9} HA: {r["ha"]:<9} {r["toast"]}')
    if shot: await pg.screenshot(path=shot, timeout=180000)

async def main(pre):
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=ARGS)

        print('A. Tesla Custom, HA atrasado 20 s: liga e desliga logo')
        pg, errs = await page(b, 'integ=custom&lag=20')
        await step(pg, 'início')
        await pg.evaluate(TAP); await pg.wait_for_timeout(1500)
        await step(pg, '1.º toque (1,5 s depois)', f'{pre}_A1.png')
        await pg.evaluate(TAP); await pg.wait_for_timeout(1500)
        await step(pg, '2.º toque logo a seguir', f'{pre}_A2.png')
        print('  comandos:', json.dumps([c[1:] for c in await pg.evaluate('window.__calls')]), errs); await pg.close()

        print('B. Tesla Custom, HA atrasado 20 s: liga e espera')
        pg, errs = await page(b, 'integ=custom&lag=20')
        await pg.evaluate(TAP); await pg.wait_for_timeout(1500)
        await step(pg, '1,5 s depois (HA ainda não sabe)')
        await pg.wait_for_timeout(22000)
        await step(pg, '~23 s depois (HA já confirmou)')
        print('  pedido pendente:', await pg.evaluate("JSON.stringify(window.__card._optim)"), errs); await pg.close()

        print('C. comando com erro')
        pg, errs = await page(b, 'integ=custom&lag=20')
        await pg.evaluate("""() => { const c = window.__card, h = c._hass; c.hass = { ...h, callService: async () => { await new Promise(r => setTimeout(r, 500)); throw new Error('Tesla command failed'); } }; }""")
        await pg.evaluate(TAP); await pg.wait_for_timeout(200)
        await step(pg, 'logo depois do toque')
        await pg.wait_for_timeout(1500)
        await step(pg, 'depois do erro', f'{pre}_C.png')
        print(' ', errs); await pg.close()

        print('D. HA nunca confirma (atraso enorme)')
        pg, errs = await page(b, 'integ=custom&lag=99999')
        await pg.evaluate(TAP); await pg.wait_for_timeout(1500)
        await step(pg, 'depois do toque')
        await pg.evaluate("() => { const c = window.__card; c._optim.climate.until = Date.now() - 1; c._render(); }")
        await pg.wait_for_timeout(500)
        await step(pg, 'passados os 12 min (simulado)')
        print(' ', errs); await pg.close()

        print('E. Tessie')
        pg, errs = await page(b, '')
        await pg.evaluate(TAP); await pg.wait_for_timeout(1500)
        await step(pg, '1.º toque')
        await pg.evaluate(TAP); await pg.wait_for_timeout(1500)
        await step(pg, '2.º toque')
        print('  comandos:', json.dumps([c[1:] for c in await pg.evaluate('window.__calls')]), errs); await pg.close()
        await b.close()

asyncio.run(main(sys.argv[1]))
