import { Hono } from 'hono';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';

const app = new Hono();

app.post('/upload-restaurant-image', async (c) => {
  try {
    console.log('📸 [UPLOAD IMAGE] Iniciando subida de imagen');
    
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const restaurantId = formData.get('restaurantId') as string;
    
    if (!file) {
      console.error('❌ [UPLOAD IMAGE] No se recibió archivo');
      return c.json({ error: 'No se recibió ningún archivo' }, 400);
    }
    
    if (!restaurantId) {
      console.error('❌ [UPLOAD IMAGE] No se recibió restaurantId');
      return c.json({ error: 'No se recibió el ID del restaurante' }, 400);
    }
    
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      console.error('❌ [UPLOAD IMAGE] Tipo de archivo no permitido:', file.type);
      return c.json({ 
        error: 'Tipo de archivo no permitido. Solo se aceptan JPG, PNG y WebP' 
      }, 400);
    }
    
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      console.error('❌ [UPLOAD IMAGE] Archivo demasiado grande:', file.size);
      return c.json({ 
        error: 'El archivo es demasiado grande. Tamaño máximo: 5MB' 
      }, 400);
    }
    
    const uploadsDir = join(process.cwd(), 'uploads', 'restaurants');
    if (!existsSync(uploadsDir)) {
      mkdirSync(uploadsDir, { recursive: true });
    }
    
    const timestamp = Date.now();
    const filenameWebp = `${restaurantId}-${timestamp}.webp`;
    const filenameJpg = `${restaurantId}-${timestamp}.jpg`;
    const filepathWebp = join(uploadsDir, filenameWebp);
    const filepathJpg = join(uploadsDir, filenameJpg);
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    try {
      await sharp(buffer)
        .resize(1200, 675, {
          fit: 'cover',
          position: 'center',
        })
        .webp({ quality: 85 })
        .toFile(filepathWebp);
      
      await sharp(buffer)
        .resize(1200, 675, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: 85, progressive: true })
        .toFile(filepathJpg);
      
      console.log('✅ [UPLOAD IMAGE] Imágenes optimizadas guardadas (WebP y JPG)');
    } catch (sharpError) {
      console.warn('⚠️ [UPLOAD IMAGE] Error con Sharp, guardando original:', sharpError);
      writeFileSync(filepathJpg, buffer);
    }
    
    const imageUrl = `https://quieromesa.com/uploads/restaurants/${filenameJpg}`;
    
    console.log('✅ [UPLOAD IMAGE] Imagen guardada:', imageUrl);
    
    return c.json({ 
      success: true, 
      imageUrl 
    });
    
  } catch (error: any) {
    console.error('❌ [UPLOAD IMAGE] Error:', error);
    return c.json({ 
      error: 'Error al subir la imagen: ' + error.message 
    }, 500);
  }
});

app.post('/upload-location-image', async (c) => {
  try {
    console.log('📸 [UPLOAD LOCATION IMAGE] Iniciando subida de imagen de ubicación');
    
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const locationId = formData.get('locationId') as string;
    
    if (!file) {
      console.error('❌ [UPLOAD LOCATION IMAGE] No se recibió archivo');
      return c.json({ error: 'No se recibió ningún archivo' }, 400);
    }
    
    if (!locationId) {
      console.error('❌ [UPLOAD LOCATION IMAGE] No se recibió locationId');
      return c.json({ error: 'No se recibió el ID de la ubicación' }, 400);
    }
    
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      console.error('❌ [UPLOAD LOCATION IMAGE] Tipo de archivo no permitido:', file.type);
      return c.json({ 
        error: 'Tipo de archivo no permitido. Solo se aceptan JPG, PNG y WebP' 
      }, 400);
    }
    
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      console.error('❌ [UPLOAD LOCATION IMAGE] Archivo demasiado grande:', file.size);
      return c.json({ 
        error: 'El archivo es demasiado grande. Tamaño máximo: 5MB' 
      }, 400);
    }
    
    const uploadsDir = join(process.cwd(), 'uploads', 'locations');
    if (!existsSync(uploadsDir)) {
      mkdirSync(uploadsDir, { recursive: true });
    }
    
    const timestamp = Date.now();
    const filenameWebp = `${locationId}-${timestamp}.webp`;
    const filenameJpg = `${locationId}-${timestamp}.jpg`;
    const filepathWebp = join(uploadsDir, filenameWebp);
    const filepathJpg = join(uploadsDir, filenameJpg);
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    try {
      await sharp(buffer)
        .resize(800, 600, {
          fit: 'cover',
          position: 'center',
        })
        .webp({ quality: 85 })
        .toFile(filepathWebp);
      
      await sharp(buffer)
        .resize(800, 600, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: 85, progressive: true })
        .toFile(filepathJpg);
      
      console.log('✅ [UPLOAD LOCATION IMAGE] Imágenes optimizadas guardadas (WebP y JPG)');
    } catch (sharpError) {
      console.warn('⚠️ [UPLOAD LOCATION IMAGE] Error con Sharp, guardando original:', sharpError);
      writeFileSync(filepathJpg, buffer);
    }
    
    const imageUrl = `https://quieromesa.com/uploads/locations/${filenameJpg}`;
    
    console.log('✅ [UPLOAD LOCATION IMAGE] Imagen guardada:', imageUrl);
    
    return c.json({ 
      success: true, 
      imageUrl 
    });
    
  } catch (error: any) {
    console.error('❌ [UPLOAD LOCATION IMAGE] Error:', error);
    return c.json({ 
      error: 'Error al subir la imagen: ' + error.message 
    }, 500);
  }
});

