#!/usr/bin/env python3
"""Display the normalized per-day elevation contract in hike_data.json."""

import json
from pathlib import Path


def main():
    data_path = Path(__file__).parent.parent / "public" / "data" / "hike_data.json"
    with data_path.open(encoding="utf-8") as source:
        data = json.load(source)

    properties = data.get("route", {}).get("properties", {})
    segments = properties.get("segments", [])
    if not segments:
        raise RuntimeError(
            "No normalized route.properties.segments contract is embedded. "
            "Run configure_active_route.js first."
        )

    print("NORMALIZED ITINERARY ELEVATION DATA")
    print("=" * 80)
    print(properties.get("elevation_accumulation_method", "Method unavailable"))
    print()
    for segment in segments:
        print(f"Day {segment['day']}: {segment['start']} → {segment['end']}")
        print(f"  Distance: {segment['distance']:.3f} mi")
        print(
            f"  Elevation: {segment['startElevation']:.0f} ft → "
            f"{segment['endElevation']:.0f} ft; "
            f"high {segment['highPoint']:.0f} ft"
        )
        print(
            f"  Gain/loss: +{segment['gain']:.0f} / "
            f"-{segment['loss']:.0f} ft"
        )
        print()

    print(
        f"Total: +{properties.get('total_gain_feet', 0):.0f} / "
        f"-{properties.get('total_loss_feet', 0):.0f} ft"
    )


if __name__ == "__main__":
    main()
