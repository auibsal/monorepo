"""Hudhud, the Society's mascot: the drawing, as flat SVG shapes.
Shapes are drawn in their own coordinates, then shifted so the body sits near the local origin."""
import math
from rig import CR,C700,C100,C50,INK,INK70,W,SCHEMES,wing,wingshape,svg,g
OX,OY=-280,-300
HC=(374,190); HR=46
BODY=("M 352 262 C 374 290 372 332 346 354 C 316 380 268 390 232 386 C 196 382 172 356 174 322 "
      "C 176 284 210 254 262 244 C 296 238 316 240 326 230 C 318 214 320 200 334 194 L 404 194 "
      "C 420 212 414 236 402 246 C 386 256 366 258 352 262 Z")
SIL="M 352 262 C 374 290 372 332 346 354 C 316 380 268 390 232 386 C 196 382 172 356 174 322 C 176 284 210 254 262 244 C 296 238 316 240 326 230 C 314 210 316 184 330 166 C 350 140 398 138 416 166 C 432 192 428 228 402 246 C 386 256 366 258 352 262 Z"
HEAD="M 326 236 C 314 210 316 184 330 166 C 350 140 398 138 416 166 C 432 192 428 228 402 246 C 386 256 360 258 340 250 Z"
WING="M 336 270 C 306 256 252 258 214 282 C 196 294 188 310 190 332 C 236 346 296 336 330 310 C 342 300 344 284 336 270 Z"
CRESTS={'up':(-84,30,[88,106,118,120,110,92]),
        'fanned':(-92,40,[92,110,122,124,116,98]),
        'folded':(-118,-34,[78,94,104,104,92,76]),
        'droop':(-148,-70,[66,80,90,90,80,66])}
PIV=(354,236)
def pt(c,ang,r):
    a=math.radians(ang); return (c[0]+math.sin(a)*r, c[1]-math.cos(a)*r)
def fan(sc,kind,uid):
    a0,a1,radii=CRESTS[kind]; c=(352,182); n=len(radii); span=(a1-a0)/n; bump=12
    d=f'M {c[0]} {c[1]} '
    for i,R in enumerate(radii):
        A=a0+i*span; B=A+span
        p0=pt(c,A,R*0.97); p1=pt(c,B,R*0.97); c1=pt(c,A+span*0.05,R+bump); c2=pt(c,B-span*0.05,R+bump)
        d+=f'L {p0[0]:.1f} {p0[1]:.1f} C {c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p1[0]:.1f} {p1[1]:.1f} '
    d+='Z'
    o=[f'<clipPath id="{uid}"><path d="{d}"/></clipPath>',f'<path d="{d}" fill="{sc["crest"]}"/>',f'<g clip-path="url(#{uid})">']
    for i,R in enumerate(radii):
        A=a0+i*span; B=A+span
        def wedge(r0,r1):
            q=[pt(c,A-1,r0),pt(c,A-1,r1),pt(c,B+1,r1),pt(c,B+1,r0)]
            return 'M '+' L '.join(f'{x:.1f} {y:.1f}' for x,y in q)+' Z'
        o.append(f'<path d="{wedge(R-32,R-20)}" fill="{sc["band"]}"/><path d="{wedge(R-11,R+60)}" fill="{sc["tip"]}"/>')
    for i in range(1,n):
        p=pt(c,a0+i*span,radii[i]*1.3); q=c
        o.append(f'<path d="M {q[0]:.1f} {q[1]:.1f} L {p[0]:.1f} {p[1]:.1f}" stroke="{sc["gap"]}" stroke-width="5" stroke-linecap="round"/>')
    o.append('</g>')
    return ''.join(o)
def eye(sc,kind):
    ex,ey=391,190; k=INK
    if kind=='open':  return f'<circle cx="{ex}" cy="{ey}" r="11.5" fill="{k}"/><circle cx="{ex+4}" cy="{ey-4}" r="3.8" fill="{W}"/>'
    if kind=='wide':  return f'<circle cx="{ex}" cy="{ey}" r="14" fill="{k}"/><circle cx="{ex+4.5}" cy="{ey-4.5}" r="4.4" fill="{W}"/>'
    if kind=='down':  return f'<circle cx="{ex+1}" cy="{ey+3}" r="11" fill="{k}"/><circle cx="{ex+4}" cy="{ey+1}" r="3.2" fill="{W}"/>'
    if kind=='up':    return f'<circle cx="{ex}" cy="{ey-2}" r="11" fill="{k}"/><circle cx="{ex+3}" cy="{ey-7}" r="3.6" fill="{W}"/>'
    if kind=='happy': return f'<path d="M {ex-11} {ey+4} Q {ex} {ey-11} {ex+11} {ey+4}" fill="none" stroke="{k}" stroke-width="6" stroke-linecap="round"/>'
    if kind=='sleep': return f'<path d="M {ex-11} {ey-2} Q {ex} {ey+9} {ex+11} {ey-2}" fill="none" stroke="{k}" stroke-width="6" stroke-linecap="round"/>'
    if kind=='worry': return (f'<circle cx="{ex}" cy="{ey+2}" r="10.5" fill="{k}"/><circle cx="{ex+3.5}" cy="{ey-1}" r="3.4" fill="{W}"/>'
                              f'<path d="M {ex-12} {ey-18} L {ex+10} {ey-23}" stroke="{k}" stroke-width="5.5" stroke-linecap="round"/>')
