import mythsData from '../data/myths_db.json';

export const checkHealthMyth = (text) => {
  if (!text || typeof text !== 'string') return { matched: false, myth: null };

  const textLower = text.toLowerCase();
  let bestMatch = null;
  let maxScore = 0;

  for (const myth of mythsData) {
    let matches = 0;
    for (const kw of myth.claim_keywords) {
      if (textLower.includes(kw.toLowerCase())) {
        matches++;
      }
    }

    if (matches > 0) {
      const score = matches / myth.claim_keywords.length;
      if (matches >= 2 || (matches === 1 && textLower.split(/\s+/).length <= 6)) {
        if (score > maxScore || (matches >= 2 && maxScore < 0.5)) {
          maxScore = Math.max(score, 0.6);
          bestMatch = myth;
        }
      }
    }
  }

  if (bestMatch && maxScore >= 0.3) {
    return { matched: true, myth: bestMatch };
  }

  return { matched: false, myth: null };
};

export const getAllMyths = () => mythsData;
