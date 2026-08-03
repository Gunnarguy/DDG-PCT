import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import operations from "./trip_operations.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ContractFlight = {
  flightNumber: string;
  origin: string;
  destination: string;
  scheduledDepartureAt: string;
  scheduledArrivalAt: string;
};

type TrackingFlight = {
  flightNumber: string;
  trackingIdent: string;
  travelDate: string;
  trackerUrl: string;
};

const contract = operations as {
  workingFlights: {
    flightTracking: {
      officialStatusUrl: string;
      provider: string;
      dataBoundary: string;
      flights: TrackingFlight[];
    };
    inbound: ContractFlight;
    outbound: ContractFlight;
  };
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

const publishableKey = () => {
  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
    if (typeof keys.default === "string" && keys.default) return keys.default;
  } catch {
    // Older projects may still expose the legacy anon key below.
  }
  return Deno.env.get("SUPABASE_ANON_KEY") ?? "";
};

const requireTeamProfile = async (authorization: string | null) => {
  const claims = decodeJwt(authorization);
  if (claims?.role !== "authenticated" || !authorization) return false;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const apiKey = publishableKey();
  if (!supabaseUrl || !apiKey) return false;

  const profileResponse = await fetch(
    `${supabaseUrl}/rest/v1/ddg_team_profiles?select=id&limit=1`,
    { headers: { apikey: apiKey, authorization } },
  );
  if (!profileResponse.ok) return false;
  const profiles = await profileResponse.json();
  return Array.isArray(profiles) && profiles.length > 0;
};

const trackedFlights = () =>
  [contract.workingFlights.inbound, contract.workingFlights.outbound].map((flight) => ({
    ...flight,
    ...(contract.workingFlights.flightTracking.flights.find(
      (candidate) => candidate.flightNumber === flight.flightNumber,
    ) ?? {
      trackingIdent: flight.flightNumber.replace(/^UA/, "UAL"),
      travelDate: flight.scheduledDepartureAt.slice(0, 10),
      trackerUrl: "",
    }),
  }));

const refreshAfterSeconds = (now = Date.now()) => {
  const nextBoundary = trackedFlights()
    .flatMap((flight) => [flight.scheduledDepartureAt, flight.scheduledArrivalAt])
    .map((value) => new Date(value).getTime())
    .filter((value) => value >= now - 6 * 60 * 60 * 1000)
    .sort((first, second) => first - second)[0];

  if (!nextBoundary) return 21_600;
  const milliseconds = nextBoundary - now;
  if (milliseconds <= 24 * 60 * 60 * 1000) return 300;
  if (milliseconds <= 48 * 60 * 60 * 1000) return 900;
  return 21_600;
};

const shouldQueryProvider = (flight: ContractFlight, now = Date.now()) => {
  const start = new Date(flight.scheduledDepartureAt).getTime() - 48 * 60 * 60 * 1000;
  const end = new Date(flight.scheduledArrivalAt).getTime() + 12 * 60 * 60 * 1000;
  return now >= start && now <= end;
};

const nearestRecord = (records: Record<string, unknown>[], flight: ContractFlight) => {
  const expected = new Date(flight.scheduledDepartureAt).getTime();
  return [...records]
    .filter((record) => typeof record.scheduled_out === "string")
    .sort(
      (left, right) =>
        Math.abs(new Date(String(left.scheduled_out)).getTime() - expected) -
        Math.abs(new Date(String(right.scheduled_out)).getTime() - expected),
    )[0] ?? null;
};

const formatRecord = (
  flight: ContractFlight & TrackingFlight,
  record: Record<string, unknown> | null,
) => ({
  flightNumber: flight.flightNumber,
  origin: flight.origin,
  destination: flight.destination,
  trackingIdent: flight.trackingIdent,
  travelDate: flight.travelDate,
  trackerUrl: flight.trackerUrl,
  scheduledDepartureAt: flight.scheduledDepartureAt,
  scheduledArrivalAt: flight.scheduledArrivalAt,
  live: Boolean(record),
  status: typeof record?.status === "string" ? record.status : "scheduled",
  providerFlightId: typeof record?.fa_flight_id === "string" ? record.fa_flight_id : null,
  actualDepartureAt: typeof record?.actual_out === "string" ? record.actual_out : null,
  estimatedDepartureAt: typeof record?.estimated_out === "string" ? record.estimated_out : null,
  actualArrivalAt: typeof record?.actual_in === "string" ? record.actual_in : null,
  estimatedArrivalAt: typeof record?.estimated_in === "string" ? record.estimated_in : null,
  originGate: typeof record?.gate_origin === "string" ? record.gate_origin : null,
  destinationGate: typeof record?.gate_destination === "string" ? record.gate_destination : null,
  aircraftType: typeof record?.aircraft_type === "string" ? record.aircraft_type : null,
});

const manualPayload = (detail: string, state: string, status = 200) =>
  json(
    {
      checkedAt: new Date().toISOString(),
      provider: {
        id: "flightaware-aeroapi",
        state,
        detail,
        officialStatusUrl: contract.workingFlights.flightTracking.officialStatusUrl,
        dataBoundary: contract.workingFlights.flightTracking.dataBoundary,
      },
      refreshAfterSeconds: refreshAfterSeconds(),
      flights: trackedFlights().map((flight) => formatRecord(flight, null)),
    },
    status,
  );

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authorization = req.headers.get("authorization");
  if (!(await requireTeamProfile(authorization))) {
    return json({ error: "An active DDG team profile is required" }, 403);
  }

  const flights = trackedFlights();
  const activeFlights = flights.filter((flight) => shouldQueryProvider(flight));
  if (!activeFlights.length) {
    return manualPayload(
      "The confirmed schedule is stored, but aircraft data is intentionally not queried until 48 hours before a flight. Use United for any schedule change before then.",
      "outside-live-window",
    );
  }

  const apiKey = Deno.env.get("FLIGHTAWARE_AEROAPI_KEY")?.trim();
  if (!apiKey) {
    return manualPayload(
      "No server-side FlightAware AeroAPI key is configured. Open United Flight Status for the authoritative travel-day check; this dashboard will not invent a live flight state.",
      "provider-key-not-configured",
    );
  }

  try {
    const results = await Promise.all(
      flights.map(async (flight) => {
        if (!shouldQueryProvider(flight)) return formatRecord(flight, null);
        const response = await fetch(
          `https://aeroapi.flightaware.com/aeroapi/flights/${encodeURIComponent(flight.trackingIdent)}`,
          { headers: { "x-apikey": apiKey } },
        );
        if (!response.ok) {
          throw new Error(`FlightAware returned ${response.status} for ${flight.flightNumber}`);
        }
        const payload = await response.json();
        const records = Array.isArray(payload?.flights) ? payload.flights : [];
        return formatRecord(flight, nearestRecord(records, flight));
      }),
    );
    return json({
      checkedAt: new Date().toISOString(),
      provider: {
        id: "flightaware-aeroapi",
        state: "live",
        detail: contract.workingFlights.flightTracking.provider,
        officialStatusUrl: contract.workingFlights.flightTracking.officialStatusUrl,
        dataBoundary: contract.workingFlights.flightTracking.dataBoundary,
      },
      refreshAfterSeconds: refreshAfterSeconds(),
      flights: results,
    });
  } catch (error) {
    return manualPayload(
      error instanceof Error
        ? `${error.message}. Open United Flight Status for the authoritative check.`
        : "The live aircraft provider failed. Open United Flight Status for the authoritative check.",
      "provider-error",
    );
  }
});
