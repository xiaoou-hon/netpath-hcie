"""NetPath 宣传视频生成器：真实界面截图 + 实况数据，输出 1280x720 / 24fps MP4。

配色沿用项目 tokens.css：暖墨底 #0b0e14、琥珀金 #e9b456、柔薄荷 #7fd1a8。
所有文案来自项目 README 与线上页面实况，不虚构数据。
"""
from __future__ import annotations

import math
import os

import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFont

W, H, FPS = 1280, 720, 24
SHOTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'shots')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'netpath-promo.mp4')

BG = (11, 14, 20)
SURFACE = (21, 26, 36)
TEXT = (236, 231, 219)
DIM = (165, 157, 142)
GOLD = (233, 180, 86)
MINT = (127, 209, 168)
GRID = (30, 36, 48)

FONT = 'C:/Windows/Fonts/msyh.ttc'
FONT_BD = 'C:/Windows/Fonts/msyhbd.ttc'


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_BD if bold else FONT, size)


def ease(x: float) -> float:
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


def backdrop(t: float) -> Image.Image:
    """暖墨底 + 稀疏网格 + 缓慢移动的光晕。"""
    img = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(img, 'RGBA')
    for x in range(0, W, 48):
        d.line([(x, 0), (x, H)], fill=GRID + (255,), width=1)
    for y in range(0, H, 48):
        d.line([(0, y), (W, y)], fill=GRID + (255,), width=1)
    cx = int(W * 0.72 + math.sin(t * 0.35) * 90)
    cy = int(H * 0.32 + math.cos(t * 0.28) * 50)
    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for r in range(300, 0, -12):
        a = int(9 * (1 - r / 300))
        gd.ellipse([cx - r, cy - r, cx + r, cy + r], fill=GOLD + (a,))
    return Image.alpha_composite(img.convert('RGBA'), glow).convert('RGB')


def shot_panel(base: Image.Image, name: str, alpha: float) -> None:
    """把截图完整缩放进右侧面板，带细边框与淡入。"""
    path = os.path.join(SHOTS, name)
    if not os.path.exists(path):
        return
    pic = Image.open(path).convert('RGB')
    box_w, box_h = 760, 545
    scale = min(box_w / pic.width, box_h / pic.height)
    pic = pic.resize((int(pic.width * scale), int(pic.height * scale)), Image.Resampling.LANCZOS)
    px = 470 + (box_w - pic.width) // 2
    py = 96 + (box_h - pic.height) // 2
    panel = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    pd = ImageDraw.Draw(panel)
    pd.rounded_rectangle([px - 8, py - 8, px + pic.width + 8, py + pic.height + 8],
                         radius=16, fill=SURFACE + (235,), outline=GOLD + (70,), width=1)
    panel.alpha_composite(pic.convert('RGBA'), (px, py))
    base.paste(Image.blend(base.convert('RGBA'), panel, ease(alpha)).convert('RGB'), (0, 0))


def label(d: ImageDraw.ImageDraw, text: str, y: int, size: int, color=TEXT,
          bold: bool = False, x: int = 72, spacing: int = 14) -> int:
    f = font(size, bold)
    for line in text.split('\n'):
        d.text((x, y), line, font=f, fill=color)
        y += size + spacing
    return y


def scene_intro(base: Image.Image, p: float) -> None:
    d = ImageDraw.Draw(base, 'RGBA')
    a = ease(p / 0.18)
    d.rounded_rectangle([72, 150 + int((1 - a) * 18), 108, 186 + int((1 - a) * 18)],
                        radius=12, fill=GOLD + (int(230 * a),))
    d.text((86, 156 + int((1 - a) * 18)), 'NP', font=font(24, True), fill=BG + (int(255 * a),))
    label(d, 'NetPath', 214 + int((1 - a) * 24), 82, TEXT, True, spacing=6)
    label(d, '网络工程师成长引擎', 330 + int((1 - a) * 20), 40, GOLD, True)
    label(d, '对标 HCIE-Datacom · 从零基础到专家', 410 + int((1 - a) * 16), 25, DIM)
    d.line([(72, 482), (72 + int(520 * ease(p)) , 482)], fill=GOLD + (200,), width=3)


