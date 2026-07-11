import React from 'react';

const ReadoutBar = ({
  hoverMeta,
  formatElevation,
  formatGrade,
  getGradeColor,
  getAltitudeZone
}) => {
  return (
    <div className="elevation-readout-bar">
      {hoverMeta ? (
        <>
          <span className="readout-item">
            <strong>Mile {hoverMeta.mile.toFixed(1)}</strong>
          </span>
          <span className="readout-divider">|</span>
          <span className="readout-item">
            {formatElevation(hoverMeta.elevation)}
          </span>
          <span className="readout-divider">|</span>
          <span className="readout-item" style={{ color: getGradeColor(hoverMeta.grade) }}>
            {formatGrade(hoverMeta.grade)} grade
          </span>
          <span className="readout-divider">|</span>
          <span className="readout-item readout-cumulative">
            ↑ {Math.round(hoverMeta.cumulativeGain).toLocaleString()}' gained
          </span>
          {(() => {
            const zone = getAltitudeZone(hoverMeta.elevation);
            if (zone.risk === 'none') return null;
            return (
              <>
                <span className="readout-divider">|</span>
                <span className="readout-item readout-altitude" style={{ color: zone.borderColor }}>
                  {zone.icon} {zone.name}
                </span>
              </>
            );
          })()}
        </>
      ) : (
        <span className="readout-prompt">
          🖱️ Hover over the profile to see grade, elevation, and sync with the map
        </span>
      )}
    </div>
  );
};

export default ReadoutBar;
