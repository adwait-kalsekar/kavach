#!/usr/bin/env python3
"""Plan by default; --run makes one billable Google model smoke request. Never prints credentials."""
import argparse
from datetime import datetime, timezone
import json
import re
import subprocess
import sys
import urllib.error
import urllib.request


def endpoint(project, location, model):
    for value, pattern, label in [
        (project, r"[a-z][a-z0-9-]{4,28}[a-z0-9]", "project"),
        (location, r"global|[a-z]+-[a-z]+\d+", "location"),
        (model, r"[A-Za-z0-9][A-Za-z0-9._-]{0,127}", "model"),
    ]:
        if not re.fullmatch(pattern, value):
            raise ValueError(f"Invalid {label}")
    host = "aiplatform.googleapis.com" if location == "global" else f"{location}-aiplatform.googleapis.com"
    return f"https://{host}/v1/projects/{project}/locations/{location}/publishers/google/models/{model}:generateContent"


def probe(project, location, model):
    url = endpoint(project, location, model)
    # Capture the short-lived token in memory only. Never put it in argv, files, output or errors.
    result = subprocess.run(["gcloud", "auth", "print-access-token"], text=True, capture_output=True, timeout=60)
    if result.returncode or not result.stdout.strip():
        raise RuntimeError("No usable gcloud identity. Authorize the CLI normally; do not paste tokens into chat.")
    body = {"contents": [{"role": "user", "parts": [{"text": "Reply with exactly KAVACH_MODEL_OK and no other text."}]}],
            "generationConfig": {"temperature": 0, "maxOutputTokens": 256}}
    request = urllib.request.Request(url, data=json.dumps(body).encode(), method="POST", headers={
        "Authorization": "Bearer " + result.stdout.strip(), "Content-Type": "application/json", "X-Goog-User-Project": project,
    })
    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            payload = json.load(response)
    except urllib.error.HTTPError as error:
        reasons = {400: "Check request/model compatibility.", 403: "Check API enablement, IAM, billing and organization policy.",
                   404: "Check the exact model ID and supported location.", 429: "Check model quota/capacity; do not loop retries."}
        raise RuntimeError(f"Google model HTTP {error.code}. {reasons.get(error.code, 'Inspect provider availability in Console.')} No response body or credentials are printed.") from None
    text = "".join(part.get("text", "") for candidate in payload.get("candidates", [])
                   for part in candidate.get("content", {}).get("parts", []) if not part.get("thought"))
    if text.strip() != "KAVACH_MODEL_OK":
        raise RuntimeError("The model responded without the expected smoke marker. Check model output/safety configuration; output is withheld.")
    return {"status": "ok", "project": project, "location": location, "model": model,
            "modelVersion": payload.get("modelVersion"), "checkedAt": datetime.now(timezone.utc).isoformat(),
            "identity": "active gcloud CLI identity", "note": "Does not prove deployed Hono runtime access or feature implementation."}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", default="kavach-farmers-market-sense")
    parser.add_argument("--location", default="global")
    parser.add_argument("--model", required=True, help="Exact text-model ID verified in this project")
    parser.add_argument("--run", action="store_true", help="Make one small billable model request with the active gcloud identity")
    args = parser.parse_args(argv)
    url = endpoint(args.project, args.location, args.model)
    if not args.run:
        print(json.dumps({"status": "plan-only", "endpoint": url, "note": "No CLI/auth/network calls made. --run makes one billable request."}, indent=2))
        return
    print(json.dumps(probe(args.project, args.location, args.model), indent=2))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, RuntimeError, OSError, subprocess.SubprocessError) as error:
        # Avoid propagating raw urllib/auth request objects or captured token stdout.
        print(f"Model diagnostic failed: {error}", file=sys.stderr)
        sys.exit(1)