def scene_value(base: Image.Image, p: float) -> None:
    d = ImageDraw.Draw(base, 'RGBA')
    label(d, '把网络真正看懂', 118, 62, TEXT, True, spacing=8)
    label(d, '从一根网线到一张企业网，再到云上网络', 212, 30, GOLD)
    stats = [('23', '课程模块'), ('136+', '可视化课时'), ('17', '互动图解'), ('240+', '自测题'), ('65h', '总学时')]
    x = 72
    for i, (num, name) in enumerate(stats):
        ap = ease((p - 0.08 - i * 0.06) / 0.16)
        bx = x + i * 218
        d.rounded_rectangle([bx, 300, bx + 196, 448], radius=16,
                            fill=SURFACE + (int(225 * ap),), outline=GOLD + (int(60 * ap),))
        d.text((bx + 20, 326), num, font=font(52, True), fill=GOLD + (int(255 * ap),))
        d.text((bx + 20, 398), name, font=font(22), fill=DIM + (int(255 * ap),))
    label(d, 'TCP/IP · IGP/BGP · 交换与 WLAN · 网络安全 · IPv6 · 运维排障与自动化',
          494, 22, DIM)


def scene_shot(base: Image.Image, name: str, title: str, points: str, p: float) -> None:
    shot_panel(base, name, (p - 0.05) / 0.3)
    d = ImageDraw.Draw(base, 'RGBA')
    ap = ease(p / 0.2)
    label(d, title, 110 + int((1 - ap) * 16), 44, TEXT, True, spacing=10)
    label(d, points, 196 + int((1 - ap) * 12), 21, GOLD, spacing=10)
    d.line([(72, 296), (420, 296)], fill=GOLD + (120,), width=2)


def scene_outro(base: Image.Image, p: float) -> None:
    d = ImageDraw.Draw(base, 'RGBA')
    a = ease(p / 0.2)
    label(d, '把网络真正看懂', 156 + int((1 - a) * 20), 66, TEXT, True, spacing=10)
    label(d, 'NetPath · 网络工程师成长引擎', 264 + int((1 - a) * 14), 34, GOLD, True)
    label(d, '23 模块 / 17 互动图解 / eNSP 真机桥接实验室', 344 + int((1 - a) * 10), 24, DIM)
    d.rounded_rectangle([72, 432, 908, 502], radius=14, fill=SURFACE + (int(235 * a),),
                        outline=MINT + (int(90 * a),))
    d.text((96, 452), '在线体验：https://37jvuljvvx51pwvubrz.traesite.cn',
           font=font(25), fill=MINT + (int(255 * a),))


SCENES = [
    (0.0, 7.0, scene_intro, None),
    (7.0, 16.0, scene_value, None),
    (16.0, 26.0, scene_shot, ('home.png', '可视化互动图解',
                              'STP / OSPF / BGP / VXLAN\n拖动点击，看协议过程')),
    (26.0, 36.0, scene_shot, ('lab-ensp.png', 'eNSP 桥接实验室',
                              '拓扑可视化 · Web 终端\nAI 助教 · 远程验收')),
    (36.0, 45.0, scene_shot, ('path-cloud.png', '云网转型路线',
                              'VLAN/VRF → VPC\nOSPF/BGP → 云上互联')),
    (45.0, 51.0, scene_outro, None),
]
TOTAL = SCENES[-1][1]


def render_frame(idx: int) -> Image.Image:
    t = idx / FPS
    scene = next((s for s in SCENES if s[0] <= t < s[1]), SCENES[-1])
    start, end, fn, args = scene
    p = (t - start) / (end - start)
    img = backdrop(t)
    if args:
        fn(img, *args, p)
    else:
        fn(img, p)
    fade = 0.55
    alpha = min(ease(p / fade), ease((1 - p) / fade))
    if alpha < 1:
        img = Image.blend(Image.new('RGB', (W, H), BG), img, alpha)
    return img


def main() -> None:
    writer = imageio_ffmpeg.write_frames(
        OUT, (W, H), fps=FPS, codec='libx264', pix_fmt_in='rgb24',
        output_params=['-crf', '20', '-preset', 'medium', '-movflags', '+faststart'],
    )
    writer.send(None)
    for i in range(int(TOTAL * FPS)):
        writer.send(render_frame(i).tobytes())
        if i % 120 == 0:
            print(f'frame {i}/{int(TOTAL * FPS)}', flush=True)
    writer.close()
    print('saved', OUT, os.path.getsize(OUT), 'bytes')


if __name__ == '__main__':
    main()
