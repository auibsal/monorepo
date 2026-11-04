"""Hudhud, flat edition: a parametric rig. Bird faces right; local origin at the body's centre."""
import math
CR='#9c213e'; C700='#7e1a32'; C100='#ebcbd3'; C50='#f7ecef'; INK='#273236'; INK70='#4a5559'; W='#ffffff'
SCHEMES={
 # light grounds (white, paper, crimson-50)
 'light':dict(body=CR, belly=C100, crest=CR, band=W, tip=INK, wing=INK, bar=W, beak=INK, leg=INK, eye=W, pupil=INK, gap=W),
 # crimson grounds (the avatar, crimson posts)
 'crimson':dict(body=W, belly=C100, crest=W, band=C100, tip=INK, wing=INK, bar=W, beak=INK, leg=INK, eye=W, pupil=INK, gap=CR),
}
def R(p,c,a):
    """rotate point p around c by a degrees"""
    t=math.radians(a); x,y=p[0]-c[0],p[1]-c[1]
    return (c[0]+x*math.cos(t)-y*math.sin(t), c[1]+x*math.sin(t)+y*math.cos(t))
def g(inner,tf=''): return f'<g transform="{tf}">{inner}</g>' if tf else f'<g>{inner}</g>'

BODY="M 72 -44 C 112 -14 108 48 62 74 C 22 98 -52 96 -92 66 C -122 43 -120 8 -96 -14 C -60 -46 22 -66 72 -44 Z"
NECK="M 26 -58 C 38 -92 54 -112 80 -120 L 122 -100 C 118 -62 102 -40 80 -30 Z"
HEAD=(80,-112); HR=50
def feather(px,py,ang,L,w):
    a=math.radians(ang); ux,uy=math.sin(a),-math.cos(a); qx,qy=-uy,ux
    def P(t,s):
        prof=w*(0.62+0.38*math.sin(min(t,0.85)/0.85*math.pi/2))
        return (px+ux*L*t+qx*s*prof/2, py+uy*L*t+qy*s*prof/2)
    n=10; left=[P(i/n,-1) for i in range(n+1)]; right=[P(1-i/n,1) for i in range(n+1)]
    e,s=right[0],left[-1]; k=w*0.55
    d='M %.1f %.1f '%left[0]+' '.join('L %.1f %.1f'%p for p in left[1:])
    d+=' C %.1f %.1f %.1f %.1f %.1f %.1f '%(s[0]+ux*k,s[1]+uy*k,e[0]+ux*k,e[1]+uy*k,e[0],e[1])
    d+=' '.join('L %.1f %.1f'%p for p in right[1:])+' Z'
    return d,(ux,uy,qx,qy)
CRESTS={
 'up':     ((-86,-62,-38,-14,10),(88,104,112,106,90)),
 'fanned': ((-96,-68,-40,-12,16,44),(84,100,110,108,96,80)),
 'folded': ((-112,-100,-88,-76,-64),(84,98,106,102,88)),
 'droop':  ((-146,-130,-114,-98,-82),(74,86,92,88,76)),
}
def crest(sc,kind='up',uid='c'):
    angs,lens=CRESTS[kind]; px,py=HEAD[0]-14,HEAD[1]-14
    out=[]
    for i,(a,L) in enumerate(zip(angs,lens)):
        d,(ux,uy,qx,qy)=feather(px,py,a,L,46)
        cid=f'{uid}{i}'
        def band(t0,t1):
            q=[(px+ux*L*t0-qx*30,py+uy*L*t0-qy*30),(px+ux*L*t1-qx*30,py+uy*L*t1-qy*30),(px+ux*L*t1+qx*30,py+uy*L*t1+qy*30),(px+ux*L*t0+qx*30,py+uy*L*t0+qy*30)]
            return 'M '+' L '.join('%.1f %.1f'%p for p in q)+' Z'
        out.append(f'<clipPath id="{cid}"><path d="{d}"/></clipPath>')
        out.append(f'<path d="{d}" fill="{sc["crest"]}" stroke="{sc["gap"]}" stroke-width="6" stroke-linejoin="round"/>')
        out.append(f'<g clip-path="url(#{cid})"><path d="{band(1-32/L,1-22/L)}" fill="{sc["band"]}"/><path d="{band(1-12/L,1.4)}" fill="{sc["tip"]}"/></g>')
    return ''.join(out)
