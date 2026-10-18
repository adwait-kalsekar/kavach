#!/usr/bin/env python3
"""Create a minimal bootstrap upload for Cloud Shell without exposing this private repo."""
from pathlib import Path
import hashlib
import json
import zipfile

root = Path(__file__).resolve().parents[2]
files = ["infra/gcp/bootstrap.py", "infra/gcp/check-access.py", "infra/gcp/check-gemini.py", "infra/gcp/settings.example.json", "infra/firestore.rules", "infra/firestore.indexes.json", "docs/deployment/gcp-setup.md", "docs/architecture/gcp-deployment.md", "docs/submission/cloud-and-model.md"]
target = root / ".data/kavach-gcp-setup.zip"
target.parent.mkdir(exist_ok=True)
manifest = {}
with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as bundle:
    for name in files:
        data = (root / name).read_bytes()
        bundle.writestr("kavach-gcp-setup/" + name, data)
        manifest[name] = hashlib.sha256(data).hexdigest()
    bundle.writestr("kavach-gcp-setup/SHA256SUMS.json", json.dumps(manifest, indent=2) + "\n")
print(target)
