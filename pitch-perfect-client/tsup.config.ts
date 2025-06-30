import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/agent.ts'],
  outDir: 'dist',
  tsconfig: './tsconfig.build.json', // Use build-specific tsconfig
  sourcemap: true,
  clean: true,
  format: ['esm'], // Use ESM to match package.json type: module
  dts: false, // Skip DTS generation to avoid external import issues
  external: [
    'dotenv', // Externalize dotenv to prevent bundling
    'fs', // Externalize fs to use Node.js built-in module
    'path', // Externalize other built-ins if necessary
    'https',
    'http',
    'zod',
    'crypto', // Externalize crypto to prevent dynamic require issues
    'js-sha1', // Externalize js-sha1 to prevent dynamic require issues
    'handlebars', // Externalize handlebars to prevent dynamic require issues
    'pino', // Externalize pino to prevent dynamic require issues
    'pino-pretty', // Externalize pino-pretty to prevent dynamic require issues
    'uuid', // Externalize uuid to prevent dynamic require issues
    'nanoid', // Externalize nanoid to prevent dynamic require issues
    'randombytes', // Externalize randombytes to prevent dynamic require issues
    'crypto-browserify', // Externalize crypto-browserify to prevent dynamic require issues
  ],
  noExternal: ['@elizaos/core'], // Ensure @elizaos/core is bundled
});
