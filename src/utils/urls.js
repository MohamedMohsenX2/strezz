/**
 * Extract and clean URLs from link data
 * @param {string[]} urls - Raw URL data
 * @returns {string[]} Cleaned and encoded URLs
 */
export const extractUrls = urls => {
  if (!Array.isArray(urls)) {
    return [];
  }

  return urls
    .filter(url => url && typeof url === 'string' && url.startsWith('/'))
    .map(url => encodeUrl(url));
};

/**
 * Validate if a URL is internal (starts with /)
 * @param {string} url - URL to validate
 * @returns {boolean} True if internal URL
 */
export const isInternalUrl = url => {
  if (!url || typeof url !== 'string') {
    return false;
  }
  return url.startsWith('/') && !url.startsWith('//');
};

/**
 * Encode URL safely, avoiding double encoding
 * @param {string} url - URL to encode
 * @returns {string} Encoded URL
 */
export const encodeUrl = url => {
  if (!url || typeof url !== 'string') {
    return '';
  }

  // Check if already encoded to avoid double encoding
  if (url.includes('%')) {
    try {
      // Try to decode first to see if it's already encoded
      const decoded = decodeURIComponent(url);
      // If decoding succeeds, re-encode to ensure consistency
      return encodeURI(decoded);
    } catch {
      // If decoding fails, it might be partially encoded, encode as-is
      return encodeURI(url);
    }
  }

  return encodeURI(url);
};

export default {
  extractUrls,
  isInternalUrl,
  encodeUrl,
};
