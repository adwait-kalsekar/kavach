#!/usr/bin/env python3
"""Reproduce the public NASA POWER Latur-centre rainfall snapshot. No credentials."""
import datetime
import json
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
URL = "https://power.larc.nasa.gov/api/temporal/daily/point?parameters=PRECTOTCORR&community=AG&longitude=76.5604&latitude=18.4088&start=19910101&end=20260831&format=JSON&time-standard=UTC"


def export(raw):
    assert raw["parameters"]["PRECTOTCORR"]["units"] == "mm/day"
    values = raw["properties"]["parameter"]["PRECTOTCORR"]
    def total(year):
        start, end = datetime.date(year, 6, 1), datetime.date(year, 8, 31)
        count, amount = 0, 0.0
        while start <= end:
            value = values[start.strftime("%Y%m%d")]
            assert isinstance(value, (float, int)) and 0 <= value <= 2000, (start, value)
            amount += value
            count += 1
            start += datetime.timedelta(days=1)
        assert count == 92
        return amount
    baseline = [total(y) for y in range(1991, 2021)]
    mean, recent = sum(baseline) / 30, total(2026)
    assert mean > 0
    return {
        "status": "available", "id": "nasa-power-latur-jja-2026", "version": 1,
        "provider": "NASA POWER", "product": "PRECTOTCORR / MERRA-2 / POWER " + raw["header"]["api"]["version"],
        "sourceUrl": "https://power.larc.nasa.gov/docs/services/api/temporal/daily/",
        "retrievedAt": datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z"),
        "period": {"start": "2026-06-01", "end": "2026-08-31", "label": "June–August 2026"},
        "baseline": {"startYear": 1991, "endYear": 2020, "meanMm": round(mean, 2), "years": 30},
        "totalMm": round(recent, 2), "departurePct": round((recent / mean - 1) * 100, 1),
        "location": {"latitude": 18.4088, "longitude": 76.5604, "scope": "district-centre", "resolution": "MERRA-2 meteorology grid approximately 0.5° latitude × 0.625° longitude"},
        "annualTotals": [{"year": y, "totalMm": round(v, 2)} for y, v in zip(range(1991, 2021), baseline)],
        "completeDays": 92,
        "limitations": ["Dated model/reanalysis grid at Latur centre; not measured field rainfall or a district-wide average.", "June–August only, not the full monsoon. Baseline uses the same 92 days in each of 30 years.", "A descriptive comparison, not a crop-loss probability, current soil-moisture measurement or sowing approval.", "NASA POWER was selected because this GCP project is not registered for Earth Engine; this is not CHIRPS."],
    }


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, help="Use a previously downloaded POWER response")
    args = parser.parse_args()
    if args.input:
        raw = json.loads(args.input.read_text())
    else:
        with urllib.request.urlopen(URL, timeout=90) as response:
            raw = json.load(response)
    snapshot = export(raw)
    path = ROOT / "apps/api/src/evidence/latur-rainfall.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(snapshot, indent=2) + "\n")
    print(json.dumps({"output": str(path), "recentMm": snapshot["totalMm"], "baselineMm": snapshot["baseline"]["meanMm"], "departurePct": snapshot["departurePct"]}))
