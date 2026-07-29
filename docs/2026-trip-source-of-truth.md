# DDG 2026 Trip Source of Truth

## Burney Falls to Ash Camp, August 28–September 7, 2026

**Audit date:** July 28, 2026

**Controlling route version:** PCTA January 2026 centerline and 2026 mile markers

**Status:** Evidence-backed planning baseline with explicit pre-trip verification gates

**Scope:** Transportation, route geometry, daily itinerary, elevation, land access, camps, water, weather, fire, smoke, communications, equipment, pickup, emergency planning, data architecture, and source hierarchy

> This document controls the website and iOS app. Any number or statement in the UI that conflicts with this document must be treated as stale until it is reconciled. This is a planning document, not a guarantee of trail, water, weather, fire, road, airline, or medical conditions.

---

## 1. Executive decision

The intended trip is **not 82.9 miles** and it is **not the legacy 54.2-mile
route that began south of the real Burney Falls access**.

The defensible current route is:

- **Start:** Burney Falls Trailhead / Burney Falls State Park PCT access
- **Start coordinate:** approximately `41.01104125, -121.65376551` for the PCTA trailhead
- **Start PCT mile:** approximately **1420.65** on the January 2026 PCTA centerline
- **Finish:** Ash Camp
- **Finish coordinate:** `41.1170914, -122.0606252`
- **Finish PCT mile:** approximately **1472.50** on the January 2026 PCTA centerline
- **Official centerline distance:** approximately **51.84 miles**
- **Garmin cropped-track distance:** approximately **51.66 miles**
- **Planning display distance:** **51.8 PCT miles**
- **Direction:** northbound
- **Primary hiking dates:** Saturday, August 29 through Saturday, September 5
- **Contingency/recovery day:** Sunday, September 6
- **Return flight:** Monday, September 7

The recommended baseline is **eight hiking days plus one true contingency day**, not nine hiking days consuming every available day.

That decision is driven by four real constraints:

1. The legacy app started approximately **2.57 trail miles before** the actual Burney Falls trailhead.
2. The legacy Day 3 camp at Kosk Spring appears to be on private land and cannot be assumed legal under the active PCTA timberland access rule.
3. The route has a current brush/blowdown alert around Bartle Gap.
4. An early September 7 flight makes September 6 a poor day to be depending on a remote pickup, a rough forest road, and a five-hour drive home.

### Current confidence

| Question | Current answer | Confidence | What can still change it |
|---|---|---:|---|
| Is the 82.9-mile route the trip? | No | Confirmed | Only a deliberate scope change |
| Was the legacy 54.2-mile app route correct? | No | Confirmed | It included an unintended 2.57-mile southern segment; current bundles are cropped |
| Is the intended route about 52 miles? | Yes, 51.84 official-centerline miles | High | Annual PCTA geometry updates or a reroute |
| Is Ash Camp the pickup? | Yes | High | Road closure, fire closure, or deliberate pickup change |
| Is September 5 the preferred finish? | Yes | Recommended | Team pace or itinerary choice |
| Is September 6 available as a buffer? | Yes | High | A flight change or trip extension |
| Is Kosk Spring a valid camp? | Do not assume so | High concern | Written/current land-manager confirmation |
| Are listed water sources flowing now? | Unknown | Low | Current FarOut/PCT Water/ranger reports |
| Are the United times fully confirmed? | No | Unresolved | Dan's United booking or manage-trip record |

---

## 2. Legacy defects corrected in the current repository

These were data defects, not design opinions. The correction column is now
implemented in the generated web/iOS datasets unless the row explicitly
describes a real-world verification gate.

| Legacy repository claim | Evidence-backed correction | Impact |
|---|---|---|
| The first GPS point is “Burney Falls State Park (Start)” | The coordinate is approximately PCTA 2026 mile **1418.09**, about 2.57 trail miles before the actual Burney Falls trailhead | Inflates route and Day 1 mileage |
| Route is 54.2 GPS miles | Intended trailhead-to-Ash route is approximately **51.84 official miles** | Every average, progress metric, waypoint route-mile, and ETA is shifted |
| Start PCT mile is 1420.7 at the current first coordinate | That coordinate is approximately 1418.09 on PCTA 2026 geometry | Source/version mismatch |
| Ash Camp is PCT mile 1472.0 | PCTA 2026 geometry places the route endpoint near **1472.50**; the PCTA public page rounds to 1472 | Secondary PCT miles need a source year and precision policy |
| Day 1 is 8.2 miles | From the real Burney Falls trailhead to Rock Creek it is approximately **5.61 official miles** | Arrival-day effort was overstated |
| Day 3 ends at Kosk Spring | Kosk does not map to public land in the current screening and is inside the private-land traversal | The “easy” nine-day itinerary may violate current access terms |
| Total gain/loss is +6,709/−7,286 feet | The cropped intended Garmin profile recomputes to **+6,394/−6,881 feet** using the repository's smoothing method | Dashboard totals are stale |
| All section profile data describe the active trip | One profile dataset still extends nearly 29 miles beyond Ash Camp | UI can show irrelevant or misleading terrain |
| Water source miles are canonical | Coordinates are useful, but stored miles mix Halfmile 2023, PCTA 2025, and app route miles | Water ordering and “miles to water” can be wrong |
| Every displayed camp is verified | Camp coordinates are mapped, but land legality and current site condition are not all verified | False reassurance |
| Nine days is safer because daily mileage is lower | It removes the only full contingency day before a 6:40 a.m. flight | Less operational resilience |

### Completed data corrections

1. ✅ Cropped the active route at the actual Burney Falls trailhead.
2. ✅ Recomputed every route-mile from zero.
3. ✅ Remapped every waypoint to PCTA 2026 geometry.
4. ✅ Stored PCT mile with `PCTA_2026` source metadata.
5. ✅ Stored route progress separately from PCT mile.
6. ✅ Recomputed daily elevation from the cropped Garmin route.
7. ✅ Removed Kosk from the default itinerary.
8. ✅ Separated static water locations from timestamped condition reports.
9. ✅ Replaced the full-Section-O profile in active-trip views.
10. ✅ Made September 5 the planned finish and September 6 the visible contingency day.

---

## 3. Flight truth and time-zone normalization

### What the calendar evidence actually proves

The Gmail search found a Google Calendar invitation from Dan named:

`DAN SJC UA481 - UA1317`

Its stored UTC boundaries normalize to:

- **Start:** Friday, August 28 at **6:03 p.m. PDT**
- **End:** Monday, September 7 at **10:45 a.m. PDT**

That calendar entry is one trip-spanning block. It is **not an airline confirmation** and does not independently prove the exact departure and arrival times of both legs.

### Likely explanation for the apparent duplicate

The provided UA481 entry says:

- ORD departure: August 28 at 8:00 p.m. CDT
- SJC arrival: August 29 at 12:36 a.m. CDT

Converted to Pacific time, that is:

- ORD departure represented in Pacific time: August 28 at **6:00 p.m. PDT**
- SJC arrival: August 28 at **10:36 p.m. PDT**

That closely matches the calendar block beginning at 6:03 p.m. PDT. The most likely explanation is that the calendar and flight entry are the **same itinerary displayed in different time zones**, with a minor schedule change or transcription difference.

