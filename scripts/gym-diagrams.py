#!/usr/bin/env python3
"""Render original articulated movement schematics, not filmed demonstrations.

Requires Pillow. Run from anywhere: python3 scripts/gym-diagrams.py
Each loop is 60 distinct frames. Joint geometry is recalculated per frame;
there are no crossfades, photographic sources, or generated human images.
"""

import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'portfolio/public/gym/media'
W, H, SCALE, FRAMES, DURATION = 800, 640, 2, 60, 70
BG = '#f5f6f2'
INK = '#213b38'
MUTED = '#6a7b75'
LIGHT = '#dce4de'
EQUIP = '#91a49a'
ACCENT = '#087f69'
PALE = '#cde9de'
ORANGE = '#b66b36'
REAR = '#91b5a8'
WHITE = '#ffffff'
FONTS = [Path('/System/Library/Fonts/Supplemental'),
         Path('/usr/share/fonts/truetype/dejavu')]


def font(size, bold=False):
    names = ['Arial Bold.ttf' if bold else 'Arial.ttf',
             'DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf']
    for directory in FONTS:
        for name in names:
            if (directory / name).exists():
                return ImageFont.truetype(str(directory / name), round(size * SCALE))
    return ImageFont.load_default(size=round(size * SCALE))


class Canvas:
    def __init__(self, title, view, phase, cue):
        self.image = Image.new('RGB', (W * SCALE, H * SCALE), BG)
        self.d = ImageDraw.Draw(self.image)
        self.rect((0, 0, W, 100), WHITE)
        self.text((28, 17), 'MOVEMENT SCHEMATIC / NOT FILMED', 13, ACCENT, True)
        self.text((28, 42), title, 29, INK, True)
        self.text((28, 80), view, 12, MUTED)
        self.line([(28, 104), (772, 104)], LIGHT, 1)
        self.rect((28, 583, 772, 623), PALE, radius=10)
        self.text((44, 594), cue, 16, INK)
        self.text((772, 80), phase, 12, ORANGE, True, 'ra')

    @staticmethod
    def p(point):
        return tuple(round(value * SCALE) for value in point)

    def line(self, points, fill=INK, width=3):
        self.d.line([self.p(p) for p in points], fill=fill,
                    width=round(width * SCALE), joint='curve')

    def poly(self, points, fill, outline=None, width=2):
        self.d.polygon([self.p(p) for p in points], fill=fill)
        if outline:
            self.line([*points, points[0]], outline, width)

    def rect(self, box, fill, outline=None, width=2, radius=0):
        self.d.rounded_rectangle(self.p(box), radius=round(radius * SCALE),
                                 fill=fill, outline=outline, width=round(width * SCALE))

    def circle(self, p, r, fill, outline=None, width=2):
        x, y = p
        self.d.ellipse(self.p((x-r, y-r, x+r, y+r)), fill=fill,
                       outline=outline, width=round(width * SCALE))

    def text(self, p, s, size=14, fill=INK, bold=False, anchor=None):
        self.d.text(self.p(p), s, font=font(size, bold), fill=fill, anchor=anchor)

    def limb(self, points, color=ACCENT, width=10, joints=True):
        self.line(points, BG, width + 5)
        self.line(points, color, width)
        for p in points:
            self.circle(p, width / 2, color)
        if joints:
            for p in points[1:-1]:
                self.circle(p, 6, WHITE, color, 2)

    def dashed(self, points, fill=EQUIP, width=2, dash=6):
        for start, end in zip(points, points[1:]):
            dx, dy = end[0]-start[0], end[1]-start[1]
            distance = math.hypot(dx, dy)
            for step in range(0, math.ceil(distance), dash * 2):
                a, b = step / distance, min(1, (step + dash) / distance)
                self.line([(start[0]+a*dx, start[1]+a*dy),
                           (start[0]+b*dx, start[1]+b*dy)], fill, width)

    def arrow(self, start, end, color=ORANGE, width=2, size=9, both=False):
        self.line([start, end], color, width)
        angle = math.atan2(end[1]-start[1], end[0]-start[0])
        for tip, a in [(end, angle)] + ([(start, angle+math.pi)] if both else []):
            self.poly([tip,
                       (tip[0]-size*math.cos(a-.5), tip[1]-size*math.sin(a-.5)),
                       (tip[0]-size*math.cos(a+.5), tip[1]-size*math.sin(a+.5))], color)

    def curve(self, points, color=ORANGE, dashed=False, arrow=False):
        if dashed:
            self.dashed(points, color, 2, 4)
        else:
            self.line(points, color, 2)
        if arrow:
            self.arrow(points[-3], points[-1], color, 2, 8)

    def finish(self, p):
        self.rect((28, 634, 772, 637), LIGHT, radius=1)
        self.rect((28, 634, 28 + 744 * p, 637), ACCENT, radius=1)
        return self.image.resize((W, H), Image.Resampling.LANCZOS)


