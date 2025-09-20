import { eq, and, or, gte, lte, sql, desc, asc, between, isNull } from 'drizzle-orm';
import {
  getDb,
  appointments,
  appointmentTypes,
  users,
  patients,
  doctorSchedules,
  scheduleBlocks,
} from '../db/index.js';
import type {
  CreateAppointmentType,
  UpdateAppointmentType,
  RescheduleAppointmentType,
  CancelAppointmentType,
  ConfirmAppointmentType,
  AppointmentFiltersType,
  AvailabilityRequestType,
  TimeSlotType,
  PaginatedAppointmentsType,
  AppointmentStatsType,
} from '../schemas/appointments.js';
import type { AppointmentStatus } from '../schemas/appointments.js';

export class AppointmentsService {
  private async getDbInstance() {
    return await getDb();
  }

  /**
   * Formata dados do agendamento com joins para resposta da API
   */
  private formatAppointmentResponse(appointmentData: any) {
    return {
      id: appointmentData.id,
      patientId: appointmentData.patientId,
      patientName: appointmentData.patient?.fullName || 'Paciente não encontrado',
      doctorId: appointmentData.doctorId,
      doctorName: appointmentData.doctor?.name || 'Médico não encontrado',
      appointmentTypeId: appointmentData.appointmentTypeId,
      appointmentType: appointmentData.appointmentType || {},
      scheduledAt: appointmentData.scheduledAt.toISOString(),
      durationMinutes: appointmentData.durationMinutes,
      status: appointmentData.status,
      notes: appointmentData.notes,
      reason: appointmentData.reason,
      symptoms: appointmentData.symptoms || [],
      isUrgent: appointmentData.isUrgent,
      requiresPreparation: appointmentData.requiresPreparation,
      preparationInstructions: appointmentData.preparationInstructions,
      confirmedAt: appointmentData.confirmedAt?.toISOString() || null,
      confirmationMethod: appointmentData.confirmationMethod,
      cancelledAt: appointmentData.cancelledAt?.toISOString() || null,
      cancellationReason: appointmentData.cancellationReason,
      cancelledBy: appointmentData.cancelledBy,
      rescheduledFromId: appointmentData.rescheduledFromId,
      reminderSent24h: appointmentData.reminderSent24h,
      reminderSent1h: appointmentData.reminderSent1h,
      source: appointmentData.source,
      externalId: appointmentData.externalId,
      hospitalId: appointmentData.hospitalId,
      createdAt: appointmentData.createdAt.toISOString(),
      updatedAt: appointmentData.updatedAt.toISOString(),
    };
  }

