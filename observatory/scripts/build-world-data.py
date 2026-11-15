"""Build public/data/world.json: the world-wide causes behind the country water record.

Run from the observatory directory:  python scripts/build-world-data.py
The JSON is committed, so the site never calls these services at runtime.

For every country/territory in public/data/global-water.json (EC JRC / UNEP
SDG 6.6.1 surface water, 1984-2018) it adds:
  - ISO code, continent and sub-region (Natural Earth 50 m, pinned commit)
  - annual precipitation, mm (Copernicus ERA5, country means by Our World in Data)
  - annual temperature anomaly vs 1991-2020, deg C (same source)
  - lakes-and-rivers permanent + seasonal water area 2000-2022, km2
    (UNEP SDG 6.6.1, UN SDG Global Database) -- an independent later release
    used only to check the projection after 2018
and the NOAA Oceanic Nino Index (DJF) for every year, plus continent and world
aggregates built from the same country values.
"""

import csv
import io
import json
import math
import re
import unicodedata
import urllib.request
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WATER = ROOT / "public" / "data" / "global-water.json"
OUTPUT = ROOT / "public" / "data" / "world.json"

BOUNDARIES = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/ca96624a56bd078437bca8184e78163e5039ad19/geojson/ne_50m_admin_0_countries.geojson"
PRECIP = "https://ourworldindata.org/grapher/average-precipitation-per-year.csv?v=1&csvType=full&useColumnShortNames=true"
TEMP = "https://ourworldindata.org/grapher/annual-temperature-anomalies.csv?v=1&csvType=full&useColumnShortNames=true"
ONI = "https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt"
SDG = "https://unstats.un.org/sdgapi/v1/sdg/Series/Data?seriesCode={code}&pageSize=20000"
CLIMATE_YEARS = list(range(1984, 2026))
SDG_YEARS = list(range(2000, 2023))
CONTINENTS = ["Africa", "Asia", "Europe", "North America", "South America", "Oceania"]

# Territories that Natural Earth does not draw separately: continent by hand.
MANUAL_CONTINENT = {
    "Abyei": "Africa", "Aksai Chin": "Asia", "Arunachal Pradesh": "Asia", "China/India": "Asia",
    "Jammu and Kashmir": "Asia", "Hala'ib triangle": "Africa", "Ilemi triangle": "Africa",
    "Ma'tan al-Sarra": "Africa", "Azores Islands": "Europe", "Madeira Islands": "Europe",
    "Kuril islands": "Asia", "Paracel Islands": "Asia", "Spratly Islands": "Asia",
    "Senkaku Islands": "Asia", "Scarborough Reef": "Asia", "Gaza Strip": "Asia", "West Bank": "Asia",
    "Western Sahara": "Africa", "Netherlands Antilles": "North America", "Guadeloupe": "North America",
    "Mayotte": "Africa", "Réunion": "Africa", "Svalbard and Jan Mayen Islands": "Europe",
    "Bassas da India": "Africa", "Europa Island": "Africa", "Glorioso Island": "Africa",
    "Juan de Nova Island": "Africa", "Tromelin Island": "Africa", "Bird Island": "North America",
    "Navassa Island": "North America", "Clipperton Island": "North America", "Tokelau": "Oceania",
    "Baker Island": "Oceania", "Howland Island": "Oceania", "Jarvis Island": "Oceania",
    "Johnston Atoll": "Oceania", "Kingman Reef": "Oceania", "Midway Island": "Oceania",
    "Palmyra Atoll": "Oceania", "Wake Island": "Oceania", "Christmas Island": "Oceania",
    "Cocos (Keeling) Islands": "Oceania", "Bouvet Island": "Antarctica",
    "Gibraltar": "Europe", "Maldives": "Asia", "Mauritius": "Africa", "Seychelles": "Africa", "Saint Helena": "Africa",
    "British Indian Ocean Territory": "Asia", "Pitcairn": "Oceania",
}
# Same idea for ISO codes when the name match fails (used for climate + SDG).
MANUAL_ISO = {
    "Western Sahara": ("ESH", 732), "Guadeloupe": ("GLP", 312), "Mayotte": ("MYT", 175), "Réunion": ("REU", 638),
    "Gaza Strip": ("PSE", 275), "West Bank": ("PSE", 275), "Svalbard and Jan Mayen Islands": ("SJM", 744),
    "Tokelau": ("TKL", 772), "Christmas Island": ("CXR", 162), "Cocos (Keeling) Islands": ("CCK", 166),
    "Netherlands Antilles": ("ANT", 530), "Bouvet Island": ("BVT", 74),
}


def fetch(url, encoding="utf-8-sig"):
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (data build script)"})
    with urllib.request.urlopen(request, timeout=180) as response:
        return response.read().decode(encoding)


def key(name):
    plain = unicodedata.normalize("NFKD", name.casefold())
    return "".join(c for c in plain if c.isalnum() and not unicodedata.combining(c))


