/**
 * Data Connector - Manages connections to various data sources
 */

import { logger } from '../utils/logger.js';

export interface ConnectionConfig {
  name: string;
  type: 'http' | 'database' | 'file' | 'websocket';
  endpoint?: string;
  credentials?: {
    username?: string;
    password?: string;
    token?: string;
  };
  options?: Record<string, any>;
}

export interface DataConnection {
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  lastCheck: Date;
  responseTime?: number;
  errorMessage?: string;
}

export class DataConnector {
  private connections: Map<string, DataConnection> = new Map();
  private configs: Map<string, ConnectionConfig> = new Map();

  constructor() {
    this.initializeConnections();
  }

  async connect(connectionName: string): Promise<boolean> {
    const config = this.configs.get(connectionName);
    if (!config) {
      logger.error(`Connection config not found: ${connectionName}`);
      return false;
    }

    try {
      const startTime = Date.now();
      logger.info(`Connecting to: ${connectionName}`);

      // Simulate connection based on type
      const success = await this.performConnection(config);
      const responseTime = Date.now() - startTime;

      const connection: DataConnection = {
        name: connectionName,
        status: success ? 'connected' : 'error',
        lastCheck: new Date(),
        responseTime,
        errorMessage: success ? undefined : 'Connection failed',
      };

      this.connections.set(connectionName, connection);

      if (success) {
        logger.info(`Connected successfully: ${connectionName}`, { responseTime });
      } else {
        logger.error(`Connection failed: ${connectionName}`);
      }

      return success;
    } catch (error) {
      const connection: DataConnection = {
        name: connectionName,
        status: 'error',
        lastCheck: new Date(),
        errorMessage: String(error),
      };

      this.connections.set(connectionName, connection);
      logger.error(`Connection error: ${connectionName}`, { error });
      return false;
    }
  }

  async disconnect(connectionName: string): Promise<void> {
    const connection = this.connections.get(connectionName);
    if (connection) {
      connection.status = 'disconnected';
      connection.lastCheck = new Date();
      logger.info(`Disconnected: ${connectionName}`);
    }
  }

  async testConnection(connectionName: string): Promise<boolean> {
    const config = this.configs.get(connectionName);
    if (!config) {
      return false;
    }

    try {
      const startTime = Date.now();
      const success = await this.performHealthCheck(config);
      const responseTime = Date.now() - startTime;

      const connection = this.connections.get(connectionName);
      if (connection) {
        connection.status = success ? 'connected' : 'error';
        connection.lastCheck = new Date();
        connection.responseTime = responseTime;
        connection.errorMessage = success ? undefined : 'Health check failed';
      }

      return success;
    } catch (error) {
      logger.error(`Health check failed: ${connectionName}`, { error });
      return false;
    }
  }

  async fetchData(connectionName: string, query?: string): Promise<any> {
    const config = this.configs.get(connectionName);
    const connection = this.connections.get(connectionName);

    if (!config || !connection) {
      throw new Error(`Connection not found: ${connectionName}`);
    }

    if (connection.status !== 'connected') {
      throw new Error(`Connection not available: ${connectionName}`);
    }

    return await this.performDataFetch(config, query);
  }

  private async performConnection(config: ConnectionConfig): Promise<boolean> {
    switch (config.type) {
      case 'http':
        return await this.connectHTTP(config);
      case 'database':
        return await this.connectDatabase(config);
      case 'file':
        return await this.connectFile(config);
      case 'websocket':
        return await this.connectWebSocket(config);
      default:
        return false;
    }
  }

  private async connectHTTP(config: ConnectionConfig): Promise<boolean> {
    if (!config.endpoint) return false;

    try {
      // Mock HTTP connection test
      await new Promise((resolve) => setTimeout(resolve, 100));
      return true;
    } catch {
      return false;
    }
  }

  private async connectDatabase(config: ConnectionConfig): Promise<boolean> {
    try {
      // Mock database connection
      await new Promise((resolve) => setTimeout(resolve, 200));
      return true;
    } catch {
      return false;
    }
  }

  private async connectFile(config: ConnectionConfig): Promise<boolean> {
    try {
      // Mock file system check
      await new Promise((resolve) => setTimeout(resolve, 50));
      return true;
    } catch {
      return false;
    }
  }

  private async connectWebSocket(config: ConnectionConfig): Promise<boolean> {
    try {
      // Mock WebSocket connection
      await new Promise((resolve) => setTimeout(resolve, 150));
      return true;
    } catch {
      return false;
    }
  }

  private async performHealthCheck(config: ConnectionConfig): Promise<boolean> {
    // Simplified health check
    return await this.performConnection(config);
  }

  private async performDataFetch(config: ConnectionConfig, query?: string): Promise<any> {
    // Mock data fetch based on connection type
    switch (config.type) {
      case 'http':
        return { data: 'mock http data', query, timestamp: new Date() };
      case 'database':
        return [{ id: 1, data: 'mock db data', query }];
      case 'file':
        return { content: 'mock file content', filename: query };
      case 'websocket':
        return { message: 'mock websocket data', query };
      default:
        return null;
    }
  }

  private initializeConnections(): void {
    const configs: ConnectionConfig[] = [
      {
        name: 'fhir-service',
        type: 'http',
        endpoint: 'http://localhost:3001',
        options: { timeout: 5000 },
      },
      {
        name: 'monitoring-service',
        type: 'http',
        endpoint: 'http://localhost:3003',
        options: { timeout: 5000 },
      },
      {
        name: 'ai-service',
        type: 'http',
        endpoint: 'http://localhost:3002',
        options: { timeout: 10000 },
      },
      {
        name: 'ml-service',
        type: 'http',
        endpoint: 'http://localhost:3004',
        options: { timeout: 15000 },
      },
      {
        name: 'nlp-service',
        type: 'http',
        endpoint: 'http://localhost:3005',
        options: { timeout: 10000 },
      },
      {
        name: 'main-database',
        type: 'database',
        endpoint: 'postgresql://localhost:5432/nexus_warehouse',
        credentials: {
          username: 'postgres',
          password: 'postgres',
        },
      },
    ];

    configs.forEach((config) => this.configs.set(config.name, config));
    logger.info('Data connector initialized', { connections: configs.length });
  }

  // Public getters
  getConnection(name: string): DataConnection | undefined {
    return this.connections.get(name);
  }

  getAllConnections(): DataConnection[] {
    return Array.from(this.connections.values());
  }

  getConnectionNames(): string[] {
    return Array.from(this.configs.keys());
  }

  getHealthyConnections(): DataConnection[] {
    return this.getAllConnections().filter((conn) => conn.status === 'connected');
  }

  async connectAll(): Promise<void> {
    const connectionNames = this.getConnectionNames();
    const results = await Promise.allSettled(connectionNames.map((name) => this.connect(name)));

    const successCount = results.filter(
      (result) => result.status === 'fulfilled' && result.value
    ).length;

    logger.info(`Connected to ${successCount}/${connectionNames.length} data sources`);
  }

  async testAllConnections(): Promise<Record<string, boolean>> {
    const connectionNames = this.getConnectionNames();
    const results: Record<string, boolean> = {};

    for (const name of connectionNames) {
      results[name] = await this.testConnection(name);
    }

    return results;
  }
}

export default DataConnector;
