#!/usr/bin/env node

/**
 * Integration Test Runner
 *
 * Standalone test runner for search system integration tests.
 * Can be run independently of the main test suite.
 *
 * Usage:
 *   node test-runner.js
 *   API_URL=http://localhost:3001/api node test-runner.js
 *   TEST_AUTH_TOKEN=your-token node test-runner.js
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3001/api';
const TEST_AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || '';
const TEST_TIMEOUT = process.env.TEST_TIMEOUT || '30000';

console.log('🧪 Running Search System Integration Tests');
console.log('📡 API URL:', API_URL);
console.log('🔑 Auth Token:', TEST_AUTH_TOKEN ? '***configured***' : 'none');
console.log('⏱️  Timeout:', TEST_TIMEOUT + 'ms');
console.log('');

// Check if API is accessible
async function checkApiHealth() {
  try {
    const response = await fetch(`${API_URL}/health`);
    return {
      accessible: true,
      status: response.status,
      statusText: response.statusText,
    };
  } catch (error) {
    return {
      accessible: false,
      error: error.message,
    };
  }
}

async function runTests() {
  console.log('🔍 Checking API connectivity...');

  const healthCheck = await checkApiHealth();

  if (!healthCheck.accessible) {
    console.error('❌ Cannot connect to API server');
    console.error('   Error:', healthCheck.error);
    console.error('   Make sure the API server is running at:', API_URL);
    process.exit(1);
  }

  console.log('✅ API server is accessible');
  console.log('   Status:', healthCheck.status, healthCheck.statusText);
  console.log('');

  // Run the tests using vitest
  const testFile = join(__dirname, 'search.integration.test.ts');

  const vitestArgs = ['run', testFile, '--reporter=verbose', '--run'];

  const env = {
    ...process.env,
    API_URL,
    TEST_AUTH_TOKEN,
    TEST_TIMEOUT,
  };

  console.log('🚀 Starting integration tests...');
  console.log('');

  const vitest = spawn('npx', ['vitest', ...vitestArgs], {
    stdio: 'inherit',
    env,
    cwd: process.cwd(),
  });

  vitest.on('close', (code) => {
    console.log('');
    if (code === 0) {
      console.log('✅ All integration tests passed!');
    } else {
      console.log('❌ Some integration tests failed');
      console.log('   Exit code:', code);
    }
    process.exit(code);
  });

  vitest.on('error', (error) => {
    console.error('❌ Failed to run tests:', error.message);
    process.exit(1);
  });
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n⏹️  Test execution interrupted');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  Test execution terminated');
  process.exit(1);
});

// Run the tests
runTests().catch((error) => {
  console.error('❌ Test runner failed:', error.message);
  process.exit(1);
});
