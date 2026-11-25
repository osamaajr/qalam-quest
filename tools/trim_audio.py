"""Trim long quiet margins from the game's recorded audio.

Keeps 120 ms on either side of detectable sound and never cuts internal pauses.
Only files with at least 250 ms of removable margin are rewritten.
"""
import json
import os
import subprocess
import sys
import tempfile

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(ROOT, 'js', 'audio-manifest.js')
SOURCES = os.path.join(ROOT, 'tools', 'audio-sources.json')
RATE = 16000
FRAME = 160  # 10 ms
THRESHOLD = 0.001  # -60 dBFS RMS
GUARD = 0.12
MIN_TRIM = 0.25


def bounds(path):
    decoded = subprocess.run(
        ['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(RATE), '-f', 'f32le', '-'],
        capture_output=True, check=True,
    ).stdout
    samples = np.frombuffer(decoded, dtype=np.float32)
    if len(samples) < FRAME:
        raise ValueError(f'Audio too short: {path}')
    levels = np.array([
        np.sqrt(np.mean(samples[i:i + FRAME] ** 2))
        for i in range(0, len(samples), FRAME)
    ])
    active = np.flatnonzero(levels > THRESHOLD)
    if not len(active):
        raise ValueError(f'No audible content: {path}')
    start = max(0, active[0] * FRAME / RATE - GUARD)
    end = min(len(samples) / RATE, (active[-1] + 1) * FRAME / RATE + GUARD)
    return start, end, len(samples) / RATE


def audio_path(clip_id):
    return os.path.join(ROOT, 'assets', 'audio', clip_id + '.mp3')


def trim(path):
    """Return (old duration, new duration), or None if no trim is needed."""
    start, end, duration = bounds(path)
    if start + duration - end < MIN_TRIM:
        return None
    fd, temp = tempfile.mkstemp(prefix='qalam-trim-', suffix='.mp3', dir=os.path.dirname(path))
    os.close(fd)
    try:
        subprocess.run([
            'ffmpeg', '-v', 'error', '-y', '-i', path,
            '-af', f'atrim=start={start:.3f}:end={end:.3f},asetpts=PTS-STARTPTS',
            '-ac', '1', '-b:a', '96k', temp,
        ], check=True)
        _, _, new_duration = bounds(temp)
        if new_duration < 0.25 or new_duration > duration:
            raise ValueError(f'Unsafe trimmed duration for {path}')
        os.replace(temp, path)
        return round(duration, 2), round(new_duration, 2)
    finally:
        if os.path.exists(temp):
            os.unlink(temp)


def rejoin(label, manifest):
    """Build a phrase from the already trimmed individual clips and 350 ms gaps."""
    pieces = label.split()
    if any(piece not in manifest for piece in pieces):
        raise ValueError(f'Missing piece for {label}')
    inputs, filters, order = [], [], []
    for index, piece in enumerate(pieces):
        inputs.extend(['-i', audio_path(manifest[piece])])
        filters.append(f'[{index}:a]aresample=24000,aformat=sample_fmts=fltp:channel_layouts=mono[a{index}]')
        order.append(f'[a{index}]')
        if index < len(pieces) - 1:
            filters.append(f'anullsrc=r=24000:cl=mono,atrim=0:0.35,aformat=sample_fmts=fltp[g{index}]')
            order.append(f'[g{index}]')
    graph = ';'.join(filters) + ';' + ''.join(order) + f'concat=n={len(order)}:v=0:a=1[out]'
    destination = audio_path(manifest[label])
    fd, temp = tempfile.mkstemp(prefix='qalam-join-', suffix='.mp3', dir=os.path.dirname(destination))
    os.close(fd)
    try:
        subprocess.run(['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', graph,
                        '-map', '[out]', '-ac', '1', '-b:a', '96k', temp], check=True)
        bounds(temp)
        os.replace(temp, destination)
    finally:
        if os.path.exists(temp):
            os.unlink(temp)
    trim(destination)


def main():
    source = open(MANIFEST, encoding='utf-8').read()
    manifest = json.loads(source[source.index('{'):source.rindex('}') + 1])
    sources = json.load(open(SOURCES, encoding='utf-8'))
    changed = []
    for label, clip_id in manifest.items():
        if sources[label].startswith('joined'):
            continue
        path = audio_path(clip_id)
        result = trim(path)
        if result:
            changed.append((label, *result))
    joined = [label for label in manifest if sources[label].startswith('joined')]
    for label in joined:
        rejoin(label, manifest)
    print(f'Trimmed {len(changed)} individual clips; rebuilt {len(joined)} phrases')
    if '--details' in sys.argv:
        for label, before, after in changed:
            print(f'{label}: {before:.2f}s -> {after:.2f}s')


if __name__ == '__main__':
    main()
