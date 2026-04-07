import { z } from 'zod';
import { publicProcedure } from '../../../procedures';
import { db } from '../../../../db/client';

const timeSchema = z.object({
  hour: z.number(),
  minute: z.number(),
});

export const createWithSplitRoute = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
      locationId: z.string(),
      date: z.string(),
      time: timeSchema,
      guests: z.number(),
      clientName: z.string(),
      clientPhone: z.string(),
      clientEmail: z.string().optional(),
      originalTableId: z.string(),
      originalTableName: z.string(),
      splitTableBCapacity: z.number(),
      splitTableBHighChairs: z.number(),
      splitTableBAllowsStroller: z.boolean(),
      splitTableBAllowsPets: z.boolean(),
      modifiedTableACapacity: z.number(),
      modifiedTableAHighChairs: z.number(),
      modifiedTableAAllowsStroller: z.boolean(),
      modifiedTableAAllowsPets: z.boolean(),
    })
  )
  .mutation(async ({ input }) => {
    const reservationId = `res-${Date.now()}`;
    const confirmationToken = `token-${Date.now()}`;
    const confirmationToken2 = `token2-${Date.now()}`;
    
    const tableBId = `${input.originalTableId}B`;
    const tableAId = `${input.originalTableId}A`;

    let clientId: string;

    const existingClient = await db.query(
      'SELECT id FROM clients WHERE phone = $1 AND restaurant_id = $2',
      [input.clientPhone, input.restaurantId]
    );

    if (existingClient.rows.length > 0) {
      clientId = existingClient.rows[0].id;
    } else {
      clientId = `client-${Date.now()}`;
      await db.query(
        `INSERT INTO clients (id, restaurant_id, name, phone, email, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [clientId, input.restaurantId, input.clientName, input.clientPhone, input.clientEmail || null]
      );
    }

    await db.query(
      `INSERT INTO reservations (
        id, restaurant_id, client_id, location_id, date, time, guests, 
        status, confirmation_token, confirmation_token2, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [
        reservationId,
        input.restaurantId,
        clientId,
        input.locationId,
        input.date,
        JSON.stringify(input.time),
        input.guests,
        'pending',
        confirmationToken,
        confirmationToken2,
      ]
    );

    await db.query(
      `INSERT INTO temporary_tables (
        id, restaurant_id, location_id, reservation_id, original_table_id,
        name, capacity, high_chairs, allows_stroller, allows_pets, type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        tableBId,
        input.restaurantId,
        input.locationId,
        reservationId,
        input.originalTableId,
        `${input.originalTableName}B`,
        input.splitTableBCapacity,
        input.splitTableBHighChairs,
        input.splitTableBAllowsStroller,
        input.splitTableBAllowsPets,
        'split_b',
      ]
    );

    await db.query(
      `INSERT INTO temporary_tables (
        id, restaurant_id, location_id, reservation_id, original_table_id,
        name, capacity, high_chairs, allows_stroller, allows_pets, type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        tableAId,
        input.restaurantId,
        input.locationId,
        reservationId,
        input.originalTableId,
        `${input.originalTableName}A`,
        input.modifiedTableACapacity,
        input.modifiedTableAHighChairs,
        input.modifiedTableAAllowsStroller,
        input.modifiedTableAAllowsPets,
        'split_a',
      ]
    );

    await db.query(
      `INSERT INTO reservation_tables (reservation_id, table_id) VALUES ($1, $2)`,
      [reservationId, tableBId]
    );

    return {
      success: true,
      reservationId,
      confirmationToken,
      message: 'Reserva creada con división de mesa',
    };
  });
