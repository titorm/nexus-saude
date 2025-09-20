# Integration Testing Suite

This directory contains comprehensive integration tests for the Advanced Search System.

## Overview

The integration test suite validates the complete search functionality including:

- **API Endpoints**: All search endpoints with various parameters
- **Search Accuracy**: Result quality and ranking validation
- **Filter Combinations**: Multi-criteria filtering scenarios
- **Performance**: Response time and concurrent request handling
- **Security**: SQL injection, XSS, and input validation testing
- **Error Handling**: Graceful handling of edge cases and malformed requests
- **Portuguese Language**: Proper handling of Portuguese medical terminology

## Test Structure

### Main Test File

- `search.integration.test.ts` - Comprehensive TypeScript test suite using Vitest

### Test Runner

- `test-runner.js` - Standalone Node.js test runner with API connectivity checks

## Running the Tests

### Prerequisites

1. **API Server Running**: Ensure the API server is running (default: `http://localhost:3001`)
2. **Database Setup**: Database should be populated with test data
3. **Dependencies**: Node.js and npm/pnpm installed

### Method 1: Using the Test Runner (Recommended)

```bash
# Run with default configuration
node test-runner.js

# Run with custom API URL
API_URL=http://localhost:3000/api node test-runner.js

# Run with authentication token
TEST_AUTH_TOKEN=your-jwt-token node test-runner.js

# Run with custom timeout
TEST_TIMEOUT=60000 node test-runner.js
```

### Method 2: Direct Vitest Execution

```bash
# Run integration tests only
npx vitest run search.integration.test.ts

# Run with verbose output
npx vitest run search.integration.test.ts --reporter=verbose

# Run in watch mode
npx vitest search.integration.test.ts
```

### Method 3: NPM Script Integration

Add to your `package.json`:

```json
{
  "scripts": {
    "test:integration": "node src/tests/integration/test-runner.js",
    "test:integration:watch": "vitest src/tests/integration/search.integration.test.ts"
  }
}
```

Then run:

```bash
npm run test:integration
```

## Environment Variables

| Variable          | Default                     | Description                          |
| ----------------- | --------------------------- | ------------------------------------ |
| `API_URL`         | `http://localhost:3001/api` | Base URL of the API server           |
| `TEST_AUTH_TOKEN` | `""`                        | JWT token for authenticated requests |
| `TEST_TIMEOUT`    | `30000`                     | Test timeout in milliseconds         |

## Test Categories

### 1. API Connectivity

- Server availability check
- Health endpoint validation
- Basic connectivity verification

### 2. Global Search Endpoint (`/search/global`)

- Simple and complex query handling
- Result limit enforcement
- Input parameter validation
- Special character handling
- Relevance score ranking

### 3. Entity-Specific Search

- **Patients** (`/search/patients`)
- **Clinical Notes** (`/search/clinical-notes`)
- **Appointments** (`/search/appointments`)

### 4. Autocomplete Functionality (`/search/autocomplete`)

- Suggestion generation
- Query length validation
- Entity type filtering
- Response time requirements

### 5. Search Filters

- Entity type filtering
- Date range filtering
- Priority-based filtering
- Status-based filtering
- Combined filter scenarios

### 6. Search History (`/search/history`)

- History retrieval
- Result limiting
- Chronological ordering

### 7. Search Analytics (`/search/analytics`)

- Metrics collection
- Performance tracking
- Usage statistics

### 8. Performance Requirements

- **Simple Queries**: < 500ms response time
- **Autocomplete**: < 200ms response time
- **Concurrent Requests**: Efficient handling of multiple simultaneous requests

### 9. Security Testing

- SQL injection attempt handling
- XSS prevention validation
- Input sanitization verification
- Malformed request handling

### 10. Portuguese Language Support

- Medical terminology handling
- Character encoding validation
- Stemming and search accuracy

## Expected Test Results

### Success Criteria

- ✅ All API endpoints respond appropriately (200 for valid requests, 4xx for invalid)
- ✅ Search results are properly formatted and ranked
- ✅ Performance requirements are met
- ✅ Security tests pass without server crashes
- ✅ Portuguese language queries work correctly

### Common Issues and Solutions

#### API Server Not Running

```
❌ Cannot connect to API server
```

**Solution**: Start the API server and ensure it's accessible at the configured URL.

#### Authentication Required

```
❌ 401 Unauthorized
```

**Solution**: Set the `TEST_AUTH_TOKEN` environment variable with a valid JWT token.

#### Database Not Populated

```
✅ Tests pass but return empty results
```

**Solution**: Ensure the database contains test data for meaningful search results.

#### Performance Test Failures

```
❌ Response time exceeded 500ms
```

**Solution**: Check database indexes, query optimization, and server resources.

## Continuous Integration

### GitHub Actions Example

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  integration-tests:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Setup database
        run: npm run db:migrate

      - name: Start API server
        run: npm run dev &

      - name: Wait for server
        run: sleep 10

      - name: Run integration tests
        run: npm run test:integration
        env:
          API_URL: http://localhost:3001/api
          TEST_AUTH_TOKEN: ${{ secrets.TEST_AUTH_TOKEN }}
```

## Contributing

When adding new integration tests:

1. **Follow the pattern**: Use the existing `ApiClient` class for HTTP requests
2. **Test both success and failure cases**: Include positive and negative test scenarios
3. **Performance considerations**: Add timing validations for new endpoints
4. **Security validation**: Test input sanitization and security measures
5. **Documentation**: Update this README with new test categories

## Troubleshooting

### Debug Mode

Enable verbose logging by setting the log level:

```bash
DEBUG=1 node test-runner.js
```

### Manual API Testing

Use the `ApiClient` class for manual testing:

```javascript
import { ApiClient } from './search.integration.test.ts';

const client = new ApiClient('http://localhost:3001/api', 'your-token');
const response = await client.post('/search/global', { query: 'test', limit: 5 });
console.log(response);
```

### Network Issues

If tests fail due to network timeouts:

1. Increase `TEST_TIMEOUT` environment variable
2. Check firewall settings
3. Verify API server logs for errors
4. Test API connectivity manually using curl

```bash
curl -X POST http://localhost:3001/api/search/global \
  -H "Content-Type: application/json" \
  -d '{"query":"test","limit":5}'
```
