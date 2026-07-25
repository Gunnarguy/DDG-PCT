import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const aqiCategory = (aqi: number | null) => {
  if (aqi === null) return "Unknown";
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for Sensitive Groups";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const authorization = req.headers.get("authorization");
  try {
    const token = authorization?.replace(/^Bearer\s+/i, "");
    const encodedPayload = token
      ?.split(".")[1]
      ?.replace(/-/g, "+")
      .replace(/_/g, "/");
    const paddedPayload = encodedPayload?.padEnd(
      Math.ceil(encodedPayload.length / 4) * 4,
      "=",
    );
    const payload = paddedPayload ? JSON.parse(atob(paddedPayload)) : null;
    if (payload?.role !== "authenticated" || !payload?.sub) {
      return json({ error: "A signed-in team session is required" }, 401);
    }
  } catch {
    return json({ error: "Invalid authorization token" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey || !authorization) {
    return json({ error: "Team authorization is unavailable" }, 503);
  }

  try {
    const profileResponse = await fetch(
      `${supabaseUrl}/rest/v1/ddg_team_profiles?select=id&limit=1`,
      {
        headers: {
          apikey: supabaseAnonKey,
          authorization,
        },
      },
    );
    if (!profileResponse.ok) {
      return json({ error: "Team authorization failed" }, 403);
    }
    const profiles = await profileResponse.json();
    if (!Array.isArray(profiles) || profiles.length === 0) {
      return json({ error: "An active DDG team profile is required" }, 403);
    }
  } catch {
    return json({ error: "Team authorization could not be verified" }, 503);
  }

  let body: { latitude?: number; longitude?: number; distance?: number };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Request body must be valid JSON" }, 400);
  }

  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  const distance = Math.min(50, Math.max(1, Number(body.distance ?? 25)));
  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    return json({ error: "Valid latitude and longitude are required" }, 400);
  }

  try {
    const airNowKey = Deno.env.get("AIRNOW_API_KEY");
    if (airNowKey) {
      const url = new URL("https://www.airnowapi.org/aq/observation/latLong/current/");
      url.search = new URLSearchParams({
        format: "application/json",
        latitude: String(latitude),
        longitude: String(longitude),
        distance: String(distance),
        API_KEY: airNowKey,
      }).toString();

      const response = await fetch(url, {
        headers: { "User-Agent": "DDG-PCT-Mission-Control/1.0" },
      });
      if (!response.ok) {
        throw new Error(`AirNow returned ${response.status}`);
      }
      return json({
        data: await response.json(),
        source: "EPA AirNow",
        observedAt: new Date().toISOString(),
      });
    }

    // Functional no-secret fallback. This is modelled/forecast air-quality data
    // from CAMS via Open-Meteo and is labelled distinctly from EPA observations.
    const url = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
    url.search = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current: "us_aqi,pm2_5,ozone",
      timezone: "America/Los_Angeles",
    }).toString();
    const response = await fetch(url, {
      headers: { "User-Agent": "DDG-PCT-Mission-Control/1.0" },
    });
    if (!response.ok) {
      throw new Error(`Open-Meteo returned ${response.status}`);
    }

    const payload = await response.json();
    const aqi = Number.isFinite(payload.current?.us_aqi)
      ? Math.round(payload.current.us_aqi)
      : null;
    const observedAt = payload.current?.time ?? new Date().toISOString();
    return json({
      data: [
        {
          ParameterName: "US_AQI",
          AQI: aqi,
          Category: { Name: aqiCategory(aqi) },
          DateObserved: observedAt,
          HourObserved: null,
          LocalTimeZone: "PDT",
        },
        {
          ParameterName: "PM2.5",
          Value: Number.isFinite(payload.current?.pm2_5)
            ? payload.current.pm2_5
            : null,
          Unit: "µg/m³",
        },
        {
          ParameterName: "O3",
          Value: Number.isFinite(payload.current?.ozone)
            ? payload.current.ozone
            : null,
          Unit: "µg/m³",
        },
      ],
      source: "Open-Meteo CAMS model",
      observedAt,
    });
  } catch (error) {
    console.error("AQI proxy failure", error);
    return json(
      { error: error instanceof Error ? error.message : "AQI request failed" },
      502,
    );
  }
});
