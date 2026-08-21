from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[1] / "public" / "icons"
OUT.mkdir(parents=True, exist_ok=True)


def make_icon(size: int) -> None:
    image = Image.new("RGBA", (size, size), "#6d4de0")
    draw = ImageDraw.Draw(image)

    # Rounded gradient-like two-tone background built from nested rounded squares.
    draw.rounded_rectangle((0, 0, size, size), radius=round(size * 0.22), fill="#4f2ccb")
    inset = round(size * 0.035)
    draw.rounded_rectangle((inset, inset, size - inset, size - inset), radius=round(size * 0.20), fill="#7c5cfc")

    s = size / 512
    def pts(values):
        return [(round(x * s), round(y * s)) for x, y in values]

    # Graduation-cap mark matching app/icon.svg.
    draw.polygon(pts([(96, 194.5), (256, 112), (416, 194.5), (256, 277.3)]), fill="#ffffff")
    draw.polygon(pts([(148, 221), (148, 326.4), (256, 378), (364, 326.4), (364, 221), (256, 276.9)]), fill="#ede9fe")
    stroke = max(2, round(20 * s))
    draw.line(pts([(392, 206), (392, 316)]), fill="#ffffff", width=stroke)
    draw.ellipse((round(369 * s), round(313 * s), round(415 * s), round(359 * s)), fill="#fbbf24")
    draw.line(pts([(208, 302), (304, 302)]), fill="#6d4de0", width=max(2, round(18 * s)))
    draw.line(pts([(208, 334), (270, 334)]), fill="#6d4de0", width=max(2, round(18 * s)))

    image.save(OUT / f"icon-{size}.png", optimize=True)


for value in (192, 512):
    make_icon(value)
