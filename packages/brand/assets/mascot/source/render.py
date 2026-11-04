import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from rig import *; import cairosvg
from PIL import Image
def png(svgs,out,w=512):
    cairosvg.svg2png(bytestring=svgs.encode(),write_to=out,output_width=w)
def sheet(files,out,cols=4,cell=360,bg='white'):
    rows=(len(files)+cols-1)//cols; S=Image.new('RGB',(cols*cell,rows*cell),bg)
    for i,f in enumerate(files):
        im=Image.open(f).convert('RGBA').resize((cell,cell)); bgim=Image.new('RGBA',im.size,bg); bgim.alpha_composite(im)
        S.paste(bgim.convert('RGB'),((i%cols)*cell,(i//cols)*cell))
    S.save(out)
