import PropTypes from 'prop-types';

function ResourcesTab({ referenceLibrary }) {
  return (
    <section className="sidebar-card sidebar-card--full">
      <h2>Reference Library</h2>
      <div className="link-columns">
        <div>
          <p className="subhead">Route Research</p>
          <ul>
            {referenceLibrary.routeResearch.map((link) => (
              <li key={link.href}>
                <a href={link.href} target="_blank" rel="noreferrer">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="subhead">Transport &amp; Resupply</p>
          <ul>
            {referenceLibrary.transportAndResupply.map((link) => (
              <li key={link.href}>
                <a href={link.href} target="_blank" rel="noreferrer">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="subhead">Permits</p>
          <ul>
            {referenceLibrary.permits.map((link) => (
              <li key={link.href}>
                <a href={link.href} target="_blank" rel="noreferrer">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

ResourcesTab.propTypes = {
  referenceLibrary: PropTypes.object.isRequired,
};

export default ResourcesTab;