ALIASES = {
    "unitedstates": "unitedstatesofamerica", "demrepublicofthecongo": "democraticrepublicofthecongo",
    "republicofthecongo": "congo", "republicofcongo": "congo", "czechrepublic": "czechia",
    "ivorycoast": "cotedivoire", "eswatini": "swaziland", "northmacedonia": "macedonia",
    "timorleste": "easttimor", "burma": "myanmar", "russianfederation": "russia",
    "republicofkorea": "southkorea", "korea": "southkorea", "dempeoplesrepofkorea": "northkorea",
    "dempeoplesrepublicofkorea": "northkorea", "laopeoplesdemocraticrepublic": "laos",
    "unitedrepublicoftanzania": "tanzania", "syrianarabrepublic": "syria", "iranislamicrepublicof": "iran",
    "moldovarepublicof": "moldova", "bruneidarussalam": "brunei",
    "theformeryugoslavrepublicofmacedonia": "macedonia", "ukofgreatbritainandnorthernireland": "unitedkingdom",
    "capeverde": "caboverde", "micronesiafederatedstatesof": "micronesia", "vietnam": "vietnam",
    "falklandislandsmalvinas": "falklandislands", "saintpierreetmiquelon": "saintpierreandmiquelon",
    "turksandcaicosislands": "turksandcaicosislands", "holysee": "vatican", "macau": "macao",
    "frenchsouthernandantarcticterritories": "frenchsouthernandantarcticlands",
    "wallisandfutuna": "wallisandfutunaislands", "saintkittsandnevis": "saintkittsandnevis",
    "unitedstatesvirginislands": "usvirginislands", "britishvirginislands": "britishvirginislands",
    "southgeorgiaandthesouthsandwichislands": "southgeorgiaandtheislands",
    "heardislandandmcdonaldislands": "heardislandandmcdonaldislands",
}


def normalized(name):
    value = key(name)
    return key(ALIASES.get(value, value))


def rounded(values, digits):
    return [None if v is None or (isinstance(v, float) and math.isnan(v)) else round(v, digits) for v in values]


