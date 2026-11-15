import sys, asyncio, base64, io
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw
async def main(glb, rot, out):
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width':400,'height':300})
        pg.on('pageerror', lambda e: print('ERR', e))
        await pg.goto('http://localhost:8765/models/tools/inspect.html'); await pg.wait_for_timeout(500)
        res = await pg.evaluate(f'() => window.inspect("{glb}", {rot})')
        await b.close()
    W,H=360,220; names=list(res); sheet=Image.new('RGB',(W*4,(H+18)*len(names)),'white'); d=ImageDraw.Draw(sheet)
    for i,n in enumerate(names):
        d.text((4,i*(H+18)+3), n, fill='black')
        for j,u in enumerate(res[n]): sheet.paste(Image.open(io.BytesIO(base64.b64decode(u.split(',')[1]))),(j*W,i*(H+18)+18))
    sheet.save(out); print(len(names),'materials')
asyncio.run(main(sys.argv[1], sys.argv[2], sys.argv[3]))
