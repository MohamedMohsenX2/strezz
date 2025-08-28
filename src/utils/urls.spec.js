import { extractUrls, isInternalUrl, encodeUrl } from './urls.js';

describe('urls', () => {
  describe('extractUrls', () => {
    it('should filter and encode valid URLs', () => {
      const urls = ['/page1', '/page2', 'https://external.com', '/page3', undefined];
      const result = extractUrls(urls);

      expect(result).toEqual(['/page1', '/page2', '/page3']);
    });

    it('should handle empty input', () => {
      const result = extractUrls([]);
      expect(result).toEqual([]);
    });

    it('should handle non-array input', () => {
      const result = extractUrls(null);
      expect(result).toEqual([]);
    });

    it('should filter out non-string URLs', () => {
      const urls = ['/page1', 123, '/page2', null, '/page3'];
      const result = extractUrls(urls);

      expect(result).toEqual(['/page1', '/page2', '/page3']);
    });

    it('should filter out external URLs', () => {
      const urls = ['/page1', 'https://external.com', '/page2', 'http://other.com'];
      const result = extractUrls(urls);

      expect(result).toEqual(['/page1', '/page2']);
    });

    it('should encode URLs properly', () => {
      const urls = ['/page with spaces', '/page/with/slashes', '/page%20encoded'];
      const result = extractUrls(urls);

      expect(result).toEqual(['/page%20with%20spaces', '/page/with/slashes', '/page%20encoded']);
    });
  });

  describe('isInternalUrl', () => {
    it('should return true for internal URLs', () => {
      expect(isInternalUrl('/page1')).toBe(true);
      expect(isInternalUrl('/api/users')).toBe(true);
      expect(isInternalUrl('/')).toBe(true);
    });

    it('should return false for external URLs', () => {
      expect(isInternalUrl('https://external.com')).toBe(false);
      expect(isInternalUrl('http://other.com')).toBe(false);
      expect(isInternalUrl('//cdn.example.com')).toBe(false);
    });

    it('should return false for invalid inputs', () => {
      expect(isInternalUrl(null)).toBe(false);
      expect(isInternalUrl(undefined)).toBe(false);
      expect(isInternalUrl(123)).toBe(false);
      expect(isInternalUrl('')).toBe(false);
    });
  });

  describe('encodeUrl', () => {
    it('should encode URLs properly', () => {
      expect(encodeUrl('/page with spaces')).toBe('/page%20with%20spaces');
      expect(encodeUrl('/page/with/slashes')).toBe('/page/with/slashes');
      expect(encodeUrl('/page%20encoded')).toBe('/page%20encoded');
      expect(encodeUrl('/page+with+plus')).toBe('/page+with+plus');
    });

    it('should handle special characters', () => {
      expect(encodeUrl('/page?param=value&other=123')).toBe('/page?param=value&other=123');
      expect(encodeUrl('/page#fragment')).toBe('/page#fragment');
    });
  });
});
