from PIL import Image, ImageDraw


def make_icon(size):
    S = size
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    orange = (237, 125, 49, 255)
    orange_dark = (191, 90, 20, 255)
    dark = (35, 30, 28, 255)

    cx, cy = S / 2, S / 2

    # Head / dive mask
    head_r = S * 0.16
    head_cx, head_cy = S * 0.50, S * 0.30
    d.ellipse([head_cx - head_r, head_cy - head_r, head_cx + head_r, head_cy + head_r], fill=orange)
    visor_r = head_r * 0.62
    d.ellipse(
        [head_cx - visor_r, head_cy - visor_r * 0.6, head_cx + visor_r, head_cy + visor_r * 1.1],
        fill=dark,
    )

    # Torso (rounded rect, built from a rectangle + two pieslices since
    # PIL's rounded_rectangle chokes on tiny sizes)
    body_w = S * 0.30
    body_top = head_cy + head_r * 0.7
    body_bot = S * 0.66
    rad = min(body_w / 2, (body_bot - body_top) / 2)
    d.rectangle([cx - body_w / 2, body_top + rad, cx + body_w / 2, body_bot - rad], fill=orange_dark)
    d.pieslice([cx - body_w / 2, body_top, cx + body_w / 2, body_top + 2 * rad], 180, 360, fill=orange_dark)
    d.pieslice([cx - body_w / 2, body_bot - 2 * rad, cx + body_w / 2, body_bot], 0, 180, fill=orange_dark)

    # Arms
    arm_w = max(1, S * 0.09)
    for side in (-1, 1):
        p1 = (cx + side * body_w * 0.35, body_top + body_w * 0.2)
        p2 = (cx + side * S * 0.30, body_bot - S * 0.02)
        d.line([p1, p2], fill=orange, width=int(arm_w))
        for p in (p1, p2):
            d.ellipse([p[0] - arm_w / 2, p[1] - arm_w / 2, p[0] + arm_w / 2, p[1] + arm_w / 2], fill=orange)

    # Legs + fins
    leg_w = max(1, S * 0.11)
    fin_len = S * 0.16
    for side in (-1, 1):
        p0 = (cx + side * body_w * 0.2, body_bot - S * 0.02)
        leg_end = (cx + side * S * 0.20, S * 0.92)
        d.line([p0, leg_end], fill=orange_dark, width=int(leg_w))
        for p in (p0, leg_end):
            d.ellipse([p[0] - leg_w / 2, p[1] - leg_w / 2, p[0] + leg_w / 2, p[1] + leg_w / 2], fill=orange_dark)
        lx, ly = leg_end
        d.polygon(
            [(lx, ly - leg_w * 0.4), (lx + side * fin_len, ly + fin_len * 0.15), (lx, ly + leg_w * 0.4)],
            fill=orange,
        )

    # Bubbles above the mask
    bcx, bcy = head_cx + head_r * 0.3, head_cy - head_r * 1.3
    for dx, dy, rr in [(0, 0, S * 0.03), (S * 0.03, -S * 0.05, S * 0.022), (S * 0.055, -S * 0.11, S * 0.015)]:
        w = max(1, int(S * 0.012))
        d.ellipse([bcx + dx - rr, bcy + dy - rr, bcx + dx + rr, bcy + dy + rr], outline=orange, width=w)

    return img


if __name__ == "__main__":
    sizes = [16, 32, 48, 64, 128, 256]
    imgs = [make_icon(s) for s in sizes]
    imgs[-1].save("public/myicon.ico", format="ICO", sizes=[(s, s) for s in sizes])