  /**
   * Verifica se existe conflito de horário para o médico
   */
  private async checkScheduleConflict(
    doctorId: number,
    scheduledAt: Date,
    durationMinutes: number,
    excludeAppointmentId?: number
  ): Promise<boolean> {
    const db = await this.getDbInstance();
    const endTime = new Date(scheduledAt.getTime() + durationMinutes * 60000);

    const conflictQuery = db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, doctorId),
          or(
            // Agendamento existente começa durante o novo agendamento
            and(gte(appointments.scheduledAt, scheduledAt), lte(appointments.scheduledAt, endTime)),
            // Agendamento existente termina durante o novo agendamento
            and(
              gte(
                sql`${appointments.scheduledAt} + interval '${appointments.durationMinutes} minutes'`,
                scheduledAt
              ),
              lte(
                sql`${appointments.scheduledAt} + interval '${appointments.durationMinutes} minutes'`,
                endTime
              )
            ),
            // Agendamento existente engloba o novo agendamento
            and(
              lte(appointments.scheduledAt, scheduledAt),
              gte(
                sql`${appointments.scheduledAt} + interval '${appointments.durationMinutes} minutes'`,
                endTime
              )
            )
          ),
          // Apenas agendamentos ativos (não cancelados)
          or(
            eq(appointments.status, 'scheduled'),
            eq(appointments.status, 'confirmed'),
            eq(appointments.status, 'in_progress')
          )
        )
      );

    if (excludeAppointmentId) {
      conflictQuery.where(sql`${appointments.id} != ${excludeAppointmentId}`);
    }

    const conflicts = await conflictQuery;
    return conflicts.length > 0;
  }

  /**
   * Verifica se o horário está dentro do horário de trabalho do médico
   */
  private async isDoctorAvailable(doctorId: number, scheduledAt: Date): Promise<boolean> {
    const db = await this.getDbInstance();
    const dayOfWeek = scheduledAt.getDay();
    const timeString = scheduledAt.toTimeString().substring(0, 5); // HH:MM

    // Verifica horário regular
    const schedule = await db
      .select()
      .from(doctorSchedules)
      .where(
        and(
          eq(doctorSchedules.doctorId, doctorId),
          eq(doctorSchedules.dayOfWeek, dayOfWeek),
          eq(doctorSchedules.isActive, true),
          lte(doctorSchedules.startTime, timeString),
          gte(doctorSchedules.endTime, timeString)
        )
      );

    if (schedule.length === 0) {
      return false;
    }

    // Verifica se não está em horário de intervalo
    const doctorSchedule = schedule[0];
    if (doctorSchedule.breakStartTime && doctorSchedule.breakEndTime) {
      if (
        timeString >= doctorSchedule.breakStartTime &&
        timeString <= doctorSchedule.breakEndTime
      ) {
        return false;
      }
    }

    // Verifica bloqueios específicos
    const blocks = await db
      .select()
      .from(scheduleBlocks)
      .where(
        and(
          eq(scheduleBlocks.doctorId, doctorId),
          lte(scheduleBlocks.startDateTime, scheduledAt),
          gte(scheduleBlocks.endDateTime, scheduledAt)
        )
      );

    return blocks.length === 0;
  }

  /**
   * Lista agendamentos com filtros e paginação
   */
  async getAppointments(
    filters: AppointmentFiltersType,
    userHospitalId: number
  ): Promise<PaginatedAppointmentsType> {
    const db = await this.getDbInstance();
    const { limit = 20, offset = 0 } = filters;

    let whereConditions = [eq(appointments.hospitalId, userHospitalId)];

    // Filtros opcionais
    if (filters.patientId) {
      whereConditions.push(eq(appointments.patientId, filters.patientId));
    }
    if (filters.doctorId) {
      whereConditions.push(eq(appointments.doctorId, filters.doctorId));
    }
    if (filters.status) {
      whereConditions.push(eq(appointments.status, filters.status));
    }
    if (filters.startDate) {
      whereConditions.push(gte(appointments.scheduledAt, new Date(filters.startDate)));
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      whereConditions.push(lte(appointments.scheduledAt, endDate));
    }
    if (filters.appointmentTypeId) {
      whereConditions.push(eq(appointments.appointmentTypeId, filters.appointmentTypeId));
    }
    if (filters.isUrgent !== undefined) {
      whereConditions.push(eq(appointments.isUrgent, filters.isUrgent));
    }

    // Query principal com joins
    const appointmentsQuery = db
      .select({
        appointment: appointments,
        patient: patients,
        doctor: users,
        appointmentType: appointmentTypes,
      })
      .from(appointments)
      .leftJoin(patients, eq(appointments.patientId, patients.id))
      .leftJoin(users, eq(appointments.doctorId, users.id))
      .leftJoin(appointmentTypes, eq(appointments.appointmentTypeId, appointmentTypes.id))
      .where(and(...whereConditions))
      .orderBy(desc(appointments.scheduledAt))
      .limit(limit)
      .offset(offset);

    const result = await appointmentsQuery;

    // Query para contar total
    const totalQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(appointments)
      .where(and(...whereConditions));

    const [{ count: total }] = await totalQuery;

    const formattedAppointments = result.map((row: any) =>
      this.formatAppointmentResponse({
        ...row.appointment,
        patient: row.patient,
        doctor: row.doctor,
        appointmentType: row.appointmentType,
      })
    );

    return {
      appointments: formattedAppointments,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Busca agendamento por ID
   */
  async getAppointmentById(id: number, userHospitalId: number) {
    const db = await this.getDbInstance();

    const result = await db
      .select({
        appointment: appointments,
        patient: patients,
        doctor: users,
        appointmentType: appointmentTypes,
      })
      .from(appointments)
      .leftJoin(patients, eq(appointments.patientId, patients.id))
      .leftJoin(users, eq(appointments.doctorId, users.id))
      .leftJoin(appointmentTypes, eq(appointments.appointmentTypeId, appointmentTypes.id))
      .where(and(eq(appointments.id, id), eq(appointments.hospitalId, userHospitalId)))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    return this.formatAppointmentResponse({
      ...row.appointment,
      patient: row.patient,
      doctor: row.doctor,
      appointmentType: row.appointmentType,
    });
  }

  /**
   * Cria novo agendamento
   */
  async createAppointment(data: CreateAppointmentType, userHospitalId: number) {
    const db = await this.getDbInstance();
    const scheduledAt = new Date(data.scheduledAt);
    const durationMinutes = data.durationMinutes || 30;

    // Validações
    const isAvailable = await this.isDoctorAvailable(data.doctorId, scheduledAt);
    if (!isAvailable) {
      throw new Error('Médico não disponível neste horário');
    }

    const hasConflict = await this.checkScheduleConflict(
      data.doctorId,
      scheduledAt,
      durationMinutes
    );
    if (hasConflict) {
      throw new Error('Conflito de horário detectado');
    }

    // Criar agendamento
    const [newAppointment] = await db
      .insert(appointments)
      .values({
        ...data,
        hospitalId: userHospitalId,
        scheduledAt,
        durationMinutes,
        isUrgent: data.isUrgent || false,
        requiresPreparation: data.requiresPreparation || false,
        reminderSent24h: false,
        reminderSent1h: false,
        source: data.source || 'web',
      })
      .returning();

    return this.getAppointmentById(newAppointment.id, userHospitalId);
  }

  /**
   * Atualiza agendamento
   */
  async updateAppointment(id: number, data: UpdateAppointmentType, userHospitalId: number) {
    const db = await this.getDbInstance();

    // Verificar se existe
    const existing = await this.getAppointmentById(id, userHospitalId);
    if (!existing) {
      throw new Error('Agendamento não encontrado');
    }

    // Se mudando horário, verificar conflitos
    if (data.scheduledAt) {
      const newScheduledAt = new Date(data.scheduledAt);
      const durationMinutes = data.durationMinutes || existing.durationMinutes;

      const isAvailable = await this.isDoctorAvailable(existing.doctorId, newScheduledAt);
      if (!isAvailable) {
        throw new Error('Médico não disponível neste horário');
      }

      const hasConflict = await this.checkScheduleConflict(
        existing.doctorId,
        newScheduledAt,
        durationMinutes,
        id
      );
      if (hasConflict) {
        throw new Error('Conflito de horário detectado');
      }
    }

    await db
      .update(appointments)
      .set({
        ...data,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        updatedAt: new Date(),
      })
      .where(and(eq(appointments.id, id), eq(appointments.hospitalId, userHospitalId)));

    return this.getAppointmentById(id, userHospitalId);
  }

  /**
   * Reagenda agendamento
   */
  async rescheduleAppointment(
    id: number,
    data: RescheduleAppointmentType,
    userHospitalId: number,
    userId: number
  ) {
    const db = await this.getDbInstance();

    const existing = await this.getAppointmentById(id, userHospitalId);
    if (!existing) {
      throw new Error('Agendamento não encontrado');
    }

    if (existing.status === 'cancelled' || existing.status === 'completed') {
      throw new Error('Não é possível reagendar agendamento cancelado ou concluído');
    }

    // Criar novo agendamento
    const newAppointment = await this.createAppointment(
      {
        patientId: existing.patientId,
        doctorId: existing.doctorId,
        appointmentTypeId: existing.appointmentTypeId,
        scheduledAt: data.newScheduledAt,
        durationMinutes: existing.durationMinutes,
        notes: `Reagendado de ${existing.scheduledAt}. ${data.reason || ''}`,
        reason: existing.reason,
        symptoms: existing.symptoms,
        isUrgent: existing.isUrgent,
        requiresPreparation: existing.requiresPreparation,
        preparationInstructions: existing.preparationInstructions,
        source: existing.source,
      },
      userHospitalId
    );

    // Marcar agendamento original como reagendado
    await db
      .update(appointments)
      .set({
        status: 'rescheduled' as AppointmentStatus,
        cancellationReason: `Reagendado para ${data.newScheduledAt}. ${data.reason || ''}`,
        cancelledBy: userId,
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(appointments.id, id), eq(appointments.hospitalId, userHospitalId)));

    // Marcar novo agendamento com referência ao original
    await db
      .update(appointments)
      .set({
        rescheduledFromId: id,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, newAppointment!.id));

    return this.getAppointmentById(newAppointment!.id, userHospitalId);
  }

  /**
   * Cancela agendamento
   */
  async cancelAppointment(
    id: number,
    data: CancelAppointmentType,
    userHospitalId: number,
    userId: number
  ) {
    const db = await this.getDbInstance();

    const existing = await this.getAppointmentById(id, userHospitalId);
    if (!existing) {
      throw new Error('Agendamento não encontrado');
    }

    if (existing.status === 'cancelled') {
      throw new Error('Agendamento já foi cancelado');
    }

    if (existing.status === 'completed') {
      throw new Error('Não é possível cancelar agendamento concluído');
    }

    await db
      .update(appointments)
      .set({
        status: 'cancelled' as AppointmentStatus,
        cancellationReason: data.reason,
        cancelledBy: userId,
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(appointments.id, id), eq(appointments.hospitalId, userHospitalId)));

    return this.getAppointmentById(id, userHospitalId);
  }

  /**
   * Confirma agendamento
   */
  async confirmAppointment(id: number, data: ConfirmAppointmentType, userHospitalId: number) {
    const db = await this.getDbInstance();

    const existing = await this.getAppointmentById(id, userHospitalId);
    if (!existing) {
      throw new Error('Agendamento não encontrado');
    }

    if (existing.status !== 'scheduled') {
      throw new Error('Apenas agendamentos com status "scheduled" podem ser confirmados');
    }

    await db
      .update(appointments)
      .set({
        status: 'confirmed' as AppointmentStatus,
        confirmedAt: new Date(),
        confirmationMethod: data.confirmationMethod,
        updatedAt: new Date(),
      })
      .where(and(eq(appointments.id, id), eq(appointments.hospitalId, userHospitalId)));

    return this.getAppointmentById(id, userHospitalId);
  }

  /**
   * Busca slots disponíveis para um médico em uma data
   */
  async getDoctorAvailability(
    request: AvailabilityRequestType,
    userHospitalId: number
  ): Promise<TimeSlotType[]> {
    const db = await this.getDbInstance();
    const { doctorId, date, appointmentTypeId } = request;
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();

    // Buscar horário do médico para o dia
    const schedule = await db
      .select()
      .from(doctorSchedules)
      .where(
        and(
          eq(doctorSchedules.doctorId, doctorId),
          eq(doctorSchedules.dayOfWeek, dayOfWeek),
          eq(doctorSchedules.isActive, true)
        )
      );

    if (schedule.length === 0) {
      return [];
    }

    const doctorSchedule = schedule[0];

    // Buscar duração padrão do tipo de consulta
    let slotDuration = 30; // default
    if (appointmentTypeId) {
      const appointmentType = await db
        .select()
        .from(appointmentTypes)
        .where(eq(appointmentTypes.id, appointmentTypeId))
        .limit(1);

      if (appointmentType.length > 0) {
        slotDuration = appointmentType[0].durationMinutes;
      }
    }

    // Buscar agendamentos existentes para o dia
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAppointments = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, doctorId),
          between(appointments.scheduledAt, startOfDay, endOfDay),
          or(
            eq(appointments.status, 'scheduled'),
            eq(appointments.status, 'confirmed'),
            eq(appointments.status, 'in_progress')
          )
        )
      )
      .orderBy(asc(appointments.scheduledAt));

    // Buscar bloqueios para o dia
    const blocks = await db
      .select()
      .from(scheduleBlocks)
      .where(
        and(
          eq(scheduleBlocks.doctorId, doctorId),
          or(
            // Bloco que começa no dia
            between(scheduleBlocks.startDateTime, startOfDay, endOfDay),
            // Bloco que termina no dia
            between(scheduleBlocks.endDateTime, startOfDay, endOfDay),
            // Bloco que engloba o dia todo
            and(
              lte(scheduleBlocks.startDateTime, startOfDay),
              gte(scheduleBlocks.endDateTime, endOfDay)
            )
          )
        )
      );

    // Gerar slots disponíveis
    const slots: TimeSlotType[] = [];
    const [startHour, startMinute] = doctorSchedule.startTime.split(':').map(Number);
    const [endHour, endMinute] = doctorSchedule.endTime.split(':').map(Number);

    let currentTime = new Date(targetDate);
    currentTime.setHours(startHour, startMinute, 0, 0);

    const endTime = new Date(targetDate);
    endTime.setHours(endHour, endMinute, 0, 0);

    while (currentTime.getTime() + slotDuration * 60000 <= endTime.getTime()) {
      const slotEnd = new Date(currentTime.getTime() + slotDuration * 60000);

      // Verificar se está no horário de almoço
      let isInBreak = false;
      if (doctorSchedule.breakStartTime && doctorSchedule.breakEndTime) {
        const [breakStartHour, breakStartMinute] = doctorSchedule.breakStartTime
          .split(':')
          .map(Number);
        const [breakEndHour, breakEndMinute] = doctorSchedule.breakEndTime.split(':').map(Number);

        const breakStart = new Date(targetDate);
        breakStart.setHours(breakStartHour, breakStartMinute, 0, 0);
        const breakEnd = new Date(targetDate);
        breakEnd.setHours(breakEndHour, breakEndMinute, 0, 0);

        if (currentTime >= breakStart && slotEnd <= breakEnd) {
          isInBreak = true;
        }
      }

      // Verificar conflitos com agendamentos
      const hasAppointmentConflict = existingAppointments.some((appt: any) => {
        const apptStart = new Date(appt.scheduledAt);
        const apptEnd = new Date(apptStart.getTime() + appt.durationMinutes * 60000);

        return (
          (currentTime >= apptStart && currentTime < apptEnd) ||
          (slotEnd > apptStart && slotEnd <= apptEnd) ||
          (currentTime <= apptStart && slotEnd >= apptEnd)
        );
      });

      // Verificar conflitos com bloqueios
      const hasBlockConflict = blocks.some((block: any) => {
        const blockStart = new Date(block.startDateTime);
        const blockEnd = new Date(block.endDateTime);

        return (
          (currentTime >= blockStart && currentTime < blockEnd) ||
          (slotEnd > blockStart && slotEnd <= blockEnd) ||
          (currentTime <= blockStart && slotEnd >= blockEnd)
        );
      });

      let isAvailable = !isInBreak && !hasAppointmentConflict && !hasBlockConflict;
      let reason = '';

      if (isInBreak) reason = 'Horário de intervalo';
      if (hasAppointmentConflict) reason = 'Agendamento existente';
      if (hasBlockConflict) reason = 'Horário bloqueado';

      slots.push({
        startTime: currentTime.toISOString(),
        endTime: slotEnd.toISOString(),
        isAvailable,
        reason: reason || undefined,
      });

      // Próximo slot (incremento de 15 minutos)
      currentTime = new Date(currentTime.getTime() + 15 * 60000);
    }

    return slots;
  }

  /**
   * Busca estatísticas de agendamentos
   */
  async getAppointmentStats(userHospitalId: number): Promise<AppointmentStatsType> {
    const db = await this.getDbInstance();
    const now = new Date();

    // Hoje
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    // Esta semana
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // Próxima semana
    const startOfNextWeek = new Date(endOfWeek);
    startOfNextWeek.setDate(endOfWeek.getDate() + 1);
    startOfNextWeek.setHours(0, 0, 0, 0);
    const endOfNextWeek = new Date(startOfNextWeek);
    endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);
    endOfNextWeek.setHours(23, 59, 59, 999);

    // Stats de hoje
    const todayStats = await db
      .select({
        status: appointments.status,
        count: sql<number>`count(*)`,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.hospitalId, userHospitalId),
          between(appointments.scheduledAt, startOfToday, endOfToday)
        )
      )
      .groupBy(appointments.status);

    // Stats desta semana
    const weekStats = await db
      .select({
        status: appointments.status,
        count: sql<number>`count(*)`,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.hospitalId, userHospitalId),
          between(appointments.scheduledAt, startOfWeek, endOfWeek)
        )
      )
      .groupBy(appointments.status);

    // Stats próxima semana
    const nextWeekStats = await db
      .select({
        status: appointments.status,
        count: sql<number>`count(*)`,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.hospitalId, userHospitalId),
          between(appointments.scheduledAt, startOfNextWeek, endOfNextWeek)
        )
      )
      .groupBy(appointments.status);

    // Urgentes próximos
    const [{ count: upcomingUrgent }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(appointments)
      .where(
        and(
          eq(appointments.hospitalId, userHospitalId),
          eq(appointments.isUrgent, true),
          gte(appointments.scheduledAt, now),
          or(eq(appointments.status, 'scheduled'), eq(appointments.status, 'confirmed'))
        )
      );

    // Processar resultados
    const processStats = (stats: any[]) => {
      const result = { total: 0, confirmed: 0, pending: 0, cancelled: 0 };
      stats.forEach((stat) => {
        result.total += stat.count;
        if (stat.status === 'confirmed') result.confirmed += stat.count;
        if (stat.status === 'scheduled') result.pending += stat.count;
        if (stat.status === 'cancelled') result.cancelled += stat.count;
      });
      return result;
    };

    return {
      today: processStats(todayStats),
      thisWeek: processStats(weekStats),
      nextWeek: {
        total: nextWeekStats.reduce((sum: any, stat: any) => sum + stat.count, 0),
        scheduled: nextWeekStats.find((stat: any) => stat.status === 'scheduled')?.count || 0,
      },
      upcomingUrgent,
    };
  }
}
