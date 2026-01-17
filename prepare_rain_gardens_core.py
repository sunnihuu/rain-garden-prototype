#!/usr/bin/env python3
"""
Prepare a core Rain Gardens dataset from GI surface data.

Inputs:
- data/processed/gi-surface-queens.geojson

Outputs:
- data/processed/rain_gardens_core.geojson

Fields ensured per feature:
- geometry: Point (passthrough)
- asset_id
- council_dist (from city_counc)
- community_dist (from community_)
- base_capacity_gal (default 2500 if missing)
- maintenance_hours_per_month (default 3.5 if missing)

Filters:
- Includes assets with asset_type indicating rain gardens: 'Rain Garden' or 'ROWRG'
  (adjust easily by editing ALLOWED_TYPES)
"""
import json
import os
from typing import Any, Dict

SRC = os.path.join('data', 'processed', 'gi-surface-queens.geojson')
DST = os.path.join('data', 'processed', 'rain_gardens_core.geojson')

ALLOWED_TYPES = { 'Rain Garden', 'ROWRG' }  # include in-street rain gardens
DEFAULT_BASE_CAPACITY_GAL = 2500
DEFAULT_MAINT_HOURS_PER_MONTH = 3.5


def main():
    if not os.path.exists(SRC):
        raise FileNotFoundError(f"Source not found: {SRC}")

    with open(SRC, 'r', encoding='utf-8') as f:
        data = json.load(f)

    features = data.get('features', [])
    out_features = []

    for feat in features:
        props: Dict[str, Any] = feat.get('properties', {})
        asset_type = str(props.get('asset_type') or '').strip()
        if asset_type not in ALLOWED_TYPES:
            continue

        asset_id = props.get('asset_id')
        council_dist = props.get('city_counc')
        community_dist = props.get('community_')
        base_capacity_gal = props.get('base_capacity_gal', DEFAULT_BASE_CAPACITY_GAL)
        maintenance_hours_per_month = props.get('maintenance_hours_per_month', DEFAULT_MAINT_HOURS_PER_MONTH)

        out_props = {
            'asset_id': asset_id,
            'council_dist': council_dist,
            'community_dist': community_dist,
            'base_capacity_gal': base_capacity_gal,
            'maintenance_hours_per_month': maintenance_hours_per_month,
        }

        out_features.append({
            'type': 'Feature',
            'properties': out_props,
            'geometry': feat.get('geometry'),
        })

    out = {
        'type': 'FeatureCollection',
        'name': 'rain_gardens_core',
        'features': out_features,
    }

    # Ensure output directory exists
    os.makedirs(os.path.dirname(DST), exist_ok=True)

    with open(DST, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False)

    print(f"Wrote {len(out_features)} features to {DST}")


if __name__ == '__main__':
    main()
