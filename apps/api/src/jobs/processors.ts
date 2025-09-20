import { sql } from 'drizzle-orm';
import type { Database } from '../db/index.js';
import type {
  JobProcessor,
  SearchIndexSyncJobPayload,
  SearchBulkReindexJobPayload,
  SearchCleanupJobPayload,
  SearchAnalyticsUpdateJobPayload,
} from './types.js';
import { searchIndexes } from '../db/schema.js';
import { eq, and, lt, isNull, inArray } from 'drizzle-orm';
import { patients, clinicalNotes, appointments } from '../db/schema.js';

/**
 * Processes search index synchronization jobs
 * Handles individual entity index updates
 */
export class SearchIndexSyncProcessor implements JobProcessor<SearchIndexSyncJobPayload> {
  async process(job: any, db: Database): Promise<Record<string, any>> {
    const { entityType, entityId, operation, hospitalId } =
      job.payload as SearchIndexSyncJobPayload;

    try {
      if (operation === 'delete') {
        // Remove from search index
        await db
          .delete(searchIndexes)
          .where(
            and(eq(searchIndexes.entityType, entityType), eq(searchIndexes.entityId, entityId))
          );

        return {
          action: 'deleted',
          entityType,
          entityId,
          message: 'Search index entry removed successfully',
        };
      }

      // Get entity data based on type
      let entityData: any = null;
      let title = '';
      let content = '';
      let metadata: Record<string, any> = {};

      switch (entityType) {
        case 'patient':
          const patient = await db
            .select()
            .from(patients)
            .where(eq(patients.id, entityId))
            .limit(1);

          if (patient.length === 0) {
            throw new Error(`Patient with ID ${entityId} not found`);
          }

          entityData = patient[0];
          title = entityData.fullName;
          content = [
            entityData.fullName,
            entityData.cpf,
            entityData.email,
            entityData.phone,
            entityData.address,
          ]
            .filter(Boolean)
            .join(' ');
          metadata = {
            fullName: entityData.fullName,
            cpf: entityData.cpf,
            email: entityData.email,
            phone: entityData.phone,
            birthDate: entityData.birthDate,
            gender: entityData.gender,
          };
          break;

        case 'clinical_note':
          const note = await db
            .select()
            .from(clinicalNotes)
            .where(eq(clinicalNotes.id, entityId))
            .limit(1);

          if (note.length === 0) {
            throw new Error(`Clinical note with ID ${entityId} not found`);
          }

          entityData = note[0];
          title = `${entityData.type} - ${entityData.createdAt.toLocaleDateString()}`;
          content = [
            entityData.content,
            entityData.diagnosis,
            entityData.prescription,
            entityData.observations,
          ]
            .filter(Boolean)
            .join(' ');
          metadata = {
            type: entityData.type,
            patientId: entityData.patientId,
            doctorId: entityData.doctorId,
            diagnosis: entityData.diagnosis,
            priority: entityData.priority,
            createdAt: entityData.createdAt,
          };
          break;

        case 'appointment':
          const appointment = await db
            .select()
            .from(appointments)
            .where(eq(appointments.id, entityId))
            .limit(1);

          if (appointment.length === 0) {
            throw new Error(`Appointment with ID ${entityId} not found`);
          }

          entityData = appointment[0];
          title = `Consulta - ${entityData.scheduledDate.toLocaleDateString()}`;
          content = [entityData.type, entityData.notes, entityData.status]
            .filter(Boolean)
            .join(' ');
          metadata = {
            type: entityData.type,
            patientId: entityData.patientId,
            doctorId: entityData.doctorId,
            scheduledDate: entityData.scheduledDate,
            status: entityData.status,
            priority: entityData.priority,
          };
          break;

        default:
          throw new Error(`Unsupported entity type: ${entityType}`);
      }

      // Create search vector
      const searchVector = sql`to_tsvector('portuguese', ${title} || ' ' || ${content})`;

      // Upsert search index
      await db
        .insert(searchIndexes)
        .values({
          entityType,
          entityId,
          title,
          content,
          searchVector,
          metadata,
          hospitalId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [searchIndexes.entityType, searchIndexes.entityId],
          set: {
            title,
            content,
            searchVector,
            metadata,
            updatedAt: new Date(),
          },
        });

      return {
        action: operation === 'create' ? 'created' : 'updated',
        entityType,
        entityId,
        title,
        contentLength: content.length,
        message: 'Search index updated successfully',
      };
    } catch (error) {
      throw new Error(
        `Failed to sync search index: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

/**
 * Processes bulk reindexing jobs
 * Handles large-scale index rebuilding
 */
export class SearchBulkReindexProcessor implements JobProcessor<SearchBulkReindexJobPayload> {
  async process(job: any, db: Database): Promise<Record<string, any>> {
    const {
      entityType,
      hospitalId,
      batchSize = 100,
      startFromId,
    } = job.payload as SearchBulkReindexJobPayload;

    const results = {
      processed: 0,
      created: 0,
      updated: 0,
      errors: 0,
      lastProcessedId: startFromId || '',
      entityType: entityType || 'all',
    };

    try {
      const entityTypes = entityType ? [entityType] : ['patient', 'clinical_note', 'appointment'];

      for (const type of entityTypes) {
        const processed = await this.reindexEntityType(
          db,
          type as any,
          hospitalId,
          batchSize,
          startFromId
        );

        results.processed += processed.total;
        results.created += processed.created;
        results.updated += processed.updated;
        results.errors += processed.errors;

        if (processed.lastId) {
          results.lastProcessedId = processed.lastId;
        }
      }

      return results;
    } catch (error) {
      throw new Error(
        `Bulk reindex failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async reindexEntityType(
    db: Database,
    entityType: 'patient' | 'clinical_note' | 'appointment',
    hospitalId?: number,
    batchSize = 100,
    startFromId?: number
  ) {
    const results = { total: 0, created: 0, updated: 0, errors: 0, lastId: 0 };

    let hasMore = true;
    let lastId = startFromId || 0;

    while (hasMore) {
      let entities: any[] = [];

      // Fetch entities based on type
      switch (entityType) {
        case 'patient':
          entities = await db
            .select()
            .from(patients)
            .where(
              and(
                hospitalId ? eq(patients.hospitalId, hospitalId) : undefined,
                lastId ? sql`${patients.id} > ${lastId}` : undefined
              )
            )
            .orderBy(patients.id)
            .limit(batchSize);
          break;

        case 'clinical_note':
          entities = await db
            .select()
            .from(clinicalNotes)
            .where(
              and(
                hospitalId ? eq(clinicalNotes.hospitalId, hospitalId) : undefined,
                lastId ? sql`${clinicalNotes.id} > ${lastId}` : undefined
              )
            )
            .orderBy(clinicalNotes.id)
            .limit(batchSize);
          break;

        case 'appointment':
          entities = await db
            .select()
            .from(appointments)
            .where(
              and(
                hospitalId ? eq(appointments.hospitalId, hospitalId) : undefined,
                lastId ? sql`${appointments.id} > ${lastId}` : undefined
              )
            )
            .orderBy(appointments.id)
            .limit(batchSize);
          break;
      }

      if (entities.length === 0) {
        hasMore = false;
        break;
      }

      // Process each entity
      for (const entity of entities) {
        try {
          const syncProcessor = new SearchIndexSyncProcessor();
          await syncProcessor.process(
            {
              payload: {
                entityType,
                entityId: entity.id,
                operation: 'update' as const,
                hospitalId: entity.hospitalId,
              },
            } as any,
            db
          );

          results.updated++;
          results.total++;
          results.lastId = entity.id;
        } catch (error) {
          console.error(`Error processing ${entityType} ${entity.id}:`, error);
          results.errors++;
        }
      }

      // Check if we have more entities to process
      if (entities.length < batchSize) {
        hasMore = false;
      } else {
        lastId = entities[entities.length - 1].id;
      }
    }

    return results;
  }
}

/**
 * Processes search cleanup jobs
 * Handles maintenance tasks like removing orphaned indexes
 */
export class SearchCleanupProcessor implements JobProcessor<SearchCleanupJobPayload> {
  async process(job: any, db: Database): Promise<Record<string, any>> {
    const { cleanupType, olderThanDays = 30, hospitalId } = job.payload as SearchCleanupJobPayload;

    const results = {
      cleanupType,
      removed: 0,
      message: '',
    };

    try {
      switch (cleanupType) {
        case 'orphaned_indexes':
          results.removed = await this.cleanupOrphanedIndexes(db, hospitalId);
          results.message = `Removed ${results.removed} orphaned search indexes`;
          break;

        case 'old_history':
          results.removed = await this.cleanupOldHistory(db, olderThanDays, hospitalId);
          results.message = `Removed ${results.removed} old search history entries`;
          break;

        case 'failed_indexes':
          results.removed = await this.cleanupFailedIndexes(db, hospitalId);
          results.message = `Removed ${results.removed} failed search indexes`;
          break;

        default:
          throw new Error(`Unknown cleanup type: ${cleanupType}`);
      }

      return results;
    } catch (error) {
      throw new Error(
        `Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async cleanupOrphanedIndexes(db: Database, hospitalId?: number): Promise<number> {
    // Find search indexes that don't have corresponding entities
    const orphanedPatients = await db
      .select({ id: searchIndexes.id })
      .from(searchIndexes)
      .leftJoin(patients, eq(searchIndexes.entityId, patients.id))
      .where(
        and(
          eq(searchIndexes.entityType, 'patient'),
          isNull(patients.id),
          hospitalId ? eq(searchIndexes.hospitalId, hospitalId) : undefined
        )
      );

    const orphanedNotes = await db
      .select({ id: searchIndexes.id })
      .from(searchIndexes)
      .leftJoin(clinicalNotes, eq(searchIndexes.entityId, clinicalNotes.id))
      .where(
        and(
          eq(searchIndexes.entityType, 'clinical_note'),
          isNull(clinicalNotes.id),
          hospitalId ? eq(searchIndexes.hospitalId, hospitalId) : undefined
        )
      );

    const orphanedAppointments = await db
      .select({ id: searchIndexes.id })
      .from(searchIndexes)
      .leftJoin(appointments, eq(searchIndexes.entityId, appointments.id))
      .where(
        and(
          eq(searchIndexes.entityType, 'appointment'),
          isNull(appointments.id),
          hospitalId ? eq(searchIndexes.hospitalId, hospitalId) : undefined
        )
      );

    const allOrphaned = [
      ...orphanedPatients.map((p: any) => p.id),
      ...orphanedNotes.map((n: any) => n.id),
      ...orphanedAppointments.map((a: any) => a.id),
    ];

    if (allOrphaned.length > 0) {
      await db.delete(searchIndexes).where(inArray(searchIndexes.id, allOrphaned));
    }

    return allOrphaned.length;
  }

  private async cleanupOldHistory(
    db: Database,
    olderThanDays: number,
    hospitalId?: number
  ): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await db
      .delete(searchIndexes)
      .where(
        and(
          lt(searchIndexes.createdAt, cutoffDate),
          hospitalId ? eq(searchIndexes.hospitalId, hospitalId) : undefined
        )
      );

    return result.rowCount || 0;
  }

  private async cleanupFailedIndexes(db: Database, hospitalId?: number): Promise<number> {
    // This would require additional metadata tracking of failed indexes
    // For now, we'll clean up indexes that haven't been updated in a long time
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7); // 7 days old

    const result = await db
      .delete(searchIndexes)
      .where(
        and(
          lt(searchIndexes.updatedAt, cutoffDate),
          isNull(searchIndexes.searchVector),
          hospitalId ? eq(searchIndexes.hospitalId, hospitalId) : undefined
        )
      );

    return result.rowCount || 0;
  }
}

/**
 * Processes search analytics update jobs
 * Handles periodic analytics calculations
 */
export class SearchAnalyticsUpdateProcessor
  implements JobProcessor<SearchAnalyticsUpdateJobPayload>
{
  async process(job: any, db: Database): Promise<Record<string, any>> {
    const { timeframe, date, hospitalId } = job.payload as SearchAnalyticsUpdateJobPayload;

    try {
      // This would calculate and store aggregated analytics
      // For now, we'll return a placeholder implementation
      const results = {
        timeframe,
        date,
        hospitalId,
        metrics: {
          totalSearches: 0,
          uniqueUsers: 0,
          avgResultsPerSearch: 0,
          topQueries: [],
          noResultQueries: [],
        },
      };

      // TODO: Implement actual analytics calculations
      // This would involve:
      // 1. Querying searchHistory for the specified timeframe
      // 2. Calculating aggregated metrics
      // 3. Storing results in an analytics table

      return results;
    } catch (error) {
      throw new Error(
        `Analytics update failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