def add(a, b):
    return tuple(x+y for x, y in zip(a, b))


def sub(a, b):
    return tuple(x-y for x, y in zip(a, b))


def mul(a, n):
    return tuple(x*n for x in a)


def dot(a, b):
    return sum(x*y for x, y in zip(a, b))


def unit(a):
    return mul(a, 1 / math.sqrt(dot(a, a)))


def joint(start, end, upper, lower, direction=1):
    """2D inverse kinematics with fixed limb lengths."""
    dx, dy = end[0]-start[0], end[1]-start[1]
    distance = math.hypot(dx, dy)
    assert abs(upper-lower) < distance <= upper+lower
    along = (upper*upper - lower*lower + distance*distance) / (2 * distance)
    away = math.sqrt(max(0, upper*upper - along*along)) * direction
    return (start[0]+along*dx/distance-away*dy/distance,
            start[1]+along*dy/distance+away*dx/distance)


def joint3(start, end, length, preference):
    """Equal-length 3D arm; bend toward the supplied anatomical elbow direction."""
    delta = sub(end, start)
    distance = math.sqrt(dot(delta, delta))
    assert distance <= 2*length
    axis = unit(delta)
    normal = unit(sub(preference, mul(axis, dot(preference, axis))))
    radius = math.sqrt(max(0, length*length-distance*distance/4))
    return add(mul(add(start, end), .5), mul(normal, radius))


def point(center, length, angle):
    a = math.radians(angle)
    return (center[0]+length*math.cos(a), center[1]+length*math.sin(a))


def cycle(p):
    return (1-math.cos(2*math.pi*p))/2


def plan_body(c, seat=False):
    if seat:
        c.rect((246, 250, 354, 359), LIGHT, EQUIP, 2, 12)
        c.rect((242, 244, 358, 265), EQUIP, radius=5)
        c.text((300, 215), 'FIXED BACK PAD', 12, MUTED, anchor='ma')
    c.rect((253, 282, 347, 334), PALE, INK, 2, 16)
    c.circle((300, 288), 27, BG, INK, 3)
    c.poly([(292, 313), (300, 324), (308, 313)], BG, INK, 2)
    c.circle((262, 300), 6, INK)
    c.circle((338, 300), 6, INK)
    c.text((300, 145), 'TOP VIEW', 13, MUTED, True, 'ma')
    c.text((300, 166), 'Looking down; front is below', 12, MUTED, anchor='ma')
    c.arrow((300, 503), (300, 539), EQUIP)
    c.text((300, 545), 'FRONT', 11, MUTED, anchor='ma')


def setup_panel(c, title):
    c.rect((594, 143, 772, 550), WHITE, LIGHT, 1, 12)
    c.text((683, 160), title, 12, MUTED, True, 'ma')


