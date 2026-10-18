#!/usr/bin/env python3
"""Export validated dated POWER rainfall context for allowlisted sample locations."""
import importlib.util
import json
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('rainfall', Path(__file__).with_name('export-latur-rainfall.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
REGIONS = [('beed', 'Beed', 18.9891, 75.7601), ('nanded', 'Nanded', 19.1383, 77.3210)]
if __name__ == '__main__':
    for key, label, lat, lon in REGIONS:
        url = module.URL.replace('longitude=76.5604&latitude=18.4088', f'longitude={lon}&latitude={lat}')
        cache = ROOT / '.data' / f'power-{key}.json'
        if cache.exists():
            raw = json.loads(cache.read_text())
        else:
            with urllib.request.urlopen(url, timeout=60) as response:
                raw = json.load(response)
            cache.parent.mkdir(parents=True, exist_ok=True)
            cache.write_text(json.dumps(raw))
        result = module.export(raw)
        result['id'] = f'nasa-power-{key}-jja-2026'
        result['location'].update(latitude=lat, longitude=lon)
        result['limitations'][0] = f'Dated model/reanalysis grid near {label} centre; not measured field rainfall or a district-wide average.'
        result['requestUrl'] = url
        # Public contract intentionally excludes operational request metadata.
        result.pop('requestUrl')
        target = ROOT / 'apps/api/src/evidence' / f'{key}-rainfall.json'
        target.write_text(json.dumps(result, indent=2) + '\n')
        print(key, result['totalMm'], result['baseline']['meanMm'], result['departurePct'], flush=True)
