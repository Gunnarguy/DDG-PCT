import React from 'react';

const DayLegend = ({ daySegments }) => {
  return (
    <div className="elevation-day-legend">
      {daySegments.map((seg) => (
        <div
          key={`legend-${seg.day}`}
          className="day-legend-item"
          style={{ '--day-color': seg.color.stroke }}
        >
          <span className="day-legend-marker" style={{ background: seg.color.stroke }}></span>
          <span className="day-legend-label">Day {seg.day}</span>
          <span className="day-legend-name">{seg.name}</span>
        </div>
      ))}
    </div>
  );
};

export default DayLegend;
