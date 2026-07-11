import React from 'react';

const ChartSVG = ({
  width,
  height,
  margin,
  xScale,
  yScale,
  chartMaxElevation,
  chartMinElevation,
  minElevation,
  yTicks,
  xTicks,
  hoverX,
  hoverMeta,
  hoveredCamp,
  allMarkers,
  daySegments,
  handleMouseMove,
  handleMouseLeave,
  setHoveredCamp,
  formatElevation,
  formatGrade,
  getGradeColor,
  getGradeClass,
  getAltitudeZone,
  DAY_COLORS,
  ALTITUDE_ZONES,
  overlayPaths,
  linePath,
  areaPath
}) => {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="elevation-svg"
    >
      <defs>
        {/* Main gradient */}
        <linearGradient id="elevationGradientDDG" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#2E7D32" stopOpacity="0.6"/>
          <stop offset="50%" stopColor="#4CAF50" stopOpacity="0.4"/>
          <stop offset="100%" stopColor="#8BC34A" stopOpacity="0.1"/>
        </linearGradient>

        {/* Day segment gradients */}
        {DAY_COLORS.map((colors, idx) => (
          <linearGradient key={`dayGrad${idx}`} id={`dayGradient${idx}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={colors.stroke} stopOpacity="0.3"/>
            <stop offset="100%" stopColor={colors.stroke} stopOpacity="0.05"/>
          </linearGradient>
        ))}

        {/* Altitude zone pattern for visual distinction */}
        <pattern id="altitudeHatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
        </pattern>

        {/* Glow filter for hover */}
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        {/* Drop shadow for markers */}
        <filter id="markerShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3"/>
        </filter>
      </defs>

      {/* Altitude Sickness Risk Zones - Background bands */}
      <g className="altitude-zones">
        {ALTITUDE_ZONES.map((zone) => {
          // Only render zones that intersect with our elevation range
          const zoneTop = Math.min(zone.maxFt, chartMaxElevation + 500);
          const zoneBottom = Math.max(zone.minFt, chartMinElevation - 200);
          if (zoneTop <= zoneBottom) return null;

          const y1 = yScale(zoneTop);
          const y2 = yScale(zoneBottom);
          const zoneHeight = y2 - y1;

          if (zoneHeight < 5) return null; // Skip tiny zones

          return (
            <g key={zone.id} className={`altitude-zone altitude-zone--${zone.risk}`}>
              {/* Zone background band */}
              <rect
                x={margin.left}
                y={y1}
                width={width - margin.left - margin.right}
                height={zoneHeight}
                fill={zone.color}
                stroke="none"
              />

              {/* Zone boundary line at top */}
              {zone.minFt > minElevation - 200 && (
                <line
                  x1={margin.left}
                  y1={yScale(zone.minFt)}
                  x2={width - margin.right}
                  y2={yScale(zone.minFt)}
                  stroke={zone.borderColor}
                  strokeWidth="1.5"
                  strokeDasharray="8,4"
                  opacity="0.6"
                />
              )}

              {/* Zone label on right side */}
              <g transform={`translate(${width - margin.right + 5}, ${(y1 + y2) / 2})`}>
                <text
                  x="0"
                  y="0"
                  fontSize="9"
                  fontWeight="600"
                  fill={zone.borderColor}
                  dominantBaseline="middle"
                  opacity="0.9"
                >
                  {zone.icon} {zone.risk !== 'none' ? zone.risk.toUpperCase() : ''}
                </text>
              </g>
            </g>
          );
        })}
      </g>

      {/* Background grid */}
      <g className="elevation-grid">
        {yTicks.map((tick) => (
          <g key={`y-${tick}`}>
            <line
              x1={margin.left}
              y1={yScale(tick)}
              x2={width - margin.right}
              y2={yScale(tick)}
              stroke="#e0e0e0"
              strokeDasharray="4,4"
              strokeWidth="1"
            />
            <text
              x={margin.left - 8}
              y={yScale(tick)}
              textAnchor="end"
              alignmentBaseline="middle"
              fontSize="11"
              fill="#666"
              fontWeight="500"
            >
              {tick.toLocaleString()}'
            </text>
          </g>
        ))}
        {xTicks.map((tick) => (
          <g key={`x-${tick}`}>
            <line
              x1={xScale(tick)}
              y1={margin.top}
              x2={xScale(tick)}
              y2={height - margin.bottom}
              stroke="#e8e8e8"
              strokeWidth="1"
            />
            <text
              x={xScale(tick)}
              y={height - margin.bottom + 20}
              textAnchor="middle"
              fontSize="11"
              fill="#666"
              fontWeight="500"
            >
              {tick}
            </text>
          </g>
        ))}
      </g>

      {/* Day segment backgrounds */}
      {daySegments.map((seg, idx) => {
        const segPoints = seg.points;
        if (!segPoints || segPoints.length < 2) return null;

        const segPath = `
          M ${xScale(seg.startMile)} ${height - margin.bottom}
          L ${segPoints.map((d) => `${xScale(d.dist)} ${yScale(d.ele)}`).join(' L ')}
          L ${xScale(seg.endMile)} ${height - margin.bottom}
          Z
        `;

        return (
          <g key={`seg-${idx}`} className="day-segment">
            <path
              d={segPath}
              fill={`url(#dayGradient${(seg.day - 1) % DAY_COLORS.length})`}
              stroke="none"
              opacity="0.8"
            />
            {/* Day label at top */}
            <text
              x={(seg.x1 + seg.x2) / 2}
              y={margin.top - 8}
              textAnchor="middle"
              fontSize="10"
              fontWeight="600"
              fill={seg.color.stroke}
            >
              Day {seg.day}
            </text>
          </g>
        );
      })}

      {/* Main elevation area */}
      <path
        d={areaPath}
        fill="url(#elevationGradientDDG)"
        stroke="none"
        className="elevation-area"
      />

      {/* Comparison overlays */}
      {overlayPaths.map((overlay) => (
        <g key={`overlay-${overlay.id}`} className="elevation-overlay-line">
          <path
            d={overlay.path}
            fill="none"
            stroke={overlay.color}
            strokeWidth="2"
            strokeDasharray="10,6"
            opacity="0.7"
          />
          <circle
            cx={overlay.labelX}
            cy={overlay.labelY}
            r="4"
            fill="#fff"
            stroke={overlay.color}
            strokeWidth="2"
          />
          <text
            x={Math.min(overlay.labelX + 8, width - margin.right)}
            y={overlay.labelY - 6}
            fontSize="10"
            fontWeight="700"
            fill={overlay.color}
            className="overlay-path-label"
          >
            {overlay.label}
          </text>
        </g>
      ))}

      {/* Elevation line with gradient based on grade */}
      <path
        d={linePath}
        fill="none"
        stroke="#2E7D32"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="elevation-line"
      />

      {/* Axes */}
      <line
        x1={margin.left}
        y1={height - margin.bottom}
        x2={width - margin.right}
        y2={height - margin.bottom}
        stroke="#999"
        strokeWidth="1.5"
      />
      <line
        x1={margin.left}
        y1={margin.top}
        x2={margin.left}
        y2={height - margin.bottom}
        stroke="#999"
        strokeWidth="1.5"
      />

      {/* Axis labels */}
      <text
        x={width / 2}
        y={height - 5}
        textAnchor="middle"
        fontSize="12"
        fill="#666"
        fontWeight="600"
      >
        Distance (miles)
      </text>
      <text
        x={15}
        y={height / 2}
        textAnchor="middle"
        fontSize="12"
        fill="#666"
        fontWeight="600"
        transform={`rotate(-90, 15, ${height / 2})`}
      >
        Elevation (ft)
      </text>

      {/* Camp Markers */}
      {allMarkers.map((marker) => (
        <g
          key={marker.id}
          className={`camp-marker-group ${hoveredCamp === marker.id ? 'is-hovered' : ''}`}
          onMouseEnter={() => setHoveredCamp(marker.id)}
          onMouseLeave={() => setHoveredCamp(null)}
          filter={hoveredCamp === marker.id ? 'url(#glow)' : undefined}
        >
          {/* Vertical line to base */}
          <line
            x1={marker.cx}
            y1={marker.cy}
            x2={marker.cx}
            y2={height - margin.bottom}
            stroke={marker.color}
            strokeWidth="1"
            strokeDasharray="3,3"
            opacity="0.5"
          />

          <circle
            cx={marker.cx}
            cy={marker.cy}
            r={hoveredCamp === marker.id ? 8 : (marker.icon ? 5 : 6)}
            fill="#fff"
            stroke={marker.color}
            strokeWidth={marker.icon ? "2" : "3"}
            filter="url(#markerShadow)"
            className="camp-marker-circle"
            style={{ transition: 'r 0.2s ease, transform 0.2s ease' }}
          />

          {/* Marker icon */}
          <text
            x={marker.cx}
            y={Math.max(14, marker.cy - 16)}
            textAnchor="middle"
            fontSize={marker.icon ? "12" : "14"}
          >
            {marker.icon || (marker.type === 'Trailhead' ? '🚗' : marker.type === 'Finish' ? '🏁' : '⛺')}
          </text>

          {/* Tooltip on hover */}
          {hoveredCamp === marker.id && (() => {
            const tooltipY = Math.max(5, marker.cy - 70);
            return (
              <g className="camp-tooltip">
                <rect
                  x={marker.cx - 80}
                  y={tooltipY}
                  width="160"
                  height="50"
                  rx="8"
                  fill="rgba(255,255,255,0.95)"
                  stroke={marker.color}
                  strokeWidth="2"
                  filter="url(#markerShadow)"
                />
                <text
                  x={marker.cx}
                  y={tooltipY + 18}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill="#333"
                >
                  {marker.name?.length > 20 ? marker.name.slice(0, 18) + '…' : marker.name}
                </text>
                <text
                  x={marker.cx}
                  y={tooltipY + 32}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#666"
                >
                  Mile {marker.mile.toFixed(1)} · {formatElevation(marker.elevation)}
                </text>
              </g>
            );
          })()}
        </g>
      ))}

      {/* Hover indicator */}
      {hoverX && hoverMeta && (
        <g className="hover-indicator">
          <line
            x1={hoverX}
            y1={margin.top}
            x2={hoverX}
            y2={height - margin.bottom}
            stroke="#FF5722"
            strokeWidth="2"
            strokeDasharray="6,4"
            opacity="0.8"
          />
          <circle
            cx={hoverX}
            cy={yScale(hoverMeta.elevation)}
            r="6"
            fill="#FF5722"
            stroke="#fff"
            strokeWidth="2"
            filter="url(#glow)"
          />

          {/* Hover data box */}
          <g transform={`translate(${hoverX > width / 2 ? hoverX - 140 : hoverX + 10}, ${Math.min(yScale(hoverMeta.elevation) - 20, height - margin.bottom - 80)})`}>
            <rect
              x="0"
              y="0"
              width="130"
              height="70"
              rx="6"
              fill="rgba(40,40,40,0.92)"
              stroke="#FF5722"
              strokeWidth="1"
            />
            <text x="10" y="18" fontSize="11" fontWeight="700" fill="#fff">
              Mile {hoverMeta.mile.toFixed(1)}
            </text>
            <text x="10" y="33" fontSize="10" fill="#ccc">
              Elev: {formatElevation(hoverMeta.elevation)}
            </text>
            <text x="10" y="48" fontSize="10" fill={getGradeColor(hoverMeta.grade)}>
              Grade: {formatGrade(hoverMeta.grade)} ({getGradeClass(hoverMeta.grade)})
            </text>
            <text x="10" y="63" fontSize="9" fill="#aaa">
              ↑{Math.round(hoverMeta.cumulativeGain)}' ↓{Math.round(hoverMeta.cumulativeLoss)}'
            </text>
            {/* Altitude zone indicator */}
            {(() => {
              const zone = getAltitudeZone(hoverMeta.elevation);
              if (zone.risk === 'none') return null;
              return (
                <>
                  <rect x="0" y="72" width="130" height="18" rx="0" ry="0" fill={zone.borderColor} opacity="0.15"/>
                  <text x="10" y="84" fontSize="9" fontWeight="600" fill={zone.borderColor}>
                    {zone.icon} {zone.name}
                  </text>
                </>
              );
            })()}
          </g>
        </g>
      )}
    </svg>
  );
};

export default ChartSVG;