def cablefly(p):
    a = cycle(p)
    c = Canvas('Standing Cable Fly', 'Chest-height pulleys / softly bent elbows',
               'BRING HANDS TOGETHER' if p < .5 else 'CONTROL THE RETURN',
               'Arms sweep forward. Keep the elbow bend almost unchanged.')
    setup_panel(c, 'SIDE SETUP')
    # Side inset gives stance and vertical pulley setting, outside the plan view.
    c.line([(622, 496), (750, 496)], LIGHT, 2)
    c.line([(749, 251), (749, 477)], EQUIP, 5)
    c.circle((749, 281), 8, WHITE, EQUIP)
    c.limb([(682, 290), (672, 372)], INK, 12, False)
    c.circle((685, 258), 19, PALE, INK, 2)
    c.line([(684, 279), (682, 291)], INK, 7)
    c.limb([(672, 372), (708, 423), (707, 487)], INK, 7)
    c.limb([(672, 372), (647, 422), (627, 487)], REAR, 7)
    c.line([(697, 491), (728, 491)], INK, 7)
    c.line([(617, 491), (646, 491)], REAR, 7)
    c.line([(682, 291), (718, 285), (739, 288)], ACCENT, 7)
    c.line([(739, 288), (749, 281)], EQUIP, 2)
    c.text((683, 194), 'Split stance', 13, INK, anchor='ma')
    c.text((683, 211), 'Chest-height cable', 12, MUTED, anchor='ma')
    c.text((683, 516), 'Quiet torso', 13, INK, anchor='ma')
    for side in [-1, 1]:
        pulley = (300+side*250, 274)
        c.rect((pulley[0]-9, 217, pulley[0]+9, 354), LIGHT, EQUIP, 2, 3)
        c.circle(pulley, 12, WHITE, EQUIP, 3)
        shoulder = (300+side*38, 300)
        # Thirty-degree change in direction at elbow = a softly bent 150-degree elbow.
        theta = 175 - 82*a
        local_elbow = point((0, 0), 88, theta)
        local_hand = add(local_elbow, point((0, 0), 88, theta-30))
        elbow = (shoulder[0]-side*local_elbow[0], shoulder[1]+local_elbow[1])
        hand = (shoulder[0]-side*local_hand[0], shoulder[1]+local_hand[1])
        c.line([pulley, hand], EQUIP, 2)
        arc = []
        for t in range(21):
            th = 175-82*t/20
            v = add(point((0, 0), 88, th), point((0, 0), 88, th-30))
            arc.append((shoulder[0]-side*v[0], shoulder[1]+v[1]))
        c.curve(arc, EQUIP, dashed=True)
        # Make phase direction explicit, away from the hand itself.
        c.curve(arc[8:14] if p < .5 else list(reversed(arc[8:14])), ORANGE, arrow=True)
        c.limb([shoulder, elbow, hand], ACCENT, 10)
        c.circle(hand, 8, WHITE, ACCENT, 3)
    plan_body(c)
    c.text((300, 477), 'Meet in front of the chest', 12, MUTED, anchor='ma')
    return c.finish(p)


def pecdeck(p):
    a = cycle(p)
    c = Canvas('Pec Deck', 'Elbow-pad machine / seated at chest height',
               'CLOSE PADS IN FRONT' if p < .5 else 'OPEN WITH CONTROL',
               'Upper arms sweep at chest height. Keep your back on the pad.')
    setup_panel(c, 'FRONT SETUP')
    c.rect((651, 270, 714, 420), LIGHT, EQUIP, 2, 8)
    c.line([(651, 418), (718, 418)], EQUIP, 8)
    c.line([(684, 423), (684, 494)], EQUIP, 6)
    c.line([(649, 495), (718, 495)], EQUIP, 6)
    c.line([(613, 501), (753, 501)], LIGHT, 2)
    c.circle((684, 259), 19, PALE, INK, 2)
    c.limb([(684, 286), (684, 388)], INK, 11, False)
    c.limb([(684, 388), (660, 433), (655, 494)], INK, 7)
    c.limb([(684, 388), (708, 433), (713, 494)], INK, 7)
    c.line([(643, 497), (662, 497)], INK, 6)
    c.line([(706, 497), (725, 497)], INK, 6)
    for s in [-1, 1]:
        c.limb([(684+s*12, 297), (684+s*51, 302), (684+s*51, 258)], ACCENT, 7)
        c.rect((684+s*51-11, 302, 684+s*51+11, 312), EQUIP, radius=3)
    c.text((684, 194), 'Forearms upright', 13, INK, anchor='ma')
    c.text((684, 212), 'Elbows about 90 degrees', 11, MUTED, anchor='ma')
    c.text((684, 516), 'Feet on floor', 13, INK, anchor='ma')
    # Back and machine linkage are fixed in the overhead view.
    c.line([(192, 236), (408, 236)], EQUIP, 7)
    for s in [-1, 1]:
        shoulder = (300+s*38, 300)
        c.line([(300+s*108, 236), shoulder], EQUIP, 5)
        angle = 175-97*a
        v = point((0, 0), 92, angle)
        elbow = (shoulder[0]-s*v[0], shoulder[1]+v[1])
        arc = []
        for t in range(21):
            v = point((0, 0), 92, 175-97*t/20)
            arc.append((shoulder[0]-s*v[0], shoulder[1]+v[1]))
        c.curve(arc, EQUIP, dashed=True)
        # Forearms point upward in this view, so their projection is a circle.
        c.line([shoulder, elbow], EQUIP, 18)
        c.limb([shoulder, elbow], ACCENT, 9)
        c.circle(elbow, 14, PALE, EQUIP, 3)
        c.circle(elbow, 7, WHITE, ACCENT, 3)
        c.circle(elbow, 2, ACCENT)
        shifted = [(x, y+24) for x, y in arc[6:13]]
        c.curve(shifted if p < .5 else list(reversed(shifted)), ORANGE, arrow=True)
    plan_body(c, seat=True)
    c.circle((162, 452), 7, WHITE, ACCENT, 2)
    c.circle((162, 452), 2, ACCENT)
    c.text((180, 444), 'Upright forearm, viewed from above', 12, MUTED)
    c.text((300, 473), 'Pads meet in front; shoulders stay down', 12, MUTED, anchor='ma')
    return c.finish(p)


