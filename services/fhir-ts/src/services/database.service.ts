/**
 * Database Service for FHIR Gateway
 * Handles database operations for FHIR resources
 */

import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { FHIRResource } from './validation.service.js';
import { SearchParameters } from './resource.service.js';

export interface DatabaseSearchResult {
  resources: FHIRResource[];
  total: number;
}

export class DatabaseService {
  private isConnected = false;
  private resources: Map<string, Map<string, FHIRResource>> = new Map();
  private resourceHistory: Map<string, Map<string, FHIRResource[]>> = new Map();

  /**
   * Connect to database
   */
  async connect(): Promise<void> {
    try {
      // Initialize in-memory storage for now
      // In production, this would connect to PostgreSQL
      this.isConnected = true;
      logger.info('Connected to FHIR database (in-memory)');
    } catch (error) {
      logger.error('Failed to connect to database: ' + String(error));
      throw error;
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    try {
      this.isConnected = false;
      this.resources.clear();
      this.resourceHistory.clear();
      logger.info('Database connection closed');
    } catch (error) {
      logger.error('Error closing database connection: ' + String(error));
    }
  }

  /**
   * Save a FHIR resource
   */
  async saveResource(resource: FHIRResource): Promise<FHIRResource> {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    const resourceType = resource.resourceType;
    const id = resource.id!;

    // Get or create resource type map
    if (!this.resources.has(resourceType)) {
      this.resources.set(resourceType, new Map());
    }

    const typeMap = this.resources.get(resourceType)!;
    typeMap.set(id, { ...resource });

    // Save to history
    this.saveToHistory(resource);

    logger.debug(`Saved ${resourceType} with ID: ${id}`);
    return { ...resource };
  }

  /**
   * Get a FHIR resource by type and ID
   */
  async getResource(resourceType: string, id: string): Promise<FHIRResource | null> {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    const typeMap = this.resources.get(resourceType);
    if (!typeMap) {
      return null;
    }

    const resource = typeMap.get(id);
    return resource ? { ...resource } : null;
  }

  /**
   * Update a FHIR resource
   */
  async updateResource(resource: FHIRResource): Promise<FHIRResource> {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    const resourceType = resource.resourceType;
    const id = resource.id!;

    const typeMap = this.resources.get(resourceType);
    if (!typeMap || !typeMap.has(id)) {
      throw new Error('Resource not found');
    }

    // Update resource
    typeMap.set(id, { ...resource });

    // Save to history
    this.saveToHistory(resource);

    logger.debug(`Updated ${resourceType} with ID: ${id}`);
    return { ...resource };
  }

  /**
   * Delete a FHIR resource
   */
  async deleteResource(resourceType: string, id: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    const typeMap = this.resources.get(resourceType);
    if (!typeMap || !typeMap.has(id)) {
      throw new Error('Resource not found');
    }

    typeMap.delete(id);
    logger.debug(`Deleted ${resourceType} with ID: ${id}`);
  }

  /**
   * Search for FHIR resources
   */
  async searchResources(params: SearchParameters): Promise<DatabaseSearchResult> {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    const resourceType = params.resourceType;
    const typeMap = this.resources.get(resourceType);

    if (!typeMap) {
      return { resources: [], total: 0 };
    }

    let results = Array.from(typeMap.values());

    // Apply filters
    if (params.id) {
      results = results.filter((r) => r.id === params.id);
    }

    if (params.identifier) {
      results = results.filter(
        (r) =>
          r.identifier &&
          Array.isArray(r.identifier) &&
          r.identifier.some((id: any) => id.value === params.identifier)
      );
    }

    if (params.name) {
      results = results.filter((r) => {
        if (r.name && Array.isArray(r.name)) {
          return r.name.some(
            (name: any) =>
              (name.family && name.family.toLowerCase().includes(params.name!.toLowerCase())) ||
              (name.given &&
                Array.isArray(name.given) &&
                name.given.some((given: string) =>
                  given.toLowerCase().includes(params.name!.toLowerCase())
                ))
          );
        }
        if (typeof r.name === 'string') {
          return r.name.toLowerCase().includes(params.name!.toLowerCase());
        }
        return false;
      });
    }

    if (params.family) {
      results = results.filter(
        (r) =>
          r.name &&
          Array.isArray(r.name) &&
          r.name.some(
            (name: any) =>
              name.family && name.family.toLowerCase().includes(params.family!.toLowerCase())
          )
      );
    }

    if (params.given) {
      results = results.filter(
        (r) =>
          r.name &&
          Array.isArray(r.name) &&
          r.name.some(
            (name: any) =>
              name.given &&
              Array.isArray(name.given) &&
              name.given.some((given: string) =>
                given.toLowerCase().includes(params.given!.toLowerCase())
              )
          )
      );
    }

    if (params.gender) {
      results = results.filter((r) => r.gender === params.gender);
    }

    if (params.birthdate) {
      results = results.filter((r) => r.birthDate === params.birthdate);
    }

    if (params.status) {
      results = results.filter((r) => r.status === params.status);
    }

    if (params.subject) {
      results = results.filter(
        (r) => r.subject && r.subject.reference && r.subject.reference.includes(params.subject!)
      );
    }

    if (params.patient) {
      results = results.filter(
        (r) =>
          (r.subject && r.subject.reference && r.subject.reference.includes(params.patient!)) ||
          (r.patient && r.patient.reference && r.patient.reference.includes(params.patient!))
      );
    }

    // Apply pagination
    const total = results.length;
    const skip = params._skip || 0;
    const count = params._count || 50;

    results = results.slice(skip, skip + count);

    // Apply sorting
    if (params._sort) {
      results = this.applySorting(results, params._sort);
    }

    return {
      resources: results,
      total,
    };
  }

  /**
   * Get resource history
   */
  async getResourceHistory(resourceType: string, id?: string): Promise<DatabaseSearchResult> {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    const historyMap = this.resourceHistory.get(resourceType);
    if (!historyMap) {
      return { resources: [], total: 0 };
    }

    let allHistory: FHIRResource[] = [];

    if (id) {
      // Get history for specific resource
      const resourceHistory = historyMap.get(id) || [];
      allHistory = [...resourceHistory];
    } else {
      // Get history for all resources of this type
      for (const resourceHistory of historyMap.values()) {
        allHistory.push(...resourceHistory);
      }
    }

    // Sort by lastUpdated descending
    allHistory.sort((a, b) => {
      const aDate = new Date(a.meta?.lastUpdated || 0);
      const bDate = new Date(b.meta?.lastUpdated || 0);
      return bDate.getTime() - aDate.getTime();
    });

    return {
      resources: allHistory,
      total: allHistory.length,
    };
  }

  /**
   * Save resource to history
   */
  private saveToHistory(resource: FHIRResource): void {
    const resourceType = resource.resourceType;
    const id = resource.id!;

    if (!this.resourceHistory.has(resourceType)) {
      this.resourceHistory.set(resourceType, new Map());
    }

    const typeHistoryMap = this.resourceHistory.get(resourceType)!;

    if (!typeHistoryMap.has(id)) {
      typeHistoryMap.set(id, []);
    }

    const resourceHistory = typeHistoryMap.get(id)!;
    resourceHistory.push({ ...resource });

    // Keep only last 100 versions
    if (resourceHistory.length > 100) {
      resourceHistory.splice(0, resourceHistory.length - 100);
    }
  }

  /**
   * Apply sorting to results
   */
  private applySorting(results: FHIRResource[], sortParam: string): FHIRResource[] {
    const sortFields = sortParam.split(',');

    return results.sort((a, b) => {
      for (const field of sortFields) {
        const isDescending = field.startsWith('-');
        const fieldName = isDescending ? field.substring(1) : field;

        let aValue = this.getFieldValue(a, fieldName);
        let bValue = this.getFieldValue(b, fieldName);

        if (aValue === bValue) continue;

        if (aValue == null) return 1;
        if (bValue == null) return -1;

        const comparison = aValue < bValue ? -1 : 1;
        return isDescending ? -comparison : comparison;
      }
      return 0;
    });
  }

  /**
   * Get field value from resource
   */
  private getFieldValue(resource: FHIRResource, fieldName: string): any {
    const parts = fieldName.split('.');
    let value: any = resource;

    for (const part of parts) {
      if (value == null) return null;
      value = value[part];
    }

    return value;
  }

  /**
   * Check if database is connected
   */
  isHealthy(): boolean {
    return this.isConnected;
  }

  /**
   * Get database statistics
   */
  getStats(): { resourceCount: number; resourceTypes: string[] } {
    let totalCount = 0;
    const resourceTypes: string[] = [];

    for (const [type, typeMap] of this.resources) {
      resourceTypes.push(type);
      totalCount += typeMap.size;
    }

    return {
      resourceCount: totalCount,
      resourceTypes,
    };
  }
}
