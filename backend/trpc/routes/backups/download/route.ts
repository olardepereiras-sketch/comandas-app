import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';
import { existsSync } from 'fs';
import { join } from 'path';

const BACKUP_DIR = '/var/backups/reservamesa';

export const downloadBackupProcedure = publicProcedure
  .input(
    z.object({
      filename: z.string(),
    })
  )
  .query(async ({ input }) => {
    console.log('⬇️ [DOWNLOAD BACKUP] Preparando descarga:', input.filename);

    try {
      const filePath = join(BACKUP_DIR, input.filename);
      
      if (!existsSync(filePath)) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Archivo no encontrado',
        });
      }

      return {
        success: true,
        url: `/api/backups/download/${input.filename}`,
      };
    } catch (error: any) {
      console.error('❌ [DOWNLOAD BACKUP] Error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Error al preparar descarga: ${error.message}`,
      });
    }
  });
