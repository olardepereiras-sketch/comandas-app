#!/bin/bash

echo "=== SOLUCIÓN DEFINITIVA NGINX ==="

# 1. Limpiar TODAS las configuraciones antiguas
sudo rm -f /etc/nginx/sites-enabled/*
sudo rm -f /etc/nginx/sites-available/default
sudo rm -f /etc/nginx/sites-available/reservamesa

# 2. Crear configuración CORRECTA desde cero
sudo tee /etc/nginx/sites-available/reservamesa > /dev/null << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    server_name _;
    
    root /var/www/reservamesa/dist;
    index index.html;
    
    # IMPORTANTE: Backend API proxy (SIN trailing slash en proxy_pass)
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Añadir para debugging
        add_header X-Proxied-By nginx always;
    }
    
    # Static assets con cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }
    
    # Frontend (SIEMPRE AL FINAL)
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

# 3. Crear symlink
sudo ln -sf /etc/nginx/sites-available/reservamesa /etc/nginx/sites-enabled/reservamesa

# 4. Verificar sintaxis
echo ""
echo "Verificando configuración..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Configuración correcta"
    
    # 5. Recargar nginx
    sudo systemctl reload nginx
    
    echo ""
    echo "=== PRUEBAS ==="
    
    # Test 1: Backend directo
    echo ""
    echo "1. Test backend directo (puerto 3000):"
    curl -s -o /dev/null -w "Status: %{http_code}\n" -X POST http://127.0.0.1:3000/api/trpc/auth.adminLogin?batch=1 \
        -H "Content-Type: application/json" \
        -d '{"0":{"json":{"username":"tono","password":"1234","ipAddress":"127.0.0.1"}}}'
    
    # Test 2: A través de nginx
    echo ""
    echo "2. Test a través de nginx (puerto 80):"
    curl -s -w "Status: %{http_code}\n" -X POST http://127.0.0.1/api/trpc/auth.adminLogin?batch=1 \
        -H "Content-Type: application/json" \
        -d '{"0":{"json":{"username":"tono","password":"1234","ipAddress":"127.0.0.1"}}}' | tail -1
    
    # Test 3: Mostrar respuesta completa
    echo ""
    echo "3. Respuesta completa:"
    curl -X POST http://127.0.0.1/api/trpc/auth.adminLogin?batch=1 \
        -H "Content-Type: application/json" \
        -d '{"0":{"json":{"username":"tono","password":"1234","ipAddress":"127.0.0.1"}}}'
    
    echo ""
    echo ""
    echo "=== CONFIGURACIÓN ACTIVA ==="
    cat /etc/nginx/sites-available/reservamesa
else
    echo ""
    echo "❌ Error en configuración"
fi
