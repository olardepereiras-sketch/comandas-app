#!/bin/bash

echo "🔍 Diagnosticando configuración de WhatsApp..."
echo ""

cd /var/www/reservamesa

bun run backend/db/diagnose-whatsapp-config.ts
