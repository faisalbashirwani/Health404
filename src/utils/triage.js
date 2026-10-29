import protocolsData from '../data/emergency_protocols.json';

export const checkEmergencyTriage = (text) => {
  if (!text || typeof text !== 'string') return { isEmergency: false, alert: null };

  const normalized = text.toLowerCase().trim();
  const categories = protocolsData.red_flag_categories || [];

  for (const cat of categories) {
    for (const kw of cat.keywords) {
      if (normalized.includes(kw.toLowerCase())) {
        return {
          isEmergency: true,
          alert: {
            category: cat.category,
            severity: cat.severity,
            guidanceEn: cat.guidance_en,
            guidanceHi: cat.guidance_hi,
            matchedTrigger: kw,
            helplines: protocolsData.emergency_helplines || []
          }
        };
      }
    }
  }

  return { isEmergency: false, alert: null };
};
