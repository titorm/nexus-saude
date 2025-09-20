const axios = require('axios');
const { program } = require('commander');
const chalk = require('chalk');

/**
 * Performance Testing Suite for Advanced Search System
 *
 * This script tests search API performance with various scenarios:
 * - Simple and complex queries
 * - Different entity types
 * - Autocomplete functionality
 * - Load testing with concurrent users
 * - Memory and response time monitoring
 */

class SearchPerformanceTester {
  constructor(baseUrl = 'http://localhost:3001/api', authToken = '') {
    this.baseUrl = baseUrl;
    this.authToken = authToken;
    this.metrics = [];
    this.axios = axios.create({
      baseURL: baseUrl,
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      timeout: 30000, // 30 second timeout
    });
  }

  /**
   * Test scenarios with different complexity levels
   */
  getTestScenarios() {
    return {
      simple: [
        { query: 'diabetes', description: 'Common medical term' },
        { query: 'patient', description: 'Basic entity search' },
        { query: 'consultation', description: 'Appointment type' },
        { query: 'headache', description: 'Symptom search' },
        { query: 'test', description: 'Short common word' },
      ],
      complex: [
        { query: 'diabetes type 2 hypertension', description: 'Multi-condition search' },
        { query: 'viral infection symptoms fever', description: 'Symptom combination' },
        { query: 'metformin lisinopril medication dosage', description: 'Medication details' },
        { query: 'emergency consultation urgent priority', description: 'Priority search' },
        { query: 'follow up appointment regular checkup', description: 'Appointment details' },
      ],
      phrases: [
        { query: '"diabetes type 2"', description: 'Exact medical phrase' },
        { query: '"viral infection"', description: 'Exact condition phrase' },
        { query: '"emergency consultation"', description: 'Exact appointment phrase' },
        { query: '"follow up"', description: 'Exact action phrase' },
        { query: '"regular check-up"', description: 'Exact routine phrase' },
      ],
      autocomplete: [
        { query: 'pat', description: 'Patient prefix' },
        { query: 'diab', description: 'Diabetes prefix' },
        { query: 'cons', description: 'Consultation prefix' },
        { query: 'emerg', description: 'Emergency prefix' },
        { query: 'med', description: 'Medical prefix' },
      ],
    };
  }

  /**
   * Run a single search test and measure performance
   */
  async runSearchTest(endpoint, query, description, options = {}) {
    const testName = `${endpoint} - ${description}`;
    const startTime = process.hrtime.bigint();
    const memBefore = process.memoryUsage();

    try {
      const payload = {
        query,
        limit: options.limit || 50,
        ...options.filters,
      };

      const response = await this.axios.post(endpoint, payload);

      const endTime = process.hrtime.bigint();
      const memAfter = process.memoryUsage();

      const executionTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
      const memoryDiff = memAfter.heapUsed - memBefore.heapUsed;

      const metric = {
        testName,
        query,
        description,
        executionTime,
        responseTime: response.headers['x-response-time'] || 'N/A',
        statusCode: response.status,
        resultCount: response.data.total || response.data.results?.length || 0,
        memoryUsage: memoryDiff,
        timestamp: new Date().toISOString(),
      };

      this.metrics.push(metric);

      // Color code based on performance
      const timeColor =
        executionTime < 100 ? chalk.green : executionTime < 500 ? chalk.yellow : chalk.red;

      console.log(
        `${timeColor('⚡')} ${testName}: ${timeColor(executionTime.toFixed(2) + 'ms')} | ${response.data.total || 0} results`
      );

      return metric;
    } catch (error) {
      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000;

      const errorMetric = {
        testName,
        query,
        description,
        executionTime,
        statusCode: error.response?.status || 'ERROR',
        error: error.message,
        timestamp: new Date().toISOString(),
      };

      this.metrics.push(errorMetric);
      console.log(`${chalk.red('❌')} ${testName}: ${chalk.red('FAILED')} - ${error.message}`);

      return errorMetric;
    }
  }

