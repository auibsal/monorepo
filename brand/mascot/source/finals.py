import sys,os; d=os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0,d); os.chdir(d)
from rig import CR,C50,svg,g; from rig2 import bird; import cairosvg
os.makedirs('out',exist_ok=True)
def save(name,s,w):
    with open(f'out/{name}.svg','w') as f: f.write(s)
    cairosvg.svg2png(bytestring=s.encode(),write_to=f'out/{name}.png',output_width=w)
V=(-240,-240,500,460)
save('hudhud',svg(g(bird('light',uid='st'),'translate(0 40)'),vb=V,size=1000),1000)
save('hudhud-reversed',svg(g(bird('crimson',uid='sr'),'translate(0 40)'),vb=V,size=1000,bg=CR),1000)
save('hudhud-flying',svg(g(bird('light',wings='flying',legs_on=False,crest_kind='folded',uid='fl'),'rotate(-6)'),vb=(-280,-270,560,400),size=1120),1120)
def avatar(scheme,bg,uid):
    return svg(g(bird(scheme,uid=uid),'translate(350 372) scale(1.72) translate(-94 110)'),vb=(0,0,640,640),size=640,bg=bg)
save('hudhud-avatar',avatar('crimson',CR,'av'),640)
