import asyncio
from playwright.async_api import async_playwright
CL = "(sel, i=0) => window.__card.shadowRoot.querySelectorAll(sel)[i].click()"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':1600,'height':940})
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:8765/test/index.html?theme=dark&color=ultra_red')
        await pg.wait_for_timeout(7000)
        await pg.evaluate(f"({CL})('.tag.round .pill')")
        await pg.wait_for_timeout(600)
        await pg.screenshot(path='test/i_confirm.png')
        await pg.evaluate(f"({CL})('.sheet .yes')")
        await pg.evaluate(f"({CL})('.sc', 0)")
        await pg.evaluate(f"({CL})('.sc', 2)")
        await pg.evaluate(f"({CL})('.seg button', 2)")
        await pg.wait_for_timeout(1500)
        await pg.screenshot(path='test/i_after.png')
        print(await pg.evaluate('JSON.stringify(window.__calls)'))
        print('errors', errs)
        await b.close()
asyncio.run(main())
