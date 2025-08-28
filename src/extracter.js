import got from 'got';
import * as cheerio from 'cheerio';

/**
 * Extract links from a given URL using web scraping
 * @param {string} url - The URL to extract links from
 * @returns {Promise<string[]>} Array of extracted links
 */
export const extractLinks = async url => {
  try {
    const response = await got(url);
    const html = response.body;
    const $ = cheerio.load(html);
    const linkObjects = $('a');
    const links = [];

    linkObjects.each((index, element) => {
      const href = $(element).attr('href');
      if (href) {
        links.push(href);
      }
    });

    return links;
  } catch (error) {
    console.error('Error extracting links:', error.message);
    return [];
  }
};

export default {
  extractLinks,
};
