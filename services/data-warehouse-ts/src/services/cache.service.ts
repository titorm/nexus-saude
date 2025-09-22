/**
 * Cache Service for Data Warehouse
 */

import { logger } from '../utils/logger';

export class CacheService {
  private cache: Map<string, { data: any; expiry: number }> = new Map();
  private isConnected = false;

  async connect(): Promise<void> {
    logger.info('Connecting to cache service...');
    this.isConnected = true;
    logger.info('Cache service connected');
  }

  async close(): Promise<void> {
    logger.info('Closing cache connection...');
    this.isConnected = false;
    this.cache.clear();
    logger.info('Cache service closed');
  }

  async disconnect(): Promise<void> {
    await this.close();
  }

  async get(key: string): Promise<any | null> {
    if (!this.isConnected) return null;

    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  async set(key: string, data: any, ttlSeconds: number = 300): Promise<void> {
    if (!this.isConnected) return;

    const expiry = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { data, expiry });

    logger.debug(`Cached data for key: ${key}`, { ttl: ttlSeconds });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
    logger.info('Cache cleared');
  }

  isHealthy(): boolean {
    return this.isConnected;
  }

  getStats(): { keys: number; memoryUsage: string } {
    return {
      keys: this.cache.size,
      memoryUsage: '64 MB', // Mock memory usage
    };
  }
}

export default CacheService;
