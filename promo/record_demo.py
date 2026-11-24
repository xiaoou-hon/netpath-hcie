"""NetPath 网站演示视频录制器：Playwright 驱动真实浏览器交互并录像。

按 timings.json 的场景时长切换真实页面、滚动展示内容，输出无声 webm，
再与 audio_mix.wav（云扬旁白 + 氛围底乐）混流为 MP4。画面全部来自线上站点。
"""
from __future__ import annotations

import json
import os
import subprocess
import time

from playwright.sync_api import sync_playwright

BASE = 'https://xiaoou-hon.github.io/netpath-hcie/'
HERE = os.path.dirname(os.path.abspath(__file__))
TIMINGS = os.path.join(HERE, 'timings.json')
VIDEO_DIR = os.path.join(HERE, 'recordings')
RAW = os.path.join(VIDEO_DIR, 'raw.webm')
OUT = os.path.join(HERE, 'netpath-demo.mp4')
AUDIO = os.path.join(HERE, 'audio_mix.wav')

# 场景键 -> 真实路由与页面内滚动距离，与旁白内容一致
# None 表示保持当前页面（开场即首页），空串表示回到首页（结尾 CTA）
SCENE_ACTIONS = {
    'intro': (None, 320),
    'value': ('path', 900),
    'viz': ('module/m03', 1100),
    'ensp': ('lab/ensp', 600),
    'cloud': ('path/cloud', 800),
    'outro': ('', 0),
}


def recordVideo() -> float:
    """录制真实交互，返回开头需裁掉的加载时长（秒）。"""
    with open(TIMINGS, encoding='utf-8') as handle:
        timings = json.load(handle)
    os.makedirs(VIDEO_DIR, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={'width': 1280, 'height': 720},
            record_video_dir=VIDEO_DIR,
            record_video_size={'width': 1280, 'height': 720},
        )
        page = context.new_page()
        tStart = time.time()
        page.goto(BASE + '#/', wait_until='networkidle', timeout=60000)
        page.wait_for_timeout(600)
        t0 = time.time()
        lead = t0 - tStart

        for scene in timings['scenes']:
            key = scene['key']
            route, scroll = SCENE_ACTIONS[key]
            if route is not None:
                page.goto(BASE + '#/' + route, wait_until='domcontentloaded', timeout=30000)
                page.wait_for_timeout(300)
            page.evaluate('window.scrollTo(0, 0)')

            start, end = scene['start'], scene['end']
            duration = max(end - start, 0.1)
            targetEnd = t0 + end
            while time.time() < targetEnd:
                remain = max(targetEnd - time.time(), 0.0)
                progress = min(1.0 - remain / duration, 1.0)
                if scroll:
                    page.evaluate(f'window.scrollTo(0, {int(scroll * progress)})')
                page.wait_for_timeout(int(min(120, remain * 1000)))
            print(f'scene {key} done', flush=True)

        video = page.video
        page.close()
        context.close()
        video.save_as(RAW)
        browser.close()

    print('raw', os.path.getsize(RAW), 'bytes; lead', round(lead, 2), 's', flush=True)
    return lead


def muxAudio(lead: float) -> None:
    """裁掉加载段，把旁白与底乐混入真实录屏。"""
    import imageio_ffmpeg
    cmd = [imageio_ffmpeg.get_ffmpeg_exe(), '-y', '-loglevel', 'error']
    if lead > 0.1:
        cmd += ['-ss', f'{lead:.3f}']
    cmd += [
        '-i', RAW, '-i', AUDIO,
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '128k', '-map', '0:v:0', '-map', '1:a:0',
        '-shortest', '-movflags', '+faststart', OUT,
    ]
    subprocess.run(cmd, check=True)
    print('saved', OUT, os.path.getsize(OUT), 'bytes', flush=True)


if __name__ == '__main__':
    muxAudio(recordVideo())
