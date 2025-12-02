import React, { useMemo, useState, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { scaleLinear } from 'd3-scale';
import sectionProfiles from '../data/sectionProfiles.json';

const MILES_TO_METERS = 1609.34;
const METERS_TO_FEET = 3.28084;

// ═══════════════════════════════════════════════════════════════════════════════
// ALTITUDE PHYSIOLOGY ZONES
// Based on wilderness medicine standards (Wilderness Medical Society guidelines)
// ═══════════════════════════════════════════════════════════════════════════════
// Reference: Luks AM, et al. "Wilderness Medical Society Practice Guidelines for
// the Prevention and Treatment of Acute Altitude Illness." Wilderness Environ Med. 2019
const ALTITUDE_ZONES = [
  {
    id: 'sea-level',
    name: 'Near Sea Level',
    minFt: 0,
    maxFt: 4000,
    color: 'rgba(76, 175, 80, 0.12)',   // Green - safe zone
    borderColor: '#4CAF50',
    risk: 'none',
    description: 'No altitude-related risk',
    icon: '✓'
  },
  {
    id: 'moderate',
    name: 'Moderate Altitude',
    minFt: 4000,
    maxFt: 8000,
    color: 'rgba(255, 193, 7, 0.12)',   // Yellow - mild caution
    borderColor: '#FFC107',
    risk: 'low',
    description: 'Mild symptoms possible in sensitive individuals',
    icon: '◐',
    symptoms: ['Slight breathlessness on exertion', 'Possible mild headache'],
    mitigation: 'Stay hydrated, pace yourself'
  },
  {
    id: 'high',
    name: 'High Altitude',
    minFt: 8000,
    maxFt: 12000,
    color: 'rgba(255, 152, 0, 0.15)',   // Orange - AMS possible
    borderColor: '#FF9800',
    risk: 'moderate',
    description: 'AMS common without acclimatization',
    icon: '⚠️',
    symptoms: ['Headache', 'Nausea', 'Fatigue', 'Dizziness', 'Sleep disturbance'],
    mitigation: 'Ascend gradually (<1,600ft sleeping elevation gain/day), hydrate, consider Diamox'
  },
  {
    id: 'very-high',
    name: 'Very High Altitude',
    minFt: 12000,
    maxFt: 18000,
    color: 'rgba(244, 67, 54, 0.18)',   // Red - serious risk
    borderColor: '#F44336',
    risk: 'high',
    description: 'Significant AMS risk; HACE/HAPE possible',
    icon: '🔺',
    symptoms: ['Severe headache', 'Confusion', 'Ataxia', 'Persistent cough', 'Chest tightness'],
    mitigation: 'Mandatory acclimatization, Diamox prophylaxis, descent if symptoms worsen'
  }
];

// Get altitude zone for a given elevation
function getAltitudeZone(elevationFt) {
  return ALTITUDE_ZONES.find(z => elevationFt >= z.minFt && elevationFt < z.maxFt) || ALTITUDE_ZONES[0];
}

// DDG Team - Dan, Drew, Gunnar
const DDG_TEAM = [
  { id: 'dan', name: 'Dan', emoji: '🧔', role: 'Trail Boss', color: '#2E7D32' },
  { id: 'drew', name: 'Drew', emoji: '🏔️', role: 'Navigator', color: '#1565C0' },
  { id: 'gunnar', name: 'Gunnar', emoji: '⚡', role: 'Pace Setter', color: '#F57C00' }
];

// Day segment colors for visual distinction
const DAY_COLORS = [
  { fill: 'rgba(46, 125, 50, 0.15)', stroke: '#2E7D32' },   // Day 1 - Forest green
  { fill: 'rgba(21, 101, 192, 0.15)', stroke: '#1565C0' },  // Day 2 - Mountain blue
  { fill: 'rgba(245, 124, 0, 0.15)', stroke: '#F57C00' },   // Day 3 - Sunset orange
  { fill: 'rgba(156, 39, 176, 0.15)', stroke: '#9C27B0' },  // Day 4 - Alpine purple
  { fill: 'rgba(0, 150, 136, 0.15)', stroke: '#009688' },   // Day 5 - Vista teal
  { fill: 'rgba(211, 47, 47, 0.15)', stroke: '#D32F2F' }    // Day 6 - Summit red
];

const OVERLAY_SECTION_ORDER = ['section-e', 'section-g', 'section-i', 'section-j'];
const OVERLAY_COLORS = ['#C62828', '#6A1B9A', '#1565C0', '#EF6C00'];

function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

// Calculate grade difficulty rating
function getGradeClass(gradePercent) {
  const absGrade = Math.abs(gradePercent);
  if (absGrade < 5) return 'easy';
  if (absGrade < 10) return 'moderate';
  if (absGrade < 15) return 'steep';
  return 'brutal';
}

function getGradeColor(gradePercent) {
  const absGrade = Math.abs(gradePercent);
  if (absGrade < 5) return '#4CAF50';
  if (absGrade < 10) return '#FFC107';
  if (absGrade < 15) return '#FF9800';
  return '#F44336';
}

const ElevationProfile = ({ hikingTrail, campPoints = [], onHover }) => {
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
  const height = 280;
  const margin = { top: 30, right: 50, bottom: 45, left: 70 };

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
    
    console.log('Section O elevation range:', minElevation, 'to', maxElevation, 'ft');
    if (activeOverlaySections.length) {
      activeOverlaySections.forEach(sec => {
        const secMin = Math.min(...sec.profile.map(p => p.ele));
        const secMax = Math.max(...sec.profile.map(p => p.ele));
        console.log(sec.name, 'elevation range:', secMin, 'to', secMax, 'ft');
      });
    }
    
    return {
      totalMiles: totalDistance,
      totalGain: lastPoint.cumulativeGain,
      totalLoss: lastPoint.cumulativeLoss,
      highPoint: maxElevation,
      lowPoint: minElevation,
      avgGrade: avgGrade
    };
  }, [profileData, totalDistance, maxElevation, minElevation, activeOverlaySections]);

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
    
    for (let i = 0; i < sortedCamps.length - 1; i++) {
      const startMile = sortedCamps[i].properties?.routeMile ?? 0;
      const endMile = sortedCamps[i + 1].properties?.routeMile ?? startMile;
      const day = sortedCamps[i + 1].properties?.day ?? i + 1;
      const colorIdx = (day - 1) % DAY_COLORS.length;
      
      // Find profile points within this segment
      const segmentPoints = profileData.filter(p => p.dist >= startMile && p.dist <= endMile);
      if (segmentPoints.length < 2) continue;
      
      const x1 = xScale(startMile);
      const x2 = xScale(endMile);
      
      segments.push({
        day,
        startMile,
        endMile,
        x1,
        x2,
        color: DAY_COLORS[colorIdx],
        name: sortedCamps[i + 1].properties?.name ?? `Day ${day}`
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
    const point = profileData.find((d) => d.dist >= mile);
    return (point ?? profileData[profileData.length - 1]).ele;
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
      
      // Find the closest point
      let closestPoint = profileData[0];
      let minDiff = Math.abs(profileData[0].dist - mile);
      
      for (const p of profileData) {
        const diff = Math.abs(p.dist - mile);
        if (diff < minDiff) {
          minDiff = diff;
          closestPoint = p;
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
      {/* DDG Team Header */}
      <header className="elevation-profile-header">
        <div className="elevation-profile-title-block">
          <div className="elevation-profile-badge">
            <span className="badge-icon">🥾</span>
            <span className="badge-text">DDG PCT MISSION</span>
          </div>
          <h3 className="elevation-profile-title">Section O: Burney Falls → Castle Crags</h3>
          <p className="elevation-endpoints">{startLabel} → {finishLabel}</p>
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
              const segPoints = profileData.filter(p => p.dist >= seg.startMile && p.dist <= seg.endMile);
              if (segPoints.length < 2) return null;
              
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
            {campMarkers.map((marker) => (
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
                
                {/* Marker circle */}
                <circle 
                  cx={marker.cx} 
                  cy={marker.cy} 
                  r={hoveredCamp === marker.id ? 8 : 6}
                  fill="#fff" 
                  stroke={marker.color} 
                  strokeWidth="3"
                  filter="url(#markerShadow)"
                  className="camp-marker-circle"
                  style={{ transition: 'r 0.2s ease, transform 0.2s ease' }}
                />
                
                {/* Camp icon */}
                <text
                  x={marker.cx}
                  y={marker.cy - 16}
                  textAnchor="middle"
                  fontSize="14"
                >
                  {marker.type === 'Trailhead' ? '🚗' : marker.type === 'Finish' ? '🏁' : '⛺'}
                </text>
                
                {/* Tooltip on hover */}
                {hoveredCamp === marker.id && (
                  <g className="camp-tooltip">
                    <rect
                      x={marker.cx - 80}
                      y={marker.cy - 70}
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
                      y={marker.cy - 52}
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight="700"
                      fill="#333"
                    >
                      {marker.name?.length > 20 ? marker.name.slice(0, 18) + '…' : marker.name}
                    </text>
                    <text
                      x={marker.cx}
                      y={marker.cy - 38}
                      textAnchor="middle"
                      fontSize="10"
                      fill="#666"
                    >
                      Mile {marker.mile.toFixed(1)} · {formatElevation(marker.elevation)}
                    </text>
                  </g>
                )}
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
        ) : (
          <div className="elevation-profile-empty">
            <p className="note">Loading Section O elevation data (Mile 1420.7 → 1502.0)...</p>
          </div>
        )}
      </div>
      
      {/* Hover readout bar */}
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

      {/* Day segment legend */}
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

      {/* Altitude Zone Legend */}
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
  onHover: PropTypes.func
};

export default ElevationProfile;