def beak(sc,open_=0):
    hx,hy=HEAD
    upper=f"M {hx+38} {hy-22} C {hx+80} {hy-17} {hx+112} {hy+2} {hx+130} {hy+40} C {hx+133} {hy+47} {hx+125} {hy+52} {hx+120} {hy+46} C {hx+102} {hy+22} {hx+78} {hy+12} {hx+42} {hy+12} Z"
    s=f'<path d="{upper}" fill="{sc["beak"]}"/>'
    if open_:
        lower=f"M {hx+44} {hy+8} C {hx+70} {hy+12+open_} {hx+88} {hy+20+open_} {hx+98} {hy+34+open_} C {hx+92} {hy+38+open_} {hx+70} {hy+28+open_} {hx+42} {hy+20} Z"
        s=f'<path d="{lower}" fill="{sc["beak"]}"/>'+s
    return s
def eye(sc,kind='open'):
    ex,ey=HEAD[0]+16,HEAD[1]-10
    if kind=='open':
        return f'<circle cx="{ex}" cy="{ey}" r="14" fill="{sc["eye"]}"/><circle cx="{ex+3}" cy="{ey}" r="8" fill="{sc["pupil"]}"/><circle cx="{ex+6}" cy="{ey-3}" r="2.6" fill="{W}"/>'
    if kind=='wide':
        return f'<circle cx="{ex}" cy="{ey}" r="17" fill="{sc["eye"]}"/><circle cx="{ex+2}" cy="{ey}" r="6.5" fill="{sc["pupil"]}"/><circle cx="{ex+4.5}" cy="{ey-2.5}" r="2.2" fill="{W}"/>'
    if kind=='happy':   # closed, smiling: an upward arc
        return f'<circle cx="{ex}" cy="{ey}" r="14" fill="{sc["eye"]}"/><path d="M {ex-9} {ey+3} Q {ex} {ey-9} {ex+9} {ey+3}" fill="none" stroke="{sc["pupil"]}" stroke-width="5" stroke-linecap="round"/>'
    if kind=='sleep':   # closed, resting: a downward arc
        return f'<circle cx="{ex}" cy="{ey}" r="14" fill="{sc["eye"]}"/><path d="M {ex-9} {ey-1} Q {ex} {ey+8} {ex+9} {ey-1}" fill="none" stroke="{sc["pupil"]}" stroke-width="5" stroke-linecap="round"/>'
    if kind=='down':    # looking down (reading)
        return f'<circle cx="{ex}" cy="{ey}" r="14" fill="{sc["eye"]}"/><circle cx="{ex+3}" cy="{ey+5}" r="7.5" fill="{sc["pupil"]}"/>'
    if kind=='up':      # looking up (thinking)
        return f'<circle cx="{ex}" cy="{ey}" r="14" fill="{sc["eye"]}"/><circle cx="{ex+2}" cy="{ey-5}" r="7.5" fill="{sc["pupil"]}"/><circle cx="{ex+4.5}" cy="{ey-8}" r="2.2" fill="{W}"/>'
    if kind=='worry':
        return (f'<circle cx="{ex}" cy="{ey}" r="15" fill="{sc["eye"]}"/><circle cx="{ex+1}" cy="{ey+2}" r="6" fill="{sc["pupil"]}"/>'
                f'<path d="M {ex-10} {ey-20} L {ex+10} {ey-24}" stroke="{sc["pupil"]}" stroke-width="5" stroke-linecap="round"/>')
def wingshape(L=150,w0=24,w1=48):
    return (f"M -{w0} 0 C -{w0} -{L*0.4:.0f} -{w1} -{L*0.66:.0f} -{w1*0.86:.0f} -{L*0.9:.0f} "
            f"C -{w1*0.6:.0f} -{L*1.06:.0f} {w1*0.6:.0f} -{L*1.06:.0f} {w1*0.86:.0f} -{L*0.9:.0f} "
            f"C {w1} -{L*0.66:.0f} {w0} -{L*0.4:.0f} {w0} 0 Z")