### Working transportation timeline

Until the United booking is checked, use this as a planning assumption, not a ticket record:

| Event | Local time at event | Pacific-normalized time | Status |
|---|---:|---:|---|
| UA481 ORD departure | About 8:00–8:03 p.m. CDT, Aug 28 | About 6:00–6:03 p.m. PDT, Aug 28 | Likely |
| UA481 SJC arrival | 10:36 p.m. PDT, Aug 28 | 10:36 p.m. PDT | Likely from supplied time-zone math |
| Bags and airport exit | About 11:00–11:30 p.m. PDT | Same | Planning estimate |
| Campbell arrival | About 11:30 p.m.–midnight | Same | Planning estimate |
| UA1317 SJC departure | 6:40 a.m. PDT, Sep 7 | Same | Supplied, not booking-verified |
| UA1317 ORD arrival | User entries conflict | Unknown | Must verify |

### Flight verification gate

Dan must supply one of these:

- United confirmation email;
- United app “Trips” screenshot showing both legs;
- United manage-trip page showing passenger, dates, airports, flight numbers, and local times; or
- ticket receipt/itinerary PDF.

The app must not label a flight “confirmed” from a Google Calendar event.

### Return-flight operational consequence

If UA1317 really departs SJC at 6:40 a.m. on September 7:

- Target airport arrival: approximately **4:40 a.m.**
- Likely departure from Campbell: approximately **4:05–4:20 a.m.**, depending on the address, parking/drop-off, and current airport guidance
- September 6 should be a home/recovery/gear-drying day, not the preferred remote pickup day

---

## 4. Canonical route geometry

### Authoritative geometry source

