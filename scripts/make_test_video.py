"""Generate a solid-color video fixture; not a signing asset."""

from pathlib import Path
import av
import numpy as np

target = Path(__file__).resolve().parents[1] / 'test-avatar.webm'
with av.open(str(target), mode='w', format='webm') as container:
    stream = container.add_stream('libvpx', rate=10)
    stream.width = stream.height = 100
    stream.pix_fmt = 'yuv420p'
    for i in range(6):
        pixels = np.zeros((100, 100, 3), dtype=np.uint8)
        pixels[:, :] = (20, 94, 102) if i % 2 else (160, 239, 225)
        frame = av.VideoFrame.from_ndarray(pixels, format='rgb24')
        for packet in stream.encode(frame):
            container.mux(packet)
    for packet in stream.encode():
        container.mux(packet)
print(target)
