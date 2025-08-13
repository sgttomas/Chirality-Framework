from pathlib import Path
from dotenv import load_dotenv
import os

from openai import OpenAI
client = OpenAI()

stream = client.responses.create(
    model="gpt-4.1-nano",
    input=[
        {
            "role": "user",
            "content": "tell me a five sentence poem about unicorns",
        },
    ],
    stream=True,
)

for event in stream:
    if event.type == "response.output_text.delta":
            # print tokens as they stream in
        print(event.delta, end="", flush=True)
    elif event.type == "response.error":
        print(f"\n[error] {event.error}", flush=True)
