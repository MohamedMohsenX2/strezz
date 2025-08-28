#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Build script for Strezz
 */
const build = async () => {
  try {
    console.log('🏗️  Building Strezz...');

    // Create dist directory
    const distDir = path.join(__dirname, '..', 'dist');
    await fs.mkdir(distDir, { recursive: true });

    // Copy source files
    const srcDir = path.join(__dirname, '..', 'src');
    const files = await fs.readdir(srcDir);

    for (const file of files) {
      if (file.endsWith('.js')) {
        const srcPath = path.join(srcDir, file);
        const destPath = path.join(distDir, file);
        await fs.copyFile(srcPath, destPath);
        console.log(`📁 Copied: ${file}`);
      }
    }

    // Copy configuration files
    const configFiles = ['strezz.config.json', 'env.example'];
    for (const configFile of configFiles) {
      const srcPath = path.join(__dirname, '..', configFile);
      const destPath = path.join(distDir, configFile);
      try {
        await fs.copyFile(srcPath, destPath);
        console.log(`📁 Copied: ${configFile}`);
      } catch (error) {
        console.log(`⚠️  Skipped: ${configFile} (not found)`);
      }
    }

    // Copy CLI binary
    const cliSrc = path.join(__dirname, '..', 'bin', 'strezz.js');
    const cliDest = path.join(distDir, 'strezz.js');
    await fs.copyFile(cliSrc, cliDest);
    console.log('📁 Copied: CLI binary');

    // Make CLI executable
    try {
      await fs.chmod(cliDest, 0o755);
      console.log('🔒 Made CLI executable');
    } catch (error) {
      console.log('⚠️  Could not make CLI executable (non-critical)');
    }

    // Create package.json for dist
    const packageJson = {
      name: 'strezz-dist',
      version: '0.1.1',
      type: 'module',
      main: 'index.js',
      bin: {
        strezz: './strezz.js',
      },
      dependencies: {
        cheerio: '^1.0.0-rc.12',
        commander: '^12.0.0',
        dotenv: '^16.4.0',
        'js-yaml': '^4.1.0',
        pino: '^8.19.0',
        'pino-pretty': '^10.3.0',
      },
    };

    await fs.writeFile(path.join(distDir, 'package.json'), JSON.stringify(packageJson, null, 2));
    console.log('📁 Created: package.json');

    // Create README for dist
    const readme = `# Strezz Distribution

This is the built distribution of Strezz.

## Usage

\`\`\`bash
# Install dependencies
npm install

# Run with Node.js
node index.js

# Or use the CLI
./strezz.js --target https://example.com
\`\`\`

## Configuration

Copy \`env.example\` to \`.env\` and update the values.
`;

    await fs.writeFile(path.join(distDir, 'README.md'), readme);
    console.log('📁 Created: README.md');

    console.log('✅ Build completed successfully!');
    console.log(`📦 Distribution ready in: ${distDir}`);
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
};

// Run build if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  build();
}

export default build;
