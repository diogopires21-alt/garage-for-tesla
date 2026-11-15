import sys, asyncio
from playwright.async_api import async_playwright
async def main(qs, out, w=1600, h=940, wait=8000):
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width':w,'height':h}, device_scale_factor=1)
        logs=[]
        pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}'))
        pg.on('pageerror', lambda e: logs.append(f'PAGEERROR: {e}'))
        await pg.goto(f'http://localhost:8765/test/index.html?{qs}')
        await pg.wait_for_timeout(wait)
        await pg.evaluate('() => { const S = window.__card && window.__card._scene; if (S) S.G.t0 = performance.now() - 750; }')
        await pg.wait_for_timeout(60)
        await pg.evaluate('() => { const S = window.__card && window.__card._scene; if (S && location.search.includes("peak")) { const f = S._fx.bind(S); S._fx = (n, t) => { f(n, t); if (S._regionPulse.value) S._regionPulse.value = S.state.dark ? .8 : .9; }; } }') # PEAK
        await pg.wait_for_timeout(800)
        await pg.screenshot(path=out, timeout=180000)
        for l in logs:
            if 'GARAGE' not in l: print(l)
        await b.close()
a=sys.argv
asyncio.run(main(a[1], a[2], int(a[3]) if len(a)>3 else 1600, int(a[4]) if len(a)>4 else 940))