def project(p):
    x, y, z = p
    return (x+.52*y+35, 523-z-.23*y)


def smith(p):
    a = cycle(p)
    bar_height = 171 + 121*a
    c = Canvas('Smith Machine Bench Press', 'Oblique view / flat bench / vertical guide rails',
               'PRESS UP' if p < .5 else 'LOWER WITH CONTROL',
               'Lower toward mid-chest. Press smoothly; keep feet and back supported.')
    c.line([(118, 546), (674, 546)], LIGHT, 2)
    # Uprights and guides stay still; bar slides vertically on the guides.
    for side in [-1, 1]:
        rail = [(270, side*139, 15), (270, side*139, 342)]
        c.line([project(q) for q in rail], EQUIP, 7)
        c.line([project((245, side*139, 15)), project((310, side*139, 15))], EQUIP, 8)
        c.circle(project((270, side*139, 342)), 5, EQUIP)
        # Stops remain above the torso and just below the illustrated bottom bar height.
        sx, sy = project((270, side*139, 159))
        c.rect((sx-10, sy-4, sx+10, sy+5), ORANGE, radius=2)
    c.line([project((270, -139, 340)), project((270, 139, 340))], LIGHT, 8)
    c.text((477, 151), 'FIXED VERTICAL RAILS', 12, MUTED)
    c.line([(478, 168), (393, 174)], EQUIP, 1)
    c.text((94, 265), 'SAFETY STOPS', 12, ORANGE, True)
    c.line([(169, 285), (221, 391)], ORANGE, 1)
    # The bench surface is horizontal in 3D, with its supports on the floor.
    for x in [190, 398]:
        c.line([project((x, 0, 15)), project((x, 0, 110))], EQUIP, 9)
        c.line([project((x, -52, 15)), project((x, 52, 15))], EQUIP, 8)
    c.poly([project(q) for q in [(164, -38, 110), (420, -38, 110),
                                 (420, 38, 110), (164, 38, 110)]], LIGHT, EQUIP, 2)
    c.line([project((164, 38, 110)), project((420, 38, 110))], EQUIP, 8)
    # Rear legs/arms, torso, then nearer limbs establish depth without fake anatomy.
    for side in [-1, 1]:
        leg = [(397, side*26, 139), (483, side*45, 102), (491, side*61, 15)]
        c.limb([project(q) for q in leg], REAR if side < 0 else INK, 11)
        c.line([project((483, side*61, 10)), project((530, side*61, 10))], INK, 10)
    c.poly([project(q) for q in [(246, -35, 146), (397, -26, 139),
                                 (397, 26, 139), (246, 35, 146)]], PALE, INK, 3)
    c.line([project((237, 0, 146)), project((209, 0, 151))], INK, 10)
    c.circle(project((202, 0, 154)), 23, PALE, INK, 3)
    c.text((555, 473), 'FEET PLANTED', 12, MUTED)
    for side in [-1, 1]:
        shoulder = (246, side*35, 146)
        hand = (270, side*78, bar_height)
        elbow = joint3(shoulder, hand, 80, (0, side*.7, -.7))
        c.limb([project(q) for q in [shoulder, elbow, hand]],
               REAR if side < 0 else ACCENT, 10)
        c.circle(project(shoulder), 6, WHITE, ACCENT, 2)
    # Horizontal bar remains perpendicular to the long axis of the bench.
    c.line([project((270, -158, bar_height)), project((270, 158, bar_height))], INK, 7)
    for side in [-1, 1]:
        c.line([project((270, side*119, bar_height-20)),
                project((270, side*119, bar_height+20))], INK, 10)
        c.circle(project((270, side*139, bar_height)), 7, WHITE, EQUIP, 3)
    c.arrow((451, 253), (451, 372), ORANGE, both=True)
    c.text((467, 279), 'VERTICAL', 12, ORANGE, True)
    c.text((467, 296), 'BAR PATH', 12, ORANGE, True)
    c.text((220, 557), 'Head and hips remain on the flat bench', 12, MUTED)
    return c.finish(p)


