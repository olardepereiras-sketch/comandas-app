import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

const BACKUP_DIR = '/var/backups/reservamesa';

export const listBackupsProcedure = publicProcedure
  .input(z.object({}).optional())
  .query(async () => {
    console.log('📦 [LIST BACKUPS] Listando copias de seguridad...');

    try {
      const files = readdirSync(BACKUP_DIR);
      
      const backups = files
        .filter(f => f.endsWith('.sql.gz') || f.endsWith('.tar.gz'))
        .map(filename => {
          const fullPath = join(BACKUP_DIR, filename);
          const stats = statSync(fullPath);
          
          const isDatabase = filename.endsWith('.sql.gz');
          const isProgram = filename.endsWith('.tar.gz') && filename.includes('program');
          
          return {
            id: filename,
            filename,
            size: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
            sizeBytes: stats.size,
            date: stats.mtime.toISOString(),
            type: filename.includes('manual') ? 'manual' : 'auto',
            backupType: isDatabase ? 'database' : isProgram ? 'program' : 'full',
          };
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      console.log('✅ [LIST BACKUPS] Copias listadas:', backups.length);
      return backups;
    } catch (error: any) {
      console.error('❌ [LIST BACKUPS] Error:', error);
      if (error.code === 'ENOENT') {
        return [];
      }
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Error al listar copias: ${error.message}`,
      });
    }
  });
