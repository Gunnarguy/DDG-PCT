/**
 * Land Management Boundaries for Section O
 * 
 * Documents which federal/state agencies manage each stretch of trail.
 * Useful for permit planning, fire restrictions, and understanding jurisdiction.
 * 
 * Data sources:
 * - USFS Land Management boundaries (ArcGIS)
 * - California State Parks boundaries
 * - Wilderness.net for designated wilderness areas
 */

export const landManagementZones = [
  {
    id: 'lassen-nf',
    name: 'Lassen National Forest',
    agency: 'U.S. Forest Service',
    mileStart: 1353.0, // Burney Falls SP boundary
    mileEnd: 1376.4,   // Hat Creek Rim exit
    trailMiles: 23.4,
    jurisdiction: 'federal',
    ranger_district: 'Hat Creek Ranger District',
    contact: {
      phone: '(530) 336-5521',
      website: 'https://www.fs.usda.gov/lassen'
    },
    regulations: {
      campfirePermit: 'Required May 1 - Jan 1',
      wildernessPermit: 'Not required (no designated wilderness)',
      bearCanisters: 'Recommended but not required',
      groupSizeLimit: 12,
      stockUse: 'Permitted with forage requirements'
    },
    features: [
      'Hat Creek Rim volcanic geology',
      'Old-growth ponderosa pine forests',
      'Seasonal wildflower meadows',
      'Pack stock shared trails'
    ],
    fireRestrictions: {
      typical: 'Stage 1 (campfires in designated rings only) during summer',
      checkUrl: 'https://www.fs.usda.gov/alerts/lassen/alerts-notices'
    },
    notes: 'First 23 miles of Section O. Known for volcanic landscapes and ponderosa pine corridors. Hat Creek Rim section is exposed with limited water—plan accordingly.',
    wikiArticles: [
      {
        title: 'Hat Creek (California)',
        url: 'https://en.wikipedia.org/wiki/Hat_Creek_(California)',
        snippet: 'Volcanic watershed feeding into Lassen Volcanic National Park system',
        distance: 1.2 // miles from trail
      },
      {
        title: 'Lassen Volcanic National Park',
        url: 'https://en.wikipedia.org/wiki/Lassen_Volcanic_National_Park',
        snippet: 'Active volcanic area; southernmost volcano in Cascade Range',
        distance: 18.5 // miles from trail
      }
    ]
  },
  {
    id: 'shasta-trinity-nf',
    name: 'Shasta-Trinity National Forest',
    agency: 'U.S. Forest Service',
    mileStart: 1376.4, // Hat Creek Rim exit
    mileEnd: 1430.0,   // Castle Crags SP approach
    trailMiles: 53.6,
    jurisdiction: 'federal',
    ranger_district: 'Mount Shasta Ranger District',
    contact: {
      phone: '(530) 926-4511',
      website: 'https://www.fs.usda.gov/stnf'
    },
    regulations: {
      campfirePermit: 'Required year-round',
      wildernessPermit: 'Required for Castle Crags Wilderness (self-issue at trailhead)',
      bearCanisters: 'Recommended but not required',
      groupSizeLimit: 12,
      stockUse: 'Permitted; grazing restrictions in wilderness'
    },
    features: [
      'Castle Crags Wilderness (designated 1984)',
      'Mt. Shasta viewsheds',
      'Granite spire formations',
      'High-elevation conifer forests',
      'Spring-fed meadows and creeks'
    ],
    fireRestrictions: {
      typical: 'Stage 2 common July-October (no campfires except in developed sites)',
      checkUrl: 'https://www.fs.usda.gov/alerts/stnf/alerts-notices'
    },
    notes: 'Longest section (54 miles). Includes Castle Crags Wilderness—self-issue permit required at boundary. Spectacular granite formations and Mt. Shasta views. Higher elevation = cooler temps and more reliable water.',
    wikiArticles: [
      {
        title: 'Castle Crags',
        url: 'https://en.wikipedia.org/wiki/Castle_Crags',
        snippet: 'Dramatic granite spires rising 6,000+ feet; popular rock climbing destination',
        distance: 0.3 // miles from trail
      },
      {
        title: 'Mount Shasta',
        url: 'https://en.wikipedia.org/wiki/Mount_Shasta',
        snippet: 'Potentially active stratovolcano, 14,179 ft; dominates Northern California skyline',
        distance: 12.0 // miles from trail
      },
      {
        title: 'Shasta-Trinity National Forest',
        url: 'https://en.wikipedia.org/wiki/Shasta%E2%80%93Trinity_National_Forest',
        snippet: 'Largest national forest in California; 2.2 million acres of diverse ecosystems',
        distance: 0.0 // trail runs through it
      }
    ],
    wilderness: {
      name: 'Castle Crags Wilderness',
      designated: 1984,
      acres: 10590,
      mileStart: 1420.0, // approximate wilderness boundary
      mileEnd: 1432.0,
      features: [
        'Granite dome geology',
        'Glacial cirques and tarns',
        'Old-growth Douglas fir',
        'Black bear habitat'
      ],
      regulations: {
        groupSize: 8, // stricter in wilderness
        campfireBan: 'Often in effect July-October',
        mechanizedEquipment: 'Prohibited (no bikes, drones)',
        leaveNoTrace: 'Pack out all waste including toilet paper'
      }
    }
  },
  {
    id: 'castle-crags-sp',
    name: 'Castle Crags State Park',
    agency: 'California State Parks',
    mileStart: 1430.0,  // PCT enters state park
    mileEnd: 1435.9,    // PCT exits to I-5 corridor
    trailMiles: 5.9,
    jurisdiction: 'state',
    contact: {
      phone: '(530) 235-2684',
      website: 'https://www.parks.ca.gov/?page_id=454',
      reservations: 'https://www.reservecalifornia.com'
    },
    regulations: {
      campfirePermit: 'Not required; fires allowed in developed sites only',
      wildernessPermit: 'Not applicable',
      bearCanisters: 'Not required; bear boxes provided in campground',
      groupSizeLimit: 8,
      dayUseHours: '6:00 AM - 10:00 PM',
      entryFee: '$10 per vehicle (thru-hikers often exempt with PCT permit)',
      stockUse: 'Prohibited in developed areas'
    },
    features: [
      'Developed campground with amenities',
      'Flush toilets and potable water',
      'Visitor center and interpretive programs',
      'Rock climbing access (permit required)',
      'Sacramento River access',
      'Historic Native American sites'
    ],
    fireRestrictions: {
      typical: 'Fires only in designated campground fire rings',
      checkUrl: 'https://www.parks.ca.gov/?page_id=454'
    },
    notes: 'Final 6 miles of Section O. Developed campground = great exit strategy (showers, water, trash). Day hikers and car campers common on weekends. Trail exits near I-5—coordinate shuttle pickup.',
    wikiArticles: [
      {
        title: 'Castle Crags State Park',
        url: 'https://en.wikipedia.org/wiki/Castle_Crags_State_Park',
        snippet: 'California State Park featuring 6,000-foot granite spires; established 1933',
        distance: 0.0 // trail runs through it
      },
      {
        title: 'Dunsmuir, California',
        url: 'https://en.wikipedia.org/wiki/Dunsmuir,_California',
        snippet: 'Historic railroad town at I-5 exit; resupply and lodging hub for PCT hikers',
        distance: 2.5 // miles from trail exit
      }
    ],
    amenities: {
      campground: {
        sites: 76,
        rvAccess: true,
        showers: true,
        flushToilets: true,
        bearBoxes: true,
        reservable: true,
        walkUp: 'Limited availability',
        cost: '$35-45 per night (2024 rates)'
      },
      dayUse: {
        parking: 'Large lot near visitor center',
        picnicAreas: true,
        trailAccess: 'Multiple trail systems',
        cost: '$10 per vehicle'
      }
    }
  }
];

/**
 * Get land management zone for a specific PCT mile
 */
export const getLandManagementZone = (pctMile) => {
  return landManagementZones.find(
    zone => pctMile >= zone.mileStart && pctMile <= zone.mileEnd
  );
};

/**
 * Get all Wikipedia articles within X miles of a point
 */
export const getNearbyWikipediaArticles = (pctMile, radiusMiles = 5) => {
  const articles = [];
  landManagementZones.forEach(zone => {
    if (pctMile >= zone.mileStart - radiusMiles && pctMile <= zone.mileEnd + radiusMiles) {
      if (zone.wikiArticles) {
        zone.wikiArticles.forEach(article => {
          if (article.distance <= radiusMiles) {
            articles.push({
              ...article,
              zone: zone.name,
              agency: zone.agency
            });
          }
        });
      }
      if (zone.wilderness?.wikiArticles) {
        zone.wilderness.wikiArticles.forEach(article => {
          if (article.distance <= radiusMiles) {
            articles.push({
              ...article,
              zone: `${zone.wilderness.name} (Wilderness)`,
              agency: zone.agency
            });
          }
        });
      }
    }
  });
  return articles;
};

/**
 * Get fire restriction summary for current date
 * (In production, would query USFS/CalFire APIs)
 */
export const getFireRestrictions = () => {
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const isFireSeason = currentMonth >= 6 && currentMonth <= 10; // June-October
  
  return {
    season: isFireSeason ? 'fire-season' : 'off-season',
    likelihood: isFireSeason ? 'Stage 2 restrictions likely' : 'Stage 1 or no restrictions',
    recommendation: isFireSeason 
      ? 'Use stove only. Check USFS alerts before departure.'
      : 'Campfires likely permitted in designated rings. Always check current restrictions.',
    checkUrls: landManagementZones.map(z => ({
      zone: z.name,
      url: z.fireRestrictions.checkUrl
    }))
  };
};

/**
 * Section O summary statistics
 */
export const sectionOLandManagement = {
  totalMiles: 82.9,
  zones: landManagementZones.length,
  breakdown: {
    federal: 77.0, // Lassen NF + Shasta-Trinity NF
    state: 5.9,    // Castle Crags SP
    wilderness: 12.0 // Castle Crags Wilderness portion
  },
  primaryJurisdiction: 'U.S. Forest Service',
  permitsSummary: {
    required: [
      'California Campfire Permit (free, online)',
      'Castle Crags Wilderness self-issue permit'
    ],
    recommended: [
      'Leave detailed itinerary with emergency contact',
      'Register at Castle Crags SP visitor center (thru-hiker courtesy)'
    ],
    notRequired: [
      'Bear canisters (but recommended)',
      'Advance wilderness reservations (self-issue only)'
    ]
  }
};

export default landManagementZones;
