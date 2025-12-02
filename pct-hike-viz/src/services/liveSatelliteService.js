const APPLE_SUPPORT_PROXY = 'https://r.jina.ai/';
const SOURCES = {
  emergencySos: 'https://support.apple.com/en-us/HT213426',
  roadside: 'https://support.apple.com/en-us/105098',
  messages: 'https://support.apple.com/en-us/120930'
};

const sanitize = (text = '') => text.replace(/\s+/g, ' ').trim();

const extractBetween = (text, startMarker, endMarker) => {
  const startIndex = text.indexOf(startMarker);
  if (startIndex === -1) return '';
  const sliced = text.slice(startIndex + startMarker.length);
  if (!endMarker) return sliced;
  const endIndex = sliced.indexOf(endMarker);
  return endIndex === -1 ? sliced : sliced.slice(0, endIndex);
};

const parseBulletLines = (section) => section
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line.startsWith('•'))
  .map((line) => sanitize(line.replace(/^•\s*/, '')));

const parseIosRequirementLines = (section) => {
  const matches = [...section.matchAll(/◦\s+([^:]+):\s+([^\n]+)/g)];
  return matches.map((match) => ({
    region: sanitize(match[1]),
    requirement: sanitize(match[2])
  }));
};

const parseEmergencySos = (text) => {
  const needsSection = extractBetween(text, '### What you need', "### Where it's available");
  const iosRequirements = parseIosRequirementLines(needsSection);
  const availabilitySection = extractBetween(text, "### Where it's available", '• You need to be in a place');
  const countryLineMatch = availabilitySection.match(/•\s+([^•]+)/);
  const countries = countryLineMatch
    ? countryLineMatch[1]
      .replace(/\.$/, '')
      .split(',')
      .map((entry) => sanitize(entry.replace(/^and\s+/i, '')))
    : [];
  const exceptionMatch = text.match(/Satellite connectivity isn't offered([^\n]+)/);
  return {
    iosRequirements,
    countries,
    exclusions: exceptionMatch ? sanitize(exceptionMatch[0]) : null
  };
};

const parseRoadside = (text) => {
  const needsSection = extractBetween(text, '### What you need', "### Where it's available");
  const iosRequirements = parseIosRequirementLines(needsSection);
  const availabilitySection = extractBetween(text, "### Where it's available", '1.');
  const countries = parseBulletLines(availabilitySection);
  return {
    iosRequirements,
    coverageNotes: countries
  };
};

const parseMessages = (text) => {
  const needsSection = extractBetween(text, '### What you need', '### Where its available');
  const iosRequirements = parseBulletLines(needsSection);
  const availabilitySection = extractBetween(text, '### Where its available', '1.');
  const countries = parseBulletLines(availabilitySection);
  return {
    iosRequirements,
    coverageNotes: countries
  };
};

const SOURCE_PARSERS = {
  emergencySos: parseEmergencySos,
  roadside: parseRoadside,
  messages: parseMessages
};

async function fetchViaProxy(url, signal) {
  const response = await fetch(`${APPLE_SUPPORT_PROXY}${url}`, {
    method: 'GET',
    signal,
    headers: {
      Accept: 'text/plain'
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to load live satellite data (HTTP ${response.status})`);
  }
  return response.text();
}

export async function fetchLiveSatelliteCoverage(signal) {
  const entries = await Promise.all(Object.entries(SOURCES).map(async ([key, url]) => {
    const rawText = await fetchViaProxy(url, signal);
    const parser = SOURCE_PARSERS[key];
    return [key, parser(rawText), url];
  }));

  const payload = entries.reduce((acc, [key, parsed, url]) => {
    acc[key] = {
      ...parsed,
      source: url
    };
    return acc;
  }, {});

  payload.updatedAt = new Date().toISOString();
  return payload;
}
