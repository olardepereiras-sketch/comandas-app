import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const CONFIG_FILE = '/var/backups/reservamesa/backup-config.json';

export interface BackupConfig {
  dbFrequency: number;
  dbRetention: number;
  dbAutoBackupEnabled: boolean;
  programFrequency: number;
  programRetention: number;
  programAutoBackupEnabled: boolean;
}

const DEFAULT_CONFIG: BackupConfig = {
  dbFrequency: 6,
  dbRetention: 7,
  dbAutoBackupEnabled: true,
  programFrequency: 24,
  programRetention: 7,
  programAutoBackupEnabled: true,
};

function readConfig(): BackupConfig {
  try {
    if (!existsSync(CONFIG_FILE)) {
      return { ...DEFAULT_CONFIG };
    }
    const raw = JSON.parse(readFileSync(CONFIG_FILE, 'utf-8')) as Partial<BackupConfig & { frequency?: number; retention?: number; autoBackupEnabled?: boolean }>;
    return {
      dbFrequency: raw.dbFrequency ?? raw.frequency ?? DEFAULT_CONFIG.dbFrequency,
      dbRetention: raw.dbRetention ?? raw.retention ?? DEFAULT_CONFIG.dbRetention,
      dbAutoBackupEnabled: raw.dbAutoBackupEnabled ?? raw.autoBackupEnabled ?? DEFAULT_CONFIG.dbAutoBackupEnabled,
      programFrequency: raw.programFrequency ?? DEFAULT_CONFIG.programFrequency,
      programRetention: raw.programRetention ?? DEFAULT_CONFIG.programRetention,
      programAutoBackupEnabled: raw.programAutoBackupEnabled ?? raw.autoBackupEnabled ?? DEFAULT_CONFIG.programAutoBackupEnabled,
    };
  } catch (error) {
    console.error('[BACKUP CONFIG] Error al leer config:', error);
    return { ...DEFAULT_CONFIG };
  }
}

export const getBackupConfigProcedure = publicProcedure
  .input(z.object({}).optional())
  .query(async () => {
    console.log('📋 [GET BACKUP CONFIG] Obteniendo configuración...');
    try {
      const config = readConfig();
      console.log('✅ [GET BACKUP CONFIG] Configuración obtenida:', config);
      return config;
    } catch (error: any) {
      console.error('❌ [GET BACKUP CONFIG] Error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Error al obtener configuración: ${error.message}`,
      });
    }
  });

export const updateBackupConfigProcedure = publicProcedure
  .input(
    z.object({
      dbFrequency: z.number().min(1).max(168),
      dbRetention: z.number().min(1).max(365),
      dbAutoBackupEnabled: z.boolean(),
      programFrequency: z.number().min(1).max(720),
      programRetention: z.number().min(1).max(365),
      programAutoBackupEnabled: z.boolean(),
    })
  )
  .mutation(async ({ input }) => {
    console.log('🔵 [UPDATE BACKUP CONFIG] Actualizando configuración:', input);
    try {
      mkdirSync(dirname(CONFIG_FILE), { recursive: true });
      writeFileSync(CONFIG_FILE, JSON.stringify(input, null, 2));
      console.log('✅ [UPDATE BACKUP CONFIG] Configuración actualizada');
      return {
        success: true,
        message: 'Configuración actualizada correctamente',
      };
    } catch (error: any) {
      console.error('❌ [UPDATE BACKUP CONFIG] Error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Error al actualizar configuración: ${error.message}`,
      });
    }
  });
