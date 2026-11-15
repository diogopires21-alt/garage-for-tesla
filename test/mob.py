import asyncio
from playwright.async_api import async_playwright
CL = "(sel, i=0) => window.__card.shadowRoot.querySelectorAll(sel)[i].click()"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':390,'height':780}, device_scale_factor=2)
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:8765/test/index.html?theme=dark&color=ultra_red')
        await pg.wait_for_timeout(8000)
        await pg.screenshot(path='test/mob1.png', timeout=90000)
        await pg.evaluate(f"({CL})('.menubtn')"); await pg.wait_for_timeout(900)
        await pg.screenshot(path='test/mob2.png', timeout=90000)
        await pg.evaluate(f"({CL})('.menu .x')"); await pg.wait_for_timeout(600)
        await pg.evaluate(f"({CL})('.tag.round .pill')"); await pg.wait_for_timeout(900)
        await pg.screenshot(path='test/mob3.png', timeout=90000)
        print('errors', errs)
        await b.close()
asyncio.run(main())
