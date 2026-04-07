import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const BACKUP_DIR = '/var/backups/reservamesa';
const PROJECT_DIR = '/var/www/reservamesa';

export const createBackupProcedure = publicProcedure
  .input(
    z.object({
      type: z.enum(['database', 'program', 'full']),
      manual: z.boolean().default(true),
    })
  )
  .mutation(async ({ input }) => {
    console.log('🔵 [CREATE BACKUP] Creando copia de seguridad:', input);

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '-' + Date.now();
      const typeLabel = input.manual ? 'manual' : 'auto';
      
      await execAsync(`mkdir -p ${BACKUP_DIR}`);

      if (input.type === 'database' || input.type === 'full') {
        const dbFilename = `backup-db-${typeLabel}-${timestamp}.sql.gz`;
        const dbPath = `${BACKUP_DIR}/${dbFilename}`;
        
        console.log('💾 [CREATE BACKUP] Creando copia de base de datos...');
        
        const dbUrl = process.env.DATABASE_URL || '';
        let dbName = 'reservamesa_db';
        let dbUser = 'reservamesa_user';
        let dbPassword = 'MiContrasenaSegura666';
        let dbHost = 'localhost';
        
        const match = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+)(?::\d+)?\/(.+)/);
        if (match) {
          dbUser = match[1];
          dbPassword = match[2];
          dbHost = match[3];
          dbName = match[4];
        }
        
        console.log('🔍 [CREATE BACKUP] Usando:', { dbName, dbUser, dbHost });
        
        await execAsync(
          `PGPASSWORD='${dbPassword}' pg_dump --clean --if-exists -h ${dbHost} -U ${dbUser} ${dbName} | gzip > ${dbPath}`,
          { maxBuffer: 1024 * 1024 * 100 }
        );
        
        const { stdout } = await execAsync(`du -h ${dbPath}`);
        console.log('✅ [CREATE BACKUP] Copia de BD creada:', dbFilename, stdout.trim());
      }

      if (input.type === 'program' || input.type === 'full') {
        const programFilename = `backup-program-${typeLabel}-${timestamp}.tar.gz`;
        const programPath = `${BACKUP_DIR}/${programFilename}`;
        
        console.log('📦 [CREATE BACKUP] Creando copia del programa...');
        
        await execAsync(
          `tar -czf ${programPath} -C ${PROJECT_DIR} --exclude=node_modules --exclude=.git --exclude=backend.log --exclude='*.log' .`
        );
        
        console.log('✅ [CREATE BACKUP] Copia del programa creada:', programFilename);
      }

      return { 
        success: true,
        message: `Copia de seguridad ${input.type === 'full' ? 'completa' : 'de ' + input.type} creada correctamente`
      };
    } catch (error: any) {
      console.error('❌ [CREATE BACKUP] Error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Error al crear copia: ${error.message}`,
      });
    }
  });
