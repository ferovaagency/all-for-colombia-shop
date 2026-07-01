// Load environment variables from .env file for server-side
import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), '.env');
    const envContent = readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        const value = valueParts.join('=').replace(/^"|"$/g, '').replace(/^'|'$/g, '');
        if (key && value) {
          process.env[key] = value;
        }
      }
    }

    console.log('[Server Env] Loaded environment variables from .env');
  } catch (error) {
    console.warn('[Server Env] Could not load .env file:', error);
  }
}

// Load environment variables immediately
loadEnv();