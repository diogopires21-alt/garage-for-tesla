"""Teste dos comandos com cada integração (backlog 7: Tesla Custom).
Uso: python3 test/commands.py prefixo_das_capturas
Cenários:
  A. Tessie, frunk aberto: tocar no frunk -> aviso "fecha-se à mão", nenhum comando
  B. Tessie, bagageira aberta: tocar -> close_cover (a bagageira do Tessie fecha)
  C. Tesla Custom, bagageira aberta: tocar -> aviso "fecha-se à mão", nenhum comando
  D. Tessie, frunk fechado: tocar + confirmar -> open_cover
  E. Tesla Custom: bancos com ventilação ("Heat Low") contam como aquecidos; volante só com nível aparece no menu
  F. Tessie: menu igual ao de antes (volante = interruptor, nível escondido)
  G. Tesla Custom, bancos ventilados: tocar no ícone -> Aquecer/Ventilar; Ventilar + "1" -> "Cool Low"; volante Desl./1/2/Auto
  H. Tesla Custom a carregar: o cartão percebe que está a carregar e quanto falta
  I. Tessie, bancos ventilados (entidade à parte): banco a aquecer em 1 -> Ventilar + "2" -> ventilação "medium" e aquecimento "off"; volta a Aquecer + "3"
  J. Tessie, banco já a ventilar: o ícone abre logo em Ventilar"""
import sys, json, asyncio
from playwright.async_api import async_playwright

ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
KEEP_TOAST = """() => { const c = window.__card; c._toast = function (m) { const el = this.$.toast; el.textContent = m; el.classList.add('show'); }; }"""
TAG = """i => window.__card.shadowRoot.querySelectorAll('.tags .tag .pill')[i].click()"""
LOOK = """() => { const c = window.__card; return { toast: c.$.toast.classList.contains('show') ? c.$.toast.textContent : '', calls: window.__calls.map(x => x[1] + ' ' + x[2].entity_id.split('.')[1] + (x[2].option ? ' ' + x[2].option : '')) }; }"""

async def page(b, qs, w=1400, h=820):
    pg = await b.new_page(viewport={'width': w, 'height': h}, device_scale_factor=1)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(f'http://localhost:8765/test/index.html?theme=dark&color=ultra_red&{qs}')
    await pg.wait_for_timeout(8000)
    await pg.evaluate(KEEP_TOAST)
    return pg, errs

