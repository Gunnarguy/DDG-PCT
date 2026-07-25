import PropTypes from 'prop-types';
import { ddgTeam } from '../data/planContent';

const MODULE_WEIGHTS = {
  locked: 1,
  'dialing in': 0.65,
  'in-progress': 0.4
};

const CHECKLIST_WEIGHTS = {
  done: 1,
  completed: 1,
  'in-progress': 0.65,
  'up next': 0.45,
  pending: 0.25
};

const clampPercent = (value) => Math.round(Math.max(0, Math.min(1, value)) * 100);

function HikerReadinessCard({ member }) {
  return (
    <div className="hiker-readiness-card" style={{ '--hiker-color': member.color }}>
      <div className="hiker-readiness-avatar">
        {member.emoji}
      </div>
      <div className="hiker-readiness-info">
        <span className="hiker-readiness-name">{member.name}</span>
        <span className="hiker-readiness-role">{member.role}</span>
      </div>
      <div className="hiker-readiness-overall">
        <span className="overall-value">Not reported</span>
      </div>
    </div>
  );
}

HikerReadinessCard.propTypes = {
  member: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    role: PropTypes.string.isRequired,
    emoji: PropTypes.string.isRequired,
    color: PropTypes.string.isRequired
  }).isRequired
};

function ProgressMeter({ label, value, detail }) {
  return (
    <article className="readiness-metric">
      <header>
        <p className="metric-label">{label}</p>
        <span className="metric-value">{value}</span>
      </header>
      <div className="progress-track" aria-hidden="true">
        <div className="progress-fill" style={{ width: detail.percent }} />
      </div>
      <p className="metric-detail">{detail.text}</p>
    </article>
  );
}

ProgressMeter.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  detail: PropTypes.shape({
    percent: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired
  }).isRequired
};

function TripReadinessPanel({ packPlanner, nextStepsChecklist, permitChecklist }) {
  const modules = packPlanner.modules ?? [];
  const moduleScore = modules.reduce((sum, module) => {
    const weight = MODULE_WEIGHTS[module.readiness] ?? 0.5;
    return sum + weight;
  }, 0) / (modules.length || 1);
  const lockedModules = modules.filter((module) => module.readiness === 'locked').length;

  const allItems = modules.flatMap((module) => module.items ?? []);
  const packedItems = allItems.filter((item) => item.defaultPacked).length;

  const checklistScore = nextStepsChecklist.reduce((sum, task) => {
    const weight = CHECKLIST_WEIGHTS[task.status.toLowerCase()] ?? 0.25;
    return sum + weight;
  }, 0) / (nextStepsChecklist.length || 1);

  const checklistStatusTallies = nextStepsChecklist.reduce((acc, task) => {
    const key = task.status.toLowerCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const totalPermits = permitChecklist.length;

  const metrics = [
    {
      label: 'Gear modules locked',
      value: `${lockedModules} / ${modules.length}`,
      detail: {
        percent: `${clampPercent(moduleScore)}%`,
        text: 'Shelter + sleep already locked, kitchen + layers dialed next.'
      }
    },
    {
      label: 'Packed-by-default items',
      value: `${packedItems} / ${allItems.length}`,
      detail: {
        percent: `${clampPercent(packedItems / (allItems.length || 1))}%`,
        text: 'Toggle default-packed flags in the gear planner to adjust.'
      }
    },
    {
      label: 'Next-step readiness',
      value: `${clampPercent(checklistScore)}%`,
      detail: {
        percent: `${clampPercent(checklistScore)}%`,
        text: `Statuses · ${Object.entries(checklistStatusTallies).map(([status, count]) => `${status}:${count}`).join(' · ')}`
      }
    },
    {
      label: 'Permits queued',
      value: `${totalPermits}`,
      detail: {
        percent: `${clampPercent(totalPermits / Math.max(totalPermits, 4))}%`,
        text: 'Track local-rule confirmation and keep paper copies of every required permit.'
      }
    }
  ];

  return (
    <section className="sidebar-card sidebar-card--full readiness-card">
      <div className="section-header">
        <div>
          <p className="eyebrow">Trip readiness</p>
          <h2>Mission control dashboard</h2>
        </div>
        <p className="section-subtitle">Auto-updates as data changes</p>
      </div>
      
      {/* DDG Team Readiness */}
      <div className="ddg-readiness-section">
        <h3 className="readiness-subheader">Team Status</h3>
        <div className="ddg-readiness-grid">
          {ddgTeam.map((member) => (
            <HikerReadinessCard key={member.id} member={member} />
          ))}
        </div>
        <div className="readiness-legend">
          <span className="legend-item"><span className="legend-icon">🎒</span> Gear</span>
          <span className="legend-item"><span className="legend-icon">📋</span> Permits</span>
          <span className="legend-item"><span className="legend-icon">💪</span> Fitness</span>
        </div>
      </div>

      {/* Mission Metrics */}
      <h3 className="readiness-subheader">Mission Metrics</h3>
      <div className="readiness-grid">
        {metrics.map((metric) => (
          <ProgressMeter
            key={metric.label}
            label={metric.label}
            value={metric.value}
            detail={metric.detail}
          />
        ))}
      </div>
      <div className="readiness-footer">
        <p>
          Base weight goal <strong>{packPlanner.baseWeightGoalLbs} lb</strong> · Consumables start{' '}
          <strong>{packPlanner.consumablesStartLbs} lb</strong> · Pack capacity <strong>{packPlanner.capacityLiters} L</strong>
        </p>
      </div>
    </section>
  );
}

TripReadinessPanel.propTypes = {
  packPlanner: PropTypes.shape({
    baseWeightGoalLbs: PropTypes.number,
    consumablesStartLbs: PropTypes.number,
    capacityLiters: PropTypes.number,
    modules: PropTypes.arrayOf(PropTypes.shape({
      readiness: PropTypes.string,
      items: PropTypes.arrayOf(PropTypes.shape({
        defaultPacked: PropTypes.bool
      }))
    }))
  }).isRequired,
  nextStepsChecklist: PropTypes.arrayOf(PropTypes.shape({
    status: PropTypes.string.isRequired
  })).isRequired,
  permitChecklist: PropTypes.arrayOf(PropTypes.object).isRequired
};

export default TripReadinessPanel;
