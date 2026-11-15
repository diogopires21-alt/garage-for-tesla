import sys, asyncio, base64, io, json
from playwright.async_api import async_playwright
from PIL import Image
async def main(args, out):
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width':800,'height':500}); pg.on('pageerror', lambda e: print('ERR', e))
        await pg.goto('http://localhost:8765/models/tools/cabin.html'); await pg.wait_for_timeout(400)
        res = await pg.evaluate('a => window.cabin(...a)', args); await b.close()
    ims=[Image.open(io.BytesIO(base64.b64decode(u.split(',')[1]))) for u in res]; W,H=ims[0].size
    sheet=Image.new('RGB',(W*2,H*((len(ims)+1)//2)),'white')
    for i,im in enumerate(ims): sheet.paste(im,((i%2)*W,(i//2)*H))
    sheet.save(out)
asyncio.run(main(json.loads(sys.argv[1]), sys.argv[2]))