app.post('/upload-menu-image', async (c) => {
  try {
    console.log('📸 [UPLOAD MENU IMAGE] Iniciando subida de imagen de carta digital');
    
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const entityId = formData.get('entityId') as string;
    
    if (!file) return c.json({ error: 'No se recibió ningún archivo' }, 400);
    if (!entityId) return c.json({ error: 'No se recibió el ID de la entidad' }, 400);
    
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: 'Tipo de archivo no permitido. Solo se aceptan JPG, PNG y WebP' }, 400);
    }
    
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) return c.json({ error: 'El archivo es demasiado grande. Tamaño máximo: 5MB' }, 400);
    
    const uploadsDir = join(process.cwd(), 'uploads', 'menus');
    if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
    
    const timestamp = Date.now();
    const filenameJpg = `${entityId}-${timestamp}.jpg`;
    const filepathJpg = join(uploadsDir, filenameJpg);
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    try {
      await sharp(buffer)
        .resize(1200, 1800, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 88, progressive: true })
        .toFile(filepathJpg);
    } catch (sharpError) {
      writeFileSync(filepathJpg, buffer);
    }
    
    const imageUrl = `https://quieromesa.com/uploads/menus/${filenameJpg}`;
    console.log('✅ [UPLOAD MENU IMAGE] Imagen guardada:', imageUrl);
    return c.json({ success: true, imageUrl });
    
  } catch (error: any) {
    console.error('❌ [UPLOAD MENU IMAGE] Error:', error);
    return c.json({ error: 'Error al subir la imagen: ' + error.message }, 500);
  }
});

app.post('/upload-game-memory-image', async (c) => {
  try {
    console.log('📸 [UPLOAD GAME MEMORY IMAGE] Iniciando subida de imagen de memory');
    
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const restaurantId = formData.get('restaurantId') as string;
    const index = formData.get('index') as string;
    
    if (!file) return c.json({ error: 'No se recibió ningún archivo' }, 400);
    if (!restaurantId) return c.json({ error: 'No se recibió el ID del restaurante' }, 400);
    
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: 'Tipo de archivo no permitido. Solo se aceptan JPG, PNG y WebP' }, 400);
    }
    
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) return c.json({ error: 'El archivo es demasiado grande. Tamaño máximo: 5MB' }, 400);
    
    const uploadsDir = join(process.cwd(), 'uploads', 'game-memory');
    if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
    
    const timestamp = Date.now();
    const filenameJpg = `${restaurantId}-${index || '0'}-${timestamp}.jpg`;
    const filepathJpg = join(uploadsDir, filenameJpg);
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    try {
      await sharp(buffer)
        .resize(400, 400, { fit: 'cover', position: 'center' })
        .jpeg({ quality: 85, progressive: true })
        .toFile(filepathJpg);
    } catch (sharpError) {
      writeFileSync(filepathJpg, buffer);
    }
    
    const imageUrl = `https://quieromesa.com/uploads/game-memory/${filenameJpg}`;
    console.log('✅ [UPLOAD GAME MEMORY IMAGE] Imagen guardada:', imageUrl);
    return c.json({ success: true, imageUrl });
    
  } catch (error: any) {
    console.error('❌ [UPLOAD GAME MEMORY IMAGE] Error:', error);
    return c.json({ error: 'Error al subir la imagen: ' + error.message }, 500);
  }
});

export default app;
