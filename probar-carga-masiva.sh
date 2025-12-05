#!/bin/bash

echo "🚀 Iniciando prueba de carga masiva local..."

# Paso 1: Crear CSV de prueba
echo "📝 Creando archivo CSV de prueba..."
echo -e "nombre_entidad,tipo_cliente,actividad_economica\nPrueba Local,persona_moral,venta_pruebas" > prueba.csv

# Paso 2: Verificar que el backend esté corriendo
echo "🔍 Verificando si el backend está corriendo en el puerto 10000..."
if lsof -i :10000 | grep LISTEN > /dev/null; then
  echo "✅ Backend detectado en puerto 10000"
else
  echo "❌ Backend no detectado. Por favor, ejecuta 'npm start' en la carpeta 'backend'"
  exit 1
fi

# Paso 3: Probar con curl
echo "📤 Enviando archivo CSV al endpoint /api/carga-directa..."
response=$(curl -s -w "%{http_code}" -X POST http://localhost:10000/api/carga-directa \
  -H "Content-Type: multipart/form-data" \
  -F "file=@prueba.csv")

# Extraer código de estado y cuerpo
http_code="${response: -3}"
body="${response%???}"

echo "📊 Respuesta del servidor:"
echo "Código HTTP: $http_code"
echo "Cuerpo: $body"

# Paso 4: Limpieza
rm prueba.csv
echo "🧹 Archivo temporal eliminado."

# Paso 5: Resultado
if [[ $http_code == "200" && $body == *success* ]]; then
  echo "✅ ¡PRUEBA EXITOSA! La carga masiva funciona localmente."
else
  echo "❌ PRUEBA FALLIDA. Revisa los logs del backend para más detalles."
fi