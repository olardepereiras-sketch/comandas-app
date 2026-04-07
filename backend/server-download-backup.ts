import { serve } from 'bun';
import { existsSync, createReadStream } from 'fs';
import { join } from 'path';

const BACKUP_DIR = '/var/backups/reservamesa';

export function setupBackupDownloadRoute(server: any) {
  return async (req: Request): Promise<Response> => {
    const url = new URL(req.url);
    
    if (url.pathname.startsWith('/api/backups/download/')) {
      const filename = url.pathname.replace('/api/backups/download/', '');
      const filePath = join(BACKUP_DIR, filename);
      
      if (!existsSync(filePath)) {
        return new Response('File not found', { status: 404 });
      }

      const file = Bun.file(filePath);
      
      return new Response(file, {
        headers: {
          'Content-Type': 'application/gzip',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }
    
    return new Response('Not found', { status: 404 });
  };
}
