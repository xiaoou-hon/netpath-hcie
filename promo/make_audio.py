"""NetPath 宣传视频配音生成器：edge-tts 逐句合成 + 时长对齐 + 氛围底乐。

用微软神经网络音色（云扬 zh-CN-YunyangNeural）合成中文旁白，按每句真实
时长推导场景时长，写入 timings.json 供画面渲染对齐；同时输出 audio_mix.wav
（旁白 + 低音量氛围底乐）。所有文案来自项目 README 与线上页面实况。
"""
from __future__ import annotations

import asyncio
import json
import os
import subprocess
import wave

import edge_tts
import imageio_ffmpeg
import numpy as np

BASE = os.path.dirname(os.path.abspath(__file__))
VOICE_DIR = os.path.join(BASE, 'voice')
VOICE = 'zh-CN-YunyangNeural'
RATE = '+0%'
SR = 24000  # edge-tts 输出 24 kHz 单声道

# 一句一个场景；文案来自项目 README 与线上实况，不虚构数据
NARRATION = [
    ('intro', 'NetPath，网络工程师成长引擎。从零基础到 HCIE-Datacom 的可视化学习平台。'),
    ('value', '把网络真正看懂。二十三个课程模块，一百三十六节可视化课时，十七个互动图解，两百四十多道自测题。'),
    ('viz', '可视化互动图解。STP、OSPF、BGP 与 VXLAN，拖动点击，看清协议过程。'),
    ('ensp', 'eNSP 桥接实验室。拓扑可视化、Web 终端、AI 助教与远程验收，像真机一样练习。'),
    ('cloud', '云网转型路线。从 VLAN、VRF 到 VPC，从 OSPF、BGP 到云上互联。'),
    ('outro', '把网络真正看懂。NetPath 网络工程师成长引擎。线上即可体验。'),
]
PAD = [0.9, 0.6, 0.7, 0.7, 0.7, 1.4]      # 各场景尾部留白
MIN_LEN = [4.5, 7.0, 5.5, 6.0, 5.5, 5.5]  # 最短镜头，保证画面可读
LEAD = 0.45  # 画面出现后多久开始说话


def ffmpeg() -> str:
    return imageio_ffmpeg.get_ffmpeg_exe()


async def synthOne(text: str, path: str) -> None:
    """单句合成，网络抖动时最多重试 3 次。"""
    for attempt in range(3):
        try:
            await edge_tts.Communicate(text, VOICE, rate=RATE).save(path)
            return
        except Exception as exc:
            if attempt == 2:
                raise
            print(f'retry {attempt + 1}: {exc}', flush=True)


def decodeMp3(path: str) -> np.ndarray:
    """把 mp3 解码为 24 kHz 单声道 int16 采样。"""
    raw = subprocess.run(
        [ffmpeg(), '-v', 'error', '-i', path, '-f', 's16le', '-ac', '1',
         '-ar', str(SR), '-'],
        capture_output=True, check=True,
    ).stdout
    return np.frombuffer(raw, dtype='<i2').astype(np.float64)


def ambientPad(seconds: float) -> np.ndarray:
    """生成柔和和弦垫音：Am 缓慢过渡到 F，低音量、首尾淡入淡出。"""
    count = int(seconds * SR)
    t = np.arange(count) / SR
    freqsA = (110.00, 261.63, 329.63)   # A2 / C4 / E4
    freqsF = (87.31, 261.63, 349.23)    # F2 / C4 / F4
    blend = 0.5 - 0.5 * np.cos(np.pi * np.clip(t / max(seconds, 1.0), 0, 1))
    wave = np.zeros(count)
    for fa, ff in zip(freqsA, freqsF):
        f = fa * (1 - blend) + ff * blend
        wave += np.sin(2 * np.pi * f * t)
    wave /= len(freqsA)
    swell = 0.75 + 0.25 * np.sin(2 * np.pi * 0.06 * t) ** 2
    fade = min(int(2.0 * SR), count // 4)
    if fade > 0:
        swell[:fade] *= np.linspace(0, 1, fade)
        swell[-fade:] *= np.linspace(1, 0, fade)
    return wave * swell * 0.045  # 约 -27 dB，不压过旁白


def writeWav(path: str, samples: np.ndarray) -> None:
    with wave.open(path, 'wb') as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(SR)
        handle.writeframes(np.clip(samples, -32768, 32767).astype('<i2').tobytes())


def main() -> None:
    os.makedirs(VOICE_DIR, exist_ok=True)

    async def synthesize() -> list[str]:
        paths = []
        for index, (_, text) in enumerate(NARRATION):
            path = os.path.join(VOICE_DIR, f'voice_{index:02d}.mp3')
            await synthOne(text, path)
            paths.append(path)
            print(f'voice {index + 1}/{len(NARRATION)}', flush=True)
        return paths

    paths = asyncio.run(synthesize())
    voices = [decodeMp3(path) for path in paths]

    scenes = []
    scenesStart = 0.0
    for index, voice in enumerate(voices):
        spoken = len(voice) / SR
        length = max(spoken + LEAD + PAD[index], MIN_LEN[index])
        scenes.append({
            'start': round(scenesStart, 3),
            'end': round(scenesStart + length, 3),
            'voiceStart': round(scenesStart + LEAD, 3),
            'key': NARRATION[index][0],
        })
        scenesStart += length
    total = scenesStart

    mix = ambientPad(total)
    for scene, voice in zip(scenes, voices):
        offset = int(scene['voiceStart'] * SR)
        end = min(offset + len(voice), len(mix))
        mix[offset:end] += voice[:end - offset] * 0.95

    audioPath = os.path.join(BASE, 'audio_mix.wav')
    writeWav(audioPath, mix)

    timingsPath = os.path.join(BASE, 'timings.json')
    with open(timingsPath, 'w', encoding='utf-8') as handle:
        json.dump({'total': round(total, 3), 'scenes': scenes},
                  handle, ensure_ascii=False, indent=2)

    print('total', round(total, 2), 's', flush=True)
    print('audio', audioPath, os.path.getsize(audioPath), 'bytes', flush=True)
    print('timings', timingsPath, flush=True)


if __name__ == '__main__':
    main()
