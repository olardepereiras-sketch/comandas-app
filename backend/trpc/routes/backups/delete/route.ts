import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';
import { unlinkSync, existsSync } from 'fs';
import { join } from 'path';

const BACKUP_DIR = '/var/backups/reservamesa';

export const deleteBackupProcedure = publicProcedure
  .input(
    z.object({
      filename: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    console.log('🗑️ [DELETE BACKUP] Eliminando copia:', input.filename);

    try {
      const filePath = join(BACKUP_DIR, input.filename);
      
      if (!existsSync(filePath)) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Archivo no encontrado',
        });
      }

      unlinkSync(filePath);
      
      console.log('✅ [DELETE BACKUP] Copia eliminada');
      
      return { 
        success: true,
        message: 'Copia de seguridad eliminada correctamente'
      };
    } catch (error: any) {
      console.error('❌ [DELETE BACKUP] Error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Error al eliminar: ${error.message}`,
      });
    }
  });
