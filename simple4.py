from dotenv import load_dotenv
load_dotenv()

from openai import OpenAI
from datetime import datetime

client = OpenAI()

prompt = "Write a one-sentence bedtime story about a unicorn."

log_path = "stream_log.txt"

with client.responses.stream(
    model="gpt-4.1-nano",
    input=prompt,
) as stream:
    # Start the log entry with a timestamp and prompt
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(f"\n[{datetime.now()}] Prompt: {prompt}\nResponse: ")

    print("assistant: ", end="", flush=True)

    for event in stream:
        if event.type == "response.output_text.delta":
            chunk = event.delta
            print(chunk, end="", flush=True)
            with open(log_path, "a", encoding="utf-8") as f:
                f.write(chunk)
        elif event.type == "response.error":
            print(f"\n[error] {event.error}", flush=True)
            with open(log_path, "a", encoding="utf-8") as f:
                f.write(f"\n[error] {event.error}")

    final = stream.get_final_response()
    print()  # newline after live output
    with open(log_path, "a", encoding="utf-8") as f:
        f.write("\n--- End of response ---\n")