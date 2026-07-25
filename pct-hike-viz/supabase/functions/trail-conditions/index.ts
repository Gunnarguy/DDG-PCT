import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ROUTE = {
  minPctMile: 1420,
  maxPctMile: 1473,
  bbox: { west: -122.15, south: 40.95, east: -121.55, north: 41.25 },
};

const WATER_URL =
  "https://docs.google.com/spreadsheets/d/1Tk7yDPd9JWAm7sbbad9idZxcDJlv7ilMz6qZa6pal8w/export?format=csv";
const PCTA_CLOSURES_URL = "https://closures.pcta.org/";
const SOURCES = {
  pctWater: "https://pctwater.com/",
  pctaClosures: PCTA_CLOSURES_URL,
  shastaTrinity: "https://www.fs.usda.gov/r05/shasta-trinity/alerts",
  lassen: "https://www.fs.usda.gov/r05/lassen/alerts",
  burneyPark: "https://www.parks.ca.gov/?page_id=455",
  burneyClosures: "https://www.parks.ca.gov/post/103",
};

const MONITORING_POINTS = [
  { name: "Burney Falls", latitude: 41.0135, longitude: -121.6207 },
  { name: "Section O high country", latitude: 41.1723, longitude: -121.9085 },
  { name: "McCloud River", latitude: 41.1119, longitude: -122.0478 },
  { name: "Ash Camp finish", latitude: 41.1171, longitude: -122.0606 },
];

type SourceStatus = {
  status: "live" | "manual_required" | "error";
  checkedAt: string;
  url: string;
  detail?: string;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const decodeJwt = (authorization: string | null) => {
  try {
    const token = authorization?.replace(/^Bearer\s+/i, "");
    const encoded = token?.split(".")[1]?.replace(/-/g, "+").replace(/_/g, "/");
    const padded = encoded?.padEnd(Math.ceil(encoded.length / 4) * 4, "=");
    return padded ? JSON.parse(atob(padded)) : null;
  } catch {
    return null;
  }
};

const parseCsv = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
};

const waterCondition = (report: string) => {
  const latest = report.split(/\r?\n/).find(Boolean)?.toLowerCase() ?? "";
  if (/\b(dry|no water|not flowing)\b/.test(latest)) return "dry";
  if (/\b(trickle|shallow|slow|seasonal)\b/.test(latest)) return "limited";
  if (/\b(flowing|good flow|great flow|running|working|excellent|tap on)\b/.test(latest)) {
    return "flowing";
  }
  return "unknown";
};

const fetchWater = async () => {
  const response = await fetch(WATER_URL, {
    headers: { "User-Agent": "DDG-PCT-Mission-Control/1.0" },
  });
  if (!response.ok) throw new Error(`PCT Water Report returned ${response.status}`);
  const rows = parseCsv(await response.text());
  const headerIndex = rows.findIndex((row) => row[0]?.trim() === "Map" && row[1]?.trim() === "Mile");
  if (headerIndex < 0) throw new Error("PCT Water Report columns were not found");

  const updatedText = rows
    .slice(0, headerIndex)
    .flat()
    .find((value) => /Updated\s+\d/i.test(value)) ?? null;
  const sources = rows.slice(headerIndex + 1).flatMap((row) => {
    const mile = Number(row[1]);
    if (!Number.isFinite(mile) || mile < ROUTE.minPctMile || mile > ROUTE.maxPctMile) {
      return [];
    }
    const report = row[4]?.trim() ?? "";
    return [{
      mile,
      waypoint: row[2]?.replace(/\s+/g, " ").trim() || null,
      name: row[3]?.trim() || "Unnamed water source",
      latestReport: report.split(/\r?\n/).find(Boolean)?.trim() || "No current report",
      report,
      reportDate: row[5]?.trim() || null,
      reportedBy: row[6]?.trim() || null,
      condition: waterCondition(report),
    }];
  });

  return {
    updatedText,
    count: sources.length,
    sources,
    sourceUrl: SOURCES.pctWater,
  };
};

const stripHtml = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();

const relevantSnippets = (html: string, keywords: RegExp, max = 8) => {
  const text = stripHtml(html);
  const chunks = text.split(/(?<=[.!?])\s+|\s{2,}/);
  const seen = new Set<string>();
  return chunks
    .filter((chunk) => keywords.test(chunk))
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length >= 20 && chunk.length <= 500)
    .filter((chunk) => {
      const key = chunk.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, max);
};

const fetchAgencyPage = async (name: string, url: string, keywords: RegExp) => {
  const response = await fetch(url, {
    headers: { "User-Agent": "DDG-PCT-Mission-Control/1.0" },
  });
  if (!response.ok) throw new Error(`${name} returned ${response.status}`);
  const html = await response.text();
  return { name, url, snippets: relevantSnippets(html, keywords) };
};

const fetchWildfires = async () => {
  const geometry = JSON.stringify({
    xmin: ROUTE.bbox.west,
    ymin: ROUTE.bbox.south,
    xmax: ROUTE.bbox.east,
    ymax: ROUTE.bbox.north,
    spatialReference: { wkid: 4326 },
  });
  const requestLayer = async (baseUrl: string, outFields: string) => {
    const query = new URL(baseUrl);
    query.search = new URLSearchParams({
      where: "1=1",
      geometry,
      geometryType: "esriGeometryEnvelope",
      spatialRel: "esriSpatialRelIntersects",
      inSR: "4326",
      outFields,
      returnGeometry: "false",
      f: "json",
    }).toString();
    const response = await fetch(query, {
      headers: { "User-Agent": "DDG-PCT-Mission-Control/1.0" },
    });
    if (!response.ok) throw new Error(`fire service returned ${response.status}`);
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data;
  };

  let data;
  let source = "NIFC WFIGS current perimeters";
  let sourceUrl = "https://data-nifc.opendata.arcgis.com/";
  let fields = {
    name: "attr_IncidentName",
    acres: "poly_GISAcres",
    containment: "attr_PercentContained",
    discovered: "attr_FireDiscoveryDateTime",
    state: "attr_POOState",
  };
  try {
    data = await requestLayer(
      "https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/WFIGS_Interagency_Perimeters_Current/FeatureServer/0/query",
      Object.values(fields).join(","),
    );
  } catch (nifcError) {
    source = "Esri USA Wildfires current-incidents mirror";
    sourceUrl =
      "https://services9.arcgis.com/RHVPKKiFTONKtxq3/ArcGIS/rest/services/USA_Wildfires_v1/FeatureServer/0";
    fields = {
      name: "IncidentName",
      acres: "DailyAcres",
      containment: "PercentContained",
      discovered: "FireDiscoveryDateTime",
      state: "POOState",
    };
    data = await requestLayer(`${sourceUrl}/query`, Object.values(fields).join(","));
    console.warn("NIFC perimeter request failed; used current-incidents mirror", nifcError);
  }

  return {
    count: data.features?.length ?? 0,
    source,
    sourceUrl,
    fires: (data.features ?? []).map((feature: { attributes?: Record<string, unknown> }) => ({
      name: feature.attributes?.[fields.name] ?? "Unnamed incident",
      acres: Math.round(Number(feature.attributes?.[fields.acres] ?? 0)),
      containment: Number(feature.attributes?.[fields.containment] ?? 0),
      discovered: feature.attributes?.[fields.discovered] ?? null,
      state: feature.attributes?.[fields.state] ?? null,
      distanceToTrail: null,
      inMonitoringArea: true,
    })),
  };
};

const aqiCategory = (aqi: number | null) => {
  if (aqi === null) return "Unknown";
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for Sensitive Groups";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
};

const fetchAirQuality = async () => {
  const readings = await Promise.all(MONITORING_POINTS.map(async (point) => {
    const url = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
    url.search = new URLSearchParams({
      latitude: String(point.latitude),
      longitude: String(point.longitude),
      current: "us_aqi,pm2_5,ozone",
      timezone: "America/Los_Angeles",
    }).toString();
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Open-Meteo returned ${response.status}`);
    const data = await response.json();
    const aqi = Number.isFinite(data.current?.us_aqi)
      ? Math.round(data.current.us_aqi)
      : null;
    return {
      location: point.name,
      aqi,
      category: aqiCategory(aqi),
      pm25: data.current?.pm2_5 ?? null,
      pm25Unit: "µg/m³",
      ozone: data.current?.ozone ?? null,
      ozoneUnit: "µg/m³",
      timestamp: data.current?.time ?? new Date().toISOString(),
      source: "Open-Meteo CAMS model",
    };
  }));
  return { readings, note: "Modeled current conditions from Open-Meteo CAMS" };
};

const resultValue = <T>(result: PromiseSettledResult<T>, fallback: T): T =>
  result.status === "fulfilled" ? result.value : fallback;

const sourceState = (
  result: PromiseSettledResult<unknown>,
  url: string,
  checkedAt: string,
): SourceStatus => result.status === "fulfilled"
  ? { status: "live", checkedAt, url }
  : {
      status: "error",
      checkedAt,
      url,
      detail: result.reason instanceof Error ? result.reason.message : String(result.reason),
    };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authorization = req.headers.get("authorization");
  const claims = decodeJwt(authorization);
  let requestBody: { scheduled?: boolean; force?: boolean } = {};
  try {
    requestBody = await req.json();
  } catch {
    // Empty bodies are accepted for interactive refreshes.
  }

  const isScheduledAnon = claims?.role === "anon" && requestBody.scheduled === true;
  if (claims?.role !== "authenticated" && !isScheduledAnon) {
    return json({ error: "A signed-in team session is required" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !authorization) {
    return json({ error: "Trail condition service is unavailable" }, 503);
  }

  if (!isScheduledAnon) {
    const profileResponse = await fetch(
      `${supabaseUrl}/rest/v1/ddg_team_profiles?select=id&limit=1`,
      { headers: { apikey: anonKey, authorization } },
    );
    const profiles = profileResponse.ok ? await profileResponse.json() : [];
    if (!Array.isArray(profiles) || profiles.length === 0) {
      return json({ error: "An active DDG team profile is required" }, 403);
    }
  }

  const dbHeaders = {
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
  };
  if (isScheduledAnon) {
    const latestResponse = await fetch(
      `${supabaseUrl}/rest/v1/trail_condition_snapshots?select=payload,fetched_at,source_status&order=fetched_at.desc&limit=1`,
      { headers: dbHeaders },
    );
    if (latestResponse.ok) {
      const [latest] = await latestResponse.json();
      const ageMs = latest ? Date.now() - new Date(latest.fetched_at).getTime() : Infinity;
      if (latest && ageMs < 20 * 60 * 60 * 1000) {
        return json({ ...latest.payload, sourceStatus: latest.source_status, cached: true });
      }
    }
  }

  const checkedAt = new Date().toISOString();
  const forestKeywords = /PCT|Pacific Crest|fire restriction|camping restriction|Burney|Britton|Ash Camp|McCloud/i;
  const parkKeywords = /Burney Creek Trail|PSEA Trail|closure|closed|restriction|reservation|hours|Britton|bridge|dam/i;
  const [
    waterResult,
    fireResult,
    airResult,
    shastaResult,
    lassenResult,
    burneyResult,
    burneyClosureResult,
    pctaResult,
  ] = await Promise.allSettled([
    fetchWater(),
    fetchWildfires(),
    fetchAirQuality(),
    fetchAgencyPage("Shasta-Trinity National Forest", SOURCES.shastaTrinity, forestKeywords),
    fetchAgencyPage("Lassen National Forest", SOURCES.lassen, forestKeywords),
    fetchAgencyPage("McArthur-Burney Falls State Park", SOURCES.burneyPark, parkKeywords),
    fetchAgencyPage("California State Parks closures", SOURCES.burneyClosures, parkKeywords),
    fetch(PCTA_CLOSURES_URL, {
      headers: { "User-Agent": "DDG-PCT-Mission-Control/1.0" },
    }).then(async (response) => {
      if (!response.ok) throw new Error(`PCTA closures returned ${response.status}`);
      return {
        name: "PCTA closures",
        url: PCTA_CLOSURES_URL,
        snippets: relevantSnippets(
          await response.text(),
          /PCT|Pacific Crest|Burney|Britton|Ash Camp|McCloud|Section O/i,
        ),
      };
    }),
  ]);

  const water = resultValue(waterResult, {
    updatedText: null,
    count: 0,
    sources: [],
    sourceUrl: SOURCES.pctWater,
  });
  const bridgeReports = water.sources.filter((source: { name: string; report: string }) =>
    /Britton|Lake Britton|Pit River|dam/i.test(`${source.name} ${source.report}`));
  const agencyAlerts = [
    ...resultValue(shastaResult, { snippets: [] }).snippets.map((text: string) => ({
      agency: "Shasta-Trinity National Forest", text, url: SOURCES.shastaTrinity,
    })),
    ...resultValue(lassenResult, { snippets: [] }).snippets.map((text: string) => ({
      agency: "Lassen National Forest", text, url: SOURCES.lassen,
    })),
    ...resultValue(burneyResult, { snippets: [] }).snippets.map((text: string) => ({
      agency: "McArthur-Burney Falls State Park", text, url: SOURCES.burneyPark,
    })),
    ...resultValue(burneyClosureResult, { snippets: [] }).snippets.map((text: string) => ({
      agency: "California State Parks", text, url: SOURCES.burneyClosures,
    })),
  ].slice(0, 18);

  const sourceStatus: Record<string, SourceStatus> = {
    pctWater: sourceState(waterResult, SOURCES.pctWater, checkedAt),
    nifcFirePerimeters: sourceState(fireResult, "https://data-nifc.opendata.arcgis.com/", checkedAt),
    smokeAqi: sourceState(airResult, "https://open-meteo.com/en/docs/air-quality-api", checkedAt),
    shastaTrinityAlerts: sourceState(shastaResult, SOURCES.shastaTrinity, checkedAt),
    lassenAlerts: sourceState(lassenResult, SOURCES.lassen, checkedAt),
    burneyPark: sourceState(burneyResult, SOURCES.burneyPark, checkedAt),
    burneyClosures: sourceState(burneyClosureResult, SOURCES.burneyClosures, checkedAt),
    pctaClosures: pctaResult.status === "fulfilled"
      ? { status: "live", checkedAt, url: SOURCES.pctaClosures }
      : {
          status: "manual_required",
          checkedAt,
          url: SOURCES.pctaClosures,
          detail: "The official PCTA closure map blocks reliable automated reading. Open it before every go/no-go decision.",
        },
    campsiteAvailability: {
      status: "manual_required",
      checkedAt,
      url: SOURCES.pctaClosures,
      detail: "Dispersed PCT camps have no authoritative availability feed. Verify legal use, capacity, water, and local orders.",
    },
    lakeBrittonBridge: {
      status: "manual_required",
      checkedAt,
      url: SOURCES.pctaClosures,
      detail: bridgeReports.length
        ? "Water-report notices were found, but only the land manager/PCTA can confirm the crossing is open."
        : "No machine-readable official bridge status was available. Confirm with PCTA and the park.",
    },
  };
  if (fireResult.status === "fulfilled") {
    sourceStatus.nifcFirePerimeters.url = fireResult.value.sourceUrl;
    sourceStatus.nifcFirePerimeters.detail = fireResult.value.source;
  }

  const payload = {
    fetchedAt: checkedAt,
    route: "Burney Falls to Ash Camp",
    water,
    wildfire: resultValue(fireResult, { count: 0, fires: [], unavailable: true }),
    airQuality: resultValue(airResult, { readings: [], note: "AQI unavailable" }),
    agencyAlerts,
    closures: {
      pcta: resultValue(pctaResult, { name: "PCTA closures", url: PCTA_CLOSURES_URL, snippets: [] }),
    },
    bridgeCrossing: {
      name: "Lake Britton / Pit River crossing",
      reports: bridgeReports,
      verification: sourceStatus.lakeBrittonBridge,
    },
    campsiteAvailability: {
      status: "manual_required",
      detail: sourceStatus.campsiteAvailability.detail,
    },
  };

  const snapshotDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const saveResponse = await fetch(
    `${supabaseUrl}/rest/v1/trail_condition_snapshots?on_conflict=snapshot_date`,
    {
      method: "POST",
      headers: {
        ...dbHeaders,
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        snapshot_date: snapshotDate,
        fetched_at: checkedAt,
        payload,
        source_status: sourceStatus,
      }),
    },
  );
  if (!saveResponse.ok) {
    console.error("Snapshot persistence failed", await saveResponse.text());
  }

  return json({ ...payload, sourceStatus, persisted: saveResponse.ok });
});
