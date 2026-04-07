#!/bin/bash

echo "🔧 Corrigiendo imports con alias @ a rutas relativas..."

# Función para calcular la ruta relativa
calculate_relative_path() {
    local file=$1
    local depth=$(echo "$file" | grep -o '/' | wc -l)
    
    # Calcular cuántos ../ necesitamos
    local relative=""
    for ((i=1; i<depth; i++)); do
        relative="../$relative"
    done
    
    echo "$relative"
}

# Encontrar todos los archivos TypeScript/React
find app -type f \( -name "*.tsx" -o -name "*.ts" \) | while read -r file; do
    echo "📝 Procesando: $file"
    
    # Calcular ruta relativa
    relative=$(calculate_relative_path "$file")
    
    # Si el archivo está en la raíz de app/, relative estará vacío, usar "./"
    if [ -z "$relative" ]; then
        relative="./"
    fi
    
    # Reemplazar @/ por la ruta relativa
    sed -i "s|@/lib/trpc|${relative}lib/trpc|g" "$file"
    sed -i "s|@/constants/colors|${relative}constants/colors|g" "$file"
    sed -i "s|@/constants/|${relative}constants/|g" "$file"
    sed -i "s|@/types|${relative}types|g" "$file"
    sed -i "s|@/types/|${relative}types/|g" "$file"
    sed -i "s|@/backend/|${relative}backend/|g" "$file"
    sed -i "s|from \"@/|from \"${relative}|g" "$file"
    sed -i "s|from '@/|from '${relative}|g" "$file"
done

echo "✅ Imports corregidos"
