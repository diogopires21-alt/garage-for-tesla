import sys, asyncio, time
from playwright.async_api import async_playwright
async def main(qs):
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width':1400,'height':820})
        pg.on('console', lambda m: print('C', m.type, m.text[:200]) if 'GL Driver' not in m.text else None)
        pg.on('pageerror', lambda e: print('PAGEERROR', e))
        pg.on('requestfailed', lambda r: print('FAIL', r.url))
        pg.on('response', lambda r: print('RESP', r.status, r.url) if r.status>=400 else None)
        await pg.goto(f'http://localhost:8765/test/index.html?{qs}')
        for i in range(8):
            t=time.time()
            try: r = await asyncio.wait_for(pg.evaluate('() => { const S = window.__card && window.__card._scene; return S ? [S.G.ready, S.failed, !!S.G.car] : null }'), 20)
            except Exception as e: r = 'busy '+str(type(e))
            print(i, round(time.time()-t,1), r); await asyncio.sleep(3)
        await b.close()
asyncio.run(main(sys.argv[1]))
