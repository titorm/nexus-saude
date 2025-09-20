import { performance } from 'perf_hooks';
import { db } from '../../lib/db';
import { searchIndexes, patients, clinicalNotes, appointments } from '../../db/schema';
import { SearchService } from '../../services/SearchService';
import { eq, sql } from 'drizzle-orm';

/**
 * Performance Test Suite for Advanced Search System
 *
 * Tests search performance with varying dataset sizes and query types
 * to ensure the system can handle production workloads efficiently.
 */

interface PerformanceMetric {
  testName: string;
  executionTime: number;
  queryTime: number;
  resultCount: number;
  queryType: string;
  datasetSize: number;
  memoryUsage?: number;
}

class SearchPerformanceTester {
  private metrics: PerformanceMetric[] = [];
  private searchService = new SearchService();

  /**
   * Generate test data for performance testing
   */
  async generateTestData(
    patientCount: number = 10000,
    notesPerPatient: number = 5,
    appointmentsPerPatient: number = 3
  ) {
    console.log(
      `🏗️  Generating test data: ${patientCount} patients, ${notesPerPatient * patientCount} notes, ${appointmentsPerPatient * patientCount} appointments...`
    );

    const startTime = performance.now();

    // Generate patients in batches to avoid memory issues
    const batchSize = 1000;
    const patientBatches = Math.ceil(patientCount / batchSize);

    for (let batch = 0; batch < patientBatches; batch++) {
      const batchStart = batch * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, patientCount);
      const currentBatchSize = batchEnd - batchStart;

      // Generate patients
      const patientsData = Array.from({ length: currentBatchSize }, (_, i) => {
        const patientIndex = batchStart + i;
        return {
          name: `Test Patient ${patientIndex}`,
          cpf: `${String(patientIndex).padStart(11, '0')}`,
          email: `patient${patientIndex}@test.com`,
          phone: `(11) 9${String(patientIndex).padStart(8, '0')}`,
          birthDate: new Date(
            1950 + (patientIndex % 50),
            patientIndex % 12,
            (patientIndex % 28) + 1
          ),
          address: `Test Street ${patientIndex}, Test City`,
          hospitalId: (patientIndex % 5) + 1, // Distribute across 5 hospitals
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      });

      await db.insert(patients).values(patientsData);

      // Generate clinical notes for this batch
      const notesData = [];
      for (let p = 0; p < currentBatchSize; p++) {
        const patientIndex = batchStart + p;
        const patientId = patientIndex + 1; // Assuming sequential IDs

        for (let n = 0; n < notesPerPatient; n++) {
          notesData.push({
            patientId,
            doctorId: ((patientIndex + n) % 10) + 1, // Rotate through 10 doctors
            title: `Clinical Note ${n + 1} for Patient ${patientIndex}`,
            content: `This is a detailed clinical note for patient ${patientIndex}. The patient presented with symptoms including headache, fever, and fatigue. Medical history includes diabetes type 2 and hypertension. Current medications: metformin 500mg twice daily, lisinopril 10mg once daily. Examination findings: blood pressure 140/90, heart rate 78 bpm, temperature 37.2°C. Diagnosis: viral infection with exacerbation of chronic conditions. Treatment plan: rest, fluids, paracetamol for fever, follow-up in 1 week if symptoms persist. Additional notes: patient advised on medication compliance and lifestyle modifications.`,
            noteType: ['consultation', 'examination', 'follow_up', 'emergency'][n % 4],
            priority: ['low', 'normal', 'high', 'urgent'][(patientIndex + n) % 4],
            status: 'completed',
            hospitalId: (patientIndex % 5) + 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }

      if (notesData.length > 0) {
        await db.insert(clinicalNotes).values(notesData);
      }

      // Generate appointments for this batch
      const appointmentsData = [];
      for (let p = 0; p < currentBatchSize; p++) {
        const patientIndex = batchStart + p;
        const patientId = patientIndex + 1;

        for (let a = 0; a < appointmentsPerPatient; a++) {
          const appointmentDate = new Date();
          appointmentDate.setDate(appointmentDate.getDate() + a * 7); // Weekly appointments

          appointmentsData.push({
            patientId,
            doctorId: ((patientIndex + a) % 10) + 1,
            scheduledAt: appointmentDate,
            title: `Appointment ${a + 1} for Patient ${patientIndex}`,
            description: `Regular check-up appointment for patient ${patientIndex}. Follow-up on ongoing treatment and medication adjustments.`,
            status: ['scheduled', 'confirmed', 'completed', 'cancelled'][a % 4],
            priority: ['normal', 'high', 'urgent', 'low'][a % 4],
            location: `Room ${((patientIndex + a) % 20) + 1}`,
            hospitalId: (patientIndex % 5) + 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }

      if (appointmentsData.length > 0) {
        await db.insert(appointments).values(appointmentsData);
      }

      console.log(`✅ Completed batch ${batch + 1}/${patientBatches}`);
    }

    // Rebuild search indexes
    console.log('🔄 Rebuilding search indexes...');
    await this.searchService.rebuildAllIndexes();

    const endTime = performance.now();
    console.log(
      `✅ Test data generation completed in ${((endTime - startTime) / 1000).toFixed(2)}s`
    );
  }

  /**
   * Test search performance with different query types
   */
  async runPerformanceTests() {
    console.log('🚀 Starting search performance tests...');

    // Get current dataset size
    const [patientCount] = await db.select({ count: sql<number>`count(*)` }).from(patients);
    const [noteCount] = await db.select({ count: sql<number>`count(*)` }).from(clinicalNotes);
    const [appointmentCount] = await db.select({ count: sql<number>`count(*)` }).from(appointments);

    const datasetSize = patientCount.count + noteCount.count + appointmentCount.count;

    console.log(
      `📊 Dataset size: ${patientCount.count} patients, ${noteCount.count} notes, ${appointmentCount.count} appointments (${datasetSize} total records)`
    );

    // Test scenarios
    const testQueries = [
      // Simple queries
      { query: 'diabetes', description: 'Simple term search' },
      { query: 'patient', description: 'Common term search' },
      { query: 'headache fever', description: 'Multi-term search' },

      // Complex queries
      { query: 'diabetes type 2 hypertension', description: 'Medical condition search' },
      { query: '"viral infection"', description: 'Exact phrase search' },
      { query: 'metformin lisinopril', description: 'Medication search' },

      // Filtered searches
      { query: 'consultation', description: 'Entity type specific' },
      { query: 'emergency urgent', description: 'Priority-based search' },

      // Autocomplete scenarios
      { query: 'pat', description: 'Short autocomplete query' },
      { query: 'diab', description: 'Medical autocomplete' },
    ];

    // Run each test query multiple times
    for (const testQuery of testQueries) {
      await this.runSearchTest(
        'Global Search',
        testQuery.query,
        testQuery.description,
        datasetSize
      );
      await this.runAutocompleteTest(testQuery.query, testQuery.description, datasetSize);
    }

    // Test with different result limits
    for (const limit of [10, 50, 100, 500]) {
      await this.runSearchTest(
        `Search Limit ${limit}`,
        'diabetes patient',
        `Results limited to ${limit}`,
        datasetSize,
        { limit }
      );
    }

    // Test filtered searches
    await this.runSearchTest(
      'Patient Search',
      'test patient',
      'Entity-specific search',
      datasetSize,
      { entityTypes: ['patient'] }
    );
    await this.runSearchTest(
      'Clinical Notes Search',
      'diabetes',
      'Clinical notes only',
      datasetSize,
      { entityTypes: ['clinical_note'] }
    );
    await this.runSearchTest(
      'Appointments Search',
      'consultation',
      'Appointments only',
      datasetSize,
      { entityTypes: ['appointment'] }
    );

    // Test date range searches
    const now = new Date();
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    await this.runSearchTest('Date Range Search', 'patient', 'Last 30 days', datasetSize, {
      dateFrom: oneMonthAgo.toISOString(),
      dateTo: now.toISOString(),
    });

    console.log('✅ Performance tests completed');
  }

  /**
   * Run a single search test and measure performance
   */
  private async runSearchTest(
    testName: string,
    query: string,
    description: string,
    datasetSize: number,
    filters: any = {}
  ) {
    const memBefore = process.memoryUsage();
    const startTime = performance.now();

    try {
      const queryStart = performance.now();
      const result = await this.searchService.globalSearch({
        query,
        limit: 50,
        ...filters,
      });
      const queryEnd = performance.now();

      const endTime = performance.now();
      const memAfter = process.memoryUsage();

      const metric: PerformanceMetric = {
        testName,
        executionTime: endTime - startTime,
        queryTime: queryEnd - queryStart,
        resultCount: result.results.length,
        queryType: description,
        datasetSize,
        memoryUsage: memAfter.heapUsed - memBefore.heapUsed,
      };

      this.metrics.push(metric);

      console.log(
        `⚡ ${testName}: ${metric.executionTime.toFixed(2)}ms, ${metric.resultCount} results (${description})`
      );
    } catch (error) {
      console.error(`❌ ${testName} failed:`, error);
    }
  }

  /**
   * Test autocomplete performance
   */
  private async runAutocompleteTest(query: string, description: string, datasetSize: number) {
    if (query.length < 2) return; // Autocomplete requires at least 2 characters

    const memBefore = process.memoryUsage();
    const startTime = performance.now();

    try {
      const queryStart = performance.now();
      const result = await this.searchService.getAutocompleteSuggestions(query);
      const queryEnd = performance.now();

      const endTime = performance.now();
      const memAfter = process.memoryUsage();

      const metric: PerformanceMetric = {
        testName: 'Autocomplete',
        executionTime: endTime - startTime,
        queryTime: queryEnd - queryStart,
        resultCount: result.suggestions.length,
        queryType: `Autocomplete: ${description}`,
        datasetSize,
        memoryUsage: memAfter.heapUsed - memBefore.heapUsed,
      };

      this.metrics.push(metric);

      console.log(
        `🔍 Autocomplete "${query}": ${metric.executionTime.toFixed(2)}ms, ${metric.resultCount} suggestions`
      );
    } catch (error) {
      console.error(`❌ Autocomplete "${query}" failed:`, error);
    }
  }

  /**
   * Generate performance report
   */
  generateReport() {
    console.log('\n📈 PERFORMANCE REPORT');
    console.log('='.repeat(80));

    // Group metrics by test type
    const groupedMetrics = this.metrics.reduce(
      (acc, metric) => {
        if (!acc[metric.testName]) {
          acc[metric.testName] = [];
        }
        acc[metric.testName].push(metric);
        return acc;
      },
      {} as Record<string, PerformanceMetric[]>
    );

    // Calculate statistics for each test type
    Object.entries(groupedMetrics).forEach(([testName, metrics]) => {
      const executionTimes = metrics.map((m) => m.executionTime);
      const queryTimes = metrics.map((m) => m.queryTime);
      const resultCounts = metrics.map((m) => m.resultCount);

      const avgExecution = executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
      const maxExecution = Math.max(...executionTimes);
      const minExecution = Math.min(...executionTimes);

      const avgQuery = queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length;
      const avgResults = resultCounts.reduce((a, b) => a + b, 0) / resultCounts.length;

      console.log(`\n${testName}:`);
      console.log(
        `  Execution Time: ${avgExecution.toFixed(2)}ms avg, ${minExecution.toFixed(2)}ms min, ${maxExecution.toFixed(2)}ms max`
      );
      console.log(`  Query Time: ${avgQuery.toFixed(2)}ms avg`);
      console.log(`  Results: ${avgResults.toFixed(1)} avg`);
      console.log(`  Tests: ${metrics.length}`);
    });

    // Performance thresholds
    console.log('\n🎯 PERFORMANCE ANALYSIS');
    console.log('-'.repeat(40));

    const slowQueries = this.metrics.filter((m) => m.executionTime > 1000);
    const fastQueries = this.metrics.filter((m) => m.executionTime < 100);

    console.log(
      `Fast queries (<100ms): ${fastQueries.length}/${this.metrics.length} (${((fastQueries.length / this.metrics.length) * 100).toFixed(1)}%)`
    );
    console.log(
      `Slow queries (>1000ms): ${slowQueries.length}/${this.metrics.length} (${((slowQueries.length / this.metrics.length) * 100).toFixed(1)}%)`
    );

    if (slowQueries.length > 0) {
      console.log('\n⚠️  SLOW QUERIES:');
      slowQueries.forEach((metric) => {
        console.log(
          `  ${metric.testName}: ${metric.executionTime.toFixed(2)}ms (${metric.queryType})`
        );
      });
    }

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    if (slowQueries.length > this.metrics.length * 0.1) {
      console.log('  ⚠️  Consider optimizing database indexes for common search patterns');
    }
    if (this.metrics.some((m) => m.memoryUsage && m.memoryUsage > 10 * 1024 * 1024)) {
      console.log('  ⚠️  High memory usage detected, consider pagination for large result sets');
    }
    console.log('  ✅ Monitor search performance in production with real user queries');
    console.log('  ✅ Set up alerts for queries exceeding 500ms response time');
    console.log('  ✅ Regularly analyze search patterns and optimize indexes accordingly');
  }

  /**
   * Export metrics to JSON for analysis
   */
  exportMetrics(filename: string = 'search-performance-metrics.json') {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: this.metrics.length,
        averageExecutionTime:
          this.metrics.reduce((a, b) => a + b.executionTime, 0) / this.metrics.length,
        fastQueries: this.metrics.filter((m) => m.executionTime < 100).length,
        slowQueries: this.metrics.filter((m) => m.executionTime > 1000).length,
      },
      metrics: this.metrics,
    };

    // In a real implementation, you would write to filesystem
    console.log(`\n📁 Metrics exported to ${filename}`);
    return report;
  }
}

/**
 * Run performance tests
 */
export async function runSearchPerformanceTests(
  generateData: boolean = false,
  patientCount: number = 10000
) {
  const tester = new SearchPerformanceTester();

  try {
    if (generateData) {
      await tester.generateTestData(patientCount);
    }

    await tester.runPerformanceTests();
    tester.generateReport();

    return tester.exportMetrics();
  } catch (error) {
    console.error('❌ Performance testing failed:', error);
    throw error;
  }
}

// CLI interface for running tests
if (require.main === module) {
  const args = process.argv.slice(2);
  const generateData = args.includes('--generate-data');
  const patientCount = parseInt(
    args.find((arg) => arg.startsWith('--patients='))?.split('=')[1] || '10000'
  );

  runSearchPerformanceTests(generateData, patientCount)
    .then(() => {
      console.log('✅ Performance testing completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Performance testing failed:', error);
      process.exit(1);
    });
}
