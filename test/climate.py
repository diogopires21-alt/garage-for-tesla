"""Teste do botão do Clima (issue #1).
Uso: python3 test/climate.py "<query>" prefixo
Carrega no atalho do Clima (liga), tira captura, carrega outra vez (desliga), tira captura.
Escreve os comandos enviados ao HA e o estado final do clima."""
import sys, json, asyncio
from playwright.async_api import async_playwright

CLICK = """() => { const c = window.__card; const i = c._shortcutKeys().indexOf('climate');
  c.shadowRoot.querySelectorAll('.sc')[i].click(); return i; }"""
STATE = """() => { const c = window.__card; const s = c._st('climate'); return s ? s.state : null; }"""

async def main(qs, pre):
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width': 1400, 'height': 820}, device_scale_factor=1)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(f'http://localhost:8765/test/index.html?{qs}')
        await pg.wait_for_timeout(8000)
        print('atalho n.º', await pg.evaluate(CLICK))
        await pg.wait_for_timeout(1200)
        print('depois de ligar:', await pg.evaluate(STATE))
        await pg.screenshot(path=f'{pre}_1.png', timeout=180000)
        await pg.wait_for_timeout(3000)
        await pg.evaluate(CLICK)
        await pg.wait_for_timeout(1200)
        print('depois de desligar:', await pg.evaluate(STATE))
        await pg.screenshot(path=f'{pre}_2.png', timeout=180000)
        print('comandos:', json.dumps(await pg.evaluate('window.__calls')))
        print('erros:', errs)
        await b.close()

asyncio.run(main(sys.argv[1], sys.argv[2]))
