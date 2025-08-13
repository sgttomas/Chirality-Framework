from dotenv import load_dotenv
load_dotenv()  # loads OPENAI_API_KEY from .env if present

from openai import OpenAI
client = OpenAI()

prompt = "Write a three sentence bedtime story about a unicorn."

# Stream and print ONLY the text deltas as they arrive
with client.responses.stream(
    model="gpt-4.1-nano",
    input=prompt,
) as stream:
    print("assistant: ", end="", flush=True)

    for event in stream:
        if event.type == "response.output_text.delta":
            # print tokens as they stream in
            print(event.delta, end="", flush=True)
        elif event.type == "response.error":
            print(f"\n[error] {event.error}", flush=True)

    # finalize (optional, lets you grab the full object if you need it)
    final = stream.get_final_response()
    print()  # newline after the streamed text
    # You can still access the aggregated text:
    # print("\n\n[full text]", final.output_text)