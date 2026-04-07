import { publicProcedure } from '../../../create-context';

export const dashboardStatsProcedure = publicProcedure
  .query(async ({ ctx }) => {
    console.log('🔵 [DASHBOARD STATS] Obteniendo estadísticas...');

    try {
      const restaurantsResult = await ctx.db.query(
        'SELECT COUNT(*) as count FROM restaurants'
      );
      const restaurants = parseInt(restaurantsResult.rows[0].count);

      const today = new Date();
      const todayString = today.toISOString().split('T')[0];
      
      const todayReservationsResult = await ctx.db.query(
        `SELECT COUNT(*) as count FROM reservations 
         WHERE date = $1 AND status NOT IN ('cancelled', 'modified')`,
        [todayString]
      );
      const todayReservations = parseInt(todayReservationsResult.rows[0].count);

      const clientsResult = await ctx.db.query(
        'SELECT COUNT(*) as count FROM clients'
      );
      const clients = parseInt(clientsResult.rows[0].count);

      const avgRatingResult = await ctx.db.query(
        'SELECT AVG(rating) as avg FROM clients WHERE rating > 0'
      );
      const avgRating = parseFloat(avgRatingResult.rows[0].avg || 0).toFixed(1);

      const currentYear = today.getFullYear();
      const noShowYearResult = await ctx.db.query(
        `SELECT COUNT(*) as count FROM reservations 
         WHERE EXTRACT(YEAR FROM date) = $1 AND status = 'cancelled' AND notes LIKE '%no show%'`,
        [currentYear]
      );
      const noShowYear = parseInt(noShowYearResult.rows[0].count);

      const currentMonth = today.getMonth() + 1;
      const monthReservationsResult = await ctx.db.query(
        `SELECT COUNT(*) as count FROM reservations 
         WHERE EXTRACT(YEAR FROM date) = $1 AND EXTRACT(MONTH FROM date) = $2 AND status NOT IN ('modified')`,
        [currentYear, currentMonth]
      );
      const liveMonthReservations = parseInt(monthReservationsResult.rows[0].count);

      let persistedMonthReservations = 0;
      try {
        const persistedResult = await ctx.db.query(
          `SELECT COALESCE(SUM(total_reservations), 0) as total
           FROM reservation_stats_monthly
           WHERE year = $1 AND month = $2`,
          [currentYear, currentMonth]
        );
        persistedMonthReservations = parseInt(persistedResult.rows[0].total || '0', 10);
      } catch {
        // Table may not exist yet
      }
      const monthReservations = liveMonthReservations + persistedMonthReservations;

      let diskUsage = { used: '0 GB', available: '0 GB', percentage: 0 };
      let systemLoad = { cpu: 0, memory: 0 };

      try {
        const { execSync } = await import('child_process');
        const fsModule = await import('fs');

        const dfOutput = execSync('df -h / | tail -1').toString();
        const dfParts = dfOutput.trim().split(/\s+/);
        diskUsage = {
          used: dfParts[2] || '0 GB',
          available: dfParts[3] || '0 GB',
          percentage: parseInt((dfParts[4] || '0').replace('%', '')) || 0
        };

        const readCpuStat = () => {
          const line = fsModule.readFileSync('/proc/stat', 'utf8').split('\n')[0];
          const parts = line.trim().split(/\s+/).slice(1).map(Number);
          const idle = (parts[3] || 0) + (parts[4] || 0);
          const total = parts.reduce((a: number, b: number) => a + b, 0);
          return { idle, total };
        };
        const s1 = readCpuStat();
        await new Promise(r => setTimeout(r, 200));
        const s2 = readCpuStat();
        const idleDiff = s2.idle - s1.idle;
        const totalDiff = s2.total - s1.total;
        const cpuUsage = totalDiff > 0 ? ((totalDiff - idleDiff) / totalDiff) * 100 : 0;

        const memContent = fsModule.readFileSync('/proc/meminfo', 'utf8');
        const memTotal = parseInt(memContent.match(/MemTotal:\s+(\d+)/)?.[1] || '0');
        const memAvailable = parseInt(memContent.match(/MemAvailable:\s+(\d+)/)?.[1] || '0');
        const memUsage = memTotal > 0 ? ((memTotal - memAvailable) / memTotal) * 100 : 0;

        systemLoad = {
          cpu: Math.round(cpuUsage * 10) / 10,
          memory: Math.round(memUsage * 10) / 10
        };

        console.log('✅ [STATS] Sistema:', { cpu: systemLoad.cpu, memory: systemLoad.memory, disk: diskUsage });
      } catch (error) {
        console.log('⚠️ [STATS] No se pudieron obtener estadísticas del sistema local:', error);
      }

      console.log('✅ [DASHBOARD STATS] Estadísticas obtenidas');

      return {
        restaurants,
        todayReservations,
        clients,
        avgRating,
        noShowYear,
        monthReservations,
        diskUsage,
        systemLoad,
      };
    } catch (error) {
      console.error('❌ [DASHBOARD STATS] Error:', error);
      return {
        restaurants: 0,
        todayReservations: 0,
        clients: 0,
        avgRating: '0.0',
        noShowYear: 0,
        monthReservations: 0,
        diskUsage: { used: '0 GB', available: '0 GB', percentage: 0 },
        systemLoad: { cpu: 0, memory: 0 },
      };
    }
  });