  /**
   * Test autocomplete performance
   */
  async runAutocompleteTest(query, description) {
    if (query.length < 2) return null;

    const startTime = process.hrtime.bigint();

    try {
      const response = await this.axios.get(
        `/search/autocomplete?query=${encodeURIComponent(query)}&limit=10`
      );

      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000;

      const metric = {
        testName: 'Autocomplete',
        query,
        description: `Autocomplete: ${description}`,
        executionTime,
        statusCode: response.status,
        resultCount: response.data.suggestions?.length || 0,
        timestamp: new Date().toISOString(),
      };

      this.metrics.push(metric);

      const timeColor =
        executionTime < 50 ? chalk.green : executionTime < 200 ? chalk.yellow : chalk.red;

      console.log(
        `${timeColor('🔍')} Autocomplete "${query}": ${timeColor(executionTime.toFixed(2) + 'ms')} | ${metric.resultCount} suggestions`
      );

      return metric;
    } catch (error) {
      console.log(
        `${chalk.red('❌')} Autocomplete "${query}": ${chalk.red('FAILED')} - ${error.message}`
      );
      return null;
    }
  }

  /**
   * Run concurrent load test
   */
  async runConcurrentTest(query, concurrentUsers = 10, duration = 30) {
    console.log(
      `\n${chalk.blue('👥')} Running concurrent test: ${concurrentUsers} users, ${duration}s duration`
    );

    const startTime = Date.now();
    const endTime = startTime + duration * 1000;
    const promises = [];
    const results = [];

    // Start concurrent users
    for (let i = 0; i < concurrentUsers; i++) {
      promises.push(this.runConcurrentUser(query, endTime, results, i + 1));
    }

    await Promise.all(promises);

    // Analyze concurrent test results
    const totalRequests = results.length;
    const successfulRequests = results.filter((r) => r.success).length;
    const averageTime = results.reduce((sum, r) => sum + r.time, 0) / totalRequests;
    const requestsPerSecond = totalRequests / duration;

    console.log(`${chalk.blue('📊')} Concurrent test results:`);
    console.log(`  Total requests: ${totalRequests}`);
    console.log(
      `  Successful: ${successfulRequests} (${((successfulRequests / totalRequests) * 100).toFixed(1)}%)`
    );
    console.log(`  Average response time: ${averageTime.toFixed(2)}ms`);
    console.log(`  Requests per second: ${requestsPerSecond.toFixed(2)}`);

    return {
      totalRequests,
      successfulRequests,
      averageTime,
      requestsPerSecond,
      duration,
    };
  }

