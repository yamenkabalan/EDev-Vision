"""Build the static global country explorer from published water statistics.

Run from the observatory directory: python scripts/build-global-water.py
The published JSON is committed so the site does not need this script at runtime.
"""

import csv
import io
import json
import math
import unicodedata
import urllib.request
from collections import defaultdict
from pathlib import Path

STATISTICS = "https://storage.googleapis.com/global-surface-water-stats/gaul0-all-2018.csv"
BOUNDARIES = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/ca96624a56bd078437bca8184e78163e5039ad19/geojson/ne_50m_admin_0_countries.geojson"
OUTPUT = Path(__file__).resolve().parents[1] / "public" / "data" / "global-water.json"
YEARS = list(range(1984, 2019))
RADIUS_KM = 6371.0088


def fetch(url, encoding="utf-8-sig"):
    with urllib.request.urlopen(url, timeout=60) as response:
        return response.read().decode(encoding)


def key(name):
    plain = unicodedata.normalize("NFKD", name.casefold())
    return "".join(c for c in plain if c.isalnum() and not unicodedata.combining(c))


ALIASES = {
    "unitedstatesofamerica": "unitedstatesofamerica",
    "unitedstates": "unitedstatesofamerica",
    "democraticrepublicofthecongo": "democraticrepublicofthecongo",
    "demrepublicofthecongo": "democraticrepublicofthecongo",
    "republicofthecongo": "congo",
    "republicofcongo": "congo",
    "czechrepublic": "czechia",
    "ivorycoast": "cotedivoire",
    "eswatini": "swaziland",
    "northmacedonia": "macedonia",
    "timorleste": "easttimor",
    "myanmar": "myanmar",
    "burma": "myanmar",
    "russianfederation": "russia",
    "republicofkorea": "southkorea",
    "korea": "southkorea",
    "dempeoplesrepublicofkorea": "northkorea",
    "laopeoplesdemrepublic": "laos",
    "vietnam": "vietnam",
    "boliviaplurinationalstateof": "bolivia",
    "venezuela bolivarian republic of": "venezuela",
    "unitedrepublicoftanzania": "tanzania",
    "syrianarabrepublic": "syria",
    "iransislamicrepublicof": "iran",
    "moldovarepublicof": "moldova",
    "bruneidarussalam": "brunei",
    "dempeoplesrepofkorea": "northkorea",
    "iranislamicrepublicof": "iran",
    "laopeoplesdemocraticrepublic": "laos",
    "theformeryugoslavrepublicofmacedonia": "macedonia",
    "ukofgreatbritainandnorthernireland": "unitedkingdom",
    "capeverde": "caboverde",
    "micronesiafederatedstatesof": "micronesia",
}


def normalized(name):
    value = key(name)
    return key(ALIASES.get(value, value))


def ring_area(ring):
    # Spherical area, with longitude deltas wrapped at the antimeridian.
    total = 0.0
    for (lon1, lat1), (lon2, lat2) in zip(ring, ring[1:]):
        delta = math.radians((lon2 - lon1 + 180) % 360 - 180)
        total += delta * (2 + math.sin(math.radians(lat1)) + math.sin(math.radians(lat2)))
    return abs(total) * RADIUS_KM * RADIUS_KM / 2


def geometry_area(geometry):
    polygons = [geometry["coordinates"]] if geometry["type"] == "Polygon" else geometry["coordinates"]
    return sum(max(0, ring_area(polygon[0]) - sum(ring_area(hole) for hole in polygon[1:])) for polygon in polygons)


def simplify_geometry(geometry):
    # Preserve 50 m Natural Earth outlines but reduce JSON size and JS parsing.
    def round_coordinates(value):
        if isinstance(value[0], (int, float)):
            return [round(value[0], 3), round(value[1], 3)]
        return [round_coordinates(part) for part in value]
    return {"type": geometry["type"], "coordinates": round_coordinates(geometry["coordinates"])}


def main():
    rows = list(csv.DictReader(io.StringIO(fetch(STATISTICS))))
    by_code = defaultdict(dict)
    names = {}
    for row in rows:
        code = int(row["ADM0_CODE"])
        year = int(row["year"])
        # Two names in the published CSV contain a replacement character.
        names[code] = row["ADM0_NAME"].replace("C�te", "Côte").replace("R�union", "Réunion")
        by_code[code][year] = [round(float(row[field]), 2) for field in ("permanent", "seasonal", "projectedPermanent", "projectedSeasonal")]

    features = json.loads(fetch(BOUNDARIES))["features"]
    geometry_by_name = {}
    for feature in features:
        props = feature["properties"]
        # SOVEREIGNT can name an entirely different subunit (e.g. Åland ->
        # Finland), so only match the feature's own administrative names.
        for name in (props.get("NAME"), props.get("NAME_LONG"), props.get("ADMIN"), props.get("BRK_NAME")):
            if name:
                geometry_by_name.setdefault(normalized(name), feature)

    regions = []
    unmatched = []
    for code, name in sorted(names.items(), key=lambda item: item[1]):
        feature = geometry_by_name.get(normalized(name))
        geometry = feature["geometry"] if feature else None
        if feature is None:
            unmatched.append(name)
        regions.append({
            "id": code,
            "name": name,
            "area_km2": round(geometry_area(geometry)) if geometry else None,
            "focus": [feature["properties"].get("LABEL_X"), feature["properties"].get("LABEL_Y")] if feature else None,
            "geometry": simplify_geometry(geometry) if geometry else None,
            "values": [by_code[code].get(year) for year in YEARS],
        })
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps({
        "years": YEARS,
        "regions": regions,
        "sources": {"statistics": STATISTICS, "boundaries": BOUNDARIES},
        "note": "Measured permanent and seasonal inland water in km2. Projected fields estimate possible water in unobserved areas. Source statistics use GAUL 0 boundaries; display outlines and area denominators use generalized Natural Earth boundaries. Percentages are approximate."
    }, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {len(regions)} regions, {len(regions)-len(unmatched)} map outlines, {OUTPUT.stat().st_size/1024:.0f} KiB")
    print("Without matching display outlines:", ", ".join(unmatched))


if __name__ == "__main__":
    main()
