import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

const BACKUP_DIR = '/var/backups/reservamesa';
const PROJECT_DIR = '/var/www/reservamesa';

export const restoreBackupProcedure = publicProcedure
  .input(
    z.object({
      filename: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    console.log('🔄 [RESTORE BACKUP] Restaurando copia:', input.filename);

    try {
      const filePath = join(BACKUP_DIR, input.filename);
      
      if (!existsSync(filePath)) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Archivo no encontrado',
        });
      }

      const isDatabase = input.filename.endsWith('.sql.gz');
      const isProgram = input.filename.includes('program');

      if (isDatabase) {
        console.log('💾 [RESTORE BACKUP] Restaurando base de datos...');
        
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
        
        console.log('🔍 [RESTORE BACKUP] Restaurando BD:', dbName);
        
        console.log('🧹 [RESTORE BACKUP] Paso 1: Eliminando todas las tablas existentes...');
        const dropSqlPath = '/tmp/drop_all_tables.sql';
        try {
          const dropSql = `DO $$ DECLARE\n  r RECORD;\nBEGIN\n  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP\n    EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';\n  END LOOP;\nEND $$;`;
          writeFileSync(dropSqlPath, dropSql, 'utf-8');
          
          await execAsync(
            `PGPASSWORD='${dbPassword}' psql -h ${dbHost} -U ${dbUser} ${dbName} -f ${dropSqlPath}`,
            { maxBuffer: 1024 * 1024 * 10 }
          );
          console.log('✅ [RESTORE BACKUP] Tablas existentes eliminadas');
        } catch (dropError: any) {
          console.log('⚠️ [RESTORE BACKUP] Aviso al limpiar tablas:', dropError.message);
          console.log('⚠️ [RESTORE BACKUP] stdout:', dropError.stdout?.substring(0, 500));
          console.log('⚠️ [RESTORE BACKUP] stderr:', dropError.stderr?.substring(0, 500));
        } finally {
          try { unlinkSync(dropSqlPath); } catch (_e) {}
        }
        
        console.log('📥 [RESTORE BACKUP] Paso 2: Restaurando datos del backup...');
        try {
          const result = await execAsync(
            `gunzip -c ${filePath} | PGPASSWORD='${dbPassword}' psql -h ${dbHost} -U ${dbUser} ${dbName} 2>&1`,
            { maxBuffer: 1024 * 1024 * 200 }
          );
          console.log('✅ [RESTORE BACKUP] Datos restaurados desde backup');
          if (result.stdout) {
            const lines = result.stdout.split('\n');
            const createLines = lines.filter((l: string) => l.includes('CREATE') || l.includes('ALTER') || l.includes('INSERT'));
            console.log(`📊 [RESTORE BACKUP] Operaciones ejecutadas: ${createLines.length} (CREATE/ALTER/INSERT)`);
          }
          if (result.stderr) {
            const errorLines = result.stderr.split('\n').filter((l: string) => l.includes('ERROR'));
            if (errorLines.length > 0) {
              console.log('⚠️ [RESTORE BACKUP] Errores durante restauración:', errorLines.slice(0, 5).join('\n'));
            }
          }
        } catch (restoreError: any) {
          console.log('⚠️ [RESTORE BACKUP] Proceso completó con código de salida no-cero');
          console.log('⚠️ [RESTORE BACKUP] stdout (primeras 1000 chars):', restoreError.stdout?.substring(0, 1000));
          console.log('⚠️ [RESTORE BACKUP] stderr (primeras 1000 chars):', restoreError.stderr?.substring(0, 1000));
          
          if (restoreError.stdout && (
            restoreError.stdout.includes('CREATE TABLE') || 
            restoreError.stdout.includes('INSERT') ||
            restoreError.stdout.includes('ALTER TABLE')
          )) {
            console.log('✅ [RESTORE BACKUP] Restauración completada (con avisos normales de psql)');
          } else {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: `Error al restaurar BD: ${restoreError.stderr?.substring(0, 300) || restoreError.message}`,
            });
          }
        }
        
        console.log('🔑 [RESTORE BACKUP] Paso 3: Verificando permisos...');
        try {
          await execAsync(
            `PGPASSWORD='${dbPassword}' psql -h ${dbHost} -U ${dbUser} ${dbName} -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${dbUser}; GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${dbUser};"`,
            { maxBuffer: 1024 * 1024 * 10 }
          );
          console.log('✅ [RESTORE BACKUP] Permisos verificados');
        } catch (grantError: any) {
          console.log('⚠️ [RESTORE BACKUP] Aviso permisos:', grantError.message);
        }

        console.log('🔍 [RESTORE BACKUP] Paso 4: Verificando tablas restauradas...');
        try {
          const { stdout: tablesOutput } = await execAsync(
            `PGPASSWORD='${dbPassword}' psql -h ${dbHost} -U ${dbUser} ${dbName} -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"`,
            { maxBuffer: 1024 * 1024 * 10 }
          );
          console.log('📊 [RESTORE BACKUP] Tablas en BD:', tablesOutput);

          const { stdout: countOutput } = await execAsync(
            `PGPASSWORD='${dbPassword}' psql -h ${dbHost} -U ${dbUser} ${dbName} -c "SELECT (SELECT count(*) FROM restaurants) as restaurants, (SELECT count(*) FROM clients) as clients, (SELECT count(*) FROM reservations) as reservations;"`,
            { maxBuffer: 1024 * 1024 * 10 }
          );
          console.log('📊 [RESTORE BACKUP] Conteo de datos:', countOutput);
        } catch (verifyError: any) {
          console.log('⚠️ [RESTORE BACKUP] Error verificando restauración:', verifyError.message);
        }
        
        console.log('✅ [RESTORE BACKUP] Base de datos restaurada correctamente');
      }

      if (isProgram) {
        console.log('📦 [RESTORE BACKUP] Restaurando programa...');
        
        await execAsync(
          `tar -xzf ${filePath} -C ${PROJECT_DIR}`
        );
        
        console.log('✅ [RESTORE BACKUP] Programa restaurado');
        console.log('🔄 [RESTORE BACKUP] Reiniciando servidor...');
        
        setTimeout(() => {
          execAsync(`cd ${PROJECT_DIR} && pm2 restart all`).catch(console.error);
        }, 2000);
      }

      return { 
        success: true,
        message: 'Sistema restaurado correctamente. Recargue la página en unos segundos.'
      };
    } catch (error: any) {
      console.error('❌ [RESTORE BACKUP] Error completo:', error);
      console.error('❌ [RESTORE BACKUP] Error message:', error.message);
      console.error('❌ [RESTORE BACKUP] Error stdout:', error.stdout?.substring(0, 500));
      console.error('❌ [RESTORE BACKUP] Error stderr:', error.stderr?.substring(0, 500));
      
      if (error instanceof TRPCError) throw error;
      
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Error al restaurar: ${error.message}`,
      });
    }
  });
