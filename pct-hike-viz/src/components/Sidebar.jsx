import { useState } from 'react';
import PropTypes from 'prop-types';
import GearPlanner from './GearPlanner';
import TripReadinessPanel from './TripReadinessPanel';
import SourceChips from './SourceChips';
import WildfireMonitor from './WildfireMonitor';
import TerrainAnalysis from './TerrainAnalysis';
import TransitPanel from './TransitPanel';
import { connectivityZones, satelliteDevices, getSignalBadgeClass, getSignalEmoji } from '../data/connectivityData';
import { ddgTeam, dayItinerary, tripStats, sectionOMeta, dataSources } from '../data/planContent';

const formatStatusLabel = (status = '') => status
  .split(/[\s-]+/)
  .filter(Boolean)
  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
  .join(' ');

// Present readable timestamps next to live Apple data refresh events.
const formatTimestamp = (isoString) => {
  if (!isoString) return 'pending refresh';
  try {
    return new Date(isoString).toLocaleString([], {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  } catch (error) {
    console.debug('Failed to humanize live satellite timestamp.', error);
    return isoString;
  }
};

// Config for each Apple feature surfaced in the sidebar so copy stays centralized.
const SATELLITE_SECTION_CONFIG = [
  {
    key: 'emergencySos',
    title: 'Emergency SOS via satellite',
    icon: '🚨',
    summary: 'Hands the call off to Apple relay teams when towers are out of range.',
    coverageKey: 'countries',
    coverageLabel: 'Where it works today'
  },
  {
    key: 'messages',
    title: 'Messages via satellite',
    icon: '✉️',
    summary: 'Keeps iMessage/SMS alive at 16 Pro Max altitudes without LTE.',
    coverageKey: 'coverageNotes',
    coverageLabel: 'Availability notes'
  },
  {
    key: 'roadside',
    title: 'Roadside Assistance via satellite',
    icon: '🛠️',
    summary: 'AAA dispatch hand-off for wilderness breakdowns.',
    coverageKey: 'coverageNotes',
    coverageLabel: 'Coverage partners'
  }
];

function Sidebar({
  style,
  waterSources,
  waterSourceMeta,
  scheduleOptions,
  travelPlan,
  resupplyPlan,
  permitChecklist,
  referenceLibrary,
  prepGuideMeta,
  gearBlueprint,
  packPlanner,
  riskPlaybook,
  nextStepsChecklist,
  liveSatelliteData,
  liveSatelliteStatus,
  liveSatelliteError,
  onSelectPoint,
  setPopupInfo
}) {
  const [activeTab, setActiveTab] = useState('mission');
  const tabs = [
    { id: 'mission', label: 'Mission' },
    { id: 'itinerary', label: 'Itinerary' },
    { id: 'safety', label: 'Safety' },
    { id: 'gear', label: 'Gear' },
    { id: 'logistics', label: 'Logistics' },
    { id: 'risks', label: 'Risks' },
    { id: 'library', label: 'Library' }
  ];

  const liveStatusCopy = {
    idle: 'Awaiting Apple live feed…',
    loading: 'Loading Apple satellite intel…',
    refreshing: 'Refreshing Apple coverage…',
    success: 'Live Apple feed synced',
    error: 'Apple feed offline—showing last known snapshot'
  };

  const renderRequirementList = (requirements) => {
    if (!requirements || requirements.length === 0) {
      return null;
    }

    const isObjectList = typeof requirements[0] === 'object';

    return (
      <ul className="mini-list">
        {requirements.map((entry, index) => {
          if (isObjectList) {
            const region = entry.region ?? `Region ${index + 1}`;
            const requirement = entry.requirement ?? '';
            return (
              <li key={`${region}-${requirement}-${index}`}>
                <strong>{region}:</strong> {requirement}
              </li>
            );
          }
          return (
            <li key={`${entry}-${index}`}>{entry}</li>
          );
        })}
      </ul>
    );
  };

  const renderCoverageList = (entries, label) => {
    if (!entries || entries.length === 0) {
      return null;
    }

    return (
      <div className="live-sat-block">
        <p className="subhead">{label}</p>
        <ul className="mini-list">
          {entries.slice(0, 6).map((entry) => (
            <li key={entry}>{entry}</li>
          ))}
        </ul>
      </div>
    );
  };

  const renderLiveSatelliteIntel = () => {
    const lastUpdated = liveSatelliteData?.updatedAt ? formatTimestamp(liveSatelliteData.updatedAt) : 'pending refresh';
    const hasLiveCards = SATELLITE_SECTION_CONFIG.some(({ key }) => liveSatelliteData?.[key]);

    return (
      <section className="sidebar-card sidebar-card--full">
        <div className="section-header">
          <h2>Live Satellite Coverage · iPhone 16 Pro Max</h2>
          <span className="section-subtitle">Direct Apple Support scrape every 30 min</span>
        </div>
        <div className={`live-sat-status live-sat-status--${liveSatelliteStatus}`}>
          <span className="status-dot" aria-hidden="true" />
          <div>
            <p className="live-sat-status__label">{liveStatusCopy[liveSatelliteStatus] ?? 'Status unknown'}</p>
            <p className="note">Last updated {lastUpdated}</p>
          </div>
        </div>
        {liveSatelliteError && (
          <p className="error-text">{liveSatelliteError.message}</p>
        )}
        {hasLiveCards ? (
          <div className="live-sat-grid">
            {SATELLITE_SECTION_CONFIG.map(({ key, title, icon, summary, coverageKey, coverageLabel }) => {
              const feature = liveSatelliteData?.[key];
              return (
                <article key={key} className="live-sat-card">
                  <div className="live-sat-card__head">
                    <span className="live-sat-card__icon" aria-hidden="true">{icon}</span>
                    <div>
                      <h3>{title}</h3>
                      <p className="note">{summary}</p>
                    </div>
                  </div>
                  {renderRequirementList(feature?.iosRequirements)}
                  {renderCoverageList(feature?.[coverageKey], coverageLabel)}
                  {feature?.exclusions && (
                    <p className="note live-sat-card__exclusion">{feature.exclusions}</p>
                  )}
                  {feature?.source && (
                    <a
                      className="live-sat-source"
                      href={feature.source}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Apple source ↗
                    </a>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <p className="note">Waiting for Apple Support to return live coverage details…</p>
        )}
        <p className="note">
          Static cell intel stays below so you can compare field-scouted towers vs the live Apple satellite feed in one glance.
        </p>
      </section>
    );
  };

  const renderSafety = () => (
    <>
      <section className="sidebar-card sidebar-card--full">
        <div className="section-header">
          <h2>Real-Time Safety Monitoring</h2>
          <span className="section-subtitle">Wildfire + air quality intel for Section O</span>
        </div>
        <p className="lede">
          Live wildfire perimeters and air quality monitoring across Section O. Data refreshes every 4 hours 
          from NIFC (National Interagency Fire Center) and EPA AirNow. Critical for trip go/no-go decisions 
          during fire season (July-October).
        </p>
      </section>
      
      <WildfireMonitor />
    </>
  );

  const renderMission = () => (
    <>
      <section className="sidebar-card sidebar-card--full hero-card">
        <p className="eyebrow">PCT {sectionOMeta.name} · Mile {sectionOMeta.pctMileStart} → {sectionOMeta.pctMileEnd}</p>
        <h1>DDG Trail Mission Control</h1>
        <p className="lede">
          All the intel from the family narrative plus the full NST Guide toolchain in one place. Use it to debate
          9-day vs 16-day options, stress-test logistics, and drop pins directly on the map without leaving this view.
        </p>
        
        {/* Section O Quick Facts */}
        <div className="section-o-facts">
          <div className="fact-grid">
            <div className="fact-item">
              <span className="fact-label">Route</span>
              <span className="fact-value">{sectionOMeta.route}</span>
            </div>
            <div className="fact-item">
              <span className="fact-label">Distance</span>
              <span className="fact-value">{sectionOMeta.gpsDistance} mi <span className="source-tag">GPS</span></span>
            </div>
            <div className="fact-item">
              <span className="fact-label">Region</span>
              <span className="fact-value">{sectionOMeta.region}</span>
            </div>
            <div className="fact-item">
              <span className="fact-label">Permits</span>
              <span className="fact-value">{sectionOMeta.permitType}</span>
            </div>
          </div>
          <div className="section-highlights">
            <span className="highlights-label">Highlights:</span>
            {sectionOMeta.highlights.slice(0, 3).map((h, i) => (
              <span key={i} className="highlight-chip">{h}</span>
            ))}
          </div>
        </div>
      </section>

      {/* DDG Team Cards */}
      <section className="sidebar-card sidebar-card--full ddg-team-section">
        <div className="section-header">
          <h2>The DDG Crew</h2>
          <span className="section-subtitle">Two generations, one trail: Dad + the boys</span>
        </div>
        <div className="ddg-team-grid">
          {ddgTeam.map((member) => (
            <article key={member.id} className="ddg-member-card" style={{ '--member-color': member.color }}>
              <div className="member-avatar">{member.emoji}</div>
              <div className="member-info">
                <h3>{member.name}</h3>
                <span className="member-role">{member.role}</span>
                <p className="member-bio">{member.bio}</p>
                <div className="member-experience">
                  <span className="exp-icon">🏔️</span>
                  <span>{member.experience}</span>
                </div>
                <div className="member-responsibilities">
                  {member.responsibilities.map((r, i) => (
                    <span key={i} className="responsibility-chip">{r}</span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <TripReadinessPanel
        packPlanner={packPlanner}
        nextStepsChecklist={nextStepsChecklist}
        permitChecklist={permitChecklist}
      />

      <section className="sidebar-card">
        <h2>Prep guide sync</h2>
        <p className="lede">
          This dashboard mirrors <strong>{prepGuideMeta.filename}</strong> so the visuals never drift from the written plan.
        </p>
        <p className="note">{prepGuideMeta.summary}</p>
        <p className="note">{prepGuideMeta.reminder}</p>
      </section>

      <section className="sidebar-card sidebar-card--full">
        <div className="section-header">
          <h2>Schedule Playbooks</h2>
          <span className="section-subtitle">Tap whichever cadence fits the crew</span>
        </div>
        <div className="schedule-grid">
          {scheduleOptions.map((option) => (
            <article key={option.title} className="schedule-card">
              <h3>{option.title}</h3>
              <p className="dates">{option.dates}</p>
              <p className="vibe">{option.vibe}</p>
              <ul>
                {option.highlights.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              {option.sourceIds && <SourceChips sourceIds={option.sourceIds} size="small" maxShow={3} />}
            </article>
          ))}
        </div>
      </section>

      <section className="sidebar-card sidebar-card--full">
        <h2>Next steps checklist</h2>
        <p className="lede">Identical to the closing checklist in {prepGuideMeta.filename}.</p>
        <ul className="checklist">
          {nextStepsChecklist.map((item) => (
            <li key={item.task}>
              <div className="checklist__row">
                <span className="checklist__task">{item.task}</span>
                <span className={`status-pill status-${item.status.replace(/\s+/g, '-').toLowerCase()}`}>
                  {formatStatusLabel(item.status)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Data Sources Reference */}
      <section className="sidebar-card sidebar-card--full sources-card">
        <div className="section-header">
          <h2>📚 Data Sources</h2>
          <span className="section-subtitle">Cross-reference the intel</span>
        </div>
        <div className="sources-grid">
          <div className="source-category">
            <h4>🗺️ Primary</h4>
            <p className="source-item">
              <strong>{dataSources.primary.name}</strong>
              <span className="source-desc">{dataSources.primary.description}</span>
            </p>
            <p className="source-item">
              <strong>{dataSources.gps.name}</strong>
              <span className="source-desc">{dataSources.gps.distance} mi measured • {dataSources.gps.pointCount.toLocaleString()} GPS points</span>
            </p>
          </div>
          <div className="source-category">
            <h4>🥾 Route Guides</h4>
            {dataSources.routes.slice(0, 4).map(src => (
              <a key={src.id} href={src.url} target="_blank" rel="noopener noreferrer" className="source-link">
                {src.name} ↗
              </a>
            ))}
          </div>
          <div className="source-category">
            <h4>💧 Water</h4>
            {dataSources.water.map(src => (
              <a key={src.id} href={src.url} target="_blank" rel="noopener noreferrer" className="source-link">
                {src.name} ↗
              </a>
            ))}
          </div>
          <div className="source-category">
            <h4>📋 Official</h4>
            {dataSources.official.map(src => (
              <a key={src.id} href={src.url} target="_blank" rel="noopener noreferrer" className="source-link">
                {src.name} ↗
              </a>
            ))}
          </div>
        </div>
      </section>
    </>
  );

  const getGradientColor = (gradient) => {
    switch (gradient) {
      case 'easy': return '#4CAF50';
      case 'moderate': return '#FFC107';
      case 'steep': return '#FF9800';
      case 'brutal': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const formatJurisdictionLabel = (label = '') => label
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const formatNearbyDistance = (distance) => {
    if (typeof distance !== 'number' || Number.isNaN(distance)) return null;
    if (distance >= 1) return `${distance.toFixed(1)} mi`;
    return `${Math.round(distance * 5280)} ft`;
  };

  const renderItinerary = () => (
    <>
      {/* Trip Stats Overview */}
      <section className="sidebar-card sidebar-card--full trip-stats-card">
        <div className="section-header">
          <div className="trip-stats-title-row">
            <div className="ddg-avatars-mini">
              {ddgTeam.map(m => (
                <span key={m.id} className="ddg-avatar-mini" style={{ backgroundColor: m.color }} title={m.name}>
                  {m.emoji}
                </span>
              ))}
            </div>
            <div>
              <h2>DDG Section O Mission</h2>
              <span className="section-subtitle">Burney Falls → Castle Crags · {tripStats.totalMiles} miles</span>
            </div>
          </div>
        </div>
        
        <div className="trip-stats-grid">
          <div className="trip-stat">
            <span className="stat-value">{tripStats.hikingDays}</span>
            <span className="stat-label">Days Hiking</span>
          </div>
          <div className="trip-stat">
            <span className="stat-value">{tripStats.totalMiles}</span>
            <span className="stat-label">Total Miles</span>
          </div>
          <div className="trip-stat">
            <span className="stat-value">{tripStats.avgMilesPerDay.toFixed(1)}</span>
            <span className="stat-label">Avg/Day</span>
          </div>
          <div className="trip-stat">
            <span className="stat-value">{(tripStats.totalGain/1000).toFixed(1)}k</span>
            <span className="stat-label">Elev Gain</span>
          </div>
          <div className="trip-stat">
            <span className="stat-value">{tripStats.highPoint.elevation.toLocaleString()}'</span>
            <span className="stat-label">High Point</span>
          </div>
          <div className="trip-stat">
            <span className="stat-value">{tripStats.waterSourceCount}</span>
            <span className="stat-label">Water Sources</span>
          </div>
        </div>

        <div className="trip-connectivity-warning">
          <span className="warning-icon">📵</span>
          <span>{tripStats.connectivityBlackoutMiles}+ miles with zero cell service — satellite comms required</span>
        </div>
      </section>

      {/* Day-by-Day Detailed Cards */}
      <section className="sidebar-card sidebar-card--full">
        <div className="section-header">
          <h2>Day-by-day plan</h2>
          <span className="section-subtitle">Tap cards for map flyto + detailed intel</span>
        </div>
        <div className="itinerary-list itinerary-list--detailed">
          {dayItinerary.map((day) => (
            <button
              type="button"
              key={day.day}
              className={`day-card day-card--detailed ${day.type === 'drive' ? 'day-card--drive' : ''}`}
              onClick={() => onSelectPoint(day.day)}
            >
              {/* Header Row */}
              <div className="day-card__header">
                <div className="day-card__day-info">
                  <span className="day-pill" style={{ backgroundColor: day.gradient ? getGradientColor(day.gradient) : undefined }}>
                    {day.label}
                  </span>
                  {day.gradient && (
                    <span className="gradient-badge" style={{ color: getGradientColor(day.gradient) }}>
                      {day.gradient}
                    </span>
                  )}
                </div>
                <div className="day-card__distance">
                  <span className="distance-value">{day.distance}</span>
                  <span className="distance-unit">{day.type === 'drive' ? 'hr drive' : 'mi'}</span>
                </div>
              </div>

              {/* Route */}
              <h3 className="day-card__route">{day.from} → {day.to}</h3>
              
              {/* Elevation Stats */}
              {day.type === 'hike' && (
                <div className="day-card__elevation-row">
                  <span className="elev-stat elev-start">
                    📍 {day.elevation.start.toLocaleString()}'
                  </span>
                  <span className="elev-arrow">→</span>
                  <span className="elev-stat elev-end">
                    🏕️ {day.elevation.end.toLocaleString()}'
                  </span>
                  <span className="elev-stat elev-gain">
                    ↗️ +{day.elevation.gain.toLocaleString()}'
                  </span>
                  <span className="elev-stat elev-loss">
                    ↘️ -{day.elevation.loss.toLocaleString()}'
                  </span>
                </div>
              )}

              {/* Terrain */}
              <p className="day-card__terrain">{day.terrain}</p>

              {/* Land Management Context */}
              {day.landManagement && (
                <div className="day-card__land">
                  <span className="land-chip">🗺️ {day.landManagement.zone}</span>
                  <span className="land-meta">
                    {day.landManagement.agency}
                    {day.landManagement.jurisdiction && (
                      <> · {formatJurisdictionLabel(day.landManagement.jurisdiction)}</>
                    )}
                  </span>
                </div>
              )}

              {/* Nearby Wikipedia intel */}
              {day.wikiNearby && day.wikiNearby.length > 0 && (
                <div className="day-card__wiki">
                  <span className="wiki-label">Nearby intel</span>
                  <ul className="wiki-list">
                    {day.wikiNearby.slice(0, 2).map((article) => (
                      <li key={article.title}>
                        <span className="wiki-topic">{article.title}</span>
                        {article.topic && <span className="wiki-detail"> · {article.topic}</span>}
                        {typeof article.distance === 'number' && (
                          <span className="wiki-distance">{formatNearbyDistance(article.distance)}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Water Intel */}
              {day.waterSources && day.waterSources.length > 0 && (
                <div className="day-card__water">
                  <div className="water-header">
                    <span className="water-icon">💧</span>
                    <span className="water-carry">{day.waterCarry}</span>
                  </div>
                  <ul className="water-sources-mini">
                    {day.waterSources.map((src, i) => (
                      <li key={i}>{src}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Connectivity */}
              <div className="day-card__connectivity">
                <span className={`signal-dot ${day.connectivity.verizon !== 'none' ? 'has-signal' : 'no-signal'}`} title={`Verizon: ${day.connectivity.verizon}`}>V</span>
                <span className={`signal-dot ${day.connectivity.att !== 'none' ? 'has-signal' : 'no-signal'}`} title={`AT&T: ${day.connectivity.att}`}>A</span>
                <span className={`signal-dot ${day.connectivity.tmobile !== 'none' ? 'has-signal' : 'no-signal'}`} title={`T-Mobile: ${day.connectivity.tmobile}`}>T</span>
                {day.connectivity.satellite && (
                  <span className="satellite-icon" title="Satellite available">📡</span>
                )}
              </div>

              {/* Camp Features */}
              {day.campFeatures && (
                <div className="day-card__features">
                  {day.campFeatures.slice(0, 3).map((feat, i) => (
                    <span key={i} className="feature-chip">{feat}</span>
                  ))}
                  {day.campFeatures.length > 3 && (
                    <span className="feature-chip feature-more">+{day.campFeatures.length - 3}</span>
                  )}
                </div>
              )}

              {/* Timing */}
              {day.timing && (
                <div className="day-card__timing">
                  <span>{day.timing.start} – {day.timing.end}</span>
                  <span>⏱️ {day.timing.movingTime} moving</span>
                </div>
              )}

              {/* Notes */}
              <p className="day-card__notes">{day.notes}</p>
              
              {/* Source Citations */}
              {day.sourceIds && day.sourceIds.length > 0 && (
                <div className="day-card__sources" onClick={(e) => e.stopPropagation()}>
                  <SourceChips sourceIds={day.sourceIds} size="small" maxShow={3} />
                </div>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Water Sources - Detailed List */}
      <section className="sidebar-card sidebar-card--full">
        <div className="section-header">
          <h2>Water Sources</h2>
          <span className="section-subtitle">{waterSourceMeta.count} reliable sources · {waterSourceMeta.mileRange}</span>
        </div>
        <div className="water-list">
          {waterSources.map((source) => (
            <button
              type="button"
              key={source.waypoint || source.mile}
              className="water-item"
              onClick={() => setPopupInfo(source)}
            >
              <div className="water-item__meta">
                <span className="water-icon">💧</span>
                <span className="mile-marker">Mile {source.mile}</span>
              </div>
              <h4>{source.name}</h4>
              <p className="note">{source.report}</p>
            </button>
          ))}
        </div>
        <p className="note water-source-note">
          Synced from {waterSourceMeta.sourceLabel}; last checked {waterSourceMeta.lastSynced}. Tap a source to drop the 💧 marker on the map.
        </p>
      </section>

      {/* Terrain Analysis - Slope-angle breakdown */}
      <TerrainAnalysis />
    </>
  );

  const renderGear = () => (
    <>
      <section className="sidebar-card">
        <h2>Gear &amp; equipment blueprint</h2>
        <p className="lede">Matches the “Gear &amp; Equipment Blueprint” chapter inside {prepGuideMeta.filename}.</p>
        <div className="gear-grid">
          {gearBlueprint.core.map((kit) => (
            <article key={kit.name} className="gear-card">
              <h3>{kit.name}</h3>
              <ul>
                {kit.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <h3 className="subhead">Personal packing priorities</h3>
        <ol className="priority-list">
          {gearBlueprint.personalPriorities.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
      </section>

      <section className="sidebar-card sidebar-card--full">
        <GearPlanner data={packPlanner} />
      </section>
    </>
  );

  const renderLogistics = () => (
    <>
      {renderLiveSatelliteIntel()}
      
      {/* Transit & Access Panel - NEW */}
      <TransitPanel />

      <section className="sidebar-card">
        <h2>Travel &amp; Shuttle Playbook</h2>
        {travelPlan.sourceIds && <SourceChips sourceIds={travelPlan.sourceIds} size="small" maxShow={3} />}
        <h3 className="subhead">Inbound</h3>
        <ul className="bullet-list bullet-list--sourced">
          {travelPlan.inbound.map((item, i) => {
            const step = typeof item === 'string' ? item : item.step;
            const stepSourceIds = typeof item === 'object' ? item.sourceIds : null;
            return (
              <li key={i}>
                <span>{step}</span>
                {stepSourceIds && <SourceChips sourceIds={stepSourceIds} size="small" maxShow={2} />}
              </li>
            );
          })}
        </ul>
        <h3 className="subhead">Exit strategy</h3>
        <ul className="bullet-list bullet-list--sourced">
          {travelPlan.exit.map((item, i) => {
            const step = typeof item === 'string' ? item : item.step;
            const stepSourceIds = typeof item === 'object' ? item.sourceIds : null;
            return (
              <li key={i}>
                <span>{step}</span>
                {stepSourceIds && <SourceChips sourceIds={stepSourceIds} size="small" maxShow={2} />}
              </li>
            );
          })}
        </ul>
        <p className="note">Trail angel intel: {travelPlan.trailAngelNotes}</p>
      </section>

      <section className="sidebar-card">
        <h2>Resupply Hub · {resupplyPlan.town}</h2>
        <p className="lede">{resupplyPlan.callouts}</p>
        {resupplyPlan.sourceIds && <SourceChips sourceIds={resupplyPlan.sourceIds} size="small" maxShow={3} />}
        <div className="two-column">
          <div>
            <h3 className="subhead">Access</h3>
            <ul className="bullet-list bullet-list--sourced">
              {resupplyPlan.access.map((item, i) => {
                const text = typeof item === 'string' ? item : item.item;
                const itemSourceIds = typeof item === 'object' ? item.sourceIds : null;
                return (
                  <li key={i}>
                    <span>{text}</span>
                    {itemSourceIds && <SourceChips sourceIds={itemSourceIds} size="small" maxShow={2} />}
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <h3 className="subhead">Services</h3>
            <ul className="bullet-list">
              {resupplyPlan.services.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="sidebar-card sidebar-card--full">
        <h2>Permit Checklist</h2>
        <div className="permit-grid">
          {permitChecklist.map((permit) => (
            <article key={permit.name} className="permit-card">
              <h3>{permit.name}</h3>
              <p className="tag">{permit.coverage}</p>
              <p><strong>Where:</strong> {permit.source}</p>
              <p><strong>Cost:</strong> {permit.cost}</p>
              <p>{permit.notes}</p>
              {permit.sourceIds && <SourceChips sourceIds={permit.sourceIds} size="small" maxShow={4} />}
            </article>
          ))}
        </div>
      </section>

      {/* Connectivity Timeline Visualization */}
      <section className="sidebar-card sidebar-card--full connectivity-timeline-card">
        <div className="section-header">
          <h2>Signal Timeline</h2>
          <span className="section-subtitle">Cell service availability along the route</span>
        </div>
        <div className="connectivity-timeline">
          <div className="timeline-track">
            {connectivityZones.map((zone, i) => {
              const nextZone = connectivityZones[i + 1];
              const hasSignal = zone.cellCoverage.verizon !== 'none' || zone.cellCoverage.att !== 'none';
              const segmentWidth = nextZone ? `${((nextZone.mile - zone.mile) / 90) * 100}%` : '5%';
              
              return (
                <div key={zone.mile} className="timeline-segment" style={{ width: segmentWidth }}>
                  <div 
                    className={`timeline-bar ${hasSignal ? 'has-signal' : 'no-signal'}`}
                    title={`${zone.name}: ${hasSignal ? 'Signal available' : 'No signal'}`}
                  />
                  <div className="timeline-marker">
                    <span className="marker-dot" style={{ backgroundColor: hasSignal ? '#4CAF50' : '#BDBDBD' }} />
                  </div>
                  <span className="timeline-label">{zone.name.split(' ')[0]}</span>
                </div>
              );
            })}
          </div>
          <div className="timeline-legend">
            <span className="legend-item"><span className="legend-dot signal-on" /> Cell service</span>
            <span className="legend-item"><span className="legend-dot signal-off" /> Satellite only</span>
          </div>
        </div>
        <p className="note">📱 Expect ~42 miles of complete cell blackout. iPhone 16 Pro Max satellite + Garmin InReach provide backup.</p>
      </section>

      <section className="sidebar-card sidebar-card--full">
        <div className="section-header">
          <h2>Cell Coverage Map</h2>
          <span className="section-subtitle">9 connectivity checkpoints along Section O</span>
        </div>
        <div className="connectivity-list">
          {connectivityZones.map((zone) => (
            <button
              type="button"
              key={zone.mile}
              className="connectivity-item"
              onClick={() => setPopupInfo({ ...zone, type: 'connectivity' })}
            >
              <div className="connectivity-header">
                <h4>{zone.name}</h4>
                <span className="mile-marker">Mile {zone.mile}</span>
              </div>
              <div className="signal-badges">
                <span className={`signal-badge ${getSignalBadgeClass(zone.cellCoverage.verizon)}`}>
                  {getSignalEmoji(zone.cellCoverage.verizon)} Verizon: {zone.cellCoverage.verizon}
                </span>
                <span className={`signal-badge ${getSignalBadgeClass(zone.cellCoverage.att)}`}>
                  {getSignalEmoji(zone.cellCoverage.att)} AT&T: {zone.cellCoverage.att}
                </span>
                <span className={`signal-badge ${getSignalBadgeClass(zone.cellCoverage.tmobile)}`}>
                  {getSignalEmoji(zone.cellCoverage.tmobile)} T-Mobile: {zone.cellCoverage.tmobile}
                </span>
              </div>
              {zone.satelliteCompatible && (
                <p className="satellite-note">📡 Satellite connectivity available</p>
              )}
              <p className="note">{zone.notes}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="sidebar-card sidebar-card--full">
        <h2>Satellite Communication Devices</h2>
        <p className="lede">Section O has ~70 miles with zero cell service. Satellite devices provide emergency SOS and two-way messaging in deep wilderness.</p>
        <div className="device-grid">
          {satelliteDevices.map((device) => (
            <article key={device.device} className="device-card">
              <h3>{device.device}</h3>
              <p className="device-cost">{device.cost}</p>
              <p className="device-compatibility"><strong>Compatibility:</strong> {device.compatibility}</p>
              <div className="device-features">
                {device.features.map((feature) => (
                  <span key={feature} className="feature-badge">{feature}</span>
                ))}
              </div>
              <p className="note">{device.notes}</p>
              <p className="trail-note"><strong>Trail intel:</strong> {device.trailNotes}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );

  const renderRisks = () => (
    <section className="sidebar-card sidebar-card--full">
      <h2>Risk &amp; contingency planning</h2>
      <p className="lede">Direct pull from the matching section in {prepGuideMeta.filename}.</p>
      <ul className="bullet-list">
        {riskPlaybook.map((risk) => (
          <li key={risk.title}>
            <strong>{risk.title}:</strong> {risk.detail}
            {risk.sourceIds && risk.sourceIds.length > 0 && (
              <SourceChips sourceIds={risk.sourceIds} size="small" />
            )}
          </li>
        ))}
      </ul>
    </section>
  );

  const renderLibrary = () => (
    <section className="sidebar-card sidebar-card--full">
      <h2>Reference Library</h2>
      <div className="link-columns">
        <div>
          <p className="subhead">Route Research</p>
          <ul>
            {referenceLibrary.routeResearch.map((link) => (
              <li key={link.href}><a href={link.href} target="_blank" rel="noreferrer">{link.label}</a></li>
            ))}
          </ul>
        </div>
        <div>
          <p className="subhead">Transport &amp; Resupply</p>
          <ul>
            {referenceLibrary.transportAndResupply.map((link) => (
              <li key={link.href}><a href={link.href} target="_blank" rel="noreferrer">{link.label}</a></li>
            ))}
          </ul>
        </div>
        <div>
          <p className="subhead">Permits</p>
          <ul>
            {referenceLibrary.permits.map((link) => (
              <li key={link.href}><a href={link.href} target="_blank" rel="noreferrer">{link.label}</a></li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );

  return (
    <aside className="sidebar" style={style}>
      <nav className="sidebar__tabs" aria-label="Mission control sections">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={tab.id === activeTab ? 'tab-btn is-active' : 'tab-btn'}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <div className="sidebar__sections">
        {activeTab === 'mission' && renderMission()}
        {activeTab === 'itinerary' && renderItinerary()}
        {activeTab === 'safety' && renderSafety()}
        {activeTab === 'gear' && renderGear()}
        {activeTab === 'logistics' && renderLogistics()}
        {activeTab === 'risks' && renderRisks()}
        {activeTab === 'library' && renderLibrary()}
      </div>
    </aside>
  );
}

Sidebar.propTypes = {
  style: PropTypes.object,
  waterSources: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string.isRequired,
    mile: PropTypes.number.isRequired,
    report: PropTypes.string.isRequired,
    waypoint: PropTypes.string
  })).isRequired,
  waterSourceMeta: PropTypes.shape({
    count: PropTypes.number.isRequired,
    mileRange: PropTypes.string.isRequired,
    sourceLabel: PropTypes.string.isRequired,
    lastSynced: PropTypes.string.isRequired
  }).isRequired,
  scheduleOptions: PropTypes.arrayOf(PropTypes.object).isRequired,
  travelPlan: PropTypes.shape({
    inbound: PropTypes.arrayOf(PropTypes.string).isRequired,
    exit: PropTypes.arrayOf(PropTypes.string).isRequired,
    trailAngelNotes: PropTypes.string.isRequired
  }).isRequired,
  resupplyPlan: PropTypes.shape({
    town: PropTypes.string.isRequired,
    access: PropTypes.arrayOf(PropTypes.string).isRequired,
    services: PropTypes.arrayOf(PropTypes.string).isRequired,
    callouts: PropTypes.string.isRequired
  }).isRequired,
  permitChecklist: PropTypes.arrayOf(PropTypes.object).isRequired,
  referenceLibrary: PropTypes.shape({
    routeResearch: PropTypes.arrayOf(PropTypes.object).isRequired,
    transportAndResupply: PropTypes.arrayOf(PropTypes.object).isRequired,
    permits: PropTypes.arrayOf(PropTypes.object).isRequired
  }).isRequired,
  prepGuideMeta: PropTypes.shape({
    filename: PropTypes.string.isRequired,
    repoLocation: PropTypes.string.isRequired,
    summary: PropTypes.string.isRequired,
    reminder: PropTypes.string.isRequired
  }).isRequired,
  gearBlueprint: PropTypes.shape({
    core: PropTypes.arrayOf(PropTypes.shape({
      name: PropTypes.string.isRequired,
      items: PropTypes.arrayOf(PropTypes.string).isRequired
    })).isRequired,
    personalPriorities: PropTypes.arrayOf(PropTypes.string).isRequired
  }).isRequired,
  packPlanner: PropTypes.shape({
    packName: PropTypes.string.isRequired,
    capacityLiters: PropTypes.number.isRequired,
    baseWeightGoalLbs: PropTypes.number.isRequired,
    consumablesStartLbs: PropTypes.number.isRequired,
    summary: PropTypes.string.isRequired,
    modules: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      weightLbs: PropTypes.number.isRequired,
      volumeLiters: PropTypes.number.isRequired,
      readiness: PropTypes.string.isRequired,
      focus: PropTypes.string.isRequired,
      items: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        detail: PropTypes.string.isRequired,
        weight: PropTypes.string.isRequired,
        defaultPacked: PropTypes.bool
      })).isRequired
    })).isRequired,
    stashZones: PropTypes.arrayOf(PropTypes.shape({
      label: PropTypes.string.isRequired,
      focus: PropTypes.string.isRequired,
      suggestions: PropTypes.arrayOf(PropTypes.string).isRequired
    })).isRequired,
    resourceLinks: PropTypes.arrayOf(PropTypes.shape({
      label: PropTypes.string.isRequired,
      href: PropTypes.string.isRequired
    })).isRequired
  }).isRequired,
  riskPlaybook: PropTypes.arrayOf(PropTypes.shape({
    title: PropTypes.string.isRequired,
    detail: PropTypes.string.isRequired
  })).isRequired,
  nextStepsChecklist: PropTypes.arrayOf(PropTypes.shape({
    task: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired
  })).isRequired,
  liveSatelliteData: PropTypes.shape({
    updatedAt: PropTypes.string,
    emergencySos: PropTypes.object,
    messages: PropTypes.object,
    roadside: PropTypes.object
  }),
  liveSatelliteStatus: PropTypes.oneOf(['idle', 'loading', 'refreshing', 'success', 'error']).isRequired,
  liveSatelliteError: PropTypes.instanceOf(Error),
  onSelectPoint: PropTypes.func.isRequired,
  setPopupInfo: PropTypes.func.isRequired
};

Sidebar.defaultProps = {
  liveSatelliteData: null,
  liveSatelliteError: null
};

export default Sidebar;