def tuck(p):
    a = cycle(p)
    c = Canvas('Legs-up Crunch / Knee Reach', 'Side view / hips and knees held at about 90 degrees',
               'CURL SHOULDERS + REACH' if p < .5 else 'LOWER SHOULDERS SLOWLY',
               'Lift the shoulder blades. Keep the hips down and the legs almost still.')
    c.rect((76, 448, 699, 463), LIGHT, radius=7)
    hip, pivot = (330, 434), (282, 431)
    angle = .43*a
    def rotate(v):
        return (v[0]*math.cos(angle)-v[1]*math.sin(angle),
                v[0]*math.sin(angle)+v[1]*math.cos(angle))
    shoulder = add(pivot, rotate((-112, -4)))
    head = add(shoulder, rotate((-40, -9)))
    # Both legs retain the same hip and knee positions throughout the loop.
    for dx, dy, color in [(10, -10, REAR), (0, 0, INK)]:
        leg = [(hip[0]+dx, hip[1]+dy), (330+dx, 284+dy), (478+dx, 284+dy)]
        c.limb(leg, color, 12)
        c.line([(478+dx, 284+dy), (499+dx, 256+dy)], color, 10)
    c.limb([hip, pivot, add(pivot, rotate((-57, -4))), shoulder], INK, 13, False)
    c.circle(head, 24, PALE, INK, 3)
    c.line([shoulder, add(shoulder, rotate((-19, -3)))], INK, 9)
    hand = (311+8*a, 365-48*a)
    elbow = joint(shoulder, hand, 81, 81, -1)
    c.limb([shoulder, elbow, hand], ACCENT, 9)
    c.circle(hand, 6, ACCENT)
    # Right-angle guides show stationary legs without obscuring their joints.
    c.line([(345, 416), (363, 416), (363, 398)], EQUIP, 2)
    c.line([(345, 301), (345, 317), (363, 317)], EQUIP, 2)
    c.text((551, 274), 'SHINS LEVEL', 12, MUTED, True)
    c.line([(546, 294), (490, 294)], EQUIP, 1)
    c.text((423, 365), 'HIPS STAY DOWN', 12, MUTED, True)
    c.line([(422, 384), (345, 429)], EQUIP, 1)
    c.text((157, 203), 'SMALL TRUNK CURL', 12, ORANGE, True)
    c.arrow((172, 384), (192, 345), ORANGE, both=True)
    c.text((230, 511), 'Reach toward the knees; do not rock onto the hips.', 13, MUTED)
    return c.finish(p)


def stair_foot(p):
    if p < .5:
        # Stance: move exactly with one tread, keeping the entire foot supported.
        return (425-140*p, 405+90*p)
    t = (p-.5)*2
    ease = (1-math.cos(math.pi*t))/2
    return (355+70*ease, 450-45*ease-66*math.sin(math.pi*t))


def stair(p):
    c = Canvas('Stair Climber', 'Side view / continuous descending steps',
               'ALTERNATE STEPS AT AN EASY PACE',
               'Plant the whole foot. Stand tall and touch the rails lightly.')
    c.line([(156, 561), (687, 561)], LIGHT, 2)
    c.poly([(234, 548), (622, 290), (655, 548)], LIGHT, EQUIP, 2)
    shift = (p*2) % 1
    for i in range(-2, 3):
        x, y = 415+70*i-70*shift, 405-45*i+45*shift
        c.poly([(x, y), (x+70, y), (x+70, y+45), (x, y+45)], '#e9eee8', EQUIP, 1)
        c.line([(x+3, y), (x+67, y)], INK, 4)
    c.line([(550, 531), (550, 253), (600, 235)], EQUIP, 7)
    c.line([(505, 253), (550, 253)], EQUIP, 7)
    hip, shoulder = (412, 309), (423, 211)
    for offset, color in [(.5, REAR), (0, ACCENT)]:
        fp = (p+offset) % 1
        heel = stair_foot(fp)
        ankle = (heel[0]+10, heel[1]-7)
        knee = joint(hip, ankle, 86, 95, -1)
        c.limb([hip, knee, ankle], color, 11)
        c.line([(heel[0], heel[1]-5), (heel[0]+38, heel[1]-5)], color, 9)
    c.limb([hip, shoulder], INK, 14, False)
    c.line([(423, 211), (427, 194)], INK, 10)
    c.circle((430, 173), 23, PALE, INK, 3)
    c.poly([(450, 169), (458, 176), (449, 179)], PALE, INK, 2)
    c.limb([shoulder, (464, 260), (521, 253)], INK, 9)
    c.text((93, 171), 'UPRIGHT TORSO', 12, MUTED, True)
    c.line([(230, 180), (410, 231)], EQUIP, 1)
    c.text((84, 291), 'LIGHT RAIL CONTACT', 12, MUTED, True)
    c.line([(243, 308), (508, 260)], EQUIP, 1)
    c.arrow((314, 397), (280, 419), ORANGE)
    c.text((95, 411), 'STEPS DESCEND', 12, ORANGE, True)
    c.text((445, 554), 'Whole foot on each tread', 12, MUTED)
    return c.finish(p)


