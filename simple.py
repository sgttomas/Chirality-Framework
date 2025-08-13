from pathlib import Path
from dotenv import load_dotenv
import os

from openai import OpenAI

client = OpenAI()

response = client.responses.create(
  model="gpt-4.1-nano",
  input="Tell me a three sentence bedtime story about a unicorn."
)

print(response)