import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: process.env.POSTGRES_HOST || "localhost",
  port: Number(process.env.POSTGRES_PORT) || 5432,
  database: process.env.POSTGRES_DB || "reservamesa_db",
  user: process.env.POSTGRES_USER || "reservamesa_user",
  password: process.env.POSTGRES_PASSWORD || "",
});

const query = async (text: string, params?: any[]) => {
  const result = await pool.query(text, params);
  return result.rows;
};

console.log("🔍 DIAGNÓSTICO PROFUNDO DEL SISTEMA");
console.log("=====================================\n");

async function runDiagnosis() {
  try {
    console.log("✅ Conectado a PostgreSQL\n");

    // 1. ESTRUCTURA COMPLETA DE TABLAS
    console.log("=" .repeat(80));
    console.log("📋 PARTE 1: ESTRUCTURA DE TABLAS RELEVANTES");
    console.log("=" .repeat(80));

    const tables = [
      "restaurants",
      "schedules",
      "day_exceptions",
      "shift_templates",
    ];

    for (const table of tables) {
      console.log(`\n🔍 Tabla: ${table}`);
      console.log("-".repeat(80));
      const structure = await query(`
        SELECT 
          column_name, 
          data_type, 
          column_default, 
          is_nullable,
          character_maximum_length
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table]);

      for (const col of structure) {
        console.log(
          `  - ${col.column_name}: ${col.data_type}${
            col.character_maximum_length
              ? `(${col.character_maximum_length})`
              : ""
          } | Default: ${col.column_default || "NULL"} | Nullable: ${
            col.is_nullable
          }`
        );
      }
    }

    // 2. DATOS ACTUALES
    console.log("\n" + "=" .repeat(80));
    console.log("📊 PARTE 2: DATOS ACTUALES");
    console.log("=" .repeat(80));

    // Restaurants
    console.log("\n🏪 RESTAURANTS:");
    const restaurants = await query('SELECT * FROM restaurants LIMIT 5');
    for (const r of restaurants) {
      console.log(`\n  Restaurant: ${r.name} (${r.id})`);
      console.log(`    - table_rotation_time: ${r.table_rotation_time}`);
      console.log(`    - slug: ${r.slug}`);
    }

    // Schedules
    console.log("\n\n📅 SCHEDULES:");
    const schedules = await query(`
      SELECT * FROM schedules 
      WHERE restaurant_id = $1
      ORDER BY day_of_week
    `, [restaurants[0]?.id]);
    for (const s of schedules) {
      const dayNames = [
        "Domingo",
        "Lunes",
        "Martes",
        "Miércoles",
        "Jueves",
        "Viernes",
        "Sábado",
      ];
      console.log(`\n  ${dayNames[s.day_of_week]} (${s.day_of_week}):`);
      console.log(`    - is_open: ${s.is_open}`);
      console.log(`    - start_time: ${s.start_time}`);
      console.log(`    - end_time: ${s.end_time}`);
      console.log(`    - max_guests: ${s.max_guests}`);
    }

    // Day Exceptions
    console.log("\n\n📆 DAY_EXCEPTIONS:");
    const exceptions = await query(`
      SELECT * FROM day_exceptions 
      WHERE restaurant_id = $1
      ORDER BY date
    `, [restaurants[0]?.id]);
    console.log(`  Total excepciones: ${exceptions.length}`);
    for (const e of exceptions) {
      console.log(`\n  Fecha: ${e.date}`);
      console.log(`    - is_open: ${e.is_open}`);
      console.log(`    - template_ids: ${e.template_ids}`);
      console.log(
        `    - template_ids length: ${e.template_ids?.length || 0}`
      );
      console.log(`    - max_guests_override: ${e.max_guests_override}`);
      console.log(`    - notes: ${e.notes}`);

      if (e.template_ids) {
        try {
          const parsed = JSON.parse(e.template_ids);
          console.log(`    - Shifts parseados: ${parsed.length}`);
          if (parsed.length > 0) {
            console.log(`    - Primer shift:`, parsed[0]);
          }
        } catch {
          console.log(`    - ❌ Error parseando template_ids`);
        }
      }
    }

    // Shift Templates
    console.log("\n\n⏰ SHIFT_TEMPLATES:");
    const shiftTemplates = await query(`
      SELECT * FROM shift_templates 
      WHERE restaurant_id = $1
      ORDER BY name
    `, [restaurants[0]?.id]);
    console.log(`  Total templates: ${shiftTemplates.length}`);
    for (const st of shiftTemplates) {
      console.log(`\n  Template: ${st.name} (${st.id})`);
      console.log(`    - start_time: ${st.start_time}`);
      console.log(`    - end_time: ${st.end_time}`);
      console.log(`    - max_guests_per_hour: ${st.max_guests_per_hour}`);
      console.log(`    - min_rating: ${st.min_rating}`);
    }

    // 3. PROBAR OPERACIONES DE ESCRITURA
    console.log("\n" + "=" .repeat(80));
    console.log("🧪 PARTE 3: PROBANDO OPERACIONES DE ESCRITURA");
    console.log("=" .repeat(80));

    if (restaurants[0]) {
      const testRestaurantId = restaurants[0].id;

      // Test 1: Actualizar table_rotation_time
      console.log("\n📝 Test 1: Actualizar table_rotation_time");
      console.log("  Valor actual:", restaurants[0].table_rotation_time);

      const newRotationTime = 150;
      console.log(`  Intentando actualizar a: ${newRotationTime}`);

      await query(`
        UPDATE restaurants 
        SET table_rotation_time = $1
        WHERE id = $2
      `, [newRotationTime, testRestaurantId]);

      const check1 = await query(`
        SELECT table_rotation_time 
        FROM restaurants 
        WHERE id = $1
      `, [testRestaurantId]);
      console.log(`  ✅ Valor después de UPDATE: ${check1[0].table_rotation_time}`);

      // Revertir
      await query(`
        UPDATE restaurants 
        SET table_rotation_time = $1
        WHERE id = $2
      `, [restaurants[0].table_rotation_time, testRestaurantId]);

      // Test 2: Crear/actualizar day_exception
      console.log("\n📝 Test 2: Crear/actualizar day_exception");
      const testDate = "2026-02-15";
      const testShifts = [
        {
          templateId: "test-shift-1",
          startTime: "19:00",
          endTime: "20:00",
          maxGuestsPerHour: 25,
          minRating: 0,
        },
      ];

      console.log(`  Fecha de prueba: ${testDate}`);
      console.log(`  Shifts de prueba:`, JSON.stringify(testShifts));

      // Eliminar si existe
      await query(`
        DELETE FROM day_exceptions 
        WHERE restaurant_id = $1 
        AND date = $2
      `, [testRestaurantId, testDate]);

      // Insertar
      await query(`
        INSERT INTO day_exceptions (
          id, restaurant_id, date, is_open, template_ids
        ) VALUES ($1, $2, $3, $4, $5)
      `, ["test-" + Date.now(), testRestaurantId, testDate, true, JSON.stringify(testShifts)]);

      const check2 = await query(`
        SELECT * FROM day_exceptions 
        WHERE restaurant_id = $1 
        AND date = $2
      `, [testRestaurantId, testDate]);

      console.log(`  ✅ Registro creado:`);
      console.log(`     - is_open: ${check2[0].is_open}`);
      console.log(`     - template_ids: ${check2[0].template_ids}`);

      const parsedShifts = JSON.parse(check2[0].template_ids);
      console.log(`     - Shifts guardados: ${parsedShifts.length}`);
      console.log(`     - Primer shift:`, parsedShifts[0]);

      // Actualizar
      const updatedShifts = [
        {
          templateId: "test-shift-1",
          startTime: "19:00",
          endTime: "20:00",
          maxGuestsPerHour: 30,
          minRating: 0,
        },
        {
          templateId: "test-shift-2",
          startTime: "20:00",
          endTime: "21:00",
          maxGuestsPerHour: 35,
          minRating: 0,
        },
      ];

      console.log(`\n  Actualizando con nuevos shifts...`);
      await query(`
        UPDATE day_exceptions 
        SET template_ids = $1,
            is_open = $2
        WHERE restaurant_id = $3 
        AND date = $4
      `, [JSON.stringify(updatedShifts), true, testRestaurantId, testDate]);

      const check3 = await query(`
        SELECT * FROM day_exceptions 
        WHERE restaurant_id = $1 
        AND date = $2
      `, [testRestaurantId, testDate]);

      console.log(`  ✅ Después de UPDATE:`);
      console.log(`     - template_ids: ${check3[0].template_ids}`);
      const parsedShifts2 = JSON.parse(check3[0].template_ids);
      console.log(`     - Shifts guardados: ${parsedShifts2.length}`);
      for (let i = 0; i < parsedShifts2.length; i++) {
        console.log(`     - Shift ${i + 1}:`, parsedShifts2[i]);
      }

      // Limpiar
      await query(`
        DELETE FROM day_exceptions 
        WHERE restaurant_id = $1 
        AND date = $2
      `, [testRestaurantId, testDate]);
      console.log(`  🧹 Test data limpiada`);
    }

    // 4. VERIFICAR RUTAS DEL BACKEND
    console.log("\n" + "=" .repeat(80));
    console.log("🔍 PARTE 4: VERIFICANDO RUTAS DEL BACKEND");
    console.log("=" .repeat(80));

    const routeFiles = [
      "backend/trpc/routes/restaurants/update/route.ts",
      "backend/trpc/routes/day-exceptions/update-with-shifts/route.ts",
      "backend/trpc/routes/day-exceptions/list/route.ts",
    ];

    for (const file of routeFiles) {
      console.log(`\n📄 Archivo: ${file}`);
      try {
        const fs = await import('fs/promises');
        const content = await fs.readFile(file, 'utf-8');
        
        // Buscar UPDATE statements
        const updateMatches = content.match(/UPDATE\s+\w+/gi);
        if (updateMatches) {
          console.log(`  ✅ Contiene ${updateMatches.length} statements UPDATE`);
          for (const match of updateMatches) {
            console.log(`     - ${match}`);
          }
        }

        // Buscar referencias a table_rotation_time
        if (content.includes("table_rotation_time")) {
          console.log(`  ✅ Contiene referencias a table_rotation_time`);
          const lines = content.split("\n");
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes("table_rotation_time")) {
              console.log(`     Línea ${i + 1}: ${lines[i].trim()}`);
            }
          }
        }

        // Buscar referencias a template_ids
        if (content.includes("template_ids")) {
          console.log(`  ✅ Contiene referencias a template_ids`);
          const lines = content.split("\n");
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes("template_ids")) {
              console.log(`     Línea ${i + 1}: ${lines[i].trim()}`);
            }
          }
        }

        // Buscar JSON.stringify
        if (content.includes("JSON.stringify")) {
          console.log(`  ✅ Usa JSON.stringify para serializar datos`);
        }
      } catch {
        console.log(`  ❌ No se pudo leer el archivo`);
      }
    }

    // 5. RESUMEN Y RECOMENDACIONES
    console.log("\n" + "=" .repeat(80));
    console.log("📊 PARTE 5: RESUMEN Y PROBLEMAS IDENTIFICADOS");
    console.log("=" .repeat(80));

    const issues = [];

    // Verificar si las operaciones de escritura funcionan
    if (restaurants.length > 0) {
      const finalCheck = await query(`
        SELECT table_rotation_time 
        FROM restaurants 
        WHERE id = $1
      `, [restaurants[0].id]);
      if (finalCheck[0].table_rotation_time === restaurants[0].table_rotation_time) {
        console.log("\n✅ Las operaciones de escritura en la BD funcionan correctamente");
      } else {
        issues.push("❌ Las operaciones de escritura en la BD no persisten");
      }
    }

    // Verificar estructura de day_exceptions
    const dayExcCols = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'day_exceptions'
    `);
    const hasTemplateIds = dayExcCols.some((c: any) => c.column_name === "template_ids");
    if (hasTemplateIds) {
      console.log("✅ day_exceptions tiene columna template_ids");
    } else {
      issues.push("❌ day_exceptions NO tiene columna template_ids");
    }

    // Verificar estructura de restaurants
    const restCols = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'restaurants'
    `);
    const hasRotationTime = restCols.some((c: any) => c.column_name === "table_rotation_time");
    if (hasRotationTime) {
      console.log("✅ restaurants tiene columna table_rotation_time");
    } else {
      issues.push("❌ restaurants NO tiene columna table_rotation_time");
    }

    if (issues.length > 0) {
      console.log("\n\n⚠️  PROBLEMAS ENCONTRADOS:");
      for (const issue of issues) {
        console.log(`  ${issue}`);
      }
    } else {
      console.log("\n\n✅ No se encontraron problemas estructurales");
      console.log("\n💡 El problema podría estar en:");
      console.log("   1. El frontend no está enviando los datos correctamente");
      console.log("   2. Las rutas del backend no están procesando los datos correctamente");
      console.log("   3. Hay un problema de sincronización/cache en el frontend");
      console.log("   4. Los datos se están sobrescribiendo después de guardar");
    }

    console.log("\n" + "=" .repeat(80));
    console.log("✅ DIAGNÓSTICO COMPLETADO");
    console.log("=" .repeat(80));
  } catch (error) {
    console.error("\n❌ Error durante el diagnóstico:", error);
    throw error;
  } finally {
    await pool.end();
    process.exit(0);
  }
}

runDiagnosis();
