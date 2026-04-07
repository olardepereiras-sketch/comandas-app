import { exec } from 'child_process';
import { promisify } from 'util';
import { readFileSync, existsSync, readdirSync, unlinkSync, statSync, mkdirSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

const BACKUP_DIR = '/var/backups/reservamesa';
const PROJECT_DIR = '/var/www/reservamesa';
const CONFIG_FILE = join(BACKUP_DIR, 'backup-config.json');

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

export class BackupWorker {
  private dbInterval: ReturnType<typeof setInterval> | null = null;
  private programInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    mkdirSync(BACKUP_DIR, { recursive: true });
  }

  start() {
    const config = this.getConfig();

    if (config.dbAutoBackupEnabled) {
      const intervalMs = config.dbFrequency * 60 * 60 * 1000;
      console.log(`[BACKUP WORKER] BD: cada ${config.dbFrequency}h, retención ${config.dbRetention} días`);
      this.createDatabaseBackup().catch(console.error);
      this.dbInterval = setInterval(() => {
        this.createDatabaseBackup().catch(console.error);
      }, intervalMs);
    } else {
      console.log('[BACKUP WORKER] Backup automático de BD deshabilitado');
    }

    if (config.programAutoBackupEnabled) {
      const intervalMs = config.programFrequency * 60 * 60 * 1000;
      console.log(`[BACKUP WORKER] Programa: cada ${config.programFrequency}h, retención ${config.programRetention} días`);
      this.createProgramBackup().catch(console.error);
      this.programInterval = setInterval(() => {
        this.createProgramBackup().catch(console.error);
      }, intervalMs);
    } else {
      console.log('[BACKUP WORKER] Backup automático del programa deshabilitado');
    }

    console.log('[BACKUP WORKER] Worker iniciado');
  }

  stop() {
    if (this.dbInterval) {
      clearInterval(this.dbInterval);
      this.dbInterval = null;
    }
    if (this.programInterval) {
      clearInterval(this.programInterval);
      this.programInterval = null;
    }
    console.log('[BACKUP WORKER] Worker detenido');
  }

  getConfig(): BackupConfig {
    try {
      if (existsSync(CONFIG_FILE)) {
        const raw = JSON.parse(readFileSync(CONFIG_FILE, 'utf-8')) as Partial<BackupConfig & { frequency?: number; retention?: number; autoBackupEnabled?: boolean }>;
        return {
          dbFrequency: raw.dbFrequency ?? raw.frequency ?? DEFAULT_CONFIG.dbFrequency,
          dbRetention: raw.dbRetention ?? raw.retention ?? DEFAULT_CONFIG.dbRetention,
          dbAutoBackupEnabled: raw.dbAutoBackupEnabled ?? raw.autoBackupEnabled ?? DEFAULT_CONFIG.dbAutoBackupEnabled,
          programFrequency: raw.programFrequency ?? DEFAULT_CONFIG.programFrequency,
          programRetention: raw.programRetention ?? DEFAULT_CONFIG.programRetention,
          programAutoBackupEnabled: raw.programAutoBackupEnabled ?? raw.autoBackupEnabled ?? DEFAULT_CONFIG.programAutoBackupEnabled,
        };
      }
    } catch (error) {
      console.error('[BACKUP WORKER] Error al leer config:', error);
    }
    return { ...DEFAULT_CONFIG };
  }

  private getDbCredentials() {
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
    return { dbName, dbUser, dbPassword, dbHost };
  }

  async createDatabaseBackup() {
    console.log('[BACKUP WORKER] Creando copia de seguridad de BD...');
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const dbFilename = `backup-db-auto-${timestamp}.sql.gz`;
      const dbPath = join(BACKUP_DIR, dbFilename);
      const { dbName, dbUser, dbPassword, dbHost } = this.getDbCredentials();
      console.log('[BACKUP WORKER] Usando DB:', { dbName, dbUser, dbHost });
      await execAsync(
        `PGPASSWORD='${dbPassword}' pg_dump --clean --if-exists -h ${dbHost} -U ${dbUser} ${dbName} | gzip > ${dbPath}`,
        { maxBuffer: 1024 * 1024 * 100 }
      );
      console.log('[BACKUP WORKER] Copia de BD creada:', dbFilename);
      await this.cleanOldBackups('db');
      console.log('[BACKUP WORKER] Copia de BD completada');
    } catch (error) {
      console.error('[BACKUP WORKER] Error al crear backup de BD:', error);
    }
  }

  async createProgramBackup() {
    console.log('[BACKUP WORKER] Creando copia de seguridad del programa...');
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const programFilename = `backup-program-auto-${timestamp}.tar.gz`;
      const programPath = join(BACKUP_DIR, programFilename);
      await execAsync(
        `tar -czf ${programPath} -C ${PROJECT_DIR} --exclude=node_modules --exclude=.git --exclude=backend.log --exclude='*.log' --exclude=dist .`
      );
      console.log('[BACKUP WORKER] Copia del programa creada:', programFilename);
      await this.cleanOldBackups('program');
      console.log('[BACKUP WORKER] Copia del programa completada');
    } catch (error) {
      console.error('[BACKUP WORKER] Error al crear backup del programa:', error);
    }
  }

  private async cleanOldBackups(type: 'db' | 'program') {
    const config = this.getConfig();
    const retentionDays = type === 'db' ? config.dbRetention : config.programRetention;
    const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const MAX_AUTO_FILES = retentionDays * 2;
    const filePattern = type === 'db' ? 'backup-db-auto-' : 'backup-program-auto-';

    console.log(`[BACKUP WORKER] Limpiando backups de ${type} (retención: ${retentionDays} días, max: ${MAX_AUTO_FILES})...`);

    try {
      const allFiles = readdirSync(BACKUP_DIR);
      const autoFiles = allFiles
        .filter(f => f.startsWith(filePattern) && !f.includes('manual'))
        .map(f => {
          const filePath = join(BACKUP_DIR, f);
          const stats = statSync(filePath);
          return { filename: f, filePath, mtime: stats.mtime.getTime(), size: stats.size };
        })
        .sort((a, b) => a.mtime - b.mtime);

      const totalSizeMB = (autoFiles.reduce((acc, f) => acc + f.size, 0) / 1024 / 1024).toFixed(1);
      console.log(`[BACKUP WORKER] Estado ${type}: ${autoFiles.length} ficheros (~${totalSizeMB} MB)`);

      let deleted = 0;
      for (let i = 0; i < autoFiles.length; i++) {
        const file = autoFiles[i];
        const age = now - file.mtime;
        const ageHours = Math.round(age / 1000 / 60 / 60);
        const shouldDeleteByAge = age > retentionMs;
        const shouldDeleteByCount = autoFiles.length - deleted > MAX_AUTO_FILES && i < autoFiles.length - MAX_AUTO_FILES;

        if (shouldDeleteByAge || shouldDeleteByCount) {
          const reason = shouldDeleteByAge
            ? `edad ${ageHours}h > límite ${retentionDays * 24}h`
            : `exceso (${autoFiles.length - deleted} > ${MAX_AUTO_FILES} max)`;
          try {
            unlinkSync(file.filePath);
            deleted++;
            console.log(`[BACKUP WORKER] Eliminado (${reason}): ${file.filename} (${(file.size / 1024 / 1024).toFixed(1)} MB)`);
          } catch (err) {
            console.error(`[BACKUP WORKER] Error al eliminar ${file.filename}:`, err);
          }
        }
      }

      const remaining = autoFiles.length - deleted;
      if (deleted > 0) {
        console.log(`[BACKUP WORKER] ${deleted} fichero(s) eliminados de ${type}. Quedan: ${remaining}`);
      } else {
        console.log(`[BACKUP WORKER] Sin cambios en ${type}. Total: ${remaining} ficheros.`);
      }
    } catch (error) {
      console.error('[BACKUP WORKER] Error al limpiar backups:', error);
    }
  }
}
