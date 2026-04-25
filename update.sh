#!/bin/bash

# ╔══════════════════════════════════════════════════════════════════╗
# ║                    ASTA BOT - UPDATE SCRIPT                      ║
# ║                    Mantenimiento 24/7 con PM2                    ║
# ╚══════════════════════════════════════════════════════════════════╝

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# ═══════════════════════════════════════════════════════════════════
# CONFIGURACIÓN - Personaliza aquí
# ═══════════════════════════════════════════════════════════════════
BOT_NAME="Asta-Bot"
PM2_PROCESS_NAME="asta-bot"
REPO_URL="https://github.com/Fer2809fl/asta-.git"
MAIN_BRANCH="main"
BACKUP_DIR="backups"
LOG_DIR="logs"
# ═══════════════════════════════════════════════════════════════════

# Función para imprimir banners
print_banner() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════════╗"
    echo "║                    🚀 ASTA BOT MANAGER 🚀                        ║"
    echo "║              Sistema de Actualización & Mantenimiento            ║"
    echo "╚══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_step() {
    echo -e "${MAGENTA}🔹 $1${NC}"
}

# Verificar si está en el directorio correcto
check_directory() {
    if [ ! -f "package.json" ]; then
        print_error "No se encontró package.json. ¿Estás en el directorio correcto del bot?"
        exit 1
    fi
    print_success "Directorio del bot verificado"
}

# Verificar dependencias del sistema
check_system_deps() {
    print_step "Verificando dependencias del sistema..."

    # Verificar Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js no está instalado. Instálalo primero."
        exit 1
    fi
    NODE_VERSION=$(node -v)
    print_info "Node.js: $NODE_VERSION"

    # Verificar npm
    if ! command -v npm &> /dev/null; then
        print_error "npm no está instalado."
        exit 1
    fi
    NPM_VERSION=$(npm -v)
    print_info "npm: v$NPM_VERSION"

    # Verificar git
    if ! command -v git &> /dev/null; then
        print_error "git no está instalado."
        exit 1
    fi
    GIT_VERSION=$(git --version | awk '{print $3}')
    print_info "git: v$GIT_VERSION"

    # Verificar PM2
    if ! command -v pm2 &> /dev/null; then
        print_warning "PM2 no está instalado. Instalando..."
        npm install -g pm2
        if [ $? -eq 0 ]; then
            print_success "PM2 instalado correctamente"
        else
            print_error "Error instalando PM2"
            exit 1
        fi
    else
        PM2_VERSION=$(pm2 -v)
        print_info "PM2: v$PM2_VERSION"
    fi

    print_success "Todas las dependencias del sistema están listas"
}

# Crear directorios necesarios
create_directories() {
    print_step "Creando directorios necesarios..."
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$LOG_DIR"
    mkdir -p "sessions"
    mkdir -p "lib/premium"
    print_success "Directorios creados/verificados"
}

# Backup de archivos importantes
backup_files() {
    print_step "Creando backup de archivos importantes..."

    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    BACKUP_NAME="backup_${TIMESTAMP}"
    BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"

    mkdir -p "$BACKUP_PATH"

    # Backup de sessions
    if [ -d "sessions" ]; then
        cp -r sessions "$BACKUP_PATH/" 2>/dev/null
        print_info "Sessions respaldadas"
    fi

    # Backup de database
    if [ -d "database" ]; then
        cp -r database "$BACKUP_PATH/" 2>/dev/null
        print_info "Database respaldada"
    fi

    # Backup de config.js o config personalizada
    if [ -f "config.js" ]; then
        cp config.js "$BACKUP_PATH/" 2>/dev/null
        print_info "Config respaldada"
    fi

    # Backup de package.json
    if [ -f "package.json" ]; then
        cp package.json "$BACKUP_PATH/" 2>/dev/null
        print_info "package.json respaldado"
    fi

    # Backup de .env si existe
    if [ -f ".env" ]; then
        cp .env "$BACKUP_PATH/" 2>/dev/null
        print_info ".env respaldado"
    fi

    # Backup de archivos personalizados del usuario
    if [ -d "lib" ]; then
        cp -r lib "$BACKUP_PATH/" 2>/dev/null
        print_info "Carpeta lib respaldada"
    fi

    # Limpiar backups antiguos (mantener últimos 5)
    cd "$BACKUP_DIR"
    ls -t | tail -n +6 | xargs rm -rf 2>/dev/null
    cd - > /dev/null

    print_success "Backup creado: $BACKUP_PATH"
    echo "$BACKUP_PATH" > .last_backup
}

