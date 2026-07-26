#!/usr/bin/env python3
"""Cut the Canva granny (525x799) into body / upper-arm / forearm / head sprites.

All coordinates are in the original image space. All four output sprites are
emitted in the SAME 525x799 frame so the game can use image coords directly
as sprite anchors.

Layering in the game: body -> bricks -> paper -> fore -> upper -> head.
The head overlay lets the (far) arm tuck behind the jaw like the source art.
"""
from PIL import Image, ImageDraw, ImageFilter, ImageChops
import sys

SRC = 'granny-src.png'
W, H = 525, 799

# joints (image coords)
SHOULDER = (190, 345)
ELBOW = (82, 235)
WRIST = (61, 196)       # measured: narrowest section before the fist widens
SLIPPER = (100, 72)     # centre of the slipper face

# hand + slipper: everything beyond the wrist. The cut runs perpendicular to
# the forearm across the wrist; elsewhere the boundary sits in transparency,
# so it can be generous. The (84,200)..(61,169) run loops around WRIST at a
# ~27px margin (bigger than the wrist-cap disc drawn in main()) rather than
# touching it — the disc is unmasked, so if HAND's own polygon doesn't reach
# past its footprint, hand.png shows the flat cap color instead of real
# pixels there and it overwrites fore's real content when composited on top.
POLY_HAND = [
    (0, 0), (205, 0), (205, 95), (150, 140), (128, 185), (100, 188),
    (84, 200), (82, 213), (61, 223), (40, 213), (34, 196), (44, 175),
    (61, 169), (30, 170), (0, 178),
]

# forearm stub: elbow up to the wrist cut. Short — most of what the old
# single sprite called "forearm" was actually fist + slipper. The right edge
# (92,180)-(81,210) is pushed a few px past where POLY_UPPER's own boundary
# sits (measured: a hairline gap otherwise runs along that edge, invisible
# in the old single-piece art but exposed here by the wrist bone/cap fill
# sitting right on top of it — the overlap is free since both pieces sample
# the same source photo).
POLY_FORE = [
    (0, 170), (30, 168), (60, 166), (92, 180), (81, 210), (74, 228),
    (60, 256), (48, 248), (36, 242), (6, 236), (0, 238),
]

# the sleeve (upper arm): boundary follows the cuff-opening V and the elbow
# point at the top, hugs the jaw on the right, ends at the armpit; the rest
# borders transparency
POLY_UPPER = [
    (0, 234), (28, 236), (44, 244), (56, 258), (66, 248), (74, 232),
    (80, 218), (86, 200), (98, 192), (108, 220), (122, 255), (138, 282),
    (158, 300), (170, 296), (174, 300), (178, 330), (232, 347), (228, 368),
    (148, 350), (82, 330), (26, 302), (0, 268),
]

# head overlay: hair + face + a sliver of static sleeve along the jaw plus a
# skirt of static chest below the chin, so the sleeve slides beneath it
# during the wind-up; drawn last, over the arm
POLY_HEAD = [
    (167, 248), (170, 300), (177, 330), (188, 356), (240, 376), (305, 352),
    (340, 312), (358, 268), (363, 205), (354, 110), (322, 46), (255, 30),
    (205, 48), (182, 90), (172, 165),
]

# painted shoulder on the body, revealed when the arm swings away
POLY_PATCH = [
    (158, 244), (144, 284), (146, 324), (166, 350), (200, 360), (246, 358),
    (242, 330), (206, 300), (170, 252),
]

INK = (56, 34, 24)

def mask_from_poly(poly, feather=1.2):
    m = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(m)
    d.polygon(poly, fill=255)
    if feather:
        m = m.filter(ImageFilter.GaussianBlur(feather))
    return m

