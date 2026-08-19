#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成 1688 Selector 应用图标: 橙色渐变圆角底 + 白色购物车 + "1688" 字标。
输出: assets/icon.png (1024x1024) + assets/icon.ico (16~256 多尺寸)
依赖: Pillow (系统 Python 已装 12.3.0)
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SIZE = 1024
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets")
OUT_DIR = os.path.normpath(OUT_DIR)

# ---------- 渐变背景 ----------
img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
px = img.load()
# 对角渐变: 左上亮橙 -> 右下深橙红
c1 = (255, 138, 0)   # #FF8A00
c2 = (224, 52, 16)   # #E03410
for y in range(SIZE):
    for x in range(SIZE):
        t = (x + y) / (2.0 * SIZE)
        r = int(c1[0] + (c2[0] - c1[0]) * t)
        g = int(c1[1] + (c2[1] - c1[1]) * t)
        b = int(c1[2] + (c2[2] - c1[2]) * t)
        px[x, y] = (r, g, b, 255)

# 圆角遮罩
mask = Image.new("L", (SIZE, SIZE), 0)
md = ImageDraw.Draw(mask)
md.rounded_rectangle([0, 0, SIZE - 1, SIZE - 1], radius=190, fill=255)
img.putalpha(mask)

# ---------- 玻璃光泽 ----------
gloss = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
gd = ImageDraw.Draw(gloss)
gd.ellipse([60, -160, 640, 420], fill=(255, 255, 255, 46))
gd.ellipse([210, -60, 520, 250], fill=(255, 255, 255, 52))
gloss = gloss.filter(ImageFilter.GaussianBlur(40))
img = Image.alpha_composite(img, gloss)

# ---------- 白色购物车 ----------
draw = ImageDraw.Draw(img)
WHITE = (255, 255, 255, 255)
LW = 26  # 推把线宽

# 车篮 (梯形)
draw.polygon([(372, 300), (652, 300), (600, 440), (424, 440)], fill=WHITE)
# 篮身网格线
draw.line([(470, 302), (456, 438)], fill=WHITE, width=10)
draw.line([(556, 302), (570, 438)], fill=WHITE, width=10)
# 轮子
draw.ellipse([438, 458, 488, 508], fill=WHITE)
draw.ellipse([532, 458, 582, 508], fill=WHITE)
# 推把: 斜杆 + 横把手 + 圆端
draw.line([(650, 302), (782, 216)], fill=WHITE, width=LW)
draw.line([(726, 198), (838, 234)], fill=WHITE, width=LW)
for cx, cy in [(782, 216), (726, 198), (838, 234)]:
    draw.ellipse([cx - LW // 2, cy - LW // 2, cx + LW // 2, cy + LW // 2], fill=WHITE)

# ---------- "1688" 字标 ----------
font_path = r"C:\Windows\Fonts\segoeuib.ttf"
font = ImageFont.truetype(font_path, 390)
text = "1688"
bbox = draw.textbbox((0, 0), text, font=font)
tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
# 垂直居中于 [600, 1024] 区间, 水平居中
tx = (SIZE - tw) // 2 - bbox[0]
ty = 600 + (1024 - 600 - th) // 2 - bbox[1]
draw.text((tx, ty), text, font=font, fill=WHITE)

# ---------- 输出 ----------
os.makedirs(OUT_DIR, exist_ok=True)
png_path = os.path.join(OUT_DIR, "icon.png")
ico_path = os.path.join(OUT_DIR, "icon.ico")
img.save(png_path, "PNG")
img.save(ico_path, "ICO", sizes=[(16, 16), (24, 24), (32, 32), (48, 48),
                                 (64, 64), (128, 128), (256, 256)])
print("PNG:", png_path, os.path.getsize(png_path), "bytes")
print("ICO:", ico_path, os.path.getsize(ico_path), "bytes")