# Restaurar último backup
restore_backup() {
    print_step "Restaurando último backup..."

    if [ ! -f ".last_backup" ]; then
        print_error "No se encontró información del último backup"
        return 1
    fi

    LAST_BACKUP=$(cat .last_backup)

    if [ ! -d "$LAST_BACKUP" ]; then
        print_error "El backup no existe: $LAST_BACKUP"
        return 1
    fi

    # Restaurar sessions
    if [ -d "$LAST_BACKUP/sessions" ]; then
        rm -rf sessions 2>/dev/null
        cp -r "$LAST_BACKUP/sessions" . 2>/dev/null
        print_info "Sessions restauradas"
    fi

    # Restaurar database
    if [ -d "$LAST_BACKUP/database" ]; then
        rm -rf database 2>/dev/null
        cp -r "$LAST_BACKUP/database" . 2>/dev/null
        print_info "Database restaurada"
    fi

    # Restaurar lib
    if [ -d "$LAST_BACKUP/lib" ]; then
        rm -rf lib 2>/dev/null
        cp -r "$LAST_BACKUP/lib" . 2>/dev/null
        print_info "Carpeta lib restaurada"
    fi

    print_success "Backup restaurado desde: $LAST_BACKUP"
}

# Actualizar dependencias de npm
update_dependencies() {
    print_step "Actualizando dependencias de npm..."

    # Limpiar caché de npm
    print_info "Limpiando caché de npm..."
    npm cache clean --force 2>/dev/null

    # Eliminar node_modules y package-lock para instalación limpia
    print_info "Eliminando node_modules antiguos..."
    rm -rf node_modules
    rm -f package-lock.json

    # Instalar dependencias
    print_info "Instalando dependencias (esto puede tardar)..."
    npm install

    if [ $? -eq 0 ]; then
        print_success "Dependencias actualizadas correctamente"
    else
        print_error "Error actualizando dependencias"
        return 1
    fi

    # Verificar dependencias críticas
    print_info "Verificando dependencias críticas..."

    # Verificar @fer280809/baileys
    if ! npm list @fer280809/baileys &> /dev/null; then
        print_warning "Instalando @fer280809/baileys..."
        npm install github:Fer280809/Baileys#main
    fi

    # Verificar jimp
    if ! npm list jimp &> /dev/null; then
        print_warning "Instalando jimp..."
        npm install jimp@^0.16.13
    fi

    # Verificar cors y body-parser
    if ! npm list cors &> /dev/null; then
        print_warning "Instalando cors..."
        npm install cors
    fi

    if ! npm list body-parser &> /dev/null; then
        print_warning "Instalando body-parser..."
        npm install body-parser
    fi

    # Verificar otras dependencias comunes de bots
    if ! npm list qrcode-terminal &> /dev/null; then
        print_warning "Instalando qrcode-terminal..."
        npm install qrcode-terminal
    fi

    if ! npm list pino &> /dev/null; then
        print_warning "Instalando pino..."
        npm install pino
    fi

    print_success "Todas las dependencias críticas están instaladas"
}

# Actualizar desde repositorio oficial
update_from_repo() {
    print_step "Actualizando desde repositorio oficial..."
    print_info "Repo: $REPO_URL"

    # Verificar si es un repositorio git
    if [ ! -d ".git" ]; then
        print_warning "No es un repositorio git. Inicializando..."
        git init
        git remote add origin "$REPO_URL" 2>/dev/null || git remote set-url origin "$REPO_URL"
    fi

    # Guardar cambios locales si los hay
    print_info "Guardando cambios locales..."
    git stash 2>/dev/null

    # Fetch latest changes
    print_info "Obteniendo últimos cambios..."
    git fetch origin "$MAIN_BRANCH"

    if [ $? -ne 0 ]; then
        print_error "Error obteniendo cambios del repositorio"
        print_info "Verifica que el repo sea público o que tengas acceso"
        git stash pop 2>/dev/null
        return 1
    fi

    # Verificar si hay actualizaciones
    LOCAL=$(git rev-parse HEAD 2>/dev/null || echo "none")
    REMOTE=$(git rev-parse origin/$MAIN_BRANCH 2>/dev/null || echo "none")

    if [ "$LOCAL" = "$REMOTE" ]; then
        print_info "El bot ya está actualizado (sin cambios nuevos)"
        git stash pop 2>/dev/null
        return 0
    fi

    print_info "Nuevos cambios detectados. Actualizando..."
    git pull origin "$MAIN_BRANCH"

    if [ $? -eq 0 ]; then
        print_success "Bot actualizado desde repositorio oficial"
    else
        print_error "Error actualizando desde repositorio"
        print_info "Intentando con merge strategy..."
        git pull origin "$MAIN_BRANCH" --strategy=recursive --strategy-option=theirs
        if [ $? -eq 0 ]; then
            print_success "Bot actualizado (usando strategy theirs)"
        else
            print_error "No se pudo actualizar. Revisa los conflictos manualmente."
            git stash pop 2>/dev/null
            return 1
        fi
    fi

    git stash pop 2>/dev/null
}

