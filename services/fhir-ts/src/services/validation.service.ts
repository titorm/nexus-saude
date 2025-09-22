/**
 * FHIR Validation Service
 * Handles validation of FHIR R4 resources and bundles
 */

import { logger } from '../utils/logger.js';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationWarning {
  field: string;
  message: string;
}

export interface FHIRResource {
  resourceType: string;
  id?: string;
  meta?: {
    versionId?: string;
    lastUpdated?: string;
    profile?: string[];
  };
  [key: string]: any;
}

export class FHIRValidationService {
  private supportedResourceTypes = [
    'Patient',
    'Practitioner',
    'Organization',
    'Encounter',
    'Observation',
    'Condition',
    'Procedure',
    'MedicationRequest',
    'DiagnosticReport',
    'DocumentReference',
    'Bundle',
  ];

  /**
   * Validate a FHIR resource
   */
  async validateResource(resource: FHIRResource): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // Basic structure validation
      if (!resource.resourceType) {
        errors.push({
          field: 'resourceType',
          code: 'MISSING_REQUIRED_FIELD',
          message: 'Resource must have a resourceType',
          severity: 'error',
        });
      } else if (!this.supportedResourceTypes.includes(resource.resourceType)) {
        errors.push({
          field: 'resourceType',
          code: 'UNSUPPORTED_RESOURCE_TYPE',
          message: `Resource type '${resource.resourceType}' is not supported`,
          severity: 'error',
        });
      }

      // Resource-specific validation
      switch (resource.resourceType) {
        case 'Patient':
          this.validatePatient(resource, errors, warnings);
          break;
        case 'Practitioner':
          this.validatePractitioner(resource, errors, warnings);
          break;
        case 'Organization':
          this.validateOrganization(resource, errors, warnings);
          break;
        case 'Encounter':
          this.validateEncounter(resource, errors, warnings);
          break;
        case 'Observation':
          this.validateObservation(resource, errors, warnings);
          break;
        case 'Bundle':
          await this.validateBundle(resource, errors, warnings);
          break;
      }

      logger.debug(
        `Validation completed for ${resource.resourceType} (id: ${resource.id}) - Errors: ${errors.length}, Warnings: ${warnings.length}`
      );

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      logger.error('Validation error: ' + String(error));
      return {
        isValid: false,
        errors: [
          {
            field: 'resource',
            code: 'VALIDATION_ERROR',
            message: 'Internal validation error occurred',
            severity: 'error',
          },
        ],
        warnings: [],
      };
    }
  }

  /**
   * Validate Patient resource
   */
  private validatePatient(
    resource: FHIRResource,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!resource.name || !Array.isArray(resource.name) || resource.name.length === 0) {
      errors.push({
        field: 'name',
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Patient must have at least one name',
        severity: 'error',
      });
    }

    if (!resource.gender || !['male', 'female', 'other', 'unknown'].includes(resource.gender)) {
      warnings.push({
        field: 'gender',
        message: 'Patient should have a valid gender value',
      });
    }

    if (!resource.birthDate) {
      warnings.push({
        field: 'birthDate',
        message: 'Patient should have a birth date',
      });
    }
  }

  /**
   * Validate Practitioner resource
   */
  private validatePractitioner(
    resource: FHIRResource,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!resource.name || !Array.isArray(resource.name) || resource.name.length === 0) {
      errors.push({
        field: 'name',
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Practitioner must have at least one name',
        severity: 'error',
      });
    }
  }

  /**
   * Validate Organization resource
   */
  private validateOrganization(
    resource: FHIRResource,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!resource.name) {
      errors.push({
        field: 'name',
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Organization must have a name',
        severity: 'error',
      });
    }
  }

  /**
   * Validate Encounter resource
   */
  private validateEncounter(
    resource: FHIRResource,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!resource.status) {
      errors.push({
        field: 'status',
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Encounter must have a status',
        severity: 'error',
      });
    }

    if (!resource.class) {
      errors.push({
        field: 'class',
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Encounter must have a class',
        severity: 'error',
      });
    }

    if (!resource.subject || !resource.subject.reference) {
      errors.push({
        field: 'subject',
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Encounter must have a subject reference',
        severity: 'error',
      });
    }
  }

  /**
   * Validate Observation resource
   */
  private validateObservation(
    resource: FHIRResource,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!resource.status) {
      errors.push({
        field: 'status',
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Observation must have a status',
        severity: 'error',
      });
    }

    if (!resource.code) {
      errors.push({
        field: 'code',
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Observation must have a code',
        severity: 'error',
      });
    }

    if (!resource.subject || !resource.subject.reference) {
      errors.push({
        field: 'subject',
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Observation must have a subject reference',
        severity: 'error',
      });
    }
  }

  /**
   * Validate Bundle resource
   */
  private async validateBundle(
    resource: FHIRResource,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    if (!resource.type) {
      errors.push({
        field: 'type',
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Bundle must have a type',
        severity: 'error',
      });
    }

    if (!resource.entry || !Array.isArray(resource.entry)) {
      warnings.push({
        field: 'entry',
        message: 'Bundle should have entries',
      });
    } else {
      // Validate each entry
      for (let i = 0; i < resource.entry.length; i++) {
        const entry = resource.entry[i];
        if (entry.resource) {
          const entryValidation = await this.validateResource(entry.resource);
          entryValidation.errors.forEach((error) => {
            errors.push({
              ...error,
              field: `entry[${i}].resource.${error.field}`,
            });
          });
          entryValidation.warnings.forEach((warning) => {
            warnings.push({
              ...warning,
              field: `entry[${i}].resource.${warning.field}`,
            });
          });
        }
      }
    }
  }

  /**
   * Get supported resource types
   */
  getSupportedResourceTypes(): string[] {
    return [...this.supportedResourceTypes];
  }
}
