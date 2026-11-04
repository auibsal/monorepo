from rig import *
def book(x,y,rot=0,sc=None):
    # open book held in front: two white pages, ink cover edge, ink text lines
    return (f'<g transform="translate({x} {y}) rotate({rot})">'
      f'<path d="M -78 -6 L 0 6 L 78 -6 L 78 52 L 0 64 L -78 52 Z" fill="{INK}"/>'
      f'<path d="M -70 -14 Q -34 -22 -2 -4 L -2 52 Q -34 36 -70 44 Z" fill="{W}"/>'
      f'<path d="M 70 -14 Q 34 -22 2 -4 L 2 52 Q 34 36 70 44 Z" fill="{W}"/>'
      + ''.join(f'<path d="M -60 {y0} Q -34 {y0-6} -12 {y0+6}" stroke="{C100}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M 60 {y0} Q 34 {y0-6} 12 {y0+6}" stroke="{C100}" stroke-width="5" fill="none" stroke-linecap="round"/>' for y0 in (2,16,30))
      + '</g>')
def envelope(x,y,rot=0):
    return (f'<g transform="translate({x} {y}) rotate({rot})">'
      f'<rect x="-46" y="-30" width="92" height="60" rx="4" fill="{W}" stroke="{INK}" stroke-width="6"/>'
      f'<path d="M -43 -26 L 0 8 L 43 -26" fill="none" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>'
      f'</g>')
def pencil(x,y,rot=0):
    return (f'<g transform="translate({x} {y}) rotate({rot})">'
      f'<rect x="-10" y="-80" width="20" height="96" fill="{INK}"/>'
      f'<rect x="-10" y="-80" width="20" height="14" fill="{C100}"/>'
      f'<path d="M -10 16 L 10 16 L 0 40 Z" fill="{W}" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>'
      f'<path d="M -4 30 L 4 30 L 0 40 Z" fill="{INK}"/></g>')
def page(x,y,rot=0):
    return (f'<g transform="translate({x} {y}) rotate({rot})">'
      f'<path d="M -50 -64 L 30 -64 L 50 -44 L 50 64 L -50 64 Z" fill="{W}" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>'
      f'<path d="M 30 -64 L 30 -44 L 50 -44" fill="none" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>'
      + ''.join(f'<path d="M -34 {yy} L {w} {yy}" stroke="{CR}" stroke-width="6" stroke-linecap="round"/>' for yy,w in ((-36,10),(-18,32),(0,32),(18,20),(36,28)))
      + '</g>')
def zzz(x,y,s=1):
    def z(cx,cy,k):
        h=18*k
        return f'<path d="M {cx-h} {cy-h} L {cx+h} {cy-h} L {cx-h} {cy+h} L {cx+h} {cy+h}" fill="none" stroke="{INK}" stroke-width="{7*k:.1f}" stroke-linejoin="round" stroke-linecap="round"/>'
    return f'<g transform="translate({x} {y}) scale({s})">'+z(0,0,1)+z(46,-40,0.75)+z(80,-74,0.55)+'</g>'
def qmark(x,y,s=1,col=INK):
    return (f'<g transform="translate({x} {y}) scale({s})"><path d="M -22 -26 C -22 -52 22 -54 22 -28 C 22 -10 0 -8 0 12" fill="none" stroke="{col}" stroke-width="12" stroke-linecap="round"/>'
            f'<circle cx="0" cy="36" r="8" fill="{col}"/></g>')
def bang(x,y,s=1,col=INK):
    return f'<g transform="translate({x} {y}) scale({s})"><path d="M 0 -50 L 0 10" stroke="{col}" stroke-width="13" stroke-linecap="round"/><circle cx="0" cy="34" r="8" fill="{col}"/></g>'
def sparks(x,y,s=1,col=CR):
    # three short dashes radiating, for surprise/joy
    return (f'<g transform="translate({x} {y}) scale({s})" stroke="{col}" stroke-width="9" stroke-linecap="round">'
            '<path d="M 0 -30 L 0 -56"/><path d="M 26 -18 L 46 -36"/><path d="M -26 -18 L -46 -36"/></g>')
def motion(x,y,s=1):
    return (f'<g transform="translate({x} {y}) scale({s})" stroke="{C100}" stroke-width="10" stroke-linecap="round">'
            '<path d="M 0 0 L -70 0"/><path d="M 10 30 L -50 30"/><path d="M -6 -30 L -56 -30"/></g>')
def sweat(x,y):
    return f'<path transform="translate({x} {y})" d="M 0 -18 C 8 -6 12 2 12 8 C 12 16 6 20 0 20 C -6 20 -12 16 -12 8 C -12 2 -8 -6 0 -18 Z" fill="{C100}" stroke="{INK}" stroke-width="4"/>'
def ticket(x,y,rot=0):
    return (f'<g transform="translate({x} {y}) rotate({rot})">'
      f'<path d="M -64 -34 L 64 -34 L 64 -12 A 12 12 0 0 0 64 12 L 64 34 L -64 34 L -64 12 A 12 12 0 0 0 -64 -12 Z" fill="{W}" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>'
      f'<path d="M 28 -26 L 28 26" stroke="{INK}" stroke-width="4" stroke-dasharray="6 6"/>'
      f'<path d="M -44 -12 L 10 -12 M -44 4 L 0 4 M -44 20 L -10 20" stroke="{CR}" stroke-width="6" stroke-linecap="round"/></g>')