def main(debug_only=False):
    img = Image.open(SRC).convert('RGBA')

    if debug_only:
        dbg = img.copy()
        d = ImageDraw.Draw(dbg)
        d.polygon(POLY_FORE, outline=(255, 0, 0, 255), width=2)
        d.polygon(POLY_HAND, outline=(255, 200, 0, 255), width=2)
        d.polygon(POLY_UPPER, outline=(0, 0, 255, 255), width=2)
        d.polygon(POLY_HEAD, outline=(0, 180, 0, 255), width=2)
        d.polygon(POLY_PATCH, outline=(255, 0, 255, 255), width=2)
        for p, c in [(SHOULDER, (255, 0, 255, 255)), (ELBOW, (0, 200, 0, 255)),
                     (WRIST, (0, 220, 220, 255)), (SLIPPER, (255, 140, 0, 255))]:
            d.ellipse([p[0]-6, p[1]-6, p[0]+6, p[1]+6], outline=c, width=3)
        dbg.save('debug-polys.png')
        print('wrote debug-polys.png')
        return

    m_fore = mask_from_poly(POLY_FORE)
    m_hand = mask_from_poly(POLY_HAND)
    m_upper = mask_from_poly(POLY_UPPER)
    m_head = mask_from_poly(POLY_HEAD)

    skin = (219, 102, 32)     # sampled mid-forearm
    yellow = (210, 159, 2)    # sampled sweater/sleeve

    alpha = img.split()[3]

    def extract(mask):
        # keep RGB verbatim; only the alpha channel is cut — paste() with a
        # mask would blend edge RGB toward black and leave dark seams
        piece = img.copy()
        piece.putalpha(ImageChops.multiply(alpha, mask))
        return piece

    def slim(piece):
        # zero RGB wherever fully transparent so PNG compresses those runs;
        # binary mask -> hard copy, no edge blending
        keep = piece.split()[3].point(lambda a: 255 if a > 0 else 0)
        out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        out.paste(piece, (0, 0), keep)
        return out

    # ── forearm sprite: masked pixels + synthetic bone down to the elbow ──
    fore = extract(m_fore)
    bone = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    bd = ImageDraw.Draw(bone)
    bd.line([WRIST, ELBOW], fill=skin + (255,), width=44)
    bd.ellipse([WRIST[0]-22, WRIST[1]-22, WRIST[0]+22, WRIST[1]+22], fill=skin + (255,))
    # clip to the source's own silhouette: the line/ellipse footprint is a
    # geometric approximation of the limb, not a measured trace of it, so it
    # can poke past the real ink outline into background wherever the
    # painted arm is narrower or curves off the straight synthetic line
    bone.putalpha(ImageChops.multiply(bone.split()[3], alpha))
    fore = Image.alpha_composite(bone, fore)
    slim(fore).save('granny-arm-fore.png')

    # ── hand sprite: fist + slipper, pivoting at the wrist ──
    hand = extract(m_hand)
    wcap = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    wd = ImageDraw.Draw(wcap)
    wd.ellipse([WRIST[0]-20, WRIST[1]-20, WRIST[0]+20, WRIST[1]+20], fill=skin + (255,))
    wcap = wcap.filter(ImageFilter.GaussianBlur(0.5))
    wcap.putalpha(ImageChops.multiply(wcap.split()[3], alpha))  # same silhouette clip
    hand = Image.alpha_composite(wcap, hand)
    slim(hand).save('granny-hand.png')

    # ── upper arm sprite: yellow half-disc cap under the sleeve pixels ──
    # only the elbow-facing half: the body-side half is the patch's job, and a
    # full disc pokes past the chest silhouette as a round bump
    cap = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    cd = ImageDraw.Draw(cap)
    r = 42
    cd.ellipse([SHOULDER[0]-r, SHOULDER[1]-r, SHOULDER[0]+r, SHOULDER[1]+r],
               fill=yellow + (255,))
    import math
    dx, dy = ELBOW[0]-SHOULDER[0], ELBOW[1]-SHOULDER[1]
    n = math.hypot(dx, dy); dx, dy = dx/n, dy/n
    # erase the half-plane 8px behind the shoulder, away from the elbow
    px, py = -dy, dx
    bx, by = SHOULDER[0] - dx*8, SHOULDER[1] - dy*8
    L = 200
    cd.polygon([(bx+px*L, by+py*L), (bx-px*L, by-py*L),
                (bx-px*L-dx*L, by-py*L-dy*L), (bx+px*L-dx*L, by+py*L-dy*L)],
               fill=(0, 0, 0, 0))
    cap = cap.filter(ImageFilter.GaussianBlur(0.5))
    upper = Image.alpha_composite(cap, extract(m_upper))
    slim(upper).save('granny-arm-upper.png')

    # ── head overlay: verbatim pixels ──
    head = extract(m_head)
    head = slim(head)
    head.save('granny-head.png')

    # ── body sprite: original minus both arm pieces, shoulder patched ──
    # dilate the union so no sliver of arm survives between the two cut lines
    union = ImageChops.lighter(ImageChops.lighter(m_fore, m_upper),
                               m_hand).filter(ImageFilter.MaxFilter(9))
    body = img.copy()
    body.putalpha(ImageChops.multiply(alpha, ImageChops.invert(union)))
    patch = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    pd = ImageDraw.Draw(patch)
    pd.polygon(POLY_PATCH, fill=yellow + (255,))
    # silhouette line along the revealed shoulder's outer edge
    pd.line([(158, 246), (146, 286), (148, 322), (167, 347), (200, 358)],
            fill=INK + (255,), width=5, joint='curve')
    patch = patch.filter(ImageFilter.GaussianBlur(0.8))
    body = Image.alpha_composite(patch, body)
    body = slim(body)
    body.save('granny-body.png')

    # ── reconstruction check: authored pose should look like the original ──
    recon = Image.alpha_composite(Image.alpha_composite(Image.alpha_composite(
        Image.alpha_composite(body, fore), hand), upper), head)
    recon.save('debug-recon.png')

    # rotated-pose seam checks (shoulder deg, elbow deg — canvas sign, so
    # positive = clockwise; PIL rotate() is counterclockwise for positive)
    for name, sh_deg, el_deg in [('ready', 17, -35), ('cock', 27, -32),
                                 ('strike', -66, -20), ('deep', -80, -40)]:
        canvas = Image.new('RGBA', (W, H), (242, 227, 200, 255))
        canvas.alpha_composite(body)
        f = fore.rotate(-el_deg, center=ELBOW, resample=Image.BICUBIC)
        f = f.rotate(-sh_deg, center=SHOULDER, resample=Image.BICUBIC)
        # hand has no independent wrist bend yet (that's task 3's IK job) —
        # carry it through the same elbow+shoulder transform as the forearm
        # so it stays glued at the wrist for this seam check
        h = hand.rotate(-el_deg, center=ELBOW, resample=Image.BICUBIC)
        h = h.rotate(-sh_deg, center=SHOULDER, resample=Image.BICUBIC)
        u = upper.rotate(-sh_deg, center=SHOULDER, resample=Image.BICUBIC)
        canvas.alpha_composite(f)
        canvas.alpha_composite(h)
        canvas.alpha_composite(u)
        canvas.alpha_composite(head)
        canvas.save(f'debug-pose-{name}.png')
    print('wrote sprites + debug composites')

if __name__ == '__main__':
    main(debug_only='--debug' in sys.argv)
