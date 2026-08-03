import { useEffect, useState } from "react";
import { tripOperations } from "../data/tripFacts";
import {
  fetchFlightStatus,
  formatFlightTimestamp,
} from "../services/flightStatusService";
import "../styles/TransitPanel.css";

const coordinateLabel = (coordinates = []) =>
  coordinates.length >= 2
    ? coordinates[1].toFixed(5) + ", " + coordinates[0].toFixed(5)
    : "pin pending";

function OperationSources({ sourceIds = [] }) {
  const sourcesById = new Map(
    (tripOperations.sources ?? []).map((source) => [source.id, source]),
  );
  const sources = sourceIds
    .map((id) => sourcesById.get(id))
    .filter(Boolean);

  if (!sources.length) return null;

  return (
    <div className="ops-source-links" aria-label="Evidence sources">
      {sources.map((source) =>
        source.url ? (
          <a
            key={source.id}
            href={source.url}
            target="_blank"
            rel="noreferrer"
          >
            {source.title}
          </a>
        ) : (
          <span key={source.id}>{source.title}</span>
        ),
      )}
    </div>
  );
}

function GateCard({ gate }) {
  const gateClass = [
    "ops-gate",
    "ops-gate--" + gate.priority,
    "ops-gate--" + gate.state,
  ].join(" ");

  return (
    <article className={gateClass}>
      <div className="ops-gate__meta">
        <span>{gate.priority === "critical" ? "BLOCKING" : "HIGH"}</span>
        <span>{gate.due}</span>
      </div>
      <h4>{gate.title}</h4>
      <p>{gate.detail}</p>
      <p className="ops-gate__block">
        <strong>Why it matters:</strong> {gate.blocks}
      </p>
      <p className="ops-gate__owner">Owner: {gate.owner}</p>
      <OperationSources sourceIds={gate.sourceIds} />
    </article>
  );
}