def main():
    water = json.loads(WATER.read_text(encoding="utf-8"))
    regions = water["regions"]

    # ---- Natural Earth: ISO codes, continent, sub-region
    features = json.loads(fetch(BOUNDARIES))["features"]
    by_name = {}
    for feature in features:
        props = feature["properties"]
        for field in ("NAME", "NAME_LONG", "ADMIN", "BRK_NAME", "NAME_EN", "FORMAL_EN"):
            if props.get(field):
                by_name.setdefault(normalized(props[field]), props)

    def iso_of(props):
        a3 = props.get("ISO_A3")
        if not a3 or a3 == "-99":
            a3 = props.get("ADM0_A3")
        n3 = props.get("ISO_N3")
        try:
            n3 = int(n3)
        except (TypeError, ValueError):
            n3 = None
        if n3 is not None and n3 < 0:
            n3 = None
        return a3, n3

    meta = {}
    for region in regions:
        name = region["name"].replace("�", "ô" if region["name"].startswith("C") else "é")
        props = by_name.get(normalized(name))
        iso3 = n3 = continent = subregion = None
        if props:
            iso3, n3 = iso_of(props)
            continent = props.get("CONTINENT")
            subregion = props.get("SUBREGION")
        if name in MANUAL_ISO:
            iso3, n3 = MANUAL_ISO[name]
        if name in MANUAL_CONTINENT:
            continent = MANUAL_CONTINENT[name]
        if continent == "Seven seas (open ocean)":
            continent = None
        meta[region["id"]] = {"iso3": iso3, "n3": n3, "continent": continent, "subregion": subregion, "name": name}
    # France (FRA) and Norway (NOR) report -99 for ISO_N3 in Natural Earth.
    for m in meta.values():
        if m["iso3"] == "FRA":
            m["n3"] = 250
        if m["iso3"] == "NOR":
            m["n3"] = 578

    # ---- ERA5 climate by country (OWID)
    def owid(url, column):
        series = defaultdict(dict)
        for row in csv.DictReader(io.StringIO(fetch(url))):
            code = row["code"] or row["entity"]
            year = int(row["year"])
            if row[column] != "":
                series[code][year] = float(row[column])
        return series

    precip = owid(PRECIP, "total_precipitation")
    temp = owid(TEMP, "temperature_anomaly")

    # ---- NOAA ONI, DJF value for each year (Dec of the year before + Jan + Feb)
    oni_djf = {}
    latest = None
    for line in fetch(ONI).splitlines()[1:]:
        parts = line.split()
        if len(parts) != 4:
            continue
        season, year, _, anomaly = parts[0], int(parts[1]), parts[2], float(parts[3])
        if season == "DJF":
            oni_djf[year] = anomaly
        latest = {"season": season, "year": year, "value": anomaly}

    # ---- UNEP SDG 6.6.1 lakes and rivers, 2000-2022
    sdg = {}
    for code, label in (("EN_LKRV_PWAN", "permanent"), ("EN_LKRV_SWAN", "seasonal")):
        data = json.loads(fetch(SDG.format(code=code), "utf-8"))["data"]
        for row in data:
            area = int(row["geoAreaCode"])
            year = int(row["timePeriodStart"])
            try:
                value = float(row["value"])
            except (TypeError, ValueError):
                continue
            sdg.setdefault(area, {}).setdefault(label, {})[year] = value

    def sdg_rows(n3):
        entry = sdg.get(n3)
        if not entry:
            return None
        rows = []
        for year in SDG_YEARS:
            p = entry.get("permanent", {}).get(year)
            s = entry.get("seasonal", {}).get(year)
            rows.append(None if p is None or s is None else round(p + s, 2))
        return rows if any(v is not None for v in rows) else None

    out_regions = []
    for region in regions:
        m = meta[region["id"]]
        pr = precip.get(m["iso3"]) if m["iso3"] else None
        ta = temp.get(m["iso3"]) if m["iso3"] else None
        out_regions.append({
            "id": region["id"],
            "iso3": m["iso3"],
            "continent": m["continent"],
            "subregion": m["subregion"],
            "pr": rounded([pr.get(y) for y in CLIMATE_YEARS], 1) if pr else None,
            "ta": rounded([ta.get(y) for y in CLIMATE_YEARS], 2) if ta else None,
            "sdg": sdg_rows(m["n3"]),
        })

    # ---- continent and world aggregates (sums of the same country values)
    area = {r["id"]: r["area_km2"] or 0 for r in regions}
    values = {r["id"]: r["values"] for r in regions}
    groups = []
    for group in ["World", *CONTINENTS]:
        members = [r["id"] for r in out_regions if (group == "World" and r["continent"] and r["continent"] != "Antarctica") or r["continent"] == group]
        n_years = len(water["years"])
        sums = []
        for i in range(n_years):
            rows = [values[m][i] for m in members if values[m] and values[m][i]]
            sums.append([round(sum(row[k] for row in rows), 1) for k in range(4)] if rows else None)

        def weighted(field):
            series = []
            for j, _ in enumerate(CLIMATE_YEARS):
                num = den = 0.0
                for r in out_regions:
                    if r["id"] in members and r[field] and r[field][j] is not None and area[r["id"]]:
                        num += r[field][j] * area[r["id"]]
                        den += area[r["id"]]
                series.append(num / den if den else None)
            return series

        if group == "World":
            pr = rounded([precip["OWID_WRL"].get(y) for y in CLIMATE_YEARS], 1)
            ta = rounded([temp["OWID_WRL"].get(y) for y in CLIMATE_YEARS], 2)
            sdg_world = sdg_rows(1)
        else:
            pr = rounded(weighted("pr"), 1)
            ta = rounded(weighted("ta"), 2)
            sdg_world = None
        if group != "World":
            # Sum the member countries that report every SDG year.
            sdg_members = [r["sdg"] for r in out_regions if r["id"] in members and r["sdg"] and all(v is not None for v in r["sdg"])]
            sdg_world = [round(sum(s[j] for s in sdg_members), 1) for j in range(len(SDG_YEARS))] if sdg_members else None
        groups.append({
            "id": "world" if group == "World" else key(group),
            "name": group,
            "members": members,
            "area_km2": round(sum(area[m] for m in members)),
            "values": sums,
            "pr": pr,
            "ta": ta,
            "sdg": sdg_world,
        })

    document = {
        "water_years": water["years"],
        "climate_years": CLIMATE_YEARS,
        "sdg_years": SDG_YEARS,
        "oni": {"years": list(range(1984, max(oni_djf) + 1)), "djf": [oni_djf.get(y) for y in range(1984, max(oni_djf) + 1)], "latest": latest},
        "regions": out_regions,
        "groups": groups,
        "sources": {
            "boundaries": BOUNDARIES,
            "precipitation": "https://ourworldindata.org/grapher/average-precipitation-per-year",
            "temperature": "https://ourworldindata.org/grapher/annual-temperature-anomalies",
            "oni": "https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt",
            "sdg": "https://unstats.un.org/sdgs/dataportal/database",
        },
        "note": "Precipitation (mm/year) and temperature anomaly (deg C vs 1991-2020) are Copernicus ERA5 country means processed by Our World in Data. ONI is NOAA CPC, Dec-Feb. SDG values are UNEP SDG 6.6.1 lakes and rivers permanent + seasonal area (km2); they exclude reservoirs, so they are compared with the JRC record only as changes, never as totals.",
    }
    OUTPUT.write_text(json.dumps(document, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
    missing_climate = [meta[r["id"]]["name"] for r in out_regions if not r["pr"]]
    print(f"wrote {OUTPUT} ({OUTPUT.stat().st_size // 1024} KB)")
    print(f"climate for {sum(1 for r in out_regions if r['pr'])} of {len(out_regions)}; sdg for {sum(1 for r in out_regions if r['sdg'])}")
    print("no climate:", ", ".join(missing_climate))
    print("no continent:", ", ".join(meta[r["id"]]["name"] for r in out_regions if not r["continent"]))


if __name__ == "__main__":
    main()
