# chat_cli.py
from __future__ import annotations
import os, sys, json
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

# --- config ---
MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1-nano")  # change if you like
THREAD_FILE = Path("thread.json")                   # persists previous_response_id + transcript
LOG_FILE = Path("chat_log.txt")                     # append-only log

def load_thread():
    if THREAD_FILE.exists():
        try:
            data = json.loads(THREAD_FILE.read_text(encoding="utf-8"))
            return data.get("previous_response_id"), data.get("transcript", [])
        except Exception:
            pass
    return None, []

def save_thread(previous_response_id, transcript):
    THREAD_FILE.write_text(
        json.dumps(
            {"previous_response_id": previous_response_id, "transcript": transcript},
            ensure_ascii=False, indent=2
        ),
        encoding="utf-8"
    )

def log_line(text=""):
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with LOG_FILE.open("a", encoding="utf-8") as f:
        f.write(text + ("\n" if not text.endswith("\n") else ""))

def main():
    load_dotenv()  # loads OPENAI_API_KEY, optional OPENAI_MODEL
    api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
    if not api_key:
        print("Missing OPENAI_API_KEY. Put it in .env or export it.", file=sys.stderr)
        sys.exit(1)

    client = OpenAI(api_key=api_key)
    previous_response_id, transcript = load_thread()

    print(f"Model: {MODEL}")
    if previous_response_id:
        print(f"Resuming thread (previous_response_id={previous_response_id})")
    print("Commands: /new  /save  /load  /exit")
    print()

    while True:
        try:
            user = input("you: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nbye.")
            break

        if not user:
            continue

        # Commands
        if user in {"/exit", "/quit"}:
            print("bye.")
            break
        if user == "/new":
            previous_response_id = None
            transcript.clear()
            save_thread(previous_response_id, transcript)
            print("(started a new thread)")
            continue
        if user == "/save":
            save_thread(previous_response_id, transcript)
            print(f"(saved to {THREAD_FILE})")
            continue
        if user == "/load":
            previous_response_id, transcript = load_thread()
            print(f"(loaded thread; previous_response_id={previous_response_id})")
            continue

        # Append user turn locally
        transcript.append({"role": "user", "content": user})
        timestamp = datetime.now().isoformat(timespec="seconds")
        log_line(f"[{timestamp}] you: {user}")
        print("assistant: ", end="", flush=True)

        # Stream the assistant reply
        try:
            with client.responses.stream(
                model=MODEL,
                input=[{"role": "user", "content": user}],
                previous_response_id=previous_response_id,  # <- chain to maintain context
            ) as stream:
                chunks = []
                for event in stream:
                    if event.type == "response.output_text.delta":
                        print(event.delta, end="", flush=True)
                        chunks.append(event.delta)
                    elif event.type == "response.error":
                        print(f"\n[error] {event.error}", flush=True)
                        log_line(f"[{timestamp}] [error] {event.error}")

                final = stream.get_final_response()

        except Exception as e:
            print(f"\n[stream error] {e}")
            log_line(f"[{timestamp}] [stream error] {e}")
            # Roll back the user turn if it failed to avoid half-saved state
            transcript.pop()
            continue

        # Finalize this turn
        print()  # newline
        assistant_text = "".join(chunks) if chunks else (final.output_text or "")
        transcript.append({"role": "assistant", "content": assistant_text})
        log_line(f"[{timestamp}] assistant: {assistant_text}")

        # Persist thread id for next turn
        previous_response_id = final.id
        save_thread(previous_response_id, transcript)

if __name__ == "__main__":
    main()