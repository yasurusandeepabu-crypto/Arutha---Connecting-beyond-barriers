"""Convert a team-owned, unmirrored video into shoulder-normalized motion."""

import argparse
import itertools
import json
import math
from pathlib import Path

POSE_IDS = [0, 11, 12, 13, 14, 15, 16]


def assign_hands(hands, left_wrist, right_wrist):
    wrists = [left_wrist, right_wrist]
    assigned = [None, None]
    hands = hands[:2]
    if not hands:
        return assigned
    slots = min(itertools.permutations(range(2), len(hands)), key=lambda slots: sum(
        math.hypot(hand[0].x - wrists[slot].x, hand[0].y - wrists[slot].y)
        for hand, slot in zip(hands, slots)))
    for hand, slot in zip(hands, slots):
        assigned[slot] = hand
    return assigned


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('video', type=Path)
    parser.add_argument('--gloss', required=True)
    parser.add_argument('--pose-model', type=Path, default=Path('models/pose_landmarker_lite.task'))
    parser.add_argument('--hand-model', type=Path, default=Path('models/hand_landmarker.task'))
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    for path in [args.video, args.pose_model, args.hand_model]:
        if not path.is_file():
            parser.error(f'Missing file: {path}')

    import cv2
    import mediapipe as mp
    from mediapipe.tasks import python
    from mediapipe.tasks.python import vision

    cap = cv2.VideoCapture(str(args.video))
    source_fps = cap.get(cv2.CAP_PROP_FPS)
    if not cap.isOpened() or not math.isfinite(source_fps) or source_fps <= 0:
        parser.error('Cannot read video or frame rate')
    fps = min(source_fps, 30)
    frames, missing_pose, missing_hands = [], 0, 0
    source_index = 0
    pose_options = vision.PoseLandmarkerOptions(
        base_options=python.BaseOptions(model_asset_path=str(args.pose_model)),
        running_mode=vision.RunningMode.VIDEO, num_poses=1)
    hand_options = vision.HandLandmarkerOptions(
        base_options=python.BaseOptions(model_asset_path=str(args.hand_model)),
        running_mode=vision.RunningMode.VIDEO, num_hands=2)
    try:
        with vision.PoseLandmarker.create_from_options(pose_options) as pose_detector, \
                vision.HandLandmarker.create_from_options(hand_options) as hand_detector:
            while True:
                ok, frame = cap.read()
                if not ok:
                    break
                index = source_index
                source_index += 1
                if index < round(len(frames) * source_fps / fps):
                    continue
                image = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
                timestamp = round(index / source_fps * 1000)
                pose = pose_detector.detect_for_video(image, timestamp)
                hands = hand_detector.detect_for_video(image, timestamp)
                landmarks = pose.pose_landmarks[0] if pose.pose_landmarks else None
                if not landmarks or min(landmarks[11].visibility, landmarks[12].visibility) < .5:
                    missing_pose += 1
                    frames.append(None)
                    continue
                shoulder_a, shoulder_b = landmarks[11], landmarks[12]
                width = math.hypot(shoulder_a.x - shoulder_b.x, shoulder_a.y - shoulder_b.y)
                if width < .05:
                    missing_pose += 1
                    frames.append(None)
                    continue
                center = ((shoulder_a.x + shoulder_b.x) / 2, (shoulder_a.y + shoulder_b.y) / 2)
                def normalize(points):
                    return [[round((p.x - center[0]) / width, 5), round((p.y - center[1]) / width, 5)] for p in points] if points else None
                left, right = assign_hands(hands.hand_landmarks, landmarks[15], landmarks[16])
                if left is None and right is None:
                    missing_hands += 1
                frames.append({'pose': normalize([landmarks[i] for i in POSE_IDS]), 'lh': normalize(left), 'rh': normalize(right)})
    finally:
        cap.release()
    if not frames or missing_pose / len(frames) > .2:
        parser.error('Too much missing pose tracking; re-record with upper body fully visible')
    first = next(f for f in frames if f is not None)
    previous = {'pose': first['pose'], 'lh': None, 'rh': None}
    for i, frame in enumerate(frames):
        if frame is None:
            frames[i] = {'pose': previous['pose'], 'lh': None, 'rh': None}
        previous = frames[i]
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps({'gloss': args.gloss.upper(), 'fps': fps, 'frames': frames}), encoding='utf-8')
    print(f'{args.output}: {len(frames)} frames; {missing_pose} missing pose, {missing_hands} with no hands. Review before demo.')


if __name__ == '__main__':
    main()
