# Icon A "The clear day": teal tile, Paper cell, teal dot. Drawn on 100x100.
# Run from the repo root: python3 design/make-icons.py (needs Playwright).
import sys
from playwright.sync_api import sync_playwright
MARK = '<rect x="{x}" y="{x}" width="{w}" height="{w}" rx="{r}" fill="#FAFAF9"/><circle cx="50" cy="50" r="{d}" fill="#0E8175"/>'
def svg(scale=1.0, rounded=False):
    w=60*scale; x=50-w/2
    bg = '<rect width="100" height="100" rx="22.5" fill="#0E8175"/>' if rounded else '<rect width="100" height="100" fill="#0E8175"/>'
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">{bg}{MARK.format(x=x,w=w,r=14*scale,d=11*scale)}</svg>'
out = {  # path: (size, scale, rounded)
 'public/icons/icon-512.png':(512,1,True), 'public/icons/icon-192.png':(192,1,True),
 'public/icons/maskable-512.png':(512,.9,False), 'public/icons/apple-touch-icon.png':(180,1,False),
 'public/favicon.png':(64,1,True), 'src/assets/clear-icon-96.png':(96,1,True)}
with sync_playwright() as p:
    b=p.chromium.launch()
    for path,(n,s,r) in out.items():
        pg=b.new_page(viewport={'width':n,'height':n})
        pg.set_content(f'<html><body style="margin:0;background:transparent">{svg(s,r).replace("<svg ","<svg width=%d height=%d "%(n,n))}</body></html>')
        pg.screenshot(path=path, omit_background=r, clip={'x':0,'y':0,'width':n,'height':n}); pg.close()
    b.close()
open('design/clear-icon.svg','w').write(svg(1,True))
