import React from 'react';
import { ALTITUDE_ZONES } from './utils.js';

const AltitudeLegend = () => {
  return (
    <div className="altitude-zone-legend">
      <div className="altitude-legend-header">
        <span className="altitude-legend-icon">🏔️</span>
        <span className="altitude-legend-title">Altitude Physiology Zones</span>
        <span className="altitude-legend-note">(Wilderness Medical Society guidelines)</span>
      </div>
      <div className="altitude-legend-zones">
        {ALTITUDE_ZONES.filter(z => z.maxFt <= 12000).map((zone) => (
          <div key={zone.id} className={`altitude-legend-item altitude-legend-item--${zone.risk}`}>
            <span
              className="altitude-legend-swatch"
              style={{ backgroundColor: zone.color, borderColor: zone.borderColor }}
            ></span>
            <span className="altitude-legend-range">
              {zone.minFt.toLocaleString()}'–{zone.maxFt.toLocaleString()}'
            </span>
            <span className="altitude-legend-name">{zone.name}</span>
            {zone.risk !== 'none' && (
              <span className="altitude-legend-risk" style={{ color: zone.borderColor }}>
                {zone.icon} {zone.description}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="altitude-section-context">
        <span className="context-badge context-badge--safe">✓ Section O Peak: 5,850' (Moderate Altitude)</span>
        <span className="context-detail">Low AMS risk for most hikers. Stay hydrated, watch for headache/nausea. High Sierra (13,000'+) requires acclimatization.</span>
      </div>
    </div>
  );
};

export default AltitudeLegend;
