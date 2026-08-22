#!/usr/bin/env python3
"""Download and transcribe authorised YouTube reference clips locally.

The script deliberately requires an explicit confirmation and only writes outputs
to a gitignored local directory. It is intended for material the operator has
permission to analyse.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

from faster_whisper import WhisperModel


DEFAULT_URLS = [
    "https://www.youtube.com/watch?v=OuoPMj2Qfzk",
    "https://www.youtube.com/watch?v=FPtTzzu3QlQ",
    "https://www.youtube.com/watch?v=Txja1tUfw6I",
    "https://www.youtube.com/watch?v=D2_HZcqW8Po",
    "https://www.youtube.com/watch?v=GvB8XfGRx4U",
    "https://www.youtube.com/watch?v=izU7g0cN-aU",
    "https://www.youtube.com/watch?v=sj2PlmR5vmk",
    "https://www.youtube.com/watch?v=tArxcYCy0aE",
    "https://www.youtube.com/watch?v=yN2GM99LyGc",
    "https://www.youtube.com/watch?v=-txVpmNX_oY",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("urls", nargs="*", help="Authorised YouTube URLs. Defaults to the curated Tech Roast list.")
    parser.add_argument("--output-dir", type=Path, default=Path("data/authorized-reference-transcripts"))
    parser.add_argument("--model", default="small.en", help="faster-whisper model name (default: small.en)")
    parser.add_argument("--device", choices=["cpu", "cuda"], default="cpu")
    parser.add_argument("--compute-type", default="int8", help="CTranslate2 compute type (default: int8)")
    parser.add_argument("--keep-audio", action="store_true", help="Retain downloaded audio locally after successful transcription.")
    parser.add_argument("--confirm-authorized", action="store_true", help="Confirm permission to download and transcribe every supplied URL.")
    return parser.parse_args()


def run(command: list[str]) -> None:
    subprocess.run(command, check=True)


def video_id(url: str) -> str:
    if "v=" in url:
        return url.split("v=", maxsplit=1)[1].split("&", maxsplit=1)[0]
    return url.rstrip("/").split("/")[-1]


def download_audio(url: str, audio_dir: Path) -> tuple[Path, dict]:
    identifier = video_id(url)
    template = str(audio_dir / "%(id)s.%(ext)s")
    run([
        sys.executable,
        "-m",
        "yt_dlp",
        "--no-playlist",
        "--extract-audio",
        "--audio-format", "mp3",
        "--write-info-json",
        "--output", template,
        url,
    ])
    audio = audio_dir / f"{identifier}.mp3"
    info_path = audio_dir / f"{identifier}.info.json"
    if not audio.is_file():
        raise FileNotFoundError(f"Expected audio file was not created for {url}")
    metadata = json.loads(info_path.read_text()) if info_path.is_file() else {"webpage_url": url, "id": identifier}
    return audio, metadata


def transcribe(model: WhisperModel, audio_path: Path) -> tuple[dict, list[dict]]:
    segments, info = model.transcribe(
        str(audio_path),
        language="en",
        beam_size=5,
        vad_filter=True,
        word_timestamps=True,
        condition_on_previous_text=False,
    )
    rendered_segments = []
    for segment in segments:
        rendered_segments.append({
            "start": round(segment.start, 3),
            "end": round(segment.end, 3),
            "text": segment.text.strip(),
            "words": [
                {"start": round(word.start, 3), "end": round(word.end, 3), "text": word.word}
                for word in (segment.words or [])
            ],
        })
    return {
        "language": info.language,
        "language_probability": info.language_probability,
        "duration": info.duration,
    }, rendered_segments


def main() -> int:
    args = parse_args()
    if not args.confirm_authorized:
        print("Refusing to run without --confirm-authorized.", file=sys.stderr)
        return 2
    urls = args.urls or DEFAULT_URLS
    output_dir = args.output_dir.resolve()
    audio_dir = output_dir / "audio"
    output_dir.mkdir(parents=True, exist_ok=True)
    audio_dir.mkdir(parents=True, exist_ok=True)
    model = WhisperModel(args.model, device=args.device, compute_type=args.compute_type)

    for url in urls:
        identifier = video_id(url)
        transcript_path = output_dir / f"{identifier}.json"
        if transcript_path.is_file():
            print(f"Skipping {identifier}: transcript already exists.")
            continue
        lock_path = output_dir / f"{identifier}.lock"
        try:
            descriptor = os.open(lock_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        except FileExistsError:
            print(f"Skipping {identifier}: another worker is already processing it.")
            continue
        else:
            os.close(descriptor)
        try:
            print(f"Downloading {identifier}…", flush=True)
            audio_path, metadata = download_audio(url, audio_dir)
            print(f"Transcribing {identifier}…", flush=True)
            info, segments = transcribe(model, audio_path)
            payload = {
                "authorization_confirmed": True,
                "source": {"url": url, "id": identifier, "title": metadata.get("title"), "channel": metadata.get("channel")},
                "transcribed_at": datetime.now(timezone.utc).isoformat(),
                "model": args.model,
                "transcription": info,
                "segments": segments,
            }
            transcript_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")
            print(f"Wrote {transcript_path}", flush=True)
            if not args.keep_audio:
                audio_path.unlink(missing_ok=True)
                (audio_dir / f"{identifier}.info.json").unlink(missing_ok=True)
        finally:
            lock_path.unlink(missing_ok=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