def wing(sc,x,y,rot,uid,L=150,w0=24,w1=48,bars=(0.36,0.56,0.76)):
    d=wingshape(L,w0,w1)
    b=''.join(f'<path d="M -{w1*2} -{L*t:.0f} L {w1*2} -{L*t:.0f}" stroke="{sc["bar"]}" stroke-width="10"/>' for t in bars)
    return f'<g transform="translate({x} {y}) rotate({rot})"><clipPath id="{uid}"><path d="{d}"/></clipPath><path d="{d}" fill="{sc["wing"]}"/><g clip-path="url(#{uid})">{b}</g></g>'
FOLD="M 46 -32 C 16 -50 -48 -46 -88 -20 C -104 -8 -110 10 -106 32 C -58 46 6 34 40 8 C 54 -4 56 -20 46 -32 Z"
def folded_wing(sc,uid):
    b=''.join(f'<path d="M {x} -70 C {x-14} -26 {x-26} 14 {x-36} 58" stroke="{sc["bar"]}" stroke-width="9" fill="none"/>' for x in (-56,-28,0,28))
    return f'<clipPath id="{uid}"><path d="{FOLD}"/></clipPath><path d="{FOLD}" fill="{sc["wing"]}" stroke="{sc["gap"]}" stroke-width="5"/><g clip-path="url(#{uid})">{b}</g>'
def tail(sc,rot=0):
    d="M -86 36 L -184 84 Q -204 94 -196 110 Q -188 124 -170 116 L -72 66 Z"
    bar="M -158 70 L -142 104 L -128 98 L -144 63 Z"
    return f'<g transform="rotate({rot} -80 50)"><path d="{d}" fill="{sc["wing"]}"/><path d="{bar}" fill="{sc["bar"]}"/></g>'
def legs(sc):
    return (f'<g stroke="{sc["leg"]}" stroke-width="8" stroke-linecap="round" fill="none">'
            '<path d="M -14 86 L -18 136 M -18 136 L -36 144 M -18 136 L -4 146"/>'
            '<path d="M 22 84 L 24 136 M 24 136 L 8 145 M 24 136 L 40 145"/></g>')
def belly(sc,uid):
    return f'<clipPath id="{uid}"><path d="{BODY}"/></clipPath><g clip-path="url(#{uid})"><ellipse cx="52" cy="40" rx="62" ry="44" fill="{sc["belly"]}"/></g>'
def bird(scheme='light',crest_kind='up',eye_kind='open',beak_open=0,head_tilt=0,wings='folded',legs_on=True,uid='b',wave=None,extra_front=''):
    sc=SCHEMES[scheme]; p=[]
    pivot=(70,-60)
    if wings=='flying':
        p.append(wing(sc,-60,10,-78,uid+'wd',150,26,50,bars=(0.42,0.62,0.8)))
    if wings=='both': p.append(wing(sc,-50,0,-76,uid+'w1',170,30,58))
    if wave in ('front','raise') or wings=='both': p.append(wing(sc,-20,0,-34,uid+'wv',190,30,60,bars=(0.42,0.6,0.78)))
    if wings=='flying': pass
    p.append(tail(sc, 0 if wings!='flying' else 8))
    if legs_on: p.append(legs(sc))
    p.append(f'<path d="{BODY}" fill="{sc["body"]}"/>')
    p.append(belly(sc,uid+'bl'))
    head=[crest(sc,crest_kind,uid+'cr'),f'<path d="{NECK}" fill="{sc["body"]}"/>',f'<circle cx="{HEAD[0]}" cy="{HEAD[1]}" r="{HR}" fill="{sc["body"]}" stroke="{sc["gap"]}" stroke-width="0"/>',
          eye(sc,eye_kind),beak(sc,beak_open)]
    # the crest sits behind the head: a ground-colored ring separates them
    head.insert(1,f'<circle cx="{HEAD[0]}" cy="{HEAD[1]}" r="{HR+4}" fill="{sc["gap"]}"/>')
    p.append(g(''.join(head),f'rotate({head_tilt} {pivot[0]} {pivot[1]})'))
    if wings=='folded': p.append(folded_wing(sc,uid+'fw'))
    if wings=='flying': p.append(wing(sc,-30,-10,-44,uid+'wu',220,32,66,bars=(0.42,0.6,0.78)))
    p.append(extra_front)
    return ''.join(p)
def svg(inner,vb=(-260,-260,520,520),size=512,bg=None):
    x,y,w,h=vb
    b=f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{bg}"/>' if bg else ''
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x} {y} {w} {h}" width="{size}" height="{size*h/w:.0f}">{b}{inner}</svg>'
