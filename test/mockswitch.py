import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width':1400,'height':860})
        pg.on('pageerror', lambda e: print('PAGEERROR', e))
        await pg.goto('http://localhost:8765/mock/index.html'); await pg.wait_for_timeout(9000)
        await pg.select_option('#dModel', 'modely_juniper'); await pg.wait_for_timeout(14000)
        print(await pg.evaluate('() => [document.querySelector("#dColor").options.length, window.__card._config.car_model, !!window.__card._scene.G.ready]'))
        await pg.select_option('#dColor', 'glacier_blue'); await pg.wait_for_timeout(3000)
        await pg.screenshot(path='models/mock_my.png', timeout=180000)
        await pg.select_option('#dModel', 'model3_classic'); await pg.wait_for_timeout(14000)
        print(await pg.evaluate('() => [document.querySelector("#dColor").value, window.__card._config.car_model, !!window.__card._scene.G.ready]'))
        await pg.screenshot(path='models/mock_m3.png', timeout=180000)
        await b.close()
asyncio.run(main())
