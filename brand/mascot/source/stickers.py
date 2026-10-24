import sys,os; d=os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0,d); os.chdir(d)
from rig import *; from props import *; from rig3 import bird; import cairosvg, io
from PIL import Image, ImageFilter, ImageChops
os.makedirs('stk7',exist_ok=True)
S={}
S['01-hello']=dict(b=dict(eye_kind='happy',beak_open=14,crest_kind='fanned',wings='wave'),lean=-4)
S['02-youre-in']=dict(b=dict(eye_kind='happy',beak_open=16,crest_kind='fanned',wings='cheer'),lean=-6,front=lambda: sparks(150,-250,1.0))
S['03-reading']=dict(b=dict(eye_kind='down',crest_kind='folded'),lean=14,front=lambda: book(170,122,0))
S['04-thinking']=dict(b=dict(eye_kind='up',crest_kind='up'),lean=-4,front=lambda: qmark(214,-226,1.1))
S['05-asleep']=dict(b=dict(eye_kind='sleep',crest_kind='folded'),lean=8,front=lambda: zzz(176,-214,1))
S['06-sent']=dict(b=dict(eye_kind='open',crest_kind='swept',wings='flying',legs_on=False),carry=lambda: envelope(250,-50,20),front=lambda: motion(-220,30,1),fly=True)
S['07-sorry']=dict(b=dict(eye_kind='worry',crest_kind='droop'),lean=6,front=lambda: sweat(40,-200))
S['08-thank-you']=dict(b=dict(eye_kind='happy',crest_kind='folded'),lean=16,front=lambda: sparks(210,-170,0.8,C100))
S['09-writing']=dict(b=dict(eye_kind='down',crest_kind='up'),lean=12,carry=lambda: pencil(240,-22,-22),front=lambda: page(212,100,4))
S['10-wow']=dict(b=dict(eye_kind='wide',crest_kind='fanned',beak_open=18),lean=-8,front=lambda: sparks(150,-256,1.0))
S['11-see-you']=dict(b=dict(eye_kind='open',crest_kind='up',wings='wave'),lean=-4,carry=lambda: ticket(236,-30,-24))
S['12-oops']=dict(b=dict(eye_kind='wide',crest_kind='fanned'),lean=4,front=lambda: bang(220,-226,1.0))
def raw(key,spec,scheme='light'):
    inner=bird(scheme,uid=key.replace('-','')[:6],**spec['b'])
    c=spec.get('carry'); inner+= c() if c else ''
    inner=g(inner,f"rotate({spec.get('lean',0)} 0 140)")
    f=spec.get('front'); inner+= f() if f else ''
    tf='translate(0 10) rotate(-6)' if spec.get('fly') else 'translate(0 30)'
    return svg(g(inner,tf),vb=(-320,-320,640,640),size=1024)
def diecut(svgs,out,size=512,pad=18,stroke=14):
    im=Image.open(io.BytesIO(cairosvg.svg2png(bytestring=svgs.encode(),output_width=1024))).convert('RGBA')
    a=im.split()[3]; bb=a.getbbox(); im=im.crop(bb)
    k=(size-2*pad-2*stroke)/max(im.size); im=im.resize((round(im.width*k),round(im.height*k)),Image.LANCZOS)
    c=Image.new('RGBA',(size,size),(0,0,0,0)); c.paste(im,((size-im.width)//2,(size-im.height)//2),im)
    a=c.split()[3].point(lambda v:255 if v>40 else 0)
    # round dilation: blur + threshold
    m=a.filter(ImageFilter.GaussianBlur(stroke*0.55)).point(lambda v:255 if v>8 else 0).filter(ImageFilter.GaussianBlur(1.2))
    base=Image.new('RGBA',(size,size),(255,255,255,0)); white=Image.new('RGBA',(size,size),(255,255,255,255))
    base=Image.composite(white,base,m); base.alpha_composite(c); base.save(out); return base
if __name__=='__main__':
    files=[]
    for k,v in S.items():
        p=f'stk7/{k}.png'; diecut(raw(k,v),p); files.append(p)
    from render import sheet
    sheet(files,'stk7_sheet.png',cols=4,cell=320,bg='#dfe3e6')
