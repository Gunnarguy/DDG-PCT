export const MILES_TO_METERS = 1609.34;
export const METERS_TO_FEET = 3.28084;

// ═══════════════════════════════════════════════════════════════════════════════
// ALTITUDE PHYSIOLOGY ZONES
// Based on wilderness medicine standards (Wilderness Medical Society guidelines)
// ═══════════════════════════════════════════════════════════════════════════════
// Reference: Luks AM, et al. "Wilderness Medical Society Practice Guidelines for
// the Prevention and Treatment of Acute Altitude Illness." Wilderness Environ Med. 2019
export const ALTITUDE_ZONES = [
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
export function getAltitudeZone(elevationFt) {
  return ALTITUDE_ZONES.find(z => elevationFt >= z.minFt && elevationFt < z.maxFt) || ALTITUDE_ZONES[0];
}

// DDG Team - Dan, Drew, Gunnar
export const DDG_TEAM = [
  { id: 'dan', name: 'Dan', emoji: '🧔', role: 'Trail Boss', color: '#2E7D32' },
  { id: 'drew', name: 'Drew', emoji: '🏔️', role: 'Navigator', color: '#1565C0' },
  { id: 'gunnar', name: 'Gunnar', emoji: '⚡', role: 'Pace Setter', color: '#F57C00' }
];

// Day segment colors for visual distinction
export const DAY_COLORS = [
  { fill: 'rgba(46, 125, 50, 0.15)', stroke: '#2E7D32' },   // Day 1 - Forest green
  { fill: 'rgba(21, 101, 192, 0.15)', stroke: '#1565C0' },  // Day 2 - Mountain blue
  { fill: 'rgba(245, 124, 0, 0.15)', stroke: '#F57C00' },   // Day 3 - Sunset orange
  { fill: 'rgba(156, 39, 176, 0.15)', stroke: '#9C27B0' },  // Day 4 - Alpine purple
  { fill: 'rgba(0, 150, 136, 0.15)', stroke: '#009688' },   // Day 5 - Vista teal
  { fill: 'rgba(211, 47, 47, 0.15)', stroke: '#D32F2F' }    // Day 6 - Summit red
];

export const OVERLAY_SECTION_ORDER = ['section-e', 'section-g', 'section-i', 'section-j'];
export const OVERLAY_COLORS = ['#C62828', '#6A1B9A', '#1565C0', '#EF6C00'];

export function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
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

export function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

// Calculate grade difficulty rating
export function getGradeClass(gradePercent) {
  const absGrade = Math.abs(gradePercent);
  if (absGrade < 5) return 'easy';
  if (absGrade < 10) return 'moderate';
  if (absGrade < 15) return 'steep';
  return 'brutal';
}

export function getGradeColor(gradePercent) {
  const absGrade = Math.abs(gradePercent);
  if (absGrade < 5) return '#4CAF50';
  if (absGrade < 10) return '#FFC107';
  if (absGrade < 15) return '#FF9800';
  return '#F44336';
}
