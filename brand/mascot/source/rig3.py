"""Hudhud v5: v3's silhouette, crest and wing; v4's beak, tail and flat colors; v3's ink eye.
Drawn in v3 coordinates, then shifted so the body sits near the local origin (same frame as rig.py)."""
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
from rig2 import tail, legs, folded
CRESTS['fanned']=(-92,38,[90,106,116,118,110,94])
CRESTS['swept']=(-112,-8,[82,98,108,106,94,78])
CRESTS['droop']=(-132,-52,[74,88,96,94,82,68])
BODYH=("M 352 262 C 374 290 372 332 346 354 C 316 380 268 390 232 386 C 196 382 172 356 174 322 "
       "C 176 284 210 254 262 244 C 296 238 316 240 326 234 L 392 250 C 380 258 364 260 352 262 Z")
HEADN=("M 322 252 C 312 228 314 194 330 166 C 350 140 398 138 416 166 C 432 192 428 228 402 246 "
       "C 392 254 378 262 366 268 L 330 266 Z")
PIV=(352,252)
UPPER="M 414 174 C 458 178 494 200 516 248 C 519 255 511 260 506 254 C 488 226 460 212 418 212 Z"
def beak(sc,open_=0):
    return f'<path d="{UPPER}" fill="{sc["beak"]}"/>'
def lower(sc,open_=0):
    if not open_: return ''
    o=open_
    return (f'<path d="M 408 200 C 446 {206+o*0.4:.0f} 472 {222+o:.0f} 486 {250+o:.0f} C 488 {256+o:.0f} 481 {260+o:.0f} 477 {255+o:.0f} '
            f'C 462 {234+o:.0f} 444 {224+o*0.6:.0f} 410 226 Z" fill="{sc["beak"]}"/>')
def wing3(sc,rot,uid,dx=0,dy=0,stroke=True,k=1.0):
    """the folded wing's own shape and bars, swung about the shoulder"""
    bars=''.join(f'<path d="M {x} 236 C {x-14} 280 {x-26} 320 {x-36} 364" stroke="{sc["bar"]}" stroke-width="9" fill="none"/>' for x in (238,266,294,322))
    st=f' stroke="{sc["gap"]}" stroke-width="6" stroke-linejoin="round"' if stroke else ''
    return (f'<g transform="translate({dx} {dy}) rotate({rot} 334 272) translate(334 272) scale({k}) translate(-334 -272)"><clipPath id="{uid}"><path d="{WING}"/></clipPath>'
            f'<path d="{WING}" fill="{sc["wing"]}"{st}/><g clip-path="url(#{uid})">{bars}</g></g>')
def bird(scheme='light',crest_kind='up',eye_kind='open',beak_open=0,head_tilt=0,wings='folded',legs_on=True,uid='b',**_):
    sc=SCHEMES[scheme]; b=[]
    if wings=='flying': b.append(wing3(sc,18,uid+'wb',dx=-30,dy=-30,stroke=False,k=1.15))
    b.append(tail(sc,0 if wings!='flying' else 8))
    if legs_on: b.append(legs(sc))
    BD=SIL if head_tilt==0 else BODYH
    b.append(f'<path d="{BD}" fill="{sc["body"]}"/>')
    filler='' if head_tilt==0 else f'<ellipse cx="350" cy="240" rx="24" ry="20" fill="{sc["body"]}"/>'
    head=[fan(sc,crest_kind,uid+'cr'),filler,lower(sc,beak_open),f'<path d="{HEAD}" fill="{sc["body"]}"/>',eye(sc,eye_kind),beak(sc,beak_open)]
    b.append(g(''.join(head),f'rotate({head_tilt} {PIV[0]} {PIV[1]})'))
    b.append(f'<clipPath id="{uid}bl"><path d="{BD}"/></clipPath><g clip-path="url(#{uid}bl)"><ellipse cx="338" cy="336" rx="60" ry="50" fill="{sc["belly"]}"/></g>')
    if wings=='folded': b.append(folded(sc,uid+'fw'))
    if wings=='wave': b.append(wing3(sc,58,uid+'wv'))
    if wings=='cheer': b.append(wing3(sc,40,uid+'wv',k=1.1))
    if wings=='flying': b.append(wing3(sc,40,uid+'wv',k=1.25))
    return g(''.join(b),f'translate({OX} {OY})')
