import os
import subprocess
import tempfile
from PIL import Image

# SVG content with media query for light/dark mode tabs
svg_content = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <style>
    :root {
      --bg: #f5f5f5;
      --fg: #0a0a0a;
      --stroke: rgba(0, 0, 0, 0.12);
    }
    @media (prefers-color-scheme: light) {
      :root {
        --bg: #141414;
        --fg: #f5f5f5;
        --stroke: rgba(255, 255, 255, 0.14);
      }
    }
    .squircle-bg {
      fill: var(--bg);
      stroke: var(--stroke);
      stroke-width: 1;
    }
    .icon-fg {
      stroke: var(--fg);
    }
  </style>
  <rect class="squircle-bg" x="1" y="1" width="30" height="30" rx="9" ry="9" />
  <g class="icon-fg" transform="translate(4, 4)" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="10" cy="8" r="5" />
    <path d="M2 21a8 8 0 0 1 10.434-7.62" />
    <circle cx="18" cy="18" r="3" />
    <path d="m22 22-1.9-1.9" />
  </g>
</svg>"""

os.makedirs("public", exist_ok=True)

with open("public/favicon.svg", "w", encoding="utf-8") as f:
    f.write(svg_content)
print("Created public/favicon.svg")

# Render 512x512 high-res image for raster outputs using headless Edge
html_render = """<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: transparent; width: 512px; height: 512px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
svg { width: 512px; height: 512px; }
</style>
</head>
<body>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect x="1" y="1" width="30" height="30" rx="9" ry="9" fill="#f5f5f5" stroke="rgba(0, 0, 0, 0.12)" stroke-width="1" />
  <g transform="translate(4, 4)" fill="none" stroke="#0a0a0a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="10" cy="8" r="5" />
    <path d="M2 21a8 8 0 0 1 10.434-7.62" />
    <circle cx="18" cy="18" r="3" />
    <path d="m22 22-1.9-1.9" />
  </g>
</svg>
</body>
</html>"""

temp_html = os.path.join(tempfile.gettempdir(), "hiresense_icon.html")
temp_png = os.path.join(tempfile.gettempdir(), "hiresense_512.png")

with open(temp_html, "w", encoding="utf-8") as f:
    f.write(html_render)

edge = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
subprocess.run([
    edge,
    "--headless",
    "--disable-gpu",
    "--default-background-color=00000000",
    f"--screenshot={temp_png}",
    "--window-size=512,512",
    temp_html
], check=True)

img_512 = Image.open(temp_png).convert("RGBA")
print(f"Rendered base PNG: {img_512.size}")

# Apple touch icon (180x180)
apple_icon = img_512.resize((180, 180), Image.Resampling.LANCZOS)
apple_icon.save("public/apple-touch-icon.png", format="PNG")
print("Saved public/apple-touch-icon.png")

# PNG 32x32 and 16x16
png_32 = img_512.resize((32, 32), Image.Resampling.LANCZOS)
png_32.save("public/favicon-32x32.png", format="PNG")
png_16 = img_512.resize((16, 16), Image.Resampling.LANCZOS)
png_16.save("public/favicon-16x16.png", format="PNG")
print("Saved PNG icons")

# Multi-frame ICO (16, 32, 48)
img_512.save("public/favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
print("Saved public/favicon.ico (16x16, 32x32, 48x48)")
