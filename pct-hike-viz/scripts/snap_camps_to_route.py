#!/usr/bin/env python3
"""Snap camp waypoints onto the Garmin-derived route path."""
from __future__ import annotations

import json
from dataclasses import dataclass
from math import cos, radians
from pathlib import Path
from typing import Iterable, List, Sequence, Tuple

ROOT = Path(__file__).resolve().parents[1]
CANONICAL_PATH = ROOT / "public" / "data" / "hike_data.json"
MIRROR_PATH = ROOT / "src" / "hike_data.json"
TARGET_TYPES = {"Trailhead", "Camp"}
MANUAL_ORIGINALS = {
    "Burney Falls State Park": [-121.65, 41.012],
    "Round Valley Campground": [-121.7, 40.95],
    "Black Rock Camp": [-121.8, 40.9],
    "Horse Camp": [-121.9, 40.85],
    "Indian Springs Camp": [-122.0, 40.8],
    "Castle Crags Vista Camp": [-122.3, 41.1],
}


@dataclass(frozen=True)
class Vec2:
    x: float
    y: float

    def __sub__(self, other: "Vec2") -> "Vec2":
        return Vec2(self.x - other.x, self.y - other.y)

    def dot(self, other: "Vec2") -> float:
        return self.x * other.x + self.y * other.y

    def scale(self, factor: float) -> "Vec2":
        return Vec2(self.x * factor, self.y * factor)

    def length(self) -> float:
        return (self.x * self.x + self.y * self.y) ** 0.5


@dataclass
class Projection:
    point: Vec2
    offset: float


def deg_to_xy_converter(path: Sequence[Sequence[float]]):
    """Return helpers to convert lon/lat <-> planar meters around the route."""
    lons = [p[0] for p in path]
    lats = [p[1] for p in path]
    lon0 = sum(lons) / len(lons)
    lat0 = sum(lats) / len(lats)
    meters_per_deg_lat = 111_132.92  # WGS84 meridional radius approx
    meters_per_deg_lon = meters_per_deg_lat * cos(radians(lat0))

    def to_xy(lon: float, lat: float) -> Vec2:
        return Vec2((lon - lon0) * meters_per_deg_lon, (lat - lat0) * meters_per_deg_lat)

    def to_lonlat(vec: Vec2) -> Tuple[float, float]:
        return (
            vec.x / meters_per_deg_lon + lon0,
            vec.y / meters_per_deg_lat + lat0,
        )

    return to_xy, to_lonlat


def iter_segments(points: Sequence[Vec2]) -> Iterable[Tuple[int, Vec2, Vec2]]:
    for idx in range(len(points) - 1):
        yield idx, points[idx], points[idx + 1]


def point_at_distance(path: Sequence[Vec2], seg_lengths: Sequence[float], target: float) -> Projection:
    """Return the coordinate that lies `target` meters along the path."""
    if target <= 0:
        return Projection(path[0], 0.0)

    traversed = 0.0
    for idx, a, b in iter_segments(path):
        seg_len = seg_lengths[idx]
        next_distance = traversed + seg_len
        if target <= next_distance:
            ratio = (target - traversed) / seg_len if seg_len else 0.0
            point = Vec2(a.x + (b.x - a.x) * ratio, a.y + (b.y - a.y) * ratio)
            return Projection(point, traversed + seg_len * ratio)
        traversed = next_distance
    return Projection(path[-1], traversed)


def build_segment_lengths(path: Sequence[Vec2]) -> List[float]:
    lengths = []
    for _, a, b in iter_segments(path):
        lengths.append((b - a).length())
    return lengths


def main() -> None:
    data = json.loads(CANONICAL_PATH.read_text())
    route_path = data["route"]["path"]
    to_xy, to_lonlat = deg_to_xy_converter(route_path)
    xy_path = [to_xy(lon, lat) for lon, lat in route_path]
    seg_lengths = build_segment_lengths(xy_path)
    total_path_m = sum(seg_lengths)

    camps = [
        feature for feature in data["features"]
        if feature["properties"].get("type") in TARGET_TYPES and feature["properties"].get("day") is not None
    ]
    camps.sort(key=lambda f: f["properties"]["day"])

    updated = []
    miles_so_far = 0.0
    for feature in camps:
        props = feature.setdefault("properties", {})
        if props.get("day", 0) == 0:
            target_miles = 0.0
        else:
            miles_so_far += float(props.get("distance") or 0)
            target_miles = miles_so_far

        target_meters = min(target_miles * 1609.34, total_path_m)
        projection = point_at_distance(xy_path, seg_lengths, target_meters)
        lonlat = tuple(round(value, 6) for value in to_lonlat(projection.point))

        original = list(feature["geometry"]["coordinates"])
        stored_original = props.get("originalCoordinates")
        manual_original = MANUAL_ORIGINALS.get(props.get("name"))
        if manual_original is not None:
            stored_original = manual_original
        elif stored_original is None:
            stored_original = original
        props["originalCoordinates"] = stored_original
        props["routeMile"] = round(target_miles, 2)
        feature["geometry"]["coordinates"] = list(lonlat)

        updated.append((props.get("name"), stored_original, lonlat, target_miles))

    # Write canonical runtime artifact
    payload = json.dumps(data, indent=2)
    CANONICAL_PATH.write_text(payload, encoding="utf-8")

    # Mirror to src/ for tooling that still expects that path
    try:
        MIRROR_PATH.write_text(payload, encoding="utf-8")
    except Exception as exc:  # noqa: BLE001
        print(f"Warning: failed to mirror to {MIRROR_PATH}: {exc}")

    print("Updated waypoints:")
    for name, original, snapped, mile in updated:
        print(f"- {name}: {original} -> {snapped} (mile {mile:.2f})")


if __name__ == "__main__":
    main()
