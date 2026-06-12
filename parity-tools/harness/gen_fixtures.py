"""Generate parity fixtures for tagged pairs that have none yet.

For every discovery entry with status `no_fixture`, inspect the Python
target's signature and fill the REQUIRED parameters from a table of standard
reference inputs (the pvr_tests reference chart: 1996-12-07 10:34, Chennai).
Optional parameters are omitted so both runtimes use their own defaults —
that is itself part of the parity surface.

Functions with a required parameter we have no standard value for are
skipped and reported; those need hand-written fixtures.

Usage:
    python gen_fixtures.py [--module jhora.horoscope.chart.sphuta] [--dry-run]
"""
import argparse
import inspect
import json
import sys
from pathlib import Path

_HARNESS_DIR = Path(__file__).resolve().parent
_REPO_ROOT = _HARNESS_DIR.parents[1]
sys.path.insert(0, str(_REPO_ROOT / "src"))
sys.path.insert(0, str(_HARNESS_DIR))

from jhora import utils  # noqa: E402

utils.set_language('en')

from jhora.panchanga import drik  # noqa: E402
from jhora.horoscope.chart import charts  # noqa: E402

DISCOVERY = _HARNESS_DIR / "results" / "discovery.json"
FIXTURES_ROOT = _HARNESS_DIR / "fixtures"

# Reference chart (pvr_tests standard)
DOB = (1996, 12, 7)
TOB = (10, 34, 0)
PLACE = {"name": "Chennai", "latitude": 13.0878, "longitude": 80.2785, "timezone": 5.5}
CASE_ID = "ref_chart_1996_chennai"
CASE_DESC = "pvr_tests reference chart: 1996-12-07 10:34, Chennai"


def _pp_json(pp):
    # JSON-safe planet positions: [['L', [rasi, long]], [0, [rasi, long]], ...]
    return [[p, [int(z[0]), float(z[1])]] for p, z in pp]


def _ref_values():
    jd = utils.julian_day_number(DOB, TOB)
    place = drik.Place(PLACE["name"], PLACE["latitude"], PLACE["longitude"], PLACE["timezone"])
    pp = charts.rasi_chart(jd, place)
    return jd, place, pp