  /**
   * Single concurrent user simulation
   */
  async runConcurrentUser(query, endTime, results, userId) {
    while (Date.now() < endTime) {
      const startTime = process.hrtime.bigint();

      try {
        await this.axios.post('/search/global', { query, limit: 20 });
        const time = Number(process.hrtime.bigint() - startTime) / 1000000;
        results.push({ success: true, time, userId });
      } catch (error) {
        const time = Number(process.hrtime.bigint() - startTime) / 1000000;
        results.push({ success: false, time, userId, error: error.message });
      }

      // Small delay between requests
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 1000 + 500));
    }
  }

  /**
   * Run comprehensive performance test suite
   */
  async runFullTestSuite(options = {}) {
    console.log(chalk.blue.bold('\n🚀 Starting Advanced Search Performance Tests'));
    console.log(chalk.blue('='.repeat(60)));

    const scenarios = this.getTestScenarios();

    // Test API connectivity
    try {
      await this.axios.get('/health');
      console.log(`${chalk.green('✅')} API connectivity: OK`);
    } catch (error) {
      console.log(`${chalk.red('❌')} API connectivity: FAILED`);
      return;
    }

    // Simple queries
    console.log(`\n${chalk.yellow('🔍')} Testing Simple Queries`);
    console.log(chalk.yellow('-'.repeat(30)));
    for (const scenario of scenarios.simple) {
      await this.runSearchTest('/search/global', scenario.query, scenario.description);
      await this.sleep(options.delay || 500);
    }

    // Complex queries
    console.log(`\n${chalk.yellow('🧠')} Testing Complex Queries`);
    console.log(chalk.yellow('-'.repeat(30)));
    for (const scenario of scenarios.complex) {
      await this.runSearchTest('/search/global', scenario.query, scenario.description);
      await this.sleep(options.delay || 500);
    }

    // Phrase queries
    console.log(`\n${chalk.yellow('📝')} Testing Phrase Queries`);
    console.log(chalk.yellow('-'.repeat(30)));
    for (const scenario of scenarios.phrases) {
      await this.runSearchTest('/search/global', scenario.query, scenario.description);
      await this.sleep(options.delay || 500);
    }

    // Entity-specific searches
    console.log(`\n${chalk.yellow('🎯')} Testing Entity-Specific Searches`);
    console.log(chalk.yellow('-'.repeat(40)));
    await this.runSearchTest('/search/patients', 'patient test', 'Patient-only search');
    await this.runSearchTest('/search/clinical-notes', 'diabetes', 'Clinical notes search');
    await this.runSearchTest('/search/appointments', 'consultation', 'Appointments search');

    // Autocomplete tests
    console.log(`\n${chalk.yellow('⚡')} Testing Autocomplete`);
    console.log(chalk.yellow('-'.repeat(25)));
    for (const scenario of scenarios.autocomplete) {
      await this.runAutocompleteTest(scenario.query, scenario.description);
      await this.sleep(options.delay || 200);
    }

    // Different result limits
    console.log(`\n${chalk.yellow('📊')} Testing Different Result Limits`);
    console.log(chalk.yellow('-'.repeat(35)));
    for (const limit of [10, 50, 100, 500]) {
      await this.runSearchTest('/search/global', 'diabetes patient', `Results limit: ${limit}`, {
        limit,
      });
      await this.sleep(options.delay || 300);
    }

    // Load testing
    if (options.loadTest) {
      console.log(`\n${chalk.yellow('🔥')} Load Testing`);
      console.log(chalk.yellow('-'.repeat(15)));

      // Progressive load testing
      for (const users of [5, 10, 20]) {
        await this.runConcurrentTest('diabetes patient consultation', users, 15);
        await this.sleep(2000);
      }
    }

    this.generateReport();
  }

  /**
   * Generate comprehensive performance report
   */
  generateReport() {
    console.log(chalk.blue.bold('\n📈 PERFORMANCE REPORT'));
    console.log(chalk.blue('='.repeat(60)));

    if (this.metrics.length === 0) {
      console.log(chalk.red('No metrics collected'));
      return;
    }

    // Group metrics by test type
    const groupedMetrics = this.metrics.reduce((acc, metric) => {
      const testType = metric.testName.split(' - ')[0];
      if (!acc[testType]) acc[testType] = [];
      acc[testType].push(metric);
      return acc;
    }, {});

    // Calculate statistics for each test type
    Object.entries(groupedMetrics).forEach(([testType, metrics]) => {
      const times = metrics.filter((m) => !m.error).map((m) => m.executionTime);
      const errorCount = metrics.filter((m) => m.error).length;

      if (times.length > 0) {
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        const results = metrics.filter((m) => !m.error).map((m) => m.resultCount || 0);
        const avgResults =
          results.length > 0 ? results.reduce((a, b) => a + b, 0) / results.length : 0;

        console.log(`\n${chalk.cyan(testType)}:`);
        console.log(
          `  Response Time: ${avgTime.toFixed(2)}ms avg, ${minTime.toFixed(2)}ms min, ${maxTime.toFixed(2)}ms max`
        );
        console.log(`  Results: ${avgResults.toFixed(1)} avg`);
        console.log(`  Tests: ${metrics.length} (${errorCount} errors)`);
      }
    });

    // Overall performance analysis
    const allTimes = this.metrics.filter((m) => !m.error).map((m) => m.executionTime);
    const fastQueries = allTimes.filter((t) => t < 100).length;
    const slowQueries = allTimes.filter((t) => t > 1000).length;
    const errorCount = this.metrics.filter((m) => m.error).length;

    console.log(`\n${chalk.blue('🎯')} PERFORMANCE ANALYSIS`);
    console.log(chalk.blue('-'.repeat(30)));
    console.log(`Total tests: ${this.metrics.length}`);
    console.log(
      `Fast queries (<100ms): ${fastQueries}/${allTimes.length} (${((fastQueries / allTimes.length) * 100).toFixed(1)}%)`
    );
    console.log(
      `Slow queries (>1000ms): ${slowQueries}/${allTimes.length} (${((slowQueries / allTimes.length) * 100).toFixed(1)}%)`
    );
    console.log(
      `Errors: ${errorCount}/${this.metrics.length} (${((errorCount / this.metrics.length) * 100).toFixed(1)}%)`
    );

    // Performance rating
    const fastPercentage = (fastQueries / allTimes.length) * 100;
    let rating, color;

    if (fastPercentage > 80) {
      rating = 'EXCELLENT';
      color = chalk.green;
    } else if (fastPercentage > 60) {
      rating = 'GOOD';
      color = chalk.yellow;
    } else if (fastPercentage > 40) {
      rating = 'FAIR';
      color = chalk.orange;
    } else {
      rating = 'NEEDS IMPROVEMENT';
      color = chalk.red;
    }

    console.log(
      `\n${color('📊')} Performance Rating: ${color(rating)} (${fastPercentage.toFixed(1)}% fast queries)`
    );

    // Recommendations
    console.log(`\n${chalk.blue('💡')} RECOMMENDATIONS:`);
    if (slowQueries > 0) {
      console.log(
        `  ${chalk.yellow('⚠️')}  Optimize ${slowQueries} slow queries - consider database indexing`
      );
    }
    if (errorCount > 0) {
      console.log(
        `  ${chalk.red('⚠️')}  Fix ${errorCount} error responses - check API implementation`
      );
    }
    const avgTime = allTimes.reduce((a, b) => a + b, 0) / allTimes.length;
    if (avgTime > 200) {
      console.log(
        `  ${chalk.yellow('⚠️')}  Average response time is ${avgTime.toFixed(2)}ms - consider caching`
      );
    }
    console.log(`  ${chalk.green('✅')} Monitor performance in production environments`);
    console.log(`  ${chalk.green('✅')} Set up alerting for response times > 500ms`);
    console.log(`  ${chalk.green('✅')} Implement query optimization based on usage patterns`);
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Export metrics to JSON
   */
  exportMetrics(filename = 'search-performance-metrics.json') {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: this.metrics.length,
        averageTime:
          this.metrics.filter((m) => !m.error).reduce((sum, m) => sum + m.executionTime, 0) /
          this.metrics.filter((m) => !m.error).length,
        fastQueries: this.metrics.filter((m) => !m.error && m.executionTime < 100).length,
        slowQueries: this.metrics.filter((m) => !m.error && m.executionTime > 1000).length,
        errors: this.metrics.filter((m) => m.error).length,
      },
      metrics: this.metrics,
    };

    console.log(`\n${chalk.blue('📁')} Metrics would be exported to: ${filename}`);
    return report;
  }
}

// CLI interface
program
  .version('1.0.0')
  .description('Advanced Search Performance Testing Suite')
  .option('-u, --url <url>', 'API base URL', 'http://localhost:3001/api')
  .option('-t, --token <token>', 'Authentication token', '')
  .option('-l, --load-test', 'Include load testing')
  .option('-s, --stress-test', 'Include stress testing')
  .option('-d, --delay <ms>', 'Delay between tests in milliseconds', '500')
  .action(async (options) => {
    const tester = new SearchPerformanceTester(options.url, options.token);

    const testOptions = {
      loadTest: options.loadTest || options.stressTest,
      delay: parseInt(options.delay),
    };

    try {
      await tester.runFullTestSuite(testOptions);
      tester.exportMetrics();

      console.log(`\n${chalk.green('✅')} Performance testing completed successfully!`);
      process.exit(0);
    } catch (error) {
      console.error(`\n${chalk.red('❌')} Performance testing failed:`, error.message);
      process.exit(1);
    }
  });

program.parse(process.argv);
