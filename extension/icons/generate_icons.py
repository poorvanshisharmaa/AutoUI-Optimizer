"""
Run: python generate_icons.py
Requires: pip install Pillow
Generates icon16.png, icon48.png, icon128.png in this directory.
"""

from PIL import Image, ImageDraw, ImageFont
import os

SIZES = [16, 48, 128]

# Brand colors
BG_START = (99, 102, 241)   # indigo-500
BG_END   = (139, 92, 246)   # violet-500
TEXT_CLR = (255, 255, 255)


def make_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Rounded-rect background — draw as filled rectangle then mask with ellipse corners
    radius = size // 5
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=BG_START)

    # Diagonal gradient overlay
    for y in range(size):
        alpha = int(80 * y / size)
        draw.line([(0, y), (size, y)], fill=(*BG_END, alpha))

    # Letter "A" centered
    font_size = max(8, int(size * 0.52))
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
    except Exception:
        font = ImageFont.load_default()

    text = "A"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = (size - tw) // 2 - bbox[0]
    ty = (size - th) // 2 - bbox[1]
    # Shadow
    draw.text((tx + 1, ty + 1), text, font=font, fill=(0, 0, 0, 80))
    draw.text((tx, ty), text, font=font, fill=TEXT_CLR)

    return img


if __name__ == "__main__":
    out_dir = os.path.dirname(os.path.abspath(__file__))
    for size in SIZES:
        icon = make_icon(size)
        path = os.path.join(out_dir, f"icon{size}.png")
        icon.save(path, "PNG")
        print(f"  Created {path}")
    print("Done.")
