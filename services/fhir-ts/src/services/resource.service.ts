/**
 * Resource Service
 * Handles CRUD operations for FHIR resources
 */

import { logger } from '../utils/logger.js';
import { DatabaseService } from './database.service.js';
import { FHIRResource } from './validation.service.js';

export interface SearchParameters {
  resourceType: string;
  id?: string;
  identifier?: string;
  name?: string;
  family?: string;
  given?: string;
  gender?: string;
  birthdate?: string;
  subject?: string;
  patient?: string;
  practitioner?: string;
  organization?: string;
  status?: string;
  code?: string;
  _count?: number;
  _skip?: number;
  _sort?: string;
  _include?: string[];
  _revinclude?: string[];
}

export interface SearchResult {
  total: number;
  resources: FHIRResource[];
  included?: FHIRResource[];
}

export interface OperationOutcome {
  resourceType: 'OperationOutcome';
  issue: Array<{
    severity: 'fatal' | 'error' | 'warning' | 'information';
    code: string;
    details?: {
      text: string;
    };
    diagnostics?: string;
  }>;
}

export class ResourceService {
  constructor(private databaseService: DatabaseService) {}

  /**
   * Create a new FHIR resource
   */
  async create(resource: FHIRResource): Promise<FHIRResource> {
    try {
      // Generate ID if not provided
      if (!resource.id) {
        resource.id = this.generateId();
      }

      // Add metadata
      resource.meta = {
        ...resource.meta,
        versionId: '1',
        lastUpdated: new Date().toISOString(),
      };

      // Store in database
      const savedResource = await this.databaseService.saveResource(resource);

      logger.info(`Created ${resource.resourceType} with ID: ${resource.id}`);
      return savedResource;
    } catch (error) {
      logger.error('Error creating resource: ' + String(error));
      throw this.createOperationOutcome('error', 'processing', 'Error creating resource');
    }
  }

  /**
   * Read a FHIR resource by ID
   */
  async read(resourceType: string, id: string): Promise<FHIRResource | null> {
    try {
      const resource = await this.databaseService.getResource(resourceType, id);

      if (!resource) {
        logger.warn(`Resource not found: ${resourceType}/${id}`);
        return null;
      }

      logger.debug(`Retrieved ${resourceType} with ID: ${id}`);
      return resource;
    } catch (error) {
      logger.error('Error reading resource: ' + String(error));
      throw this.createOperationOutcome('error', 'processing', 'Error reading resource');
    }
  }

  /**
   * Update a FHIR resource
   */
  async update(resource: FHIRResource): Promise<FHIRResource> {
    try {
      if (!resource.id) {
        throw this.createOperationOutcome(
          'error',
          'required',
          'Resource ID is required for update'
        );
      }

      // Check if resource exists
      const existingResource = await this.databaseService.getResource(
        resource.resourceType,
        resource.id
      );
      if (!existingResource) {
        throw this.createOperationOutcome('error', 'not-found', 'Resource not found');
      }

      // Update metadata
      const currentVersion = parseInt(existingResource.meta?.versionId || '1', 10);
      resource.meta = {
        ...resource.meta,
        versionId: (currentVersion + 1).toString(),
        lastUpdated: new Date().toISOString(),
      };

      // Store updated resource
      const updatedResource = await this.databaseService.updateResource(resource);

      logger.info(`Updated ${resource.resourceType} with ID: ${resource.id}`);
      return updatedResource;
    } catch (error) {
      logger.error('Error updating resource: ' + String(error));
      if (error instanceof Error && error.message.includes('OperationOutcome')) {
        throw error;
      }
      throw this.createOperationOutcome('error', 'processing', 'Error updating resource');
    }
  }

  /**
   * Delete a FHIR resource
   */
  async delete(resourceType: string, id: string): Promise<void> {
    try {
      // Check if resource exists
      const existingResource = await this.databaseService.getResource(resourceType, id);
      if (!existingResource) {
        throw this.createOperationOutcome('error', 'not-found', 'Resource not found');
      }

      // Delete resource
      await this.databaseService.deleteResource(resourceType, id);

      logger.info(`Deleted ${resourceType} with ID: ${id}`);
    } catch (error) {
      logger.error('Error deleting resource: ' + String(error));
      if (error instanceof Error && error.message.includes('OperationOutcome')) {
        throw error;
      }
      throw this.createOperationOutcome('error', 'processing', 'Error deleting resource');
    }
  }

  /**
   * Search for FHIR resources
   */
  async search(params: SearchParameters): Promise<SearchResult> {
    try {
      const { resources, total } = await this.databaseService.searchResources(params);

      logger.debug(`Search completed for ${params.resourceType} - Found: ${total} resources`);

      return {
        total,
        resources,
      };
    } catch (error) {
      logger.error('Error searching resources: ' + String(error));
      throw this.createOperationOutcome('error', 'processing', 'Error searching resources');
    }
  }

  /**
   * Get resource history
   */
  async history(resourceType: string, id?: string): Promise<SearchResult> {
    try {
      const { resources, total } = await this.databaseService.getResourceHistory(resourceType, id);

      logger.debug(
        `History retrieved for ${resourceType}${id ? `/${id}` : ''} - Found: ${total} versions`
      );

      return {
        total,
        resources,
      };
    } catch (error) {
      logger.error('Error getting resource history: ' + String(error));
      throw this.createOperationOutcome('error', 'processing', 'Error getting resource history');
    }
  }

  /**
   * Create a Bundle from search results
   */
  createBundle(
    bundleType: 'searchset' | 'collection' | 'document' | 'transaction' | 'transaction-response',
    resources: FHIRResource[],
    total?: number,
    baseUrl?: string
  ): FHIRResource {
    const bundle: FHIRResource = {
      resourceType: 'Bundle',
      id: this.generateId(),
      type: bundleType,
      total: total || resources.length,
      entry: resources.map((resource) => ({
        fullUrl: baseUrl ? `${baseUrl}/${resource.resourceType}/${resource.id}` : undefined,
        resource,
      })),
    };

    return bundle;
  }

  /**
   * Generate a unique ID for resources
   */
  private generateId(): string {
    return 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Create an OperationOutcome for errors
   */
  private createOperationOutcome(
    severity: 'fatal' | 'error' | 'warning' | 'information',
    code: string,
    message: string
  ): OperationOutcome {
    return {
      resourceType: 'OperationOutcome',
      issue: [
        {
          severity,
          code,
          details: {
            text: message,
          },
        },
      ],
    };
  }
}