function FlightWatch({ tracking }) {
  const [snapshot, setSnapshot] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = async (force = false) => {
    setIsRefreshing(true);
    try {
      setSnapshot(await fetchFlightStatus({ tracking, force }));
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let active = true;
    let timer;
    const load = async (force = false) => {
      const next = await fetchFlightStatus({ tracking, force });
      if (!active) return;
      setSnapshot(next);
      const seconds = Math.max(60, Number(next?.refreshAfterSeconds) || 21_600);
      timer = window.setTimeout(() => void load(true), seconds * 1000);
    };
    void load();
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [tracking]);

  const provider = snapshot?.provider;
  const flights = snapshot?.flights?.length ? snapshot.flights : tracking?.flights ?? [];

  return (
    <section className="flight-watch" aria-labelledby="flight-watch-title">
      <div className="flight-watch__heading">
        <div>
          <p className="ops-eyebrow">Travel-day operations</p>
          <h3 id="flight-watch-title">Flight Watch</h3>
        </div>
        <span className={`flight-watch__state flight-watch__state--${provider?.state ?? "scheduled"}`}>
          {provider?.state === "live" ? "Live provider" : "Official check ready"}
        </span>
      </div>

      <p>{provider?.detail ?? "The team-confirmed schedule is loaded. Use United for the authoritative travel-day check."}</p>
      {provider?.dataBoundary && <p className="flight-watch__boundary">{provider.dataBoundary}</p>}

      <div className="flight-watch__flights">
        {flights.map((flight) => {
          const timing = [
            formatFlightTimestamp(flight.actualDepartureAt) &&
              `out ${formatFlightTimestamp(flight.actualDepartureAt)}`,
            formatFlightTimestamp(flight.estimatedArrivalAt) &&
              `ETA ${formatFlightTimestamp(flight.estimatedArrivalAt)}`,
            flight.originGate && `gate ${flight.originGate}`,
          ].filter(Boolean);
          return (
            <article className="flight-watch__flight" key={flight.flightNumber}>
              <strong>{flight.flightNumber}</strong>
              <span>{flight.origin && flight.destination ? `${flight.origin} → ${flight.destination}` : `Travel date ${flight.travelDate}`}</span>
              <span>{flight.live ? flight.status : "Scheduled — no live aircraft claim"}</span>
              {timing.length > 0 && <small>{timing.join(" · ")}</small>}
              {flight.trackerUrl && (
                <a href={flight.trackerUrl} target="_blank" rel="noreferrer">
                  Track aircraft
                </a>
              )}
            </article>
          );
        })}
      </div>

      <div className="flight-watch__actions">
        {tracking?.officialStatusUrl && (
          <a href={tracking.officialStatusUrl} target="_blank" rel="noreferrer">
            Open United Flight Status
          </a>
        )}
        <button type="button" onClick={() => void refresh(true)} disabled={isRefreshing}>
          {isRefreshing ? "Refreshing…" : "Refresh Flight Watch"}
        </button>
      </div>
      {snapshot?.checkedAt && (
        <p className="flight-watch__checked">
          Last dashboard check: {formatFlightTimestamp(snapshot.checkedAt) ?? snapshot.checkedAt}
        </p>
      )}
    </section>
  );
}

/**
 * One trip-specific access view. It intentionally does not surface generic
 * hypothetical transit, gas-price, or rental-car data as if it were a booked
 * plan. Every timing claim carries its verification status.
 */
function TransitPanel() {
  const {
    arrivalPlan,
    canonicalRoute,
    dayThreeSupport,
    finishPlan,
    gates,
    updatedAt,
    workingFlights,
  } = tripOperations;
  const openGates = gates.filter((gate) => gate.state !== "confirmed");
  const criticalGates = openGates.filter((gate) => gate.priority === "critical");
  const dayThreePin = coordinateLabel(dayThreeSupport.fieldCoordinates);
  const ashCampPin = coordinateLabel(finishPlan.fieldCoordinates);

  return (
    <section className="transit-panel" aria-labelledby="access-contract-title">
      <header className="ops-panel-header">
        <div>
          <p className="ops-eyebrow">Team-specific plan · checked {updatedAt}</p>
          <h2 id="access-contract-title">Access &amp; Extraction Contract</h2>
        </div>
        <span className="ops-open-count">
          {criticalGates.length} critical gates open
        </span>
      </header>

      <p className="ops-intro">
        This is the actual DDG travel plan—not generic Section O transit.
        Route math is locked to {canonicalRoute.officialPctaMiles.toFixed(3)}
        {" "}official PCTA miles; the items below are the real-world facts that
        still require a person, a booking, or a current condition check.
      </p>

      <div className="ops-timeline">
        <article className="ops-stage">
          <span className="ops-stage__icon" aria-hidden="true">✈️</span>
          <div>
            <p className="ops-stage__label">Arrival · Aug 28</p>
            <h3>{workingFlights.inbound.flightNumber} · ORD → SJC</h3>
            <p>
              Confirmed itinerary: {workingFlights.inbound.scheduledDepartureLocal}
              {" "}→ {workingFlights.inbound.scheduledArrivalLocal}. {workingFlights.disclaimer}
            </p>
          </div>
        </article>

        <FlightWatch tracking={workingFlights.flightTracking} />

        <article className="ops-stage">
          <span className="ops-stage__icon" aria-hidden="true">🚙</span>
          <div>
            <p className="ops-stage__label">Same-night insertion · Aug 28–29</p>
            <h3>{arrivalPlan.driver} drives the team toward Burney</h3>
            <p>{arrivalPlan.instruction}</p>
            <p className="ops-stage__metric">
              SJC → Burney snapshot: {arrivalPlan.driveSnapshot.distanceMiles.toFixed(1)} mi · {arrivalPlan.driveSnapshot.durationHours.toFixed(1)} hr before stops
            </p>
          </div>
        </article>

        <article className="ops-stage ops-stage--support">
          <span className="ops-stage__icon" aria-hidden="true">↔️</span>
          <div>
            <p className="ops-stage__label">Day 3 · Aug 31</p>
            <h3>Required Bartle Gap support transfer</h3>
            <p>{dayThreeSupport.instruction}</p>
            <p className="ops-stage__metric">
              Exact field pin: {dayThreePin} · route mile {dayThreeSupport.routeMile.toFixed(3)} · PCT {dayThreeSupport.pctMile.toFixed(3)} · {dayThreeSupport.fieldToTrailOffsetFeet} ft from the PCTA trail boundary
            </p>
          </div>
        </article>

        <article className="ops-stage ops-stage--finish">
          <span className="ops-stage__icon" aria-hidden="true">🏁</span>
          <div>
            <p className="ops-stage__label">Extraction · Sep 5 primary</p>
            <h3>Ash Camp—not “mile 52”</h3>
            <p>{finishPlan.road}</p>
            <p className="ops-stage__metric">
              Field pin: {ashCampPin} · route mile {finishPlan.routeMile.toFixed(3)} · {finishPlan.pickupWindow}
            </p>
          </div>
        </article>
      </div>

      <section className="ops-gates-section" aria-labelledby="ops-gates-title">
        <div className="ops-section-heading">
          <div>
            <p className="ops-eyebrow">Go / no-go checklist</p>
            <h3 id="ops-gates-title">Remaining operational gates</h3>
          </div>
          <p>Do not mark these done until the stated evidence exists.</p>
        </div>
        <div className="ops-gate-list">
          {openGates.map((gate) => <GateCard key={gate.id} gate={gate} />)}
        </div>
      </section>

      <section className="ops-protocols">
        <article>
          <h3>Day 3 no-show rule</h3>
          <p>{dayThreeSupport.noShowRule}</p>
        </article>
        <article>
          <h3>Ash Camp backup</h3>
          <p>{finishPlan.fallback}</p>
          <p className="ops-stage__metric">
            Ash Camp → Campbell snapshot: {finishPlan.driveSnapshot.distanceMiles.toFixed(1)} mi · {finishPlan.driveSnapshot.durationHours.toFixed(1)} hr before stops
          </p>
        </article>
      </section>
    </section>
  );
}

export default TransitPanel;