async def main(pre):
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=ARGS)

        print('A. Tessie, frunk aberto')
        pg, errs = await page(b, 'frunk=1')
        await pg.evaluate(TAG, 1); await pg.wait_for_timeout(1200)
        print(' ', await pg.evaluate(LOOK), errs); await pg.screenshot(path=f'{pre}_A.png', timeout=180000); await pg.close()

        print('B. Tessie, bagageira aberta')
        pg, errs = await page(b, 'trunk=1')
        await pg.evaluate(TAG, 2); await pg.wait_for_timeout(1200)
        print(' ', await pg.evaluate(LOOK), errs); await pg.close()

        print('C. Tesla Custom, bagageira aberta')
        pg, errs = await page(b, 'trunk=1&integ=custom')
        await pg.evaluate(TAG, 2); await pg.wait_for_timeout(1200)
        print(' ', await pg.evaluate(LOOK), errs); await pg.screenshot(path=f'{pre}_C.png', timeout=180000); await pg.close()

        print('D. Tessie, frunk fechado: abrir')
        pg, errs = await page(b, '')
        await pg.evaluate(TAG, 1); await pg.wait_for_timeout(300)
        await pg.evaluate("() => window.__card.shadowRoot.querySelector('.scrim .yes').click()"); await pg.wait_for_timeout(1200)
        print(' ', await pg.evaluate(LOOK), errs); await pg.close()

        for name, qs in (('E. Tesla Custom', 'integ=custom&wheel=1'), ('F. Tessie', 'wheel=1')):
            print(name + ': bancos, volante e menu')
            pg, errs = await page(b, qs)
            r = await pg.evaluate("""() => { const c = window.__card, s = c._scene.state;
              return { seatHeat: s.seatHeat, steerHeat: s.steerHeat, volante_interruptor: c._ent('steering_heat') || null, volante_nivel: c._ent('steering_level') || null,
                       menu: c._menuKeys().filter(k => /seat|steer/.test(k)) }; }""")
            print(' ', json.dumps(r, ensure_ascii=False), errs)
            await pg.screenshot(path=f'{pre}_{name[0]}.png', timeout=180000)
            await pg.close()

        ROW = """t => [...window.__card.shadowRoot.querySelectorAll('.menu .row')].find(r => r.querySelector('b').textContent === t)"""
        SEG = """t => [...[...window.__card.shadowRoot.querySelectorAll('.menu .row')].find(r => r.querySelector('b').textContent === t).querySelectorAll('.seg button')].map(b => b.textContent + (b.classList.contains('on') ? '*' : ''))"""
        print('G. Tesla Custom: bancos ventilados e volante')
        pg, errs = await page(b, 'integ=custom&sfl=Heat%20Medium')
        print('  volante:', await pg.evaluate(SEG, 'Aquecimento do volante'))
        print('  condutor (aquecer):', await pg.evaluate(SEG, 'Banco do condutor'))
        await pg.screenshot(path=f'{pre}_G1.png', clip={'x': 1030, 'y': 180, 'width': 360, 'height': 420}, timeout=180000)
        await pg.evaluate("t => (" + ROW + ")(t).querySelector('.ic').click()", 'Banco do condutor'); await pg.wait_for_timeout(300)
        print('  depois de tocar no ícone:', await pg.evaluate(SEG, 'Banco do condutor'))
        await pg.screenshot(path=f'{pre}_G2.png', clip={'x': 1030, 'y': 180, 'width': 360, 'height': 420}, timeout=180000)
        await pg.evaluate("t => [...(" + ROW + ")(t).querySelectorAll('.seg button')][1].click()", 'Banco do condutor'); await pg.wait_for_timeout(300)
        print('  depois de escolher Ventilar:', await pg.evaluate(SEG, 'Banco do condutor'))
        await pg.evaluate("t => [...(" + ROW + ")(t).querySelectorAll('.seg button')][1].click()", 'Banco do condutor'); await pg.wait_for_timeout(1200)
        print('  depois de tocar em 1:', await pg.evaluate(SEG, 'Banco do condutor'), await pg.evaluate(LOOK))
        print('  aquecimento no carro:', await pg.evaluate("() => window.__card._scene.state.seatHeat"))
        await pg.screenshot(path=f'{pre}_G3.png', clip={'x': 1030, 'y': 180, 'width': 360, 'height': 420}, timeout=180000)
        print(' ', errs); await pg.close()

        print('H. Tesla Custom a carregar')
        pg, errs = await page(b, 'integ=custom&chg=charging')
        r = await pg.evaluate("() => { const c = window.__card, ci = c._chargeInfo(); return { estado: ci.st, a_carregar: ci.charging, cabo: ci.plugged, minutos: Math.round(ci.mins), cena: c._scene.state.charging }; }")
        print(' ', r, errs); await pg.screenshot(path=f'{pre}_H.png', timeout=180000); await pg.close()

        print('I. Tessie: bancos ventilados')
        pg, errs = await page(b, 'sfl=low')
        print('  condutor (aquecer):', await pg.evaluate(SEG, 'Banco do condutor'))
        await pg.evaluate("t => (" + ROW + ")(t).querySelector('.ic').click()", 'Banco do condutor'); await pg.wait_for_timeout(300)
        print('  depois de tocar no ícone:', await pg.evaluate(SEG, 'Banco do condutor'))
        await pg.screenshot(path=f'{pre}_I1.png', clip={'x': 1030, 'y': 180, 'width': 360, 'height': 420}, timeout=180000)
        await pg.evaluate("t => [...(" + ROW + ")(t).querySelectorAll('.seg button')][1].click()", 'Banco do condutor'); await pg.wait_for_timeout(300)
        print('  depois de escolher Ventilar:', await pg.evaluate(SEG, 'Banco do condutor'))
        await pg.evaluate("t => [...(" + ROW + ")(t).querySelectorAll('.seg button')][2].click()", 'Banco do condutor'); await pg.wait_for_timeout(1500)
        print('  depois de tocar em 2:', await pg.evaluate(SEG, 'Banco do condutor'), await pg.evaluate(LOOK))
        print('  aquecimento no carro:', await pg.evaluate("() => window.__card._scene.state.seatHeat.fl"))
        await pg.screenshot(path=f'{pre}_I2.png', clip={'x': 1030, 'y': 180, 'width': 360, 'height': 420}, timeout=180000)
        await pg.evaluate("t => (" + ROW + ")(t).querySelector('.ic').click()", 'Banco do condutor'); await pg.wait_for_timeout(300)
        await pg.evaluate("t => [...(" + ROW + ")(t).querySelectorAll('.seg button')][0].click()", 'Banco do condutor'); await pg.wait_for_timeout(300)
        await pg.evaluate("t => [...(" + ROW + ")(t).querySelectorAll('.seg button')][3].click()", 'Banco do condutor'); await pg.wait_for_timeout(1500)
        print('  Aquecer + 3:', await pg.evaluate(SEG, 'Banco do condutor'), await pg.evaluate(LOOK))
        print('  aquecimento no carro:', await pg.evaluate("() => window.__card._scene.state.seatHeat.fl"))
        print('  outros bancos com ícone de escolha:', await pg.evaluate("() => [...window.__card.shadowRoot.querySelectorAll('.menu .row')].filter(r => r.querySelector('.ic.pick')).map(r => r.querySelector('b').textContent)"))
        print(' ', errs); await pg.close()

        print('J. Tessie: banco já a ventilar')
        pg, errs = await page(b, 'sfl=off&cfl=medium')
        print('  condutor:', await pg.evaluate(SEG, 'Banco do condutor'), 'ícone:', await pg.evaluate("t => (" + ROW + ")(t).querySelector('.ic ha-icon').getAttribute('icon')", 'Banco do condutor'))
        print(' ', errs); await pg.close()
        await b.close()

asyncio.run(main(sys.argv[1] if len(sys.argv) > 1 else 'cmd'))
