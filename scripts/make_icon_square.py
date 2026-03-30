from PIL import Image
import numpy as np
from pathlib import Path

src = Path(__file__).resolve().parents[1] / 'assets' / 'adaptive-icon-new.png'
if not src.exists():
    print('Source not found:', src)
    raise SystemExit(1)

img = Image.open(src).convert('RGBA')
w,h = img.size
arr = np.array(img)

# Extract white mask from original (white-ish pixels)
r,g,b,a = arr[:,:,0], arr[:,:,1], arr[:,:,2], arr[:,:,3]
white_mask = (r>220) & (g>220) & (b>220)
mask_img = Image.fromarray((white_mask.astype('uint8')*255))

# Create new square background with a simple diagonal gradient approximating original
new = Image.new('RGBA', (w,h))
new_arr = np.zeros((h,w,4), dtype=np.uint8)
# Colors chosen to approximate the original gradient
c1 = np.array([118,115,255,255])  # top-left
c2 = np.array([43,142,255,255])   # bottom-right
for y in range(h):
    for x in range(w):
        t = (x + y) / (w + h - 2)
        new_arr[y,x] = (c1*(1-t) + c2*t).astype(np.uint8)
new = Image.fromarray(new_arr, 'RGBA')

# Prepare scaled white shape
bbox = mask_img.getbbox()
if bbox is None:
    print('No white region detected; aborting')
    raise SystemExit(1)
mask_crop = mask_img.crop(bbox)
scale = 0.88
nw = int(mask_crop.width * scale)
nh = int(mask_crop.height * scale)
mask_small = mask_crop.resize((nw, nh), resample=Image.LANCZOS)

# Center position for paste
cx = w//2
cy = h//2
paste_x = cx - nw//2
paste_y = cy - nh//2

# Use average white color from original white region
white_pixels = arr[white_mask]
if len(white_pixels) > 0:
    avg = tuple(np.mean(white_pixels, axis=0).astype(int))
    fill_color = (avg[0], avg[1], avg[2], 255)
else:
    fill_color = (250,250,250,255)

# Composite: paste scaled white onto new background
out = new.copy()
white_layer = Image.new('RGBA', out.size, (0,0,0,0))
white_paste = Image.new('RGBA', (nw, nh), fill_color)
white_layer.paste(white_paste, (paste_x, paste_y), mask_small)
out = Image.alpha_composite(out, white_layer)

# Backup original
bak = src.with_suffix('.orig.png')
if not bak.exists():
    src.replace(bak)
    print('Backup created at', bak)
else:
    src.unlink()

# Save new image to original path
out.save(src)
print('Saved new icon to', src)