SPECS = {
    'stair': (stair, 'Stair Climber', 'Side view with moving treads and alternating feet; '
              'stance feet move exactly with a tread; swing feet lift clear.'),
    'cablefly': (cablefly, 'Standing Cable Fly', 'Overhead projection with constant 150-degree '
                 'elbow angle and shoulder rotation; static inset shows chest-height pulleys and split stance.'),
    'smith': (smith, 'Smith Machine Bench Press', 'Oblique 3D flat-bench projection; fixed-length '
              'articulated arms follow a bar constrained to vertical rails; feet, head and hips stay supported.'),
    'pecdeck': (pecdeck, 'Pec Deck', 'Overhead projection of elbow-pad machine, with upright forearms '
                'seen as circles; front inset explains elbow height, seat and forearm position.'),
    'tuck': (tuck, 'Legs-up Crunch / Knee Reach', 'Side projection with fixed hips, knees and horizontal '
             'shins; only the upper trunk curls and hands reach toward the knees.'),
}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    metadata = []
    sheets = []
    for key, (render, title, description) in SPECS.items():
        frames = [render(i/FRAMES) for i in range(FRAMES)]
        # One shared palette prevents animated palette flicker on stable equipment.
        palette = frames[0].quantize(colors=128, method=Image.Quantize.MEDIANCUT)
        gifs = [f.quantize(palette=palette, dither=Image.Dither.NONE) for f in frames]
        target = OUT / f'{key}-diagram.gif'
        gifs[0].save(target, save_all=True, append_images=gifs[1:], duration=DURATION,
                     loop=0, optimize=False, disposal=2)
        frames[15].save(OUT / f'{key}-diagram.jpg', quality=90, optimize=True)
        # Review images live in /tmp rather than shipping in the app.
        strip = Image.new('RGB', (W*3, H), BG)
        for slot, index in enumerate([0, 15, 30]):
            strip.paste(frames[index], (slot*W, 0))
        strip.resize((1500, 400)).save(f'/tmp/{key}-diagram-review.jpg', quality=92)
        sheets.append(strip.resize((1200, 320)))
        with Image.open(target) as result:
            assert result.n_frames == FRAMES, (key, result.n_frames)
        metadata.append({
            'id': key, 'title': title, 'gif': f'media/{key}-diagram.gif',
            'poster': f'media/{key}-diagram.jpg',
            'kind': 'original-articulated-schematic', 'frames': FRAMES,
            'durationMs': FRAMES*DURATION, 'width': W, 'height': H,
            'creator': 'Original diagram for Hillman Gym',
            'license': 'Original project asset', 'licenseUrl': '',
            'sourceScript': 'scripts/gym-diagrams.py',
            'description': description,
            'mediaNote': '動態路線示意（非實拍）；器材設定請教教練。',
            'label': 'MOVEMENT SCHEMATIC / NOT FILMED',
        })
        print(f'{key}: {FRAMES} frames, {target.stat().st_size:,} bytes')
    (OUT / 'diagram-metadata.json').write_text(json.dumps(metadata, indent=2, ensure_ascii=False)+'\n')
    contact = Image.new('RGB', (1200, len(sheets)*320), BG)
    for row, sheet in enumerate(sheets):
        contact.paste(sheet, (0, row*320))
    contact.save('/tmp/gym-diagrams-contact.jpg', quality=92)


if __name__ == '__main__':
    main()
