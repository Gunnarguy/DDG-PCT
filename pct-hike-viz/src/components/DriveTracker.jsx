import { useState, useEffect } from 'react';

/**
 * DriveTracker
 * Calculates real-time gas cost based on CA average from AAA and 
 * links out to Google Maps with live traffic for the route.
 */
function DriveTracker() {
  const [gasPrice, setGasPrice] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // 2024 Kia Sportage X-Pro Prestige (Gas) - 26 Highway MPG
  // 540 miles for the full Round Trip (Campbell -> SJC -> Burney Falls -> Campbell)
  const assumedMPG = 26;
  const oneWayMiles = 270;
  const roundTripMiles = oneWayMiles * 2;
  
  useEffect(() => {
    const fetchGasPrice = async () => {
      try {
        const url = encodeURIComponent('https://gasprices.aaa.com/?state=CA');
        const res = await fetch(`https://api.allorigins.win/get?url=${url}`);
        const data = await res.json();
        
        // Extract gas price from HTML string
        // class="numb">$4.567</h3>
        const match = data.contents.match(/class="numb">\$(\d+\.\d+)/);
        if (match && match[1]) {
          setGasPrice(parseFloat(match[1]));
        }
      } catch (err) {
        console.error("Failed to fetch gas prices", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchGasPrice();
  }, []);

  const totalCost = gasPrice ? (roundTripMiles / assumedMPG) * gasPrice : null;
  const mapUrl = "https://www.google.com/maps/dir/2800+Joseph+Ave,+Campbell,+CA/San+Jose+Mineta+International+Airport+(SJC),+San+Jose,+CA/Burney+Falls,+CA/";

  return (
    <div className="summary-card" style={{ background: 'var(--blue-50)', borderLeftColor: 'var(--blue-500)', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h4 style={{ margin: 0, color: 'var(--blue-900)' }}>🚙 Mikaela's Shuttle Tracker</h4>
        <a 
          href={mapUrl}
          target="_blank" 
          rel="noopener noreferrer"
          style={{ 
            background: 'var(--blue-600)', 
            color: 'white', 
            padding: '0.5rem 1rem', 
            borderRadius: '20px', 
            textDecoration: 'none',
            fontSize: '0.85rem',
            fontWeight: 'bold'
          }}
        >
          Open Live Traffic 🚦
        </a>
      </div>
      
      <p style={{ marginTop: 0, color: 'var(--stone-600)' }}>
        <strong>Vehicle:</strong> 2024 Kia Sportage X-Pro Prestige (26 MPG HWY)<br/>
        <strong>Route:</strong> 2800 Joseph Ave → SJC Airport → Burney Falls State Park <br/>
        <strong>Distance:</strong> {roundTripMiles} miles (Round Trip)
      </p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1rem' }}>
        <div style={{ background: 'white', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--stone-200)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--stone-500)', fontWeight: 'bold' }}>CA AVG GAS</div>
          <div style={{ fontSize: '1.25rem', color: 'var(--green-700)', fontWeight: 'bold' }}>
            {loading ? '...' : gasPrice ? `$${gasPrice.toFixed(2)}` : 'N/A'}
          </div>
        </div>
        
        <div style={{ background: 'white', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--stone-200)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--stone-500)', fontWeight: 'bold' }}>TOTAL COST</div>
          <div style={{ fontSize: '1.25rem', color: 'var(--green-700)', fontWeight: 'bold' }}>
            {loading ? '...' : totalCost ? `$${totalCost.toFixed(2)}` : 'N/A'}
          </div>
        </div>
        
        <div style={{ background: 'white', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--stone-200)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--stone-500)', fontWeight: 'bold' }}>ASSUMED MPG</div>
          <div style={{ fontSize: '1.25rem', color: 'var(--blue-700)', fontWeight: 'bold' }}>
            {assumedMPG}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DriveTracker;