# Limpiar caché del bot
clear_bot_cache() {
    print_step "Limpiando caché del bot..."

    # Limpiar caché de Baileys
    if [ -d ".cache" ]; then
        rm -rf .cache/* 2>/dev/null
        print_info "Caché de Baileys limpiada"
    fi

    # Limpiar logs antiguos
    if [ -d "$LOG_DIR" ]; then
        find "$LOG_DIR" -name "*.log" -type f -mtime +7 -delete 2>/dev/null
        print_info "Logs antiguos eliminados (+7 días)"
    fi

    # Limpiar tmp
    if [ -d "tmp" ]; then
        rm -rf tmp/* 2>/dev/null
        print_info "Directorio tmp limpiado"
    fi

    # Limpiar archivos temporales
    find . -name "*.tmp" -type f -delete 2>/dev/null
    find . -name ".DS_Store" -type f -delete 2>/dev/null

    print_success "Caché limpiada correctamente"
}

# Iniciar bot con PM2
start_bot() {
    print_step "Iniciando bot con PM2..."

    # Verificar si ya está corriendo
    if pm2 describe "$PM2_PROCESS_NAME" &> /dev/null; then
        print_warning "El bot ya está corriendo. Reiniciando..."
        pm2 restart "$PM2_PROCESS_NAME"
    else
        # Iniciar nuevo proceso con configuración optimizada
        pm2 start index.js \
            --name "$PM2_PROCESS_NAME" \
            --time \
            --log "$LOG_DIR/bot.log" \
            --error "$LOG_DIR/error.log" \
            --output "$LOG_DIR/out.log" \
            --restart-delay 5000 \
            --max-restarts 10 \
            --min-uptime 10s \
            --merge-logs \
            --watch \
            --ignore-watch "node_modules sessions database backups logs tmp"
    fi

    if [ $? -eq 0 ]; then
        print_success "Bot iniciado correctamente con PM2"
        pm2 save > /dev/null 2>&1

        echo ""
        print_info "Comandos útiles de PM2:"
        echo "  pm2 status              - Ver estado de procesos"
        echo "  pm2 logs asta-bot       - Ver logs"
        echo "  pm2 monit               - Monitor en tiempo real"
        echo "  pm2 reload asta-bot     - Recargar sin downtime"
    else
        print_error "Error iniciando el bot"
        return 1
    fi
}

# Detener bot
stop_bot() {
    print_step "Deteniendo bot..."

    if pm2 describe "$PM2_PROCESS_NAME" &> /dev/null; then
        pm2 stop "$PM2_PROCESS_NAME"
        print_success "Bot detenido"
    else
        print_warning "El bot no está corriendo"
    fi
}

# Reiniciar bot
restart_bot() {
    print_step "Reiniciando bot..."

    if pm2 describe "$PM2_PROCESS_NAME" &> /dev/null; then
        pm2 restart "$PM2_PROCESS_NAME"
        print_success "Bot reiniciado"
    else
        print_warning "El bot no está corriendo. Iniciando..."
        start_bot
    fi
}

# Ver estado del bot
bot_status() {
    print_step "Estado del bot..."

    if pm2 describe "$PM2_PROCESS_NAME" &> /dev/null; then
        echo -e "${CYAN}"
        pm2 status "$PM2_PROCESS_NAME"
        echo -e "${NC}"

        echo -e "${YELLOW}Últimos 20 logs:${NC}"
        pm2 logs "$PM2_PROCESS_NAME" --lines 20 --nostream

        echo ""
        print_info "Uptime y recursos:"
        pm2 show "$PM2_PROCESS_NAME" | grep -E "(uptime|memory|cpu|status)"
    else
        print_warning "El bot no está corriendo"
        print_info "Inicia con: ./update.sh start"
    fi
}

# Ver logs en tiempo real
view_logs() {
    print_step "Mostrando logs en tiempo real (Ctrl+C para salir)..."
    pm2 logs "$PM2_PROCESS_NAME" --lines 50
}

# Configurar PM2 para inicio automático
setup_pm2_startup() {
    print_step "Configurando inicio automático de PM2..."

    # Detectar sistema operativo
    if command -v systemctl &> /dev/null; then
        print_info "Sistema con systemd detectado"
        pm2 startup systemd
    else
        print_info "Detectando sistema..."
        pm2 startup
    fi

    pm2 save

    print_success "PM2 configurado para inicio automático"
    print_info "El bot se iniciará automáticamente al reiniciar el servidor"
}

# Ver información del sistema
system_info() {
    print_step "Información del sistema..."

    echo -e "${CYAN}"
    echo "═══════════════════════════════════════════════════════════════"
    echo "  SISTEMA"
    echo "═══════════════════════════════════════════════════════════════"
    echo -e "${NC}"

    echo -e "${BLUE}Hostname:${NC} $(hostname)"
    echo -e "${BLUE}OS:${NC} $(uname -o) $(uname -r)"
    echo -e "${BLUE}Arquitectura:${NC} $(uname -m)"

    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  RECURSOS${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"

    # CPU
    CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    echo -e "${BLUE}CPU:${NC} ${CPU_USAGE}%"

    # RAM
    RAM_INFO=$(free -h | awk '/^Mem:/ {print $3 "/" $2}')
    echo -e "${BLUE}RAM:${NC} $RAM_INFO"

    # Disco
    DISK_INFO=$(df -h . | awk 'NR==2 {print $3 "/" $2 " (" $5 ")"}')
    echo -e "${BLUE}Disco:${NC} $DISK_INFO"

    # Uptime
    echo -e "${BLUE}Uptime:${NC} $(uptime -p)"

    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  BOT${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"

    if pm2 describe "$PM2_PROCESS_NAME" &> /dev/null; then
        echo -e "${GREEN}Estado: CORRIENDO ✅${NC}"
        pm2 show "$PM2_PROCESS_NAME" | grep -E "(uptime|memory|cpu|status|restarts)"
    else
        echo -e "${RED}Estado: DETENIDO ❌${NC}"
    fi

    # Tamaño del proyecto
    if command -v du &> /dev/null; then
        echo ""
        echo -e "${BLUE}Tamaño del proyecto:${NC} $(du -sh . 2>/dev/null | awk '{print $1}')"
    fi
}

# Actualización completa
full_update() {
    print_banner

    echo -e "${BOLD}${WHITE}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${WHITE}║              INICIANDO ACTUALIZACIÓN COMPLETA                   ║${NC}"
    echo -e "${BOLD}${WHITE}╚══════════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    check_directory
    check_system_deps
    create_directories
    backup_files

    # Detener bot antes de actualizar
    stop_bot

    # Actualizar desde repo
    update_from_repo

    # Actualizar dependencias
    update_dependencies

    # Limpiar caché
    clear_bot_cache

    # Iniciar bot
    start_bot

    # Configurar inicio automático
    setup_pm2_startup

    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              ✅ ACTUALIZACIÓN COMPLETADA ✅                      ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    print_info "El bot está corriendo 24/7 con PM2"
    print_info "Usa: ./update.sh status    - Ver estado"
    print_info "Usa: ./update.sh logs      - Ver logs"
    print_info "Usa: ./update.sh restart   - Reiniciar"
}

# Menú interactivo
show_menu() {
    print_banner

    echo -e "${BOLD}${WHITE}Opciones disponibles:${NC}"
    echo ""
    echo -e "  ${CYAN}1.${NC}  🔄 Actualización completa (repo + deps + reinicio)"
    echo -e "  ${CYAN}2.${NC}  📦 Solo actualizar dependencias (npm)"
    echo -e "  ${CYAN}3.${NC}  ⬇️  Solo actualizar desde repositorio"
    echo -e "  ${CYAN}4.${NC}  ▶️  Iniciar bot (PM2)"
    echo -e "  ${CYAN}5.${NC}  ⏹️  Detener bot"
    echo -e "  ${CYAN}6.${NC}  🔄 Reiniciar bot"
    echo -e "  ${CYAN}7.${NC}  📊 Ver estado del bot"
    echo -e "  ${CYAN}8.${NC}  📋 Ver logs en tiempo real"
    echo -e "  ${CYAN}9.${NC}  🧹 Limpiar caché"
    echo -e "  ${CYAN}10.${NC} 💾 Crear backup"
    echo -e "  ${CYAN}11.${NC} ♻️  Restaurar último backup"
    echo -e "  ${CYAN}12.${NC} ⚙️  Configurar inicio automático (PM2)"
    echo -e "  ${CYAN}13.${NC} 🖥️  Información del sistema"
    echo -e "  ${CYAN}0.${NC}  ❌ Salir"
    echo ""

    read -p "Selecciona una opción: " choice

    case $choice in
        1) full_update ;;
        2) 
            check_directory
            check_system_deps
            backup_files
            stop_bot
            update_dependencies
            start_bot
            ;;
        3)
            check_directory
            check_system_deps
            backup_files
            stop_bot
            update_from_repo
            start_bot
            ;;
        4) start_bot ;;
        5) stop_bot ;;
        6) restart_bot ;;
        7) bot_status ;;
        8) view_logs ;;
        9) clear_bot_cache ;;
        10) backup_files ;;
        11) restore_backup ;;
        12) setup_pm2_startup ;;
        13) system_info ;;
        0) 
            echo -e "${GREEN}¡Hasta luego! 👋${NC}"
            exit 0 
            ;;
        *) print_error "Opción inválida" ;;
    esac
}

# Procesar argumentos de línea de comandos
case "${1:-}" in
    "full"|"update"|"--full"|"-u")
        full_update
        ;;
    "deps"|"dependencies"|"--deps"|"-d")
        check_directory
        check_system_deps
        backup_files
        stop_bot
        update_dependencies
        start_bot
        ;;
    "repo"|"--repo"|"-r")
        check_directory
        check_system_deps
        backup_files
        stop_bot
        update_from_repo
        start_bot
        ;;
    "start"|"--start"|"-s")
        start_bot
        ;;
    "stop"|"--stop")
        stop_bot
        ;;
    "restart"|"--restart"|"-rs")
        restart_bot
        ;;
    "status"|"--status"|"-st")
        bot_status
        ;;
    "logs"|"--logs"|"-l")
        view_logs
        ;;
    "clear"|"clean"|"--clear"|"-c")
        clear_bot_cache
        ;;
    "backup"|"--backup"|"-b")
        check_directory
        backup_files
        ;;
    "restore"|"--restore")
        restore_backup
        ;;
    "startup"|"--startup")
        setup_pm2_startup
        ;;
    "info"|"--info"|"-i")
        system_info
        ;;
    "help"|"--help"|"-h"|"?")
        print_banner
        echo -e "${BOLD}Uso:${NC} ./update.sh [opción]"
        echo ""
        echo -e "${CYAN}Opciones:${NC}"
        echo "  full, -u, --full      Actualización completa (repo + deps + reinicio)"
        echo "  deps, -d, --deps      Solo actualizar dependencias npm"
        echo "  repo, -r, --repo      Solo actualizar desde repositorio"
        echo "  start, -s, --start    Iniciar bot con PM2"
        echo "  stop, --stop          Detener bot"
        echo "  restart, -rs          Reiniciar bot"
        echo "  status, -st           Ver estado del bot"
        echo "  logs, -l, --logs      Ver logs en tiempo real"
        echo "  clear, -c, --clear    Limpiar caché del bot"
        echo "  backup, -b, --backup  Crear backup de archivos importantes"
        echo "  restore, --restore    Restaurar último backup"
        echo "  startup, --startup    Configurar inicio automático PM2"
        echo "  info, -i, --info      Información del sistema"
        echo "  help, -h, --help      Mostrar esta ayuda"
        echo ""
        echo -e "${YELLOW}Sin argumentos:${NC} Muestra menú interactivo"
        ;;
    "")
        show_menu
        ;;
    *)
        print_error "Opción desconocida: $1"
        echo "Usa: ./update.sh help"
        exit 1
        ;;
esac
