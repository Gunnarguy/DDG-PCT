import React, { useMemo, useState, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { scaleLinear } from 'd3-scale';
import sectionProfiles from '../data/sectionProfiles.json';


import ChartSVG from './ElevationProfileComponents/ChartSVG';
import ReadoutBar from './ElevationProfileComponents/ReadoutBar';
import DayLegend from './ElevationProfileComponents/DayLegend';
import AltitudeLegend from './ElevationProfileComponents/AltitudeLegend';
import {
  MILES_TO_METERS,
  METERS_TO_FEET,
  ALTITUDE_ZONES,
  getAltitudeZone,
  DDG_TEAM,
  DAY_COLORS,
  OVERLAY_SECTION_ORDER,
  OVERLAY_COLORS,
  getDistanceFromLatLonInMeters,
  getGradeClass,
  getGradeColor
} from './ElevationProfileComponents/utils';

const ElevationProfile = ({ 
  hikingTrail, 
  campPoints = [], 
  townPins = [],
  transportPoints = [],
  waterSources = [],
  connectivityZones = [],
  onHover 
}) => {
  const containerRef = useRef(null);
  const [hoverX, setHoverX] = useState(null);
  const [hoverMeta, setHoverMeta] = useState(null);
  const [hoveredCamp, setHoveredCamp] = useState(null);
  const [selectedHiker, setSelectedHiker] = useState(null);
  const [activeOverlayIds, setActiveOverlayIds] = useState([]);

  // Process trail data to get [distance, elevation] points with grade calculations
  const profileData = useMemo(() => {
    if (!hikingTrail || hikingTrail.length === 0) return [];
    
    if (hikingTrail[0].length < 3) return [];

    // Step 1: Apply moving average smoothing to filter GPS noise (industry standard)
    const SMOOTHING_WINDOW = 5; // Average over 5 points
    const smoothedElevations = hikingTrail.map((point, i) => {
      const start = Math.max(0, i - Math.floor(SMOOTHING_WINDOW / 2));
      const end = Math.min(hikingTrail.length, i + Math.ceil(SMOOTHING_WINDOW / 2));
      const window = hikingTrail.slice(start, end);
      const avg = window.reduce((sum, p) => sum + p[2], 0) / window.length;
      return avg;
    });

    const data = [];
    let totalDist = 0;
    let cumulativeGain = 0;
    let cumulativeLoss = 0;

    // First point
    data.push({
      dist: 0,
      ele: smoothedElevations[0],
      original: hikingTrail[0],
      grade: 0,
      cumulativeGain: 0,
      cumulativeLoss: 0
    });

    // Step 2: Use threshold method - only count climbs/descents > 10ft between points
    // This matches Strava/AllTrails approach
    const ELEVATION_THRESHOLD = 10; // feet
    let lastCountedElevation = smoothedElevations[0];

    for (let i = 1; i < hikingTrail.length; i++) {
      const prev = hikingTrail[i - 1];
      const curr = hikingTrail[i];
      const d = getDistanceFromLatLonInMeters(prev[1], prev[0], curr[1], curr[0]);
      totalDist += d;
      
      const currEle = smoothedElevations[i];
      const elevationChange = currEle - lastCountedElevation;
      
      // Only count if change exceeds threshold
      if (Math.abs(elevationChange) >= ELEVATION_THRESHOLD) {
        if (elevationChange > 0) {
          cumulativeGain += elevationChange;
        } else {
          cumulativeLoss += Math.abs(elevationChange);
        }
        lastCountedElevation = currEle;
      }
      
      // Calculate grade as percentage (using raw data for accuracy)
      const eleChange = smoothedElevations[i] - smoothedElevations[i - 1];
      const distFeet = d * METERS_TO_FEET;
      const grade = distFeet > 0 ? (eleChange / distFeet) * 100 : 0;
      
      data.push({
        dist: totalDist / MILES_TO_METERS,
        ele: currEle,
        original: curr,
        grade,
        cumulativeGain,
        cumulativeLoss
      });
    }
    return data;
  }, [hikingTrail]);

  const overlaySections = useMemo(() => {
    const sections = OVERLAY_SECTION_ORDER.map((sectionId, idx) => {
      const section = sectionProfiles[sectionId];
      if (!section || !Array.isArray(section.profile)) {
        return null;
      }
      const [shortName, subtitle] = section.name.split(':').map((part) => part.trim());
      return {
        id: section.id,
        name: section.name,
        shortName: shortName || section.name,
        subtitle: subtitle || 'PCT comparison',
        stats: section.stats || {},
        color: OVERLAY_COLORS[idx % OVERLAY_COLORS.length],
        profile: section.profile.map(([dist, ele]) => ({ dist, ele })),
        sourceFile: section.sourceFile
      };
    }).filter(Boolean);
    return sections;
  }, []);

  const toggleOverlay = useCallback((sectionId) => {
    setActiveOverlayIds((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  }, []);

  const activeOverlaySections = useMemo(
    () => overlaySections.filter((section) => activeOverlayIds.includes(section.id)),
    [overlaySections, activeOverlayIds]
  );

  const width = 1000;
  const height = 160;
  const margin = { top: 15, right: 50, bottom: 30, left: 70 };

  const totalDistance = profileData.length ? profileData[profileData.length - 1].dist : 0;
  const minElevation = profileData.length ? Math.min(...profileData.map((d) => d.ele)) : 0;
  const maxElevation = profileData.length ? Math.max(...profileData.map((d) => d.ele)) : 0;

  const overlayDistanceMax = useMemo(() => {
    if (!activeOverlaySections.length) return 0;
    const overlayDistances = activeOverlaySections.map((section) => {
      const lastPoint = section.profile[section.profile.length - 1];
      return lastPoint?.dist || 0;
    });
    return Math.max(...overlayDistances);
  }, [activeOverlaySections]);

  const overlayElevationRange = useMemo(() => {
    const values = activeOverlaySections.flatMap((section) => section.profile.map((point) => point.ele));
    if (!values.length) return null;
    return {
      min: Math.min(...values),
      max: Math.max(...values)
    };
  }, [activeOverlaySections]);

  const chartDistanceMax = useMemo(() => {
    const maxDistance = Math.max(totalDistance, overlayDistanceMax);
    return maxDistance > 0 ? maxDistance : totalDistance;
  }, [overlayDistanceMax, totalDistance]);

  const chartMinElevation = useMemo(() => {
    if (profileData.length) {
      return overlayElevationRange ? Math.min(minElevation, overlayElevationRange.min) : minElevation;
    }
    return overlayElevationRange ? overlayElevationRange.min : minElevation;
  }, [profileData.length, minElevation, overlayElevationRange]);

  const chartMaxElevation = useMemo(() => {
    if (profileData.length) {
      return overlayElevationRange ? Math.max(maxElevation, overlayElevationRange.max) : maxElevation;
    }
    return overlayElevationRange ? overlayElevationRange.max : maxElevation;
  }, [profileData.length, maxElevation, overlayElevationRange]);

  const xScale = useMemo(() => {
    if (!chartDistanceMax) return null;
    return scaleLinear()
      .domain([0, chartDistanceMax])
      .range([margin.left, width - margin.right]);
  }, [chartDistanceMax, margin.left, margin.right, width]);

  const yScale = useMemo(() => {
    if (!chartMaxElevation && !chartMinElevation) return null;
    const domainSpan = Math.max(200, chartMaxElevation - chartMinElevation);
    const padding = domainSpan * 0.1;
    return scaleLinear()
      .domain([chartMinElevation - padding, chartMaxElevation + padding])
      .range([height - margin.bottom, margin.top]);
  }, [chartMaxElevation, chartMinElevation, height, margin.bottom, margin.top]);

  const hasProfile = profileData.length > 0 && xScale && yScale;

  const overlayPaths = useMemo(() => {
    if (!xScale || !yScale || !activeOverlaySections.length) return [];
    return activeOverlaySections
      .map((section) => {
        if (!section.profile.length) return null;
        const d = section.profile
          .map((point, idx) => `${idx === 0 ? 'M' : 'L'} ${xScale(point.dist)} ${yScale(point.ele)}`)
          .join(' ');
        const lastPoint = section.profile[section.profile.length - 1];
        return {
          id: section.id,
          color: section.color,
          label: section.shortName,
          stats: section.stats,
          labelX: xScale(lastPoint.dist),
          labelY: yScale(lastPoint.ele),
          path: d
        };
      })
      .filter(Boolean);
  }, [activeOverlaySections, xScale, yScale]);

  // Calculate comprehensive stats
  const stats = useMemo(() => {
    if (!profileData.length) return {
      totalMiles: 0, totalGain: 0, totalLoss: 0, highPoint: 0, lowPoint: 0, avgGrade: 0
    };
    const lastPoint = profileData[profileData.length - 1];
    const grades = profileData.map(p => Math.abs(p.grade)).filter(g => !isNaN(g));
    const avgGrade = grades.length ? grades.reduce((a, b) => a + b, 0) / grades.length : 0;
    
    return {
      totalMiles: totalDistance,
      totalGain: lastPoint.cumulativeGain,
      totalLoss: lastPoint.cumulativeLoss,
      highPoint: maxElevation,
      lowPoint: minElevation,
      avgGrade: avgGrade
    };
  }, [profileData, totalDistance, maxElevation, minElevation]);

  // Estimated hiking time (Naismith's rule: 3 mph + 1 hr per 2000ft gain)
  const estimatedTime = useMemo(() => {
    const baseTime = stats.totalMiles / 2.5; // Conservative 2.5 mph with packs
    const gainTime = stats.totalGain / 1500; // 1 hour per 1500ft for loaded hikers
    return baseTime + gainTime;
  }, [stats.totalMiles, stats.totalGain]);

  const startLabel = useMemo(() => (
    campPoints.find((camp) => (camp?.properties?.routeMile ?? 0) === 0)?.properties?.name
  ) ?? 'Burney Falls State Park', [campPoints]);

  const finishLabel = useMemo(() => {
    if (!campPoints.length) return 'Castle Crags State Park';
    return (campPoints[campPoints.length - 1]?.properties?.name) ?? 'Castle Crags State Park';
  }, [campPoints]);

  // Build day segments for colored zones
  const daySegments = useMemo(() => {
    if (!hasProfile || campPoints.length < 2) return [];
    
    const segments = [];
    const sortedCamps = [...campPoints].sort((a, b) => 
      (a.properties?.routeMile ?? 0) - (b.properties?.routeMile ?? 0)
    );
    
    let profileIndex = 0;

    for (let i = 0; i < sortedCamps.length - 1; i++) {
      const startMile = sortedCamps[i].properties?.routeMile ?? 0;
      const endMile = sortedCamps[i + 1].properties?.routeMile ?? startMile;
      const day = sortedCamps[i + 1].properties?.day ?? i + 1;
      const colorIdx = (day - 1) % DAY_COLORS.length;
      
      // Advance profileIndex to the start of this segment
      while (profileIndex < profileData.length && profileData[profileIndex].dist < startMile) {
        profileIndex++;
      }

      const points = [];
      let tempIndex = profileIndex;
      while (tempIndex < profileData.length && profileData[tempIndex].dist <= endMile) {
        points.push(profileData[tempIndex]);
        tempIndex++;
      }

      if (points.length < 2) continue;
      
      const x1 = xScale(startMile);
      const x2 = xScale(endMile);
      
      segments.push({
        day,
        startMile,
        endMile,
        x1,
        x2,
        color: DAY_COLORS[colorIdx],
        name: sortedCamps[i + 1].properties?.name ?? `Day ${day}`,
        points
      });
    }
    
    return segments;
  }, [hasProfile, campPoints, profileData, xScale]);

  const areaPath = useMemo(() => {
    if (!hasProfile) return '';
    return `
      M ${xScale(profileData[0].dist)} ${height - margin.bottom}
      L ${profileData.map((d) => `${xScale(d.dist)} ${yScale(d.ele)}`).join(' L ')}
      L ${xScale(profileData[profileData.length - 1].dist)} ${height - margin.bottom}
      Z
    `;
  }, [hasProfile, xScale, yScale, profileData, height, margin.bottom]);
  
  const linePath = useMemo(() => {
    if (!hasProfile) return '';
    return `M ${profileData.map((d) => `${xScale(d.dist)} ${yScale(d.ele)}`).join(' L ')}`;
  }, [hasProfile, xScale, yScale, profileData]);

  const getElevationAtMile = useCallback((mile) => {
    if (!profileData.length) return null;
    if (mile <= 0) return profileData[0].ele;

    let low = 0;
    let high = profileData.length - 1;
    let result = profileData[high];

    while (low <= high) {
      const mid = (low + high) >> 1;
      if (profileData[mid].dist >= mile) {
        result = profileData[mid];
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }

    return result.ele;
  }, [profileData]);

  // Map camp points to the profile with enhanced data
  const campMarkers = useMemo(() => {
    if (!profileData.length || !xScale || !yScale) return [];
    return campPoints.map((camp, idx) => {
      const mile = camp?.properties?.routeMile;
      if (typeof mile !== 'number') return null;
      const clampedMile = Math.max(0, Math.min(mile, totalDistance));
      const eleAtCamp = getElevationAtMile(clampedMile);
      if (eleAtCamp === null) return null;
      const cx = xScale(clampedMile);
      const cy = yScale(eleAtCamp);
      if (Number.isNaN(cx) || Number.isNaN(cy)) return null;
      
      const day = camp.properties?.day ?? idx;
      const colorIdx = Math.max(0, day - 1) % DAY_COLORS.length;
      
      return {
        id: camp.properties?.name ?? `camp-${mile}`,
        name: camp.properties?.name,
        cx,
        cy,
        mile: clampedMile,
        elevation: eleAtCamp,
        day,
        type: camp.properties?.type ?? 'Camp',
        color: DAY_COLORS[colorIdx].stroke,
        notes: camp.properties?.notes,
        segment: camp.properties?.segment
      };
    }).filter(Boolean);
  }, [campPoints, getElevationAtMile, profileData.length, totalDistance, xScale, yScale]);

  const getMileFromCoordinates = useCallback((coord) => {
    if (!profileData.length || !coord) return null;
    let closestPoint = profileData[0];
    let minDiff = Infinity;
    for (const pt of profileData) {
      if (!pt.original) continue;
      const d = getDistanceFromLatLonInMeters(coord[1], coord[0], pt.original[1], pt.original[0]);
      if (d < minDiff) {
        minDiff = d;
        closestPoint = pt;
      }
    }
    return closestPoint.dist;
  }, [profileData]);

  const getTransportIcon = (type) => {
    switch (type) {
      case "airport": return "✈️";
      case "trailhead-parking": return "🅿️";
      case "shuttle-point": return "🚐";
      default: return "📍";
    }
  };

  const extraMarkers = useMemo(() => {
    if (!profileData.length || !xScale || !yScale) return [];
    const markers = [];

    const processPoints = (points, typeFn, iconFn) => {
      points.forEach((pt, idx) => {
        let mile = pt.mile;
        if (typeof mile !== 'number' && pt.coordinates) {
          mile = getMileFromCoordinates(pt.coordinates);
        }
        if (typeof mile !== 'number') return;
        
        const clampedMile = Math.max(0, Math.min(mile, totalDistance));
        const eleAtPt = getElevationAtMile(clampedMile);
        if (eleAtPt === null) return;
        const cx = xScale(clampedMile);
        const cy = yScale(eleAtPt);
        if (Number.isNaN(cx) || Number.isNaN(cy)) return;

        markers.push({
          id: `${typeFn(pt)}-${idx}-${mile}`,
          name: pt.name || pt.waypoint || typeFn(pt),
          cx,
          cy,
          mile: clampedMile,
          elevation: eleAtPt,
          type: typeFn(pt),
          icon: iconFn(pt),
          color: '#666', // Neutral color for non-camp markers
          notes: pt.notes || pt.report || (pt.cellCoverage ? 'Cell coverage check' : null)
        });
      });
    };

    processPoints(townPins, () => 'Town', () => '🏘️');
    processPoints(transportPoints, (pt) => pt.type || 'Transport', (pt) => getTransportIcon(pt.type));
    processPoints(waterSources, () => 'Water', () => '💧');
    processPoints(connectivityZones, () => 'Connectivity', () => '📡');

    return markers;
  }, [townPins, transportPoints, waterSources, connectivityZones, profileData.length, xScale, yScale, getMileFromCoordinates, getElevationAtMile, totalDistance]);

  const allMarkers = useMemo(() => [...campMarkers, ...extraMarkers], [campMarkers, extraMarkers]);

  // Y-axis tick marks
  const yTicks = useMemo(() => {
    if (!yScale) return [];
    const domain = yScale.domain();
    const range = domain[1] - domain[0];
    const step = Math.ceil(range / 5 / 500) * 500; // Round to nearest 500ft
    const ticks = [];
    for (let v = Math.ceil(domain[0] / step) * step; v <= domain[1]; v += step) {
      ticks.push(v);
    }
    return ticks;
  }, [yScale]);

  // X-axis tick marks (every 5 miles)
  const xTicks = useMemo(() => {
    if (!xScale) return [];
    const ticks = [];
    const maxDistance = Math.ceil(chartDistanceMax / 5) * 5;
    for (let m = 0; m <= maxDistance; m += 5) {
      ticks.push(m);
    }
    return ticks;
  }, [xScale, chartDistanceMax]);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    // Calculate position relative to the SVG viewBox
    const svgRect = containerRef.current.querySelector('svg')?.getBoundingClientRect();
    if (!svgRect) return;
    
    const relativeX = e.clientX - svgRect.left;
    const scaleRatio = width / svgRect.width;
    const x = relativeX * scaleRatio;
    
    if (hasProfile && x >= margin.left && x <= width - margin.right) {
      const mile = xScale.invert(x);
      setHoverX(x);
      
      // Find the closest point using binary search
      let closestPoint = profileData[0];
      let low = 0;
      let high = profileData.length - 1;
      
      if (mile <= profileData[low].dist) {
        closestPoint = profileData[low];
      } else if (mile >= profileData[high].dist) {
        closestPoint = profileData[high];
      } else {
        while (low <= high) {
          const mid = (low + high) >> 1;
          const midDist = profileData[mid].dist;

          if (midDist === mile) {
            closestPoint = profileData[mid];
            break;
          }

          if (midDist < mile) {
            low = mid + 1;
          } else {
            high = mid - 1;
          }
        }

        if (low > high) {
          const highDiff = Math.abs(profileData[high].dist - mile);
          const lowDiff = Math.abs(profileData[low].dist - mile);
          closestPoint = highDiff < lowDiff ? profileData[high] : profileData[low];
        }
      }
      
      if (closestPoint) {
        setHoverMeta({
          mile: closestPoint.dist,
          elevation: closestPoint.ele,
          grade: closestPoint.grade,
          cumulativeGain: closestPoint.cumulativeGain,
          cumulativeLoss: closestPoint.cumulativeLoss
        });
        if (onHover) {
          onHover({
            coordinates: [closestPoint.original[0], closestPoint.original[1]],
            elevationFt: closestPoint.ele,
            mile: closestPoint.dist
          });
        }
      }
    } else {
      setHoverX(null);
      setHoverMeta(null);
      if (onHover) onHover(null);
    }
  };

  const handleMouseLeave = () => {
    setHoverX(null);
    setHoverMeta(null);
    setHoveredCamp(null);
    if (onHover) onHover(null);
  };

  const formatElevation = (value) => `${Math.round(value).toLocaleString()}'`;
  const formatMile = (value) => `${value.toFixed(1)} mi`;
  const formatGrade = (value) => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  const formatTime = (hours) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };
  const formatDistanceStat = (value) => (typeof value === 'number' ? `${Math.round(value)} mi` : '—');
  const formatNumberStat = (value) => (typeof value === 'number' ? value.toLocaleString() : '—');

  return (
    <section className="elevation-profile-shell elevation-profile--ddg" aria-label="Elevation profile">
      {/* Compact inline title bar */}
      <div className="elevation-compact-bar">
        <span className="elevation-compact-title">📈 Elevation Profile</span>
        <span className="elevation-compact-stats">
          {formatMile(stats.totalMiles)} • +{Math.round(stats.totalGain).toLocaleString()}' / -{Math.round(stats.totalLoss).toLocaleString()}'
        </span>
      </div>
      {/* DDG Team Header (hidden in compact mode) */}
      <header className="elevation-profile-header">
        <div className="elevation-profile-title-block">
          <div className="elevation-profile-badge">
            <span className="badge-icon">🥾</span>
            <span className="badge-text">DDG PCT MISSION</span>
          </div>
          <h3 className="elevation-profile-title">Section O: {startLabel} → {finishLabel}</h3>
        </div>
        
        {/* DDG Team Avatars */}
        <div className="ddg-team-row">
          {DDG_TEAM.map((member) => (
            <button
              key={member.id}
              className={`ddg-member ${selectedHiker === member.id ? 'is-active' : ''}`}
              onClick={() => setSelectedHiker(selectedHiker === member.id ? null : member.id)}
              style={{ '--member-color': member.color }}
              title={`${member.name} - ${member.role}`}
            >
              <span className="ddg-member-emoji">{member.emoji}</span>
              <span className="ddg-member-name">{member.name}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Stats Dashboard */}
      <div className="elevation-stats-grid">
        <div className="elevation-stat elevation-stat--primary">
          <span className="stat-icon">📏</span>
          <div className="stat-content">
            <span className="stat-value">{formatMile(stats.totalMiles)}</span>
            <span className="stat-label">Total Distance</span>
          </div>
        </div>
        <div className="elevation-stat elevation-stat--gain">
          <span className="stat-icon">📈</span>
          <div className="stat-content">
            <span className="stat-value">+{Math.round(stats.totalGain).toLocaleString()}'</span>
            <span className="stat-label">Elevation Gain</span>
          </div>
        </div>
        <div className="elevation-stat elevation-stat--loss">
          <span className="stat-icon">📉</span>
          <div className="stat-content">
            <span className="stat-value">-{Math.round(stats.totalLoss).toLocaleString()}'</span>
            <span className="stat-label">Elevation Loss</span>
          </div>
        </div>
        <div className="elevation-stat elevation-stat--high">
          <span className="stat-icon">⛰️</span>
          <div className="stat-content">
            <span className="stat-value">{formatElevation(stats.highPoint)}</span>
            <span className="stat-label">High Point</span>
          </div>
        </div>
        <div className="elevation-stat elevation-stat--time">
          <span className="stat-icon">⏱️</span>
          <div className="stat-content">
            <span className="stat-value">{formatTime(estimatedTime)}</span>
            <span className="stat-label">Est. Moving Time</span>
          </div>
        </div>
      </div>

      {overlaySections.length > 0 && (
        <div className="overlay-toggle-panel">
          <div className="overlay-toggle-copy">
            <p className="overlay-toggle-title">Overlay other finalist sections</p>
            <p className="overlay-toggle-subtitle">
              Tap to layer altitude data straight from Dad's <em>#file:Original-DDG-PCT-PDF.txt</em> research + the Garmin GPX pulls.
            </p>
          </div>
          <div className="overlay-toggle-grid">
            {overlaySections.map((section) => {
              const isActive = activeOverlayIds.includes(section.id);
              const { stats } = section;
              return (
                <button
                  key={section.id}
                  type="button"
                  className={`overlay-toggle-pill ${isActive ? 'is-active' : ''}`}
                  style={{ '--overlay-color': section.color }}
                  onClick={() => toggleOverlay(section.id)}
                  aria-pressed={isActive}
                >
                  <span className="overlay-pill-title">{section.shortName}</span>
                  <span className="overlay-pill-subtitle">{section.subtitle}</span>
                  <span className="overlay-pill-metric">
                    {formatDistanceStat(stats.distance)} · Max {formatNumberStat(stats.maxElevation)}'
                  </span>
                  <span className="overlay-pill-metric overlay-pill-metric--gain">
                    +{formatNumberStat(stats.elevationGain)}' / -{formatNumberStat(stats.elevationLoss)}'
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {activeOverlaySections.length > 0 && (
        <div className="overlay-legend">
          <div className="overlay-legend-header">
            <span className="overlay-legend-title">Active comparison overlays</span>
            <span className="overlay-legend-note">Secondary lines = other options we rejected</span>
          </div>
          <div className="overlay-legend-grid">
            {activeOverlaySections.map((section) => (
              <div key={`legend-${section.id}`} className="overlay-legend-item">
                <span className="overlay-color-swatch" style={{ backgroundColor: section.color }}></span>
                <div>
                  <p className="overlay-legend-name">{section.name}</p>
                  <p className="overlay-legend-metric">
                    {formatDistanceStat(section.stats.distance)} · Peak {formatNumberStat(section.stats.maxElevation)}'
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="overlay-legend-footnote">Profiles double-checked against <strong>#file:Original-DDG-PCT-PDF.txt</strong> and Garmin GPX extracts.</p>
        </div>
      )}

      {/* Main Profile Chart */}
      <div className="elevation-profile-container" ref={containerRef}>
        {hasProfile ? (
          <ChartSVG
            width={width}
            height={height}
            margin={margin}
            xScale={xScale}
            yScale={yScale}
            chartMaxElevation={chartMaxElevation}
            chartMinElevation={chartMinElevation}
            minElevation={minElevation}
            yTicks={yTicks}
            xTicks={xTicks}
            hoverX={hoverX}
            hoverMeta={hoverMeta}
            hoveredCamp={hoveredCamp}
            allMarkers={allMarkers}
            daySegments={daySegments}
            handleMouseMove={handleMouseMove}
            handleMouseLeave={handleMouseLeave}
            setHoveredCamp={setHoveredCamp}
            formatElevation={formatElevation}
            formatGrade={formatGrade}
            getGradeColor={getGradeColor}
            getGradeClass={getGradeClass}
            getAltitudeZone={getAltitudeZone}
            DAY_COLORS={DAY_COLORS}
            ALTITUDE_ZONES={ALTITUDE_ZONES}
            overlayPaths={overlayPaths}
            linePath={linePath}
            areaPath={areaPath}
          />
        ) : (
          <div className="elevation-profile-empty">
            <p className="note">Loading Section O elevation data (Mile 1420.7 → 1472.7)...</p>
          </div>
        )}
      </div>
      
      {/* Hover readout bar */}
      <ReadoutBar
        hoverMeta={hoverMeta}
        formatElevation={formatElevation}
        formatGrade={formatGrade}
        getGradeColor={getGradeColor}
        getAltitudeZone={getAltitudeZone}
      />

      {/* Day segment legend */}
      <DayLegend daySegments={daySegments} />

      {/* Altitude Zone Legend */}
      <AltitudeLegend />

      <p className="elevation-source-note">
        📊 Elevation from Garmin COURSE_334289912.gpx · Cross-checked with Halfmile PCT dataset · Grade difficulty: 
        <span className="grade-key grade-easy">●Easy &lt;5%</span>
        <span className="grade-key grade-moderate">●Moderate 5-10%</span>
        <span className="grade-key grade-steep">●Steep 10-15%</span>
        <span className="grade-key grade-brutal">●Brutal &gt;15%</span>
      </p>
    </section>
  );
};

ElevationProfile.propTypes = {
  hikingTrail: PropTypes.arrayOf(PropTypes.array),
  campPoints: PropTypes.arrayOf(PropTypes.shape({
    properties: PropTypes.object
  })),
  townPins: PropTypes.arrayOf(PropTypes.object),
  transportPoints: PropTypes.arrayOf(PropTypes.object),
  waterSources: PropTypes.arrayOf(PropTypes.object),
  connectivityZones: PropTypes.arrayOf(PropTypes.object),
  onHover: PropTypes.func
};

export default ElevationProfile;
