"""Convert the transparent Blender frame to responsive, opaque black WebP posters."""
from pathlib import Path
import sys
from PIL import Image

source, out = map(Path, sys.argv[1:])
rgba = Image.open(source).convert('RGBA')
base = Image.new('RGB', rgba.size)
base.paste(rgba, mask=rgba.getchannel('A'))
for w in (640, 1280):
    base.resize((w, round(w * base.height / base.width)), Image.Resampling.LANCZOS).save(out / f'infinity-{w}.webp', quality=88, method=6)
