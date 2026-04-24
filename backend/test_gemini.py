import os
import json
from google import genai
from google.genai import types
from google.oauth2 import service_account

def load_env():
    try:
        with open(".env", "r") as f:
            for line in f:
                if "=" in line and not line.startswith("#"):
                    key, value = line.strip().split("=", 1)
                    os.environ[key] = value
    except FileNotFoundError:
        pass

def test_gemini():
    load_env()
    project = os.environ.get("GOOGLE_CLOUD_PROJECT", "").strip()
    location = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1").strip()
    key_file = os.environ.get("VERTEX_KEY_FILE", "").strip()
    
    print(f"Project: {project}")
    print(f"Location: {location}")
    print(f"Key File: {key_file}")

    credentials = None
    if key_file and os.path.exists(key_file):
        credentials = service_account.Credentials.from_service_account_file(
            key_file,
            scopes=["https://www.googleapis.com/auth/cloud-platform"],
        )
        print("Credentials loaded from file.")
    else:
        print("Key file not found or not specified.")

    models_to_test = [
        "gemini-3-pro-preview",
        "gemini-3-flash-preview",
        "gemini-2.0-flash-001",
        "gemini-2.0-flash-lite-preview-02-05",
        "gemini-2.0-flash",
        "gemini-2.0-pro-exp-0205",
        "gemini-1.5-pro",
        "gemini-1.5-flash",
    ]

    for location in ["us-central1", "global"]:
        print(f"\n--- Testing Location: {location} ---")
        for model_name in models_to_test:
            print(f"\nTesting model: {model_name}")
            try:
                client = genai.Client(
                    vertexai=True,
                    project=project,
                    location=location,
                    credentials=credentials,
                )
                
                response = client.models.generate_content(
                    model=model_name,
                    contents="Hello, this is a test.",
                )
                print(f"Response successful for {model_name} in {location}:")
                print(response.text)
                return # Stop if one works
            except Exception as e:
                print(f"Error calling {model_name} in {location}: {e}")

if __name__ == "__main__":
    test_gemini()
