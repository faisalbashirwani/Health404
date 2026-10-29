import clinicsData from '../data/delhi_clinics.json';

const LANDMARKS = {
  dtu: [28.7499, 77.1170],
  'delhi technological university': [28.7499, 77.1170],
  shahbad: [28.7511, 77.1165],
  rohini: [28.7360, 77.1265],
  'rohini sector 16': [28.7360, 77.1265],
  'rohini sector 6': [28.7118, 77.1189],
  bawana: [28.7960, 77.0370],
  narela: [28.8415, 77.0945],
  samaypur: [28.7423, 77.1421],
  badli: [28.7423, 77.1421],
  jahangirpuri: [28.7289, 77.1648],
  pitampura: [28.6990, 77.1384],
  'ashok vihar': [28.6942, 77.1725],
  aiims: [28.5672, 77.2100],
  safdarjung: [28.5709, 77.2075],
  delhi: [28.7499, 77.1170]
};

export const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371.0;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
};

export const findNearestClinics = (lat, lon, topK = 3) => {
  const sorted = clinicsData.map(c => {
    const dist = haversineKm(lat, lon, c.latitude, c.longitude);
    return {
      ...c,
      distanceKm: dist,
      directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${c.latitude},${c.longitude}`
    };
  });

  sorted.sort((a, b) => a.distanceKm - b.distanceKm);
  return sorted.slice(0, topK);
};

export const findClinicsByQuery = (text, topK = 3) => {
  const lower = (text || '').toLowerCase();
  for (const [lm, coords] of Object.entries(LANDMARKS)) {
    if (lower.includes(lm)) {
      return {
        matchedLocation: lm.toUpperCase(),
        clinics: findNearestClinics(coords[0], coords[1], topK)
      };
    }
  }

  // Fallback to DTU coords
  return {
    matchedLocation: 'DTU / Rohini Area',
    clinics: findNearestClinics(LANDMARKS.dtu[0], LANDMARKS.dtu[1], topK)
  };
};

export const getAllClinics = () => clinicsData;
