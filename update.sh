#!/bin/bash

# Script de actualización para Asta Bot
# Compatible con Termux y servidores Linux/macOS

set -e  # Salir en caso de error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir con color
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Banner
clear
echo -e "${BLUE}"
echo "╔════════════════════════════════════════╗"
echo "║  🤖 Asta Bot - Script de Actualización  ║"
echo "║         v2.0.0                          ║"
echo "╚════════════════════════════════════════╝"
echo -e "${NC}\n"

# Verificar si estamos en un repositorio git
if [ ! -d ".git" ]; then
    print_error "Este script debe ejecutarse desde el directorio raíz del bot"
    print_error "No se encontró el directorio .git"
    exit 1
fi

# Obtener directorio actual
PROJECT_DIR=$(pwd)
print_status "Directorio del proyecto: $PROJECT_DIR"

# Paso 1: Mostrar estado actual
echo ""
print_status "Obteniendo estado actual..."
print_status "Rama actual:"
git branch --show-current
print_status "Versión instalada:"
node -e "console.log(require('./package.json').version)"

# Paso 2: Fetch de cambios
echo ""
print_status "Conectando con el repositorio remoto..."
if ! git fetch origin main 2>/dev/null; then
    print_error "No se pudo conectar con el repositorio remoto"
    print_error "Verifica tu conexión a internet"
    exit 1
fi
print_success "Conexión establecida"

# Paso 3: Verificar cambios
echo ""
print_status "Verificando actualizaciones disponibles..."
GIT_STATUS=$(git status -sb)

if echo "$GIT_STATUS" | grep -q "up to date"; then
    print_success "El bot ya está en la última versión"
    echo "$GIT_STATUS"
    exit 0
fi

# Paso 4: Mostrar cambios pendientes
echo ""
print_warning "Cambios disponibles:"
git log --oneline HEAD..origin/main | head -10

# Confirmar actualización
echo ""
read -p "¿Deseas continuar con la actualización? (s/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    print_warning "Actualización cancelada por el usuario"
    exit 0
fi

# Paso 5: Actualizar código
echo ""
print_status "Descargando cambios..."
if ! git pull origin main; then
    print_error "Error al descargar cambios"
    print_status "Intentando deshacer cambios..."
    git merge --abort 2>/dev/null || true
    exit 1
fi
print_success "Cambios descargados"

# Paso 6: Instalar dependencias
echo ""
print_status "Instalando/actualizando dependencias..."
print_warning "Esto puede tomar varios minutos..."

if command -v npm &> /dev/null; then
    if ! npm install; then
        print_error "Error al instalar dependencias"
        exit 1
    fi
    print_success "Dependencias instaladas"
else
    print_error "npm no está instalado"
    exit 1
fi

# Paso 7: Mostrar resumen
echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✓ ACTUALIZACIÓN COMPLETADA            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}\n"

print_status "Versión actualizada:"
node -e "console.log(require('./package.json').version)"

print_status "Rama: $(git branch --show-current)"
print_status "Último commit:"
git log -1 --oneline

echo ""
print_status "Próximos pasos:"
echo "  1. Reinicia el bot: npm start"
echo "  2. En Termux con tmux: tmux kill-session -t asta && tmux new-session -d -s asta 'npm start'"
echo ""
print_success "¡Bot actualizado correctamente!"
