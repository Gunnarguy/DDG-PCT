export const normalizeCoordinatePair = (coordinates) => {
  const longitude = Array.isArray(coordinates)
    ? Number(coordinates[0])
    : Number(coordinates?.longitude ?? coordinates?.lng ?? coordinates?.lon);
  const latitude = Array.isArray(coordinates)
    ? Number(coordinates[1])
    : Number(coordinates?.latitude ?? coordinates?.lat);

  if (
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90
  ) {
    return null;
  }

  return [longitude, latitude];
};

export const normalizeTrailCoordinate = (coordinates) => {
  const pair = normalizeCoordinatePair(coordinates);
  if (coordinates?.[2] == null) return null;
  const elevation = Number(coordinates?.[2]);
  if (!pair || !Number.isFinite(elevation)) return null;
  return [...pair, elevation];
};

export const normalizeCoordinatePoint = (point) => {
  const coordinates = normalizeCoordinatePair(point?.coordinates);
  return coordinates ? { ...point, coordinates } : null;
};

export const normalizeFeaturePoint = (feature) => {
  const coordinates = normalizeCoordinatePair(feature?.geometry?.coordinates);
  if (!coordinates) return null;
  return {
    ...feature,
    geometry: {
      ...feature.geometry,
      coordinates,
    },
  };
};