The primary geometry is the [PCTA PCT Data release](https://www.pcta.org/discover-the-trail/maps/pct-data/):

- PCTA calls its centerline the most accurate representation of the trail.
- It is adjusted annually.
- The current release was updated in January 2026.
- The mile markers are generated from that same centerline.

Direct services:

- [PCTA Centerline Feature Service](https://services5.arcgis.com/ZldHa25efPFpMmfB/arcgis/rest/services/PCTA_Centerline/FeatureServer/0)
- [PCTA 2026 Mile Markers Feature Service](https://services5.arcgis.com/ZldHa25efPFpMmfB/arcgis/rest/services/PCT_Mile_Markers_2026/FeatureServer/0)
- [PCTA Trailheads Feature Service](https://services5.arcgis.com/ZldHa25efPFpMmfB/ArcGIS/rest/services/Trailheads_Current/FeatureServer/0)

### Endpoint audit

| Point | Coordinate | PCTA 2026 mile | Distance to Ash Camp |
|---|---|---:|---:|
| Repository's current mislabeled start | `41.0134804, -121.6207090` | 1418.086 | 54.411 mi |
| Burney Falls Trailhead | `41.0110413, -121.6537655` | 1420.653 | 51.844 mi |
| Burney Falls State Park access | `41.0134000, -121.6503877` | Approximately 1420.76 at nearest PCT point | Approximately 51.74 PCT mi plus connector |
| Ash Camp | `41.1170914, -122.0606252` | 1472.497 | 0 |

The PCTA trailhead coordinate is about 0.027 mile from the centerline. The State Park access coordinate is an access/parking point, not a point snapped directly to the PCT. Connector distance must be represented separately if the team starts at the park rather than the Clark Creek Road trailhead.

### Route-mile policy

The product must show two different values:

- **Route mile:** distance from the selected trip start, beginning at 0.0.
- **PCT mile:** the PCTA mile marker system, explicitly versioned.

Example:

`Route 13.6 mi · PCT 1434.3 (PCTA 2026)`

Never silently substitute one for the other.

### Geometry precision policy

- Operational route distance: round to one decimal in overview cards.
- Daily leg distance: show one decimal, retain at least three decimals internally.
- Pickup and emergency coordinates: retain at least five decimal places.
- PCT mile: show one decimal in UI and retain three decimals internally.
- Elevation: show nearest 10 feet in UI; retain raw source value and method internally.

---

## 5. Recommended eight-day itinerary

### Why this is the baseline

This plan:

- starts at the actual Burney Falls access;
- respects the current private-land concern by not sleeping at Kosk;
- preserves short recovery days around the steep and brushy Bartle Gap section;
- finishes September 5;
- keeps September 6 available for weather, smoke, fire, road, injury, or pace disruption;
- avoids pretending that three humans will walk the same mileage every day.

### Day-by-day plan

Elevation gain/loss below is derived from the cropped Garmin profile using five-point smoothing and a 10-foot accumulation threshold. Distance is from PCTA 2026 geometry. Field time is a conservative planning window for loaded hikers, breaks, water treatment, navigation, heat, and brush; it is not a promise.

| Day/date | Leg | Daily mi | Cumulative mi | End PCT mi | Gain/loss | End elev. | Planning read | Field window |
|---|---|---:|---:|---:|---:|---:|---|---:|
| 1 · Sat Aug 29 | Burney Falls → Rock Creek | **5.61** | 5.61 | 1426.26 | +608 / −514 ft | ~3,043 ft | Arrival-day shakedown; dam/road crossing; water at end | 4–6 hr |
| 2 · Sun Aug 30 | Rock Creek → Peavine Creek | **8.03** | 13.64 | 1434.29 | +2,006 / −276 ft | ~4,769 ft | Sustained-climb day; highest ascent total | 5.5–7.5 hr |
| 3 · Mon Aug 31 | Peavine → Moosehead Creek | **14.53** | 28.17 | 1448.82 | +1,824 / −1,313 ft | ~5,285 ft | Longest and hardest day; private-land traverse; brush begins near end | 9–11 hr |
| 4 · Tue Sep 1 | Moosehead → high saddle near 38N10 | **4.08** | 32.25 | 1452.90 | +987 / −146 ft | ~6,128 ft | Short but steep; route high point; dry camp | 3.5–5 hr |
| 5 · Wed Sep 2 | High saddle → Alder/Star City | **3.79** | 36.04 | 1456.69 | +85 / −818 ft | ~5,394 ft | Brush/blowdown and knee-loading descent; water uncertain | 3–5 hr |
| 6 · Thu Sep 3 | Alder/Star City → Deer Creek Spring | **6.35** | 42.39 | 1463.04 | +884 / −1,075 ft | ~5,197 ft | Mixed climbing/descending; verify first dependable water | 5–7 hr |
| 7 · Fri Sep 4 | Deer Creek Spring → Butcherknife Creek | **5.60** | 47.99 | 1468.64 | +0 / −1,828 ft | ~3,360 ft | Biggest continuous descent; knees are the limiter | 4.5–6.5 hr |
| 8 · Sat Sep 5 | Butcherknife → Ash Camp | **3.85** | **51.84** | 1472.50 | +0 / −912 ft | ~2,365–2,443 ft | Short pickup day; poison-oak awareness; rough-road pickup | 2.5–4 hr |
| Buffer · Sun Sep 6 | No scheduled trail miles | — | — | — | — | — | Weather/fire/road/injury buffer and home recovery | — |

### Route totals

- PCTA 2026 centerline distance: **51.84 miles**
- Garmin cropped route distance: **51.66 miles**
- Garmin-derived gain: **6,394 feet**
- Garmin-derived loss: approximately **6,881 feet**
- Highest route elevation: approximately **6,146 feet**
- Lowest finish-area elevation:
  - Garmin track: approximately **2,443 feet**
  - USGS 3DEP at Ash Camp pin: approximately **2,365 feet**

The Ash Camp elevation difference is an example of why the app must store source and method, not just a naked number.

### Difficulty ranking

1. **Day 3:** 14.5 miles, 3,137 feet of combined vertical movement, private-land timing, and brush at the end.
2. **Day 2:** 2,006 feet of climbing over 8 miles.
3. **Day 7:** 1,828 feet of descent in 5.6 miles; likely the hardest day on knees.
4. **Day 6:** 1,959 feet of combined vertical movement over 6.35 miles.
5. **Day 4:** almost 1,000 feet of ascent in only 4.1 miles, ending at the high point.
6. **Day 5:** low mileage but descending through the current brush/blowdown alert area.
7. **Day 1:** moderate terrain, but sleep and transportation make it operationally harder than the profile suggests.
8. **Day 8:** short, downhill, and pickup-focused.

### Nine-day alternative

A nine-day plan that sleeps at Kosk is **not the default**. It becomes eligible only if all of the following are confirmed:

1. The exact Kosk campsite parcel and owner are identified.
2. Camping is currently authorized there on August 31.
3. Stove/use restrictions are understood.
4. The team knowingly accepts having no full contingency day before the return flight.

Without those four facts, the app must not present Kosk as a normal green-status camp.

---

## 6. Land ownership and camp legality

### Current PCTA timberland rule

The active [PCTA private timberland access alert](https://closures.pcta.org/closure/eDTns8WfTkvDtYlimQlJ) states that on affected Sierra Pacific Industries, Hearst Forests, and Collins lands:

- PCT passage is allowed;
- camping is not allowed;
- campfires are not allowed;
- stoves and ignition sources are not allowed;
- smoking is not allowed;
- extended stops are not allowed; and
- hikers must travel carefully and continuously.

PCTA specifically warns that private timberland is common between McArthur-Burney Falls Memorial State Park and Mushroom Rock.

### GIS screening used in this audit

The route was screened against:

- [USGS PAD-US 4.1 Fee Managers](https://services.arcgis.com/v01gqwM5QqNysAAi/ArcGIS/rest/services/Fee_Managers_PADUS/FeatureServer/0)
- PCTA's Sierra Pacific Industries holdings layer
- PCTA 2026 centerline

This is useful screening, not a title report.

| Proposed camp | Current screen | Planning status |
|---|---|---|
| Rock Creek | USFS/open-access mapping | Acceptable pending current site check |
| Peavine Creek | USFS/open-access mapping | Acceptable pending current site/water check |
| Kosk Spring | Not mapped as public land | **Do not use without confirmation** |
| Moosehead Creek | USFS/open-access mapping | Acceptable pending current site/water check |
| High saddle near 38N10 | USFS/open-access mapping | Acceptable as a dry-camp candidate |
| Alder/Star City | USFS/open-access mapping | Acceptable pending site/water check |
| Deer Creek Spring | USFS/open-access mapping | Acceptable pending site/water check |
| Butcherknife Creek | USFS/open-access mapping | Acceptable pending site/water check |
| Ash Camp | USFS/open-access mapping | Trailhead/pickup; current road check required |

The screening shows a substantial private/unmapped traversal between Peavine and the Bartle Gap/Moosehead area. That is why Day 3 cannot be casually split at Kosk.

### Required confirmation calls

Ask the McCloud Ranger Station and PCTA:

1. Is camping at the exact Kosk Spring coordinate legal on August 31, 2026?
2. Which owner controls the parcel?
3. Are current private timber restrictions in force?
4. Is brief water collection at Clark, Deadman, or Kosk allowed during continuous passage?
5. Is Moosehead Creek camping on public USFS land at the mapped coordinate?
6. Is camping allowed at the high saddle and Alder/Star City coordinates?

**McCloud Ranger Station:** `(530) 964-2184`

**Shasta-Trinity headquarters:** `(530) 226-2500`

**PCTA main office:** `(916) 285-1846`

Record the date, person, agency, exact question, answer, and any order number in Supabase. Do not reduce a phone answer to an unlabeled green check.

---

## 7. Water plan

### The most important water fact

The repository has useful water **coordinates**, and the live Supabase snapshot
now contains July 2026 crowd reports. Those reports are useful evidence, but
they are not late-August guarantees.

The checked-in CSV made the Section O observations look mostly 2021–2022.
However, the active Supabase project's July 28 snapshot includes reports dated
June and July 2026. This is materially better field intelligence. It still
comes from a crowdsourced feed, and even a correct July observation can be
wrong six weeks later after sustained heat, diversion, logging, or a fire
response.

The live-parser audit also found concrete data-quality defects:

- Peavine's latest text says `07/15/26`, but its structured `reportDate` is
  stored as `7/15/22`.
- Star City has a June 15, 2026 report in text, but `reportDate` and
  `reportedBy` are null.
- Rock Creek says “lots of water, strong flow” in the latest report but its
  structured condition is `unknown`.
- Several downstream sources with plainly positive text are also classified
  `unknown`.
- A source-level status of `live` currently means the source was fetched; it
  does not mean the water is flowing or that the information is current enough
  for the trip.

The product must therefore display the original observation, parsed date,
reporter, parser confidence, and age together. It must not reduce this evidence
to an unqualified green dot.

Primary sources:

- [PCT Water Report](https://www.pcta.org/discover-the-trail/backcountry-basics/water/pct-water-report/)
- [PCTWater.com](https://www.pctwater.com/)
- FarOut Northern California comments checked shortly before departure
- McCloud Ranger Station
- direct observations shared by 2026 hikers

### Water inventory remapped to PCTA 2026

Route mile begins at the real Burney Falls trailhead.

| Route mi | PCT 2026 mi | Source | Latest live-snapshot evidence on Jul 28 | Planning interpretation |
|---:|---:|---|---|---|
| Start | ~1420.65 | Burney Falls facilities/tap | Jul 9: entrance spigot working; second spigot easier | Strong start source, but verify park operation |
| 5.39 | 1426.04 | Rock Creek | Jul 14: lots of water/strong flow | Strong July evidence; recheck |
| 8.62 | 1429.28 | Upper Jake Spring | Jul 10: shallow flow and many bees | Limited and 0.17 mi/111 ft down |
| 9.51 | 1430.17 | Screwdriver Creek | Jul 4: flowing with a large pool | Useful intermediate backup |
| 13.56 | 1434.22 | Peavine Creek | Jul 15 text: good flow near second road crossing; Jul 10 trail crossing dry but alternate coordinate flowing | **Use alternate-access detail; parser date is wrong; recheck** |
| 17.78 | 1438.43 | Clark Spring | Jul 10: dry; Jun 21: flowing | Treat as dry unless a newer report says otherwise |
| 19.81 | 1440.47 | Deadman Creek | Jun 17: good water source | Older and private-land/access implications |
| 21.36 | 1442.01 | Kosk Spring | Jul 15: good flow/fast collection | Water evidence is good; camping/access legality is separate |
| 28.16 | 1448.82 | Moosehead Creek | Jul 11: very good flow but overgrown | Strong July evidence; exact access may be brushy |
| 28.57 | 1449.23 | Moosehead alternate/headwaters | Jul 16: strong trickle, about 1 L/30 sec | Useful limited alternate |
| 35.60 | 1456.26 | Alder/Star City Creek | Jun 15: clear pool/flow, about 2 L/min | Structured report date missing; **recheck before dry camp** |
| 42.38 | 1463.04 | Deer Creek Spring | Jul 13: water audible from trail | Positive but indirect observation |
| 43.48 | 1464.13 | Deer Creek | Jul 16: plenty of flow | Strong July evidence |
| 44.60 | 1465.26 | Second Deer Creek crossing | Jul 16: plenty of water | Strong July evidence |
| 47.66 | 1468.31 | Butcherknife tributary | Jul 12: flowing well | Strong July evidence |
| 48.01 | 1468.66 | Butcherknife Creek | Jul 17: flowing | Strong July evidence |
| 48.19–48.72 | 1468.84–1469.38 | Small McCloud-drainage sources | Jul 12–17: several flowing | Seasonal redundancy; Strider at 1470.3 was nearly dry |
| 51.84 | 1472.50 | Ash Camp/McCloud River area | Jul 17: lots of water | Major drainage; still treat/filter |

### Daily water decisions

#### Day 1

- Start with full treated/potable water.
- Rock Creek is the planned evening source.
- If Rock Creek is not freshly confirmed, carry enough to camp and to leave the next morning.

#### Day 2

- Rock Creek to Peavine is a climbing day.
- Upper Jake and Screwdriver are possible intermediate sources.
- Peavine is seasonal and cannot be the sole plan without a recent report.

#### Day 3

- This is the critical water-and-land day.
- Peavine to Moosehead is approximately 14.5 miles.
- Clark, Deadman, and Kosk are mapped, but the route crosses restricted private holdings.
- Confirm whether collection is allowed and how long it takes.
- In hot conditions, plan capacity from the last confirmed legal source to Moosehead rather than assuming every mapped spring is available.

#### Days 4–6

- High saddle is a dry camp.
- Alder/Star City had a positive June 15 report, but the parser lost its date
  metadata and it still needs a pre-trip confirmation.
- The team may need to carry from Moosehead through the saddle until a verified source.
- Gold Creek must not be treated as a routine fallback; historical notes describe private-property/no-trespassing concerns on the access.

#### Days 7–8

- Deer Creek and Butcherknife have multiple mapped sources, but current flow still controls.
- The last day is short and descending.

### Capacity policy

The app should calculate, per person:

- miles to next **confirmed** source;
- expected hours to that source;
- forecast heat;
- elevation exposure;
- current liters carried;
- minimum reserve;
- whether the source is on private/restricted land; and
- whether its report is stale.

For Day 3, a **4–5 liter capacity per person** may be appropriate in hot weather, but the actual carry must be set from the final forecast, verified source status, individual consumption, and team experience. Capacity is not the same as a requirement to leave camp carrying every container full.

Carry two treatment methods across the group:

- primary filters; and
- chemical backup tablets/drops.

---

## 8. Trail condition, bridge, and crossing gates

### Current official concerns

#### Bartle Gap brush and blowdown

The [PCTA alert](https://closures.pcta.org/closure/jR2pac6ijlObt8Z2eNGG) covers approximately PCT mile 1448 to 1460:

- dense brush;
- likely blowdown;
- ongoing/planned maintenance in summer 2026.

This overlaps:

- the end of Day 3;
- all of Day 4; and
- all of Day 5.

Low mileage on Days 4 and 5 is intentional.

#### Burney Falls adjacent trail closures

California State Parks currently lists erosion closures on parts of:

- Burney Creek Trail; and
- PSEA Trail.

The PCT is not listed as fully closed, but the exact walk from the chosen parking/drop-off point to the PCT must be checked against posted signs.

[Current State Parks notice](https://www.parks.ca.gov/post/103)

#### Lake Britton Dam

The PCT crosses Lake Britton/Pit No. 3 Dam on the first day. Historical work has required escorts or temporary closures. No current PCTA full closure was found in this audit, but current PG&E construction/access status must be checked directly before departure.

Do not confuse the nearby “Stand by Me” railroad bridge with the legal PCT dam crossing.

#### Rock Creek bridge

The PCT crosses Rock Creek on a wooden bridge near the first camp. Verify current bridge and trail condition from PCTA/FarOut/ranger reports.

#### Ash Camp/McCloud River

The planned pickup is at Ash Camp before continuing beyond the trip. The McCloud River bridge is nearby in PCT data. The team does not need to continue to an arbitrary “52nd mile” and then find an exit; Ash Camp is the defined vehicle-access endpoint.

---

## 9. Start logistics

### The arrival-night reality

If UA481 lands at approximately 10:36 p.m. PDT:

- driving directly from SJC to Burney would put the group near Burney around 3:30–4:30 a.m.;
- the group would arrive exhausted;
- Mikaela would be doing a long night drive;
- State Park access may not be available overnight; and
- starting an 8-mile day after that would be poor risk management.

The corrected route makes a better plan possible.

### Recommended August 28–29 sequence

1. UA481 lands at SJC late Friday evening.
2. Mikaela picks up Dan and Drew.
3. Everyone returns to Campbell.
4. Gear is already packed, weighed, charged, and staged before the flight lands.
5. Sleep at home.
6. Depart Campbell around **5:00–5:30 a.m.** on August 29.
7. Allow approximately five hours plus stops and traffic.
8. Arrive in the Burney area around **10:30–11:30 a.m.**
9. Complete the final conditions check and drop-off.
10. Hike approximately 5.6 miles to Rock Creek.

This is still a long transportation day for Mikaela. Driver fatigue is a real risk. Build a fuel/food/rest stop and do not make the plan depend on a perfect flight arrival.

### Burney entry options

#### Main State Park access

Advantages:

- facilities;
- potable water when operating;
- ability to see Burney Falls;
- paved passenger-vehicle access.

Constraint:

- California State Parks requires day-use vehicle reservations Friday through Sunday and holidays from May 15 through September 27, 2026.
- August 29 is a Saturday.
- Make the reservation now if using the main entrance.

[California State Parks reservation announcement](https://www.parks.ca.gov/NewsRelease/1509)

#### Clark Creek Road / Burney Falls Trailhead

PCTA describes this as:

- generally passenger-vehicle accessible;
- dirt/gravel;
- parking available;
- a short connector to the PCT.

[PCTA Burney Falls Trailhead](https://explore.pcta.org/trailheads/burney-falls-trailhead)

Do not assume this option bypasses all park rules. Confirm current access with the park.

---

## 10. Finish and pickup plan

### Primary pickup

- **Date:** Saturday, September 5
- **Location:** Ash Camp
- **Pin:** `41.1170914, -122.0606252`
- **PCTA 2026 mile:** approximately 1472.50
- **Planned pickup window:** approximately 9:30 a.m.–12:30 p.m.
- **Backup date:** Sunday, September 6

### Why Ash Camp is the correct endpoint

[PCTA's Ash Camp page](https://explore.pcta.org/trailheads/ash-camp) lists:

- nearby PCT access;
- free overnight parking;
- a bathroom;
- dirt/gravel road access; and
- high-clearance recommended.

The current route endpoint already lands within approximately 0.01 mile of the PCTA Ash Camp feature.

### Road access

Official directions:

1. Approach the Lake McCloud Dam area.
2. Turn onto Hawkins Creek Road / Forest Road 38N11.
3. Continue approximately one mile to Ash Camp.

Use the [PCTA Ash Camp page](https://explore.pcta.org/trailheads/ash-camp) as
the current public directions reference. A previously cited USFS “Pacific
Crest Trail Access Points” PDF returned HTTP 404 during the July 28 link audit
and is not a dependable live source.

Current concern:

- Hawkins Creek Road had a culvert failure in March 2026.
- A temporary repair reportedly reopened the road.
- A permanent repair was still planned.
- This is not enough to assume September access.

Required:

- call McCloud Ranger Station within seven days of pickup;
- check again within 24–48 hours;
- use a high-clearance vehicle if available;
- do not send Mikaela onto the road at night for the first time;
- pre-drive/recon the road if practical; and
- save offline directions and the exact pin.

### Pickup communication protocol

Cell service is not the control channel.

#### September 4

- Hikers send a satellite “camped at Butcherknife” message.
- Confirm primary pickup date and planned morning departure.
- Mikaela acknowledges by satellite.

#### September 5

- Hikers send “departing Butcherknife” around 6:30–7:00 a.m.
- Hikers send “arrived Ash Camp” when at the pickup pin.
- Mikaela sends “at Ash Camp” when parked.

#### If messages fail

- Mikaela still follows the agreed pickup window.
- She remains at the exact Ash Camp pin through the agreed overdue time.
- She does not search random forest roads alone.
- The written trip plan identifies the last camp, route, clothing, equipment, and satellite device.
- A missed routine message alone is not an automatic 911 call; use the documented overdue threshold and circumstances.
- SOS, injury, fire, or a materially overdue team triggers emergency escalation.

### Return home

McCloud-to-San Jose road distance is roughly 315–318 miles and commonly estimated around five hours before stops. Ash Camp adds rough-road time.

Finishing September 5 gives:

- one night to return home;
- September 6 for recovery, drying gear, and resolving delays; and
- protection for the early September 7 airport departure.

### Fallback transport

PCTA lists regional transportation resources, including Burney Taxi, but no scheduled service should be assumed to retrieve hikers from Ash Camp.

[PCTA transportation directory](https://www.pcta.org/discover-the-trail/backcountry-basics/pct-transportation/)

Fallback options must be prearranged:

1. Mikaela in an appropriate vehicle.
2. A local high-clearance driver/shuttle confirmed before the hike.
3. A known trail angel who explicitly accepts the Ash Camp road and date.
4. Emergency services only for an actual emergency, not routine transportation.

---

## 11. Bailout and access points

Only verified access points belong in the default app.

| PCT 2026 mi | Access | Road characterization | Role |
|---:|---|---|---|
| 1420.65 | Burney Falls Trailhead | Dirt/gravel; generally passenger accessible | Start/abort |
| 1420.66 | Burney Falls State Park | Paved | Start/abort/facilities |
| 1426.33 | Rock Creek Falls Trailhead | Dirt/gravel; generally passenger accessible | Day 1 bailout or revised start |
| 1447.53 | Bartle Gap Access Point | Dirt/gravel; high-clearance recommended | Critical Day 3 bailout |
| 1472.45–1472.50 | Ash Camp | Dirt/gravel; high-clearance recommended | Finish/pickup |

Road crossings shown in a GPX are not automatically safe pickup points. “Near Road 38N10” remains a provisional emergency access concept until road ownership, gates, condition, and vehicle approach are verified.

For every bailout, the future app needs:

- exact pin;
- road name;
- road surface;
- vehicle class;
- gate status;
- last verification time;
- source;
- driving route;
- nearest services;
- satellite pickup message template; and
- explicit “routine pickup” versus “emergency only” status.

---

## 12. Weather, smoke, fire, and closure source stack

There is no single all-knowing API. The app needs a source hierarchy.

### Weather and alerts

Use the [National Weather Service API](https://www.weather.gov/documentation/services-web-api):

- `/points/{lat},{lon}` for grid discovery;
- `/gridpoints/{office}/{x},{y}/forecast`;
- `/gridpoints/{office}/{x},{y}/forecast/hourly`; and
- `/alerts/active?point={lat},{lon}`.

Query representative route zones, not one town:

1. Burney/low southern route;
2. Peavine/Kosk;
3. Bartle Gap/high saddle;
4. Deer/Butcherknife descent; and
5. Ash Camp/McCloud River.

Forecasts are operationally useful only in the final seven days. Before then, display climate context, not a fake trip forecast.

### Climate planning range

Late August/early September can produce:

- hot exposed daytime conditions;
- cool high-elevation nights;
- very low humidity;
- rapid weather changes;
- occasional thunderstorms;
- smoke transported from distant fires; and
- fire restrictions even when no nearby fire is visible.

Packing and water planning should tolerate roughly **40s at night to 90s in the day**, with the understanding that actual conditions may exceed that range. Replace this planning range with the route-grid forecast during the final week.

### Air quality and smoke

Primary:

- [AirNow Fire and Smoke Map](https://fire.airnow.gov/)
- [AirNow API](https://docs.airnowapi.org/webservices)

AirNow combines regulatory and temporary PM2.5 monitors with quality-screened/corrected low-cost sensor information and smoke layers. Use it for health-facing AQI and smoke conditions.

Do not present an absent nearby sensor as “good air.”

### Active fire

Use multiple layers:

- [CAL FIRE incidents](https://www.fire.ca.gov/incidents)
- [NIFC](https://www.nifc.gov/fire-information/maps)
- [Northern California Geographic Area Coordination Center](https://gacc.nifc.gov/oncc/)
- [NASA FIRMS active fire detections](https://firms.modaps.eosdis.nasa.gov/usfs/active_fire/)
- Watch Duty as an operational notification tool

NASA FIRMS detections are not legal closure orders. Watch Duty is valuable but does not replace an agency order.

### Legal closures and restrictions

Legal/controlling:

- [PCTA closures](https://closures.pcta.org/)
- [Shasta-Trinity alerts and orders](https://www.fs.usda.gov/r05/shasta-trinity/alerts)
- [California State Parks current conditions](https://www.parks.ca.gov/?page_id=455)
- local fire-restriction orders

The UI must distinguish:

- closure;
- alert;
- fire restriction;
- active incident;
- smoke impact;
- satellite detection;
- stale/unknown; and
- all clear.

“No result” is not “safe.”

### Refresh cadence

| Time relative to trip | Closures/orders | Fire/AQI | Weather | Water/field reports |
|---|---:|---:|---:|---:|
| More than 14 days | Daily | Daily | Climate only | Weekly/manual |
| 14–7 days | Every 6 hr | Every 3 hr | Daily | Every 48 hr/manual |
| Final 7 days | Every 3 hr | Hourly | Every 3 hr | Daily/manual |
| On trail when connected | Every 3 hr | Hourly | Hourly cache | Manual reports/FarOut |

Every record needs:

- source;
- source URL;
- fetched time;
- effective time;
- expiration;
- route overlap;
- severity;
- confidence;
- raw payload hash;
- parser version; and
- last known good state.

---

## 13. Permits and fire rules

### PCT long-distance permit

The PCTA long-distance permit is for trips of 500 or more continuous PCT miles. This approximately 52-mile trip does not qualify and does not need that permit.

[PCTA permits](https://www.pcta.org/discover-the-trail/permits/)

### Local overnight permit

PCTA's current local-permit list does not identify a wilderness permit requirement for this specific Burney Falls-to-Ash Camp segment. That must still be confirmed with the land managers because orders and boundaries can change.

[PCTA local permit areas](https://www.pcta.org/discover-the-trail/permits/local-permits/)

### California Campfire Permit

A current California Campfire Permit is generally required for a stove, lantern, or campfire on applicable California public lands.

[California Campfire Permit information](https://www.pcta.org/discover-the-trail/permits/california-fire-permit/)

The permit does not override:

- forest restrictions;
- private-land prohibitions;
- complete ignition bans; or
- site-specific orders.

Plan to use only a shutoff-valve stove if allowed. Be prepared to go stoveless.

### Campfires

The default trip plan should be **no campfires**.

---

## 14. Navigation and communications

### Required navigation redundancy

Each hiker should have:

- the same current GPX;
- offline map tiles;
- the eight-day itinerary;
- water points;
- legal camps;
- bailout points; and
- pickup pin.

The group should also carry:

- one dedicated satellite communicator;
- one independent backup map/device;
- paper overview and critical coordinates; and
- a small compass that the team knows how to use.

### Recommended platforms

| Platform | Best role | Limitation |
|---|---|---|
| FarOut Northern California | Current hiker comments, water, camps, field intelligence | Paid/crowdsourced; no dependable public automation API |
| CalTopo | Route, offline maps, public-land and fire layers, printable backup | Layer meaning must be understood |
| Gaia GPS | Cross-platform offline navigation | Subscription/features vary |
| Garmin Explore + inReach | Satellite check-ins, SOS, device sync | Requires subscription and message discipline |
| Watch Duty | Fire notifications and operational context | Not the legal closure authority |
| AirNow | AQI and smoke | Sparse-monitor uncertainty |
| PCTA mobile/web | Official closures and trail context | Conditions can still be crowdsourced |
| OnX Backcountry/Hunt | Parcel/ownership screening | Paid; parcel data still needs legal confirmation |
| Google/Apple offline road maps | Highway approach | Forest-road condition may be stale |

### Android and web access

Drew does not need an iPhone to participate.

The trip system should support:

- authenticated responsive web/PWA access on Android;
- offline export independent of the web app;
- FarOut/CalTopo/Gaia on Android;
- satellite messages through the shared communicator; and
- printable/PDF fallback.

No mission-critical function should exist only inside Gunnar's sideloaded iOS app.

### Satellite check-in schedule

Minimum routine:

- morning departure;
- material plan change;
- arrival at camp;
- pickup-day departure;
- pickup complete.

Message template:

`DDG OK | Day 3 | Camped Moosehead | 41.xxxxx,-121.xxxxx | all 3 OK | water X L | tomorrow high saddle | next check 0700`

Emergency messages should state:

- exact coordinate;
- number of patients;
- injury/illness;
- consciousness/breathing/bleeding;
- fire or terrain threat;
- shelter/water status; and
- device battery.

---

## 15. Equipment and consumables

This section defines planning categories. Final quantities depend on body size, pack fit, forecast, medical needs, and actual gear.

### Core equipment

- fitted backpack for each person;
- shelter capacity for three with known setup roles;
- sleep systems appropriate to final route-grid forecast;
- insulation and rain/wind layer;
- sun protection;
- long sleeves/pants suitable for brush and poison oak;
- trekking poles for every hiker;
- headlamp plus backup light;
- filter capacity for three people;
- chemical treatment backup;
- bear-resistant food storage strategy;
- repair kit;
- first-aid and blister kit;
- satellite communicator;
- offline navigation on at least two independent devices;
- power banks and cables;
- California Campfire Permit if using a stove where allowed; and
- stove-free food plan if ignition restrictions apply.

### Food

Plan for:

- eight hiking days;
- one emergency/contingency day of food;
- no assumed resupply;
- a realistic first-day lunch/dinner after the drive; and
- pickup-day breakfast/snacks.

A common planning range is about 1.5–2 pounds of food per person per day, which implies roughly **13.5–18 pounds per person for nine days of food**. That is a starting estimate, not a prescription. The app should calculate calories, weight, volume, allergens, and ownership per meal.

This food load is one reason Day 3 must be taken seriously.

### Bear storage

A bear canister is not currently identified as legally required for this segment, but PCTA recommends robust food protection throughout the trail.

[PCTA bear-canister guidance](https://www.pcta.org/discover-the-trail/backcountry-basics/food/bear-canister-protecting-your-food/)

Confirm that:

- all food;
- trash;
- toiletries;
- medication with odor; and
- cooking items

fit the chosen protection strategy.

### Water hardware

Per team:

- enough filter throughput for three people;
- backflush/maintenance method;
- chemical backup;
- clean/dirty separation;
- at least one spare cap/gasket;
- individual capacity suitable for a hot 14.5-mile day; and
- clearly assigned shared-water responsibilities.

### Knee and foot preparation

The route is not difficult only because of distance.

Train for:

- Day 2's sustained ascent;
- Day 3's 14.5 loaded miles;
- Day 7's 1,828-foot descent;
- consecutive days;
- uneven/brushy tread; and
- full pack weight.

Use:

- trekking poles;
- tested footwear;
- tested socks;
- blister prevention/treatment;
- controlled pack weight;
- downhill training; and
- personal medication/medical plans reviewed before the trip.

The app should not diagnose injuries or present braces/supplements as universally appropriate.

### Poison oak and brush

Carry:

- long coverage;
- lightweight gloves if helpful;
- poison-oak wash/cleanup supplies;
- a bag for contaminated clothing; and
- the discipline not to burn poison oak.

---

## 16. Emergency and overdue plan

### Emergency channel

- Satellite SOS for immediate life safety when cell service is unavailable.
- 911 when cellular service exists.
- The satellite provider's response center coordinates with local responders.

### Shared trip plan

Mikaela and one additional home contact need:

- all three hikers' legal names and photos;
- clothing and pack colors;
- medical/allergy/medication essentials;
- vehicle and drop-off details;
- route GPX;
- daily camps;
- bailout points;
- satellite device identifier/share link;
- check-in schedule;
- primary/backup pickup;
- overdue threshold; and
- ranger contacts.

### Group rules

- No one hikes alone out of voice range in brush or at crossings.
- The group stops for a missing person immediately.
- No unscheduled shortcut or road exit without a satellite message when possible.
- No one separates to “go get help” unless the communication and care plan makes that the safest option.
- A fire/smoke/closure order overrides mileage goals.
- The route is abandoned before conditions become an emergency.

### Decision triggers

Examples that require reassessment:

- Peavine or Moosehead is dry;
- private-land access terms make the Day 3 traverse infeasible;
- Bartle Gap brush reduces pace below the pickup plan;
- AQI reaches an unhealthy level for the team;
- lightning threatens exposed high terrain;
- any member cannot keep food/water down;
- a knee/foot problem changes gait;
- fire or closure geometry overlaps the route;
- Ash Camp road access fails; or
- the satellite device fails without adequate backup.

---

## 17. Source hierarchy

### Tier 1: controlling or authoritative

| Domain | Source |
|---|---|
| Trail geometry/miles | [PCTA PCT Data](https://www.pcta.org/discover-the-trail/maps/pct-data/) |
| Legal PCT closures | [PCTA Closures](https://closures.pcta.org/) and issuing land agency |
| Forest orders/roads | [Shasta-Trinity National Forest](https://www.fs.usda.gov/r05/shasta-trinity) |
| State Park access | [California State Parks](https://www.parks.ca.gov/?page_id=455) |
| Weather/alerts | [National Weather Service](https://www.weather.gov/documentation/services-web-api) |
| AQI/smoke | [AirNow](https://fire.airnow.gov/) |
| Fire incidents | [CAL FIRE](https://www.fire.ca.gov/incidents), [NIFC](https://www.nifc.gov/fire-information/maps), incident agency |
| Elevation reference | [USGS 3DEP/EPQS](https://epqs.nationalmap.gov/v1/docs) |
| Flight | United booking/manage-trip record |

### Tier 2: operational field intelligence

| Domain | Source |
|---|---|
| Water/current camp comments | FarOut Northern California |
| Water report | [PCT Water Report](https://www.pcta.org/discover-the-trail/backcountry-basics/water/pct-water-report/) |
| Trail reports | [PCTA trail conditions](https://www.pcta.org/discover-the-trail/trail-conditions/) |
| Fire notifications | Watch Duty |
| Parcel screening | USGS PAD-US, OnX, CalTopo public-land layers |
| Road condition | Ranger station plus recent local observation |

### Tier 3: context only

- AllTrails;
- blogs;
- trail journals;
- Reddit/forums;
- historical guidebooks; and
- old Halfmile notes.

These sources are valuable for understanding what the section feels like:

- heat;
- brush;
- blowdowns;
- poison oak;
- daily rhythms;
- water collection difficulty; and
- terrain reputation.

They do not override a current order, centerline, or direct field report.

### Relevant hiker context

Historical accounts consistently describe Section O as:

- hotter than the profile alone suggests;
- brushy/overgrown in places;
- dusty;
- poison-oak prone;
- capable of slow travel despite moderate grades; and
- commonly hiked in much larger days by conditioned thru-hikers.

Thru-hiker 20-mile days are not the right comparison for Dan, Drew, and Gunnar. The useful lesson is where the natural water/camp breaks and slow terrain occur, not copying thru-hiker mileage.

Examples:

- [Puddles trail journal](https://www.trailjournals.com/journal/entries/27703)
- [Section O historical trip report](https://jansjaunts.wordpress.com/2015/05/08/pct-ca-section-o/)
- [Section O hiker account](https://jenkeithpct.com/2013/08/)

---

## 18. Supabase source-of-truth design

Supabase should hold facts, source receipts, status, and history. UI constants must not be the primary database.

### Live project audit on July 28

The connected active project is **Pacific Crest Adventure**
(`wpeyvbhhfqcyhuszumtx`), and Supabase reports it as healthy.

Current live reality:

- Seven public tables exist, all with RLS enabled.
- `trail_condition_snapshots` contains three dated snapshots.
- The `trail-conditions` Edge Function is active at version 4.
- The `aqi-proxy` Edge Function is active at version 3.
- A daily cron job named `refresh-ddg-trail-conditions-daily` is active at
  `15 12 * * *` UTC.
- Its July 26–28 cron submissions report success; the most recent retained
  HTTP response is `200`.
- The latest stored snapshot was fetched July 28 at 13:30 UTC and includes
  `route`, `water`, `wildfire`, `airQuality`, `closures`, `agencyAlerts`,
  `bridgeCrossing`, and `campsiteAvailability`.
- PCTA closure, bridge-open, and dispersed-campsite questions are correctly
  marked `manual_required` in the snapshot.

What the live project does **not** yet contain:

- a versioned route table;
- normalized PCTA waypoints;
- a versioned itinerary;
- daily elevation records;
- normalized water observations;
- source receipts with hashes and parser versions;
- transport/pickup records; or
- a durable verification-gate workflow.

The daily-refresh plumbing is therefore real and useful, but the snapshot blob
is not yet the trip's source of truth. It also needs semantic health checks:
cron success means the HTTP request was submitted, and a source status of
`live` means a fetch worked. Neither proves that the source is authoritative,
that its parser was correct, or that a hazard is absent.

The current access tables also show zero `allowed_emails` rows and one
`ddg_team_profiles` row. That is consistent with the recent “Access Pending”
behavior and must be reconciled separately from trail-data work; auth success
is not team authorization.

### Core tables

#### `route_versions`

- `id`
- `name`
- `source`
- `source_release`
- `source_url`
- `geometry`
- `start_point`
- `end_point`
- `distance_miles`
- `created_at`
- `active`
- `checksum`

#### `waypoints`

- `id`
- `route_version_id`
- `type`
- `name`
- `coordinate`
- `route_mile`
- `pct_mile`
- `pct_mile_source`
- `elevation_feet`
- `elevation_source`
- `land_manager`
- `camping_status`
- `vehicle_access_status`
- `source_receipt_id`

#### `itinerary_versions`

- `id`
- `name`
- `route_version_id`
- `start_date`
- `finish_date`
- `buffer_date`
- `status`
- `assumptions`
- `created_by`
- `created_at`

#### `itinerary_days`

- `itinerary_version_id`
- `day_number`
- `date`
- `start_waypoint_id`
- `end_waypoint_id`
- `distance_miles`
- `gain_feet`
- `loss_feet`
- `difficulty_rank`
- `expected_hours_min`
- `expected_hours_max`
- `water_plan`
- `land_access_notes`
- `exit_plan`

#### `source_receipts`

- `id`
- `source_name`
- `source_url`
- `fetched_at`
- `effective_at`
- `expires_at`
- `http_status`
- `payload_hash`
- `raw_payload`
- `parser_version`
- `confidence`
- `notes`

#### `hazards`

- `id`
- `kind`
- `title`
- `severity`
- `geometry`
- `route_mile_start`
- `route_mile_end`
- `status`
- `issued_at`
- `updated_at`
- `expires_at`
- `source_receipt_id`

#### `water_locations`

- `id`
- `waypoint_id`
- `static_reliability`
- `collection_notes`
- `private_land_constraints`

#### `water_reports`

- `water_location_id`
- `observed_at`
- `flow_status`
- `collection_rate`
- `reporter`
- `source`
- `source_url`
- `confidence`
- `fetched_at`

#### `transport_events`

- `id`
- `kind`
- `carrier`
- `flight_number`
- `origin`
- `destination`
- `scheduled_departure_utc`
- `scheduled_arrival_utc`
- `booking_verified`
- `source_receipt_id`

#### `pickup_plans`

- `id`
- `date`
- `window_start`
- `window_end`
- `location`
- `driver`
- `vehicle`
- `road_status`
- `last_road_check_at`
- `backup_date`
- `overdue_protocol`

#### `team_checkins`

- `id`
- `member_id`
- `sent_at`
- `coordinate`
- `status`
- `message`
- `source`

### Truth-state enum

Every operational item should be one of:

- `confirmed_current`
- `confirmed_future`
- `provisional`
- `stale`
- `unknown`
- `closed`
- `not_applicable`

Never infer `confirmed_current` from an empty API response.

### Manual overrides

Manual overrides need:

- author;
- reason;
- evidence;
- creation time;
- expiration;
- superseded record; and
- audit trail.

“Gunnar said so” can be a valid planning decision, but it must not masquerade as an agency fact.

---

## 19. Product architecture after the data is fixed

The current nuanced content should be preserved, but reorganized by trip decisions rather than by data source.

### Recommended primary navigation

1. **Today**
   - current day;
   - next water;
   - next camp;
   - weather;
   - active hazards;
   - check-in;
   - go/no-go.

2. **Route**
   - map;
   - elevation;
   - camps;
   - water;
   - land ownership;
   - exits;
   - selectable source layers.

3. **Plan**
   - flights;
   - start logistics;
   - eight-day itinerary;
   - September 6 buffer;
   - pickup;
   - roles.

4. **Conditions**
   - closures;
   - fire;
   - smoke/AQI;
   - weather;
   - water reports;
   - road status;
   - freshness/source receipts.

5. **Gear & Food**
   - ownership;
   - packed/weighed;
   - consumables;
   - water capacity;
   - battery budget;
   - medical/personal items.

6. **Team**
   - Dan/Drew/Gunnar;
   - check-ins;
   - shared notes;
   - emergency plan;
   - Mikaela pickup view;
   - access and permissions.

7. **Sources & Audit**
   - every source;
   - when checked;
   - conflicts;
   - manual decisions;
   - stale data;
   - change history.

### Mikaela mode

Mikaela should not need the entire backpacking interface.

Her view should prioritize:

- current trip status;
- last check-in;
- planned camp;
- primary/backup pickup date;
- Ash Camp pin;
- road condition;
- driver departure time;
- overdue protocol;
- emergency contacts; and
- whether a route/plan change was acknowledged.

### Offline requirements

The web and iOS products must cache:

- route geometry;
- itinerary;
- camp/water/exit points;
- source timestamps;
- latest condition snapshot;
- emergency plan;
- pickup plan; and
- team contacts.

An offline app must show the age of its last data. It must never look “live” when it is displaying a three-day-old snapshot.

---

## 20. Verification calendar

### Immediately

- Obtain Dan's United booking.
- Reserve Burney Falls vehicle entry for August 29 if using the park entrance.
- Call McCloud Ranger Station about Kosk/private land, camps, and 38N11.
- Confirm every person's exact legal name/email/access account.
- Confirm the exact State Park access/drop-off procedure for the canonical Burney Falls PCT start.

### By August 7

- Lock the eight-day itinerary.
- Lock shelter, sleep, food-storage, stove/stoveless, water capacity, and satellite device.
- Export PCTA 2026 route to Garmin/CalTopo/Gaia/FarOut-compatible workflows.
- Verify the regenerated web and iOS datasets remain synchronized in CI.

### By August 15

- Complete a full-pack consecutive-day training test.
- Confirm Day 3 capability.
- Weigh every pack.
- Test filters, satellite messages, power, and offline maps.
- Confirm Mikaela's vehicle and pickup approach.

### August 22–23

- Recheck private timber restrictions.
- Recheck Bartle Gap maintenance/brush.
- Recheck State Park access.
- Recheck Lake Britton Dam crossing.
- Recheck 38N11.
- Recheck Ash Camp.
- Review current fires and smoke pattern.

### August 27

- Pull current NWS forecasts for five route zones.
- Pull PCTA/USFS/State Parks closures.
- Pull CAL FIRE/NIFC/FIRMS/AirNow.
- Review latest FarOut comments for every overnight source and camp.
- Build final water carry table.
- Decide stove versus stoveless.
- Send final trip plan to Mikaela/home contact.

### August 28

- United flight status.
- Final route go/no-go.
- Final fire/smoke/closure check.
- Final water verification.
- Charge every device.
- Download fresh offline maps and source snapshot.
- Weigh packs after food/water.
- Confirm August 29 departure time.

### Each trail morning

- health/feet/knees;
- water;
- weather/lightning;
- smoke/AQI if available;
- closure/fire update if available;
- destination legality;
- bailout;
- satellite battery; and
- morning check-in.

---

## 21. Unresolved gates

These must remain visually prominent in the product.

| Gate | Owner | Deadline | Current state |
|---|---|---|---|
| Verify UA481 and UA1317 booking/local times | Dan/Gunnar | Immediate | Open |
| Confirm State Park drop-off/access procedure at the canonical start | Team/Mikaela | Aug 7 | Open |
| Reserve State Park vehicle entry if needed | Gunnar | Immediate | Open |
| Verify Kosk/private-land camping legality | Gunnar/Ranger/PCTA | Aug 7 | Open/high priority |
| Verify Moosehead and remaining camp legality | Gunnar/Ranger | Aug 7 | Open |
| Verify Lake Britton Dam crossing | Gunnar/PG&E/PCTA | Aug 22 | Open |
| Verify Bartle Gap condition after summer work | Gunnar/PCTA/FarOut | Aug 27 | Open |
| Verify every overnight water source | Team | Aug 27–28 | Open |
| Verify 38N11 and Ash Camp road | Mikaela/Gunnar/Ranger | Sep 3–4 | Open |
| Confirm high-clearance pickup vehicle | Mikaela | Aug 15 | Open |
| Confirm satellite communicator/subscription | Team | Aug 15 | Open |
| Confirm September 5 primary/September 6 backup pickup | Team/Mikaela | Aug 15 | Proposed |
| Update web/iOS route and itinerary data | Engineering | Complete | Implemented and validated; future source changes must rerun both integrity checks |

---

## 22. Final controlling statement

As of July 28, 2026, the best-supported trip definition is:

> Dan, Drew, and Gunnar will hike northbound from the actual Burney Falls PCT access near PCTA 2026 mile 1420.65 to Ash Camp near mile 1472.50. The route is approximately 51.84 official PCT miles. The preferred itinerary is August 29 through September 5, with September 6 reserved for contingency and recovery before the September 7 flight. The current Kosk Spring overnight is not valid unless land-access permission is confirmed; the default plan therefore includes a hard 14.53-mile Peavine-to-Moosehead day. Ash Camp is the defined pickup point, not an arbitrary 52-mile mark.

The website and iOS app are built outward from that statement. Every volatile
condition must continue to carry its source, observation age, retrieval status,
confidence, and legal/operational meaning.