def beak(sc,open_=0):
    s=f'<path d="M 414 174 C 458 178 494 200 516 248 C 519 255 511 260 506 254 C 488 226 460 212 418 212 Z" fill="{sc["beak"]}"/>'
    if open_:
        lo=f'<path d="M 420 214 C 446 218+{open_} 466 226+{open_} 478 242+{open_} C 472 246+{open_} 448 234+{open_} 418 226 Z"'
        lo=(f'<path d="M 418 212 C 446 {216+open_} 466 {226+open_} 478 {242+open_} C 472 {247+open_} 448 {236+open_} 416 222 Z" fill="{sc["beak"]}"/>')
        s=lo+s
    return s
def tail(sc,rot=0):
    d="M 194 336 L 96 384 Q 76 394 84 410 Q 92 424 110 416 L 208 366 Z"
    bar="M 122 370 L 138 404 L 152 398 L 136 363 Z"
    return f'<g transform="rotate({rot} 200 350)"><path d="{d}" fill="{sc["wing"]}"/><path d="{bar}" fill="{sc["bar"]}"/></g>'
def legs(sc):
    return (f'<g stroke="{sc["leg"]}" stroke-width="8" stroke-linecap="round" fill="none">'
            '<path d="M 262 382 L 258 432 M 258 432 L 240 440 M 258 432 L 272 442"/>'
            '<path d="M 298 380 L 300 432 M 300 432 L 284 441 M 300 432 L 316 441"/></g>')
def folded(sc,uid):
    bars=''.join(f'<path d="M {x} 236 C {x-14} 280 {x-26} 320 {x-36} 364" stroke="{sc["bar"]}" stroke-width="9" fill="none"/>' for x in (238,266,294,322))
    return (f'<clipPath id="{uid}"><path d="{WING}"/></clipPath><path d="{WING}" fill="{sc["wing"]}" stroke="{sc["gap"]}" stroke-width="6" stroke-linejoin="round"/>'
            f'<g clip-path="url(#{uid})">{bars}</g>')
def bird(scheme='light',crest_kind='up',eye_kind='open',beak_open=0,head_tilt=0,wings='folded',legs_on=True,uid='b',wave=None,extra_front=''):
    sc=SCHEMES[scheme]; back=[]; front=[]
    if wings=='flying': back.append(wing(sc,-60,10,-78,uid+'wd',150,26,50,bars=(0.42,0.62,0.8)))
    if wings=='both': back.append(wing(sc,-50,0,-76,uid+'w1',170,30,58))
    if wave in ('front','raise') or wings=='both': back.append(wing(sc,-20,0,-34,uid+'wv',190,30,60,bars=(0.42,0.6,0.78)))
    b=[tail(sc,0 if wings!='flying' else 8)]
    if legs_on: b.append(legs(sc))
    BD=SIL if head_tilt==0 else BODY
    b.append(f'<path d="{BD}" fill="{sc["body"]}"/>')
    b.append(f'<clipPath id="{uid}bl"><path d="{BD}"/></clipPath><g clip-path="url(#{uid}bl)"><ellipse cx="338" cy="336" rx="60" ry="50" fill="{sc["belly"]}"/></g>')
    head=[fan(sc,crest_kind,uid+'cr'),
          f'<path d="{HEAD}" fill="{sc["body"]}"/>',
          eye(sc,eye_kind),beak(sc,beak_open)]
    b.append(g(''.join(head),f'rotate({head_tilt} {PIV[0]} {PIV[1]})'))
    if wings=='folded': b.append(folded(sc,uid+'fw'))
    out=''.join(back)+g(''.join(b),f'translate({OX} {OY})')
    if wings=='flying': out+=wing(sc,-30,-10,-44,uid+'wu',220,32,66,bars=(0.42,0.6,0.78))
    return out+extra_front
