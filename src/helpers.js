import fs from 'fs/promises';
import path from 'path';
import { extractUrls } from './utils/urls.js';

/**
 * Write a file to the filesystem
 * @param {string} content - File content to write
 * @param {string} filename - Target filename
 * @param {string} directory - Target directory (default: current)
 */
export const extractFile = async (content, filename = 'loc.py', directory = './') => {
  try {
    const filePath = path.join(directory, filename);
    await fs.writeFile(filePath, content, 'utf8');
    console.log(`File written successfully: ${filePath}`);
  } catch (error) {
    console.error('Error writing file:', error.message);
    throw new Error(`Failed to write file: ${error.message}`);
  }
};

/**
 * Generate Locust tasks from links
 * @param {string[]} links - Array of URLs to test
 * @returns {string} Generated Locust task code
 */
export const generateTasks = links => {
  if (!Array.isArray(links) || links.length === 0) {
    return '';
  }

  return links
    .map(
      (link, index) => `
    @task(${index + 1})
    def f${index + 1}(self):
        self.client.get("${link}")
        `
    )
    .join('');
};

/**
 * Generate complete Locust test file
 * @param {string} tasks - Generated task code
 * @returns {string} Complete Locust test file
 */
export const generateFile = tasks => {
  return `import random
from locust import HttpUser, task, between

class QuickstartUser(HttpUser):
    wait_time = between(5, 9)
    
    ${tasks}
`;
};

/**
 * Generate k6 test file (placeholder for future implementation)
 * @param {string} tasks - Generated task code
 * @returns {string} Complete k6 test file
 */
export const generateK6File = tasks => {
  return `import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
};

export default function () {
  ${tasks}
  
  sleep(1);
}`;
};

export default {
  extractUrls,
  extractFile,
  generateTasks,
  generateFile,
  generateK6File,
};
