import type { Database } from '../db/index.js';
import { getSearchJobManager } from './manager.js';

/**
 * Database hooks for automatic search index synchronization
 * These functions should be called after database operations to keep search indexes in sync
 */

/**
 * Hook for patient operations
 */
export class PatientSearchHooks {
  static async afterCreate(db: Database, patientId: number, hospitalId: number): Promise<void> {
    try {
      const jobManager = getSearchJobManager(db);
      await jobManager.syncPatientIndex(patientId, hospitalId, 'create');
      console.log(`Queued search index sync for new patient ${patientId}`);
    } catch (error) {
      console.error('Error queuing patient index sync after create:', error);
      // Don't throw - index sync failures shouldn't break the main operation
    }
  }

  static async afterUpdate(db: Database, patientId: number, hospitalId: number): Promise<void> {
    try {
      const jobManager = getSearchJobManager(db);
      await jobManager.syncPatientIndex(patientId, hospitalId, 'update');
      console.log(`Queued search index sync for updated patient ${patientId}`);
    } catch (error) {
      console.error('Error queuing patient index sync after update:', error);
    }
  }

  static async afterDelete(db: Database, patientId: number, hospitalId: number): Promise<void> {
    try {
      const jobManager = getSearchJobManager(db);
      await jobManager.syncPatientIndex(patientId, hospitalId, 'delete');
      console.log(`Queued search index removal for deleted patient ${patientId}`);
    } catch (error) {
      console.error('Error queuing patient index sync after delete:', error);
    }
  }
}

/**
 * Hook for clinical note operations
 */
export class ClinicalNoteSearchHooks {
  static async afterCreate(db: Database, noteId: number, hospitalId: number): Promise<void> {
    try {
      const jobManager = getSearchJobManager(db);
      await jobManager.syncClinicalNoteIndex(noteId, hospitalId, 'create');
      console.log(`Queued search index sync for new clinical note ${noteId}`);
    } catch (error) {
      console.error('Error queuing clinical note index sync after create:', error);
    }
  }

  static async afterUpdate(db: Database, noteId: number, hospitalId: number): Promise<void> {
    try {
      const jobManager = getSearchJobManager(db);
      await jobManager.syncClinicalNoteIndex(noteId, hospitalId, 'update');
      console.log(`Queued search index sync for updated clinical note ${noteId}`);
    } catch (error) {
      console.error('Error queuing clinical note index sync after update:', error);
    }
  }

  static async afterDelete(db: Database, noteId: number, hospitalId: number): Promise<void> {
    try {
      const jobManager = getSearchJobManager(db);
      await jobManager.syncClinicalNoteIndex(noteId, hospitalId, 'delete');
      console.log(`Queued search index removal for deleted clinical note ${noteId}`);
    } catch (error) {
      console.error('Error queuing clinical note index sync after delete:', error);
    }
  }
}

/**
 * Hook for appointment operations
 */
export class AppointmentSearchHooks {
  static async afterCreate(db: Database, appointmentId: number, hospitalId: number): Promise<void> {
    try {
      const jobManager = getSearchJobManager(db);
      await jobManager.syncAppointmentIndex(appointmentId, hospitalId, 'create');
      console.log(`Queued search index sync for new appointment ${appointmentId}`);
    } catch (error) {
      console.error('Error queuing appointment index sync after create:', error);
    }
  }

  static async afterUpdate(db: Database, appointmentId: number, hospitalId: number): Promise<void> {
    try {
      const jobManager = getSearchJobManager(db);
      await jobManager.syncAppointmentIndex(appointmentId, hospitalId, 'update');
      console.log(`Queued search index sync for updated appointment ${appointmentId}`);
    } catch (error) {
      console.error('Error queuing appointment index sync after update:', error);
    }
  }

  static async afterDelete(db: Database, appointmentId: number, hospitalId: number): Promise<void> {
    try {
      const jobManager = getSearchJobManager(db);
      await jobManager.syncAppointmentIndex(appointmentId, hospitalId, 'delete');
      console.log(`Queued search index removal for deleted appointment ${appointmentId}`);
    } catch (error) {
      console.error('Error queuing appointment index sync after delete:', error);
    }
  }
}

/**
 * Utility function to trigger bulk reindex for a hospital
 */
export async function triggerHospitalReindex(
  db: Database,
  hospitalId: number,
  batchSize = 100
): Promise<string[]> {
  const jobManager = getSearchJobManager(db);
  return await jobManager.reindexHospital(hospitalId, batchSize);
}

/**
 * Utility function to trigger system-wide reindex
 */
export async function triggerSystemReindex(db: Database, batchSize = 100): Promise<string> {
  const jobManager = getSearchJobManager(db);
  return await jobManager.reindexSystem(batchSize);
}

/**
 * Utility function to trigger cleanup operations
 */
export async function triggerSearchCleanup(
  db: Database,
  hospitalId?: number
): Promise<{
  orphanedIndexes: string;
  oldHistory: string;
}> {
  const jobManager = getSearchJobManager(db);

  const [orphanedIndexes, oldHistory] = await Promise.all([
    jobManager.cleanupOrphanedIndexes(hospitalId),
    jobManager.cleanupOldHistory(90, hospitalId), // Clean history older than 90 days
  ]);

  return { orphanedIndexes, oldHistory };
}

/**
 * Example of how to integrate these hooks into your service methods:
 *
 * // In PatientService.ts
 * async createPatient(data: CreatePatientData): Promise<Patient> {
 *   const patient = await db.insert(patients).values(data).returning();
 *
 *   // Trigger search index sync
 *   await PatientSearchHooks.afterCreate(db, patient.id, patient.hospitalId);
 *
 *   return patient;
 * }
 *
 * // In ClinicalNoteService.ts
 * async updateClinicalNote(id: number, data: UpdateNoteData): Promise<ClinicalNote> {
 *   const note = await db.update(clinicalNotes)
 *     .set(data)
 *     .where(eq(clinicalNotes.id, id))
 *     .returning();
 *
 *   // Trigger search index sync
 *   await ClinicalNoteSearchHooks.afterUpdate(db, note.id, note.hospitalId);
 *
 *   return note;
 * }
 *
 * // In AppointmentService.ts
 * async deleteAppointment(id: number): Promise<void> {
 *   const appointment = await db.select().from(appointments).where(eq(appointments.id, id));
 *   await db.delete(appointments).where(eq(appointments.id, id));
 *
 *   // Trigger search index cleanup
 *   await AppointmentSearchHooks.afterDelete(db, id, appointment.hospitalId);
 * }
 */
