import { jest } from '@jest/globals';

// Mock fs/promises
jest.mock('fs/promises', () => ({
  writeFile: jest.fn(),
}));

// Mock path
jest.mock('path', () => ({
  join: jest.fn(),
}));

// Import after mocking
import fs from 'fs/promises';
import path from 'path';
import { extractFile, generateTasks, generateFile, generateK6File } from './helpers.js';

describe('helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractFile', () => {
    it('should write file successfully', async () => {
      const content = 'test content';
      const filename = 'test.py';
      const directory = './test';

      // Mock the path.join function
      const mockJoin = jest.fn().mockReturnValue('./test/test.py');
      path.join = mockJoin;

      // Mock the fs.writeFile function
      const mockWriteFile = jest.fn().mockResolvedValue();
      fs.writeFile = mockWriteFile;

      await extractFile(content, filename, directory);

      expect(mockJoin).toHaveBeenCalledWith(directory, filename);
      expect(mockWriteFile).toHaveBeenCalledWith('./test/test.py', content, 'utf8');
    });

    it('should use default values', async () => {
      const content = 'test content';

      // Mock the path.join function
      const mockJoin = jest.fn().mockReturnValue('./loc.py');
      path.join = mockJoin;

      // Mock the fs.writeFile function
      const mockWriteFile = jest.fn().mockResolvedValue();
      fs.writeFile = mockWriteFile;

      await extractFile(content);

      expect(mockJoin).toHaveBeenCalledWith('./', 'loc.py');
      expect(mockWriteFile).toHaveBeenCalledWith('./loc.py', content, 'utf8');
    });

    it('should handle write errors', async () => {
      const content = 'test content';
      const error = new Error('Write failed');

      // Mock the path.join function
      const mockJoin = jest.fn().mockReturnValue('./test.py');
      path.join = mockJoin;

      // Mock the fs.writeFile function
      const mockWriteFile = jest.fn().mockRejectedValue(error);
      fs.writeFile = mockWriteFile;

      await expect(extractFile(content)).rejects.toThrow('Failed to write file: Write failed');
    });
  });

  describe('generateTasks', () => {
    it('should generate tasks for valid links', () => {
      const links = ['/page1', '/page2', '/page3'];
      const result = generateTasks(links);

      expect(result).toContain('@task(1)');
      expect(result).toContain('@task(2)');
      expect(result).toContain('@task(3)');
      expect(result).toContain('self.client.get("/page1")');
      expect(result).toContain('self.client.get("/page2")');
      expect(result).toContain('self.client.get("/page3")');
    });

    it('should handle empty links', () => {
      const result = generateTasks([]);
      expect(result).toBe('');
    });

    it('should handle non-array input', () => {
      const result = generateTasks(null);
      expect(result).toBe('');
    });
  });

  describe('generateFile', () => {
    it('should generate complete Locust file', () => {
      const tasks = 'test tasks';
      const result = generateFile(tasks);

      expect(result).toContain('from locust import HttpUser, task, between');
      expect(result).toContain('class QuickstartUser(HttpUser):');
      expect(result).toContain('wait_time = between(5, 9)');
      expect(result).toContain('test tasks');
    });
  });

  describe('generateK6File', () => {
    it('should generate complete k6 file', () => {
      const tasks = 'test tasks';
      const result = generateK6File(tasks);

      expect(result).toContain("import http from 'k6/http'");
      expect(result).toContain("import { check, sleep } from 'k6'");
      expect(result).toContain('export const options = {');
      expect(result).toContain('vus: 10');
      expect(result).toContain("duration: '30s'");
      expect(result).toContain('export default function () {');
      expect(result).toContain('test tasks');
      expect(result).toContain('sleep(1);');
    });
  });
});