def build_value_table():
    jd, place, pp = _ref_values()
    pp_json = _pp_json(pp)
    d3_json = _pp_json(charts.divisional_chart(jd, place, divisional_chart_factor=3))
    d9_json = _pp_json(charts.divisional_chart(jd, place, divisional_chart_factor=9))
    d12_json = _pp_json(charts.divisional_chart(jd, place, divisional_chart_factor=12))
    h_to_p = utils.get_house_planet_list_from_planet_positions(pp)
    d9_h_to_p = utils.get_house_planet_list_from_planet_positions(
        charts.divisional_chart(jd, place, divisional_chart_factor=9))
    asc_rasi = int(pp[0][1][0])
    planet0_rasi = int(pp[1][1][0])
    moon_long = pp[2][1][0] * 30 + pp[2][1][1]
    moon_star = int(moon_long / (360 / 27)) + 1
    place_tag = {"__type": "Place", "value": dict(PLACE)}
    dob_tag = {"__type": "Date", "value": {"year": DOB[0], "month": DOB[1], "day": DOB[2]}}
    dob2_tag = {"__type": "Date", "value": {"year": 1997, "month": 1, "day": 15}}
    return {
        "jd": jd, "jd_at_dob": jd, "jd_at_years": jd, "birth_jd": jd, "jd_utc": jd,
        "panchanga_start_date_jd": jd, "start_jd": jd, "jd_years": jd, "julian_day": jd,
        "place": place_tag, "panchanga_place": place_tag, "place_as_tuple": place_tag,
        "dob": dob_tag, "date_in": dob_tag, "panchanga_date": dob_tag,
        "panchanga_start_date": dob_tag, "start_date": dob_tag,
        "panchanga_date1": dob_tag, "panchanga_date2": dob2_tag,
        "date_of_birth_as_tuple": list(DOB), "time_of_birth_as_tuple": list(TOB),
        "tob": list(TOB), "time_of_birth_in_hours": TOB[0] + TOB[1] / 60 + TOB[2] / 3600,
        "birth_time_hrs": TOB[0] + TOB[1] / 60 + TOB[2] / 3600,
        "start_time_hrs": 10.5, "end_time_hrs": 20.5,
        "planet_positions": pp_json,
        "planet_positions_in_rasi": pp_json,
        "rasi_planet_positions": pp_json,
        "planet_positions_rasi": pp_json, "pp_rasi": pp_json,
        "planet_positions_navamsa": d9_json, "pp_navamsa": d9_json,
        "navamsa_planet_positions": d9_json,
        "drekkana_planet_positions": d3_json,
        "dwadasamsa_planet_positions": d12_json,
        "house_to_planet_dict": h_to_p, "house_to_planet_list": h_to_p,
        "h_to_p": h_to_p, "chart": h_to_p, "house_planet_list": h_to_p,
        "chart_1d": h_to_p, "chart_rasi": h_to_p, "chart_1d_rasi": h_to_p,
        "chart_1d_navamsa": d9_h_to_p, "house_planet_dict": h_to_p,
        "dhasa_chart": h_to_p,
        "planet": 0, "planet1": 0, "planet2": 1, "p1": 0, "p2": 1, "planet_index": 0,
        "lord": 0, "dhasa_lord": 0, "maha_lord": 0, "bhukti_lord": 1, "bhukthi_lord": 1,
        "raja_yoga_planet1": 4, "raja_yoga_planet2": 5,
        "raasi": asc_rasi, "rasi": asc_rasi, "sign": asc_rasi,
        "house": asc_rasi, "asc_house": asc_rasi,
        "raasi1": asc_rasi, "raasi2": (asc_rasi + 4) % 12,
        "rasi1": asc_rasi, "rasi2": (asc_rasi + 4) % 12,
        "planet_house": planet0_rasi,
        "maandi_house": asc_rasi, "maand_house": asc_rasi,
        "moon_star": moon_star, "nak": moon_star,
        "tithi_": 1, "paksha_index": 0, "maasa_index": 1, "weekday_index": 3,
        "bird_index": 1, "is_shukla_paksha": True, "is_daytime_birth": True,
        "upagraha": "kaala",
        "longitude": 123.456, "latitude": 13.0878, "deg": 123.456, "angle": 123.456,
        "solar_longitude": 257.5, "moon_longitude": 123.456,
        "ascendant_longitude": 290.0, "planet_longitude_within_raasi": 15.5,
        "dms_str": "10:20:30",
        "divisional_chart_factor": 1, "dcf": 1,
        "language": "en", "years": 1, "months": 1, "sixty_hours": 1,
    }


def generate(module_filter=None, dry_run=False):
    entries = json.loads(DISCOVERY.read_text())
    items = entries if isinstance(entries, list) else entries.get("functions", entries)
    values = build_value_table()

    generated, skipped = [], []
    for e in items:
        if (e.get("status") or e.get("state")) != "no_fixture":
            continue
        target = e["python_target"]
        if module_filter and not target.startswith(module_filter):
            continue
        mod_name, fn_name = target.rsplit(".", 1)
        try:
            mod = __import__(mod_name, fromlist=[fn_name])
            fn = getattr(mod, fn_name)
            sig = inspect.signature(fn)
        except Exception as ex:
            skipped.append((target, f"import/signature failed: {ex}"))
            continue

        inputs = {}
        missing = []
        for name, param in sig.parameters.items():
            if param.kind in (param.VAR_POSITIONAL, param.VAR_KEYWORD):
                continue
            if param.default is not inspect.Parameter.empty:
                continue  # optional — let both runtimes default
            if name in values:
                inputs[name] = values[name]
            else:
                missing.append(name)
        if missing:
            skipped.append((target, f"no standard value for required param(s): {missing}"))
            continue

        rel = Path(*mod_name.replace("jhora.", "").split(".")) / f"{fn_name}.json"
        out_path = FIXTURES_ROOT / rel
        if out_path.exists():
            skipped.append((target, "fixture already exists"))
            continue

        fixture = {
            "python_target": target,
            "typescript_target": e["typescript_target"],
            "setup": {"ayanamsa": "LAHIRI"},
            "cases": [{"id": CASE_ID, "description": CASE_DESC, "inputs": inputs}],
        }
        if not dry_run:
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_text(json.dumps(fixture, indent=2) + "\n")
        generated.append(target)

    return generated, skipped


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--module", help="only generate for python targets with this prefix")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    generated, skipped = generate(args.module, args.dry_run)
    print(f"generated: {len(generated)}")
    print(f"skipped:   {len(skipped)}")
    for t, why in skipped:
        print(f"  SKIP {t}: {why}")


if __name__ == "__main__":
    main()
