import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import sectionData from '../data/sectionProfiles.json';

const haversineMiles = (a, b) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371000; // meters
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return (R * c) / 1609.344;
};

const deriveProfileFromTrail = (trail = [], samples = 40) => {
  if (!trail.length) {
    return { profile: [], stats: null };
  }

  const normalized = trail.map(([lon, lat, elevation]) => ({
    lon,
    lat,
    elevation: elevation ?? null
  }));

  const cumulative = [0];
  for (let i = 1; i < normalized.length; i += 1) {
    const miles = haversineMiles(normalized[i - 1], normalized[i]);
    cumulative[i] = cumulative[i - 1] + miles;
  }

  const totalDistance = cumulative.at(-1) ?? 0;
  const sampleTargets = samples <= 1
    ? [0]
    : Array.from({ length: samples }, (_, idx) => (idx / (samples - 1)) * totalDistance);

  const profile = sampleTargets.map((target) => {
    let cursor = 1;
    while (cursor < cumulative.length && cumulative[cursor] < target) {
      cursor += 1;
    }

    const prevIdx = Math.max(0, cursor - 1);
    const nextIdx = Math.min(normalized.length - 1, cursor);
    const startDist = cumulative[prevIdx];
    const endDist = cumulative[nextIdx];
    const span = Math.max(endDist - startDist, 1e-6);
    const lerpT = (target - startDist) / span;
    const startElev = normalized[prevIdx].elevation ?? normalized[nextIdx].elevation ?? 0;
    const endElev = normalized[nextIdx].elevation ?? startElev;
    const elevation = startElev + (endElev - startElev) * lerpT;

    return [target, elevation];
  });

  let minElevation = Infinity;
  let maxElevation = -Infinity;
  let gain = 0;
  let loss = 0;
  normalized.forEach((point, idx) => {
    const elev = point.elevation ?? 0;
    if (elev < minElevation) minElevation = elev;
    if (elev > maxElevation) maxElevation = elev;
    if (idx > 0) {
      const delta = elev - (normalized[idx - 1].elevation ?? elev);
      if (delta > 0) gain += delta;
      if (delta < 0) loss += Math.abs(delta);
    }
  });

  return {
    profile,
    stats: {
      distance: totalDistance,
      elevationGain: gain,
      elevationLoss: loss,
      minElevation,
      maxElevation
    }
  };
};

/**
 * SectionComparison - Overlay visualization of all 5 PCT section options.
 * Section O always reflects the live map route sourced from
 * #file:Original-DDG-PCT-PDF.txt research so the HUD stays trustworthy.
 */
const SectionComparison = ({ primaryTrail }) => {
  const baseSections = useMemo(() => Object.values(sectionData), []);

  const sections = useMemo(() => {
    if (!primaryTrail?.length) return baseSections;

    const derived = deriveProfileFromTrail(primaryTrail);
    if (!derived.stats) return baseSections;

    return baseSections.map((section) => {
      if (section.id !== 'section-o') return section;
      return {
        ...section,
        stats: {
          ...section.stats,
          distance: derived.stats.distance,
          elevationGain: Math.round(derived.stats.elevationGain),
          elevationLoss: Math.round(derived.stats.elevationLoss),
          minElevation: Math.round(derived.stats.minElevation),
          maxElevation: Math.round(derived.stats.maxElevation)
        },
        profile: derived.profile
      };
    });
  }, [baseSections, primaryTrail]);

  return (
    <div className="section-comparison-overlay">
      <div className="overlay-header">
        <h3>Section Comparison</h3>
        <p className="overlay-subtitle">5 potential routes analyzed</p>
      </div>

      <div className="section-list">
        {sections.map((section) => {
          const distance = section.stats.distance || 1;
          const minElevation = section.stats.minElevation ?? 0;
          const elevationRange = Math.max(1, (section.stats.maxElevation ?? 0) - minElevation);
          const isSelectedRoute = section.id === 'section-o';

          return (
            <div
              key={section.id}
              className={`section-card ${isSelectedRoute ? 'is-selected' : ''}`}
            >
              <div className="section-info">
                <h4 className="section-name">{section.name}</h4>
                <div className="section-stats-compact">
                  <span className="stat">{Math.round(distance)} mi</span>
                  <span className="stat">{Math.round(section.stats.maxElevation).toLocaleString()}' high</span>
                  <span className="stat">±{Math.round(elevationRange).toLocaleString()}' range</span>
                </div>
              </div>

              {/* Simple sparkline-style elevation profile */}
              <svg className="section-sparkline" viewBox="0 0 200 40" preserveAspectRatio="none">
                <path
                  d={`M ${(section.profile ?? []).map(([dist, ele]) =>
                    `${(dist / distance) * 200},${40 - ((ele - minElevation) / elevationRange) * 40}`
                  ).join(' L ')}`}
                  fill="none"
                  stroke={isSelectedRoute ? '#4fc3f7' : '#757575'}
                  strokeWidth={isSelectedRoute ? 2 : 1.5}
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>
          );
        })}
      </div>
    </div>
  );
};

SectionComparison.propTypes = {
  primaryTrail: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number))
};

SectionComparison.defaultProps = {
  primaryTrail: []
};

export default SectionComparison;
