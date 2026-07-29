# Canonical Garmin source

`garmin-section-o-80.826mi.gpx` is the checked-in canonical copy of Gunnar's
user-supplied Section O export.

- SHA-256: `9073d39f82e0e6ee68f7acc050e857b235bf3ea8b527c4fa7e9110aca2d2e6e1`
- Full source course: 80.826 miles
- Burney Falls–Ash Camp crop in this export: 51.153 miles
- Active itinerary distance: 51.844 PCTA 2026 centerline miles

The TCX, `-2.gpx`, KML, JavaScript, and CSV exports supplied with it contain
the same 6,916-point geometry/elevation stream and are represented by the
receipts in `../garmin-route-export-audit.json`; they are not duplicated here.
The alternate GPX has the same endpoints and distance but a different
elevation sampling stream. The FIT file remains receipt-audited but is not
needed for the normalized elevation contract.

Run:

```bash
node scripts/normalize_garmin_itinerary.mjs \
  --output docs/data/garmin-itinerary-normalization.json
```

The selected model resamples every 25 meters, applies a centered 200-meter
moving mean, and carries one 20-foot hysteresis accumulator continuously across
all eight day boundaries. This prevents export density and campsite boundaries
from creating fake ascent/descent.
