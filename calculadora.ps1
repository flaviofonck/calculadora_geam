<#
.SYNOPSIS
    Levanta la Calculadora GEAM en local: backend y base en Docker, frontend en el puerto 8081.

.DESCRIPTION
    1. Si la API ya contesta en http://localhost:3000/api/nodos, no toca Docker.
       Si no contesta, levanta los servicios db y backend con docker compose y espera a
       que la API responda.
    2. Sirve el frontend en http://127.0.0.1:<Puerto> y abre el navegador.

    El servidor solo entrega los archivos del frontend (index.html, css, js, img, favicon)
    y la referencia de diseno de docs/diseno. Cualquier otra ruta devuelve 404: servir la
    raiz entera, como hace python -m http.server, expondria .env y backend/.env, que
    llevan las credenciales.

    Todas las respuestas van con Cache-Control: no-store. El ciclo del Contramaestre cambia
    estos archivos entre vueltas, y sin eso el navegador ensenaria una version vieja.

    Ctrl+C detiene el frontend. El backend se queda arriba a proposito, porque el ciclo lo
    usa para sus pruebas. Para pararlo: docker compose stop

.PARAMETER Puerto
    Puerto del frontend. Por defecto 8081.

.PARAMETER SinNavegador
    No abre el navegador.

.PARAMETER SinBackend
    No comprueba ni toca el backend. Para cuando corre por otro lado.

.EXAMPLE
    .\calculadora.ps1

.EXAMPLE
    .\calculadora.ps1 -Puerto 8082 -SinNavegador
#>
[CmdletBinding()]
param(
    [ValidateRange(1024, 65535)]
    [int]$Puerto = 8081,
    [switch]$SinNavegador,
    [switch]$SinBackend
)

$raiz = $PSScriptRoot
$urlApi = 'http://localhost:3000/api/nodos'
$esperaApiSeg = 90
$esperaFrontendSeg = 15

function Escribir-Paso([string]$texto) { Write-Host "-> $texto" -ForegroundColor Cyan }
function Salir-ConError([string]$texto) { Write-Host "ERROR: $texto" -ForegroundColor Red; exit 1 }

function Probar-Api {
    try {
        $respuesta = Invoke-WebRequest -Uri $urlApi -UseBasicParsing -TimeoutSec 3
        return ($respuesta.StatusCode -eq 200)
    } catch {
        # Mientras el backend arranca, la conexion se rechaza: es lo esperado, no un fallo.
        return $false
    }
}

function Esperar-Puerto([int]$numero, [int]$segundos) {
    $limite = (Get-Date).AddSeconds($segundos)
    while ((Get-Date) -lt $limite) {
        if (Get-NetTCPConnection -LocalPort $numero -State Listen -ErrorAction SilentlyContinue) { return $true }
        Start-Sleep -Milliseconds 300
    }
    return $false
}

# --- 1. Backend ---------------------------------------------------------------
if ($SinBackend) {
    Escribir-Paso 'Backend: omitido por -SinBackend'
} elseif (Probar-Api) {
    Escribir-Paso "Backend: ya contesta en $urlApi"
} else {
    Escribir-Paso 'Backend: no contesta, compruebo Docker'
    docker info 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { Salir-ConError 'Docker no responde. Abre Docker Desktop y vuelve a lanzar.' }

    # --no-recreate: si los contenedores existen, solo los arranca. Nunca los rehace,
    # que reiniciaria el backend en mitad de una prueba del ciclo.
    Escribir-Paso 'Backend: levantando db y backend con docker compose'
    Push-Location $raiz
    try {
        docker compose up -d --no-recreate db backend
        $codigoCompose = $LASTEXITCODE
    } finally {
        Pop-Location
    }
    if ($codigoCompose -ne 0) { Salir-ConError 'docker compose up fallo. Revisa la salida de arriba.' }

    Escribir-Paso "Backend: esperando a la API (hasta $esperaApiSeg s)"
    $limite = (Get-Date).AddSeconds($esperaApiSeg)
    $lista = $false
    while ((Get-Date) -lt $limite) {
        if (Probar-Api) { $lista = $true; break }
        Start-Sleep -Seconds 2
    }
    if (-not $lista) { Salir-ConError "La API no contesto en $esperaApiSeg s. Mira: docker compose logs backend" }
    Escribir-Paso 'Backend: listo'
}

# --- 2. Frontend --------------------------------------------------------------
$ocupado = Get-NetTCPConnection -LocalPort $Puerto -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($ocupado) {
    $dueno = Get-Process -Id $ocupado.OwningProcess -ErrorAction SilentlyContinue
    Salir-ConError "El puerto $Puerto ya esta ocupado por $($dueno.ProcessName) (PID $($ocupado.OwningProcess)). Usa -Puerto con otro numero."
}

$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) { Salir-ConError 'No encuentro python en el PATH.' }

$codigoServidor = @'
import functools, http.server, posixpath, sys, urllib.parse

PERMITIDOS = ('/index.html', '/favicon.ico', '/css/', '/js/', '/img/', '/docs/diseno/')

class SoloFrontend(http.server.SimpleHTTPRequestHandler):
    def _permitido(self):
        ruta = urllib.parse.urlsplit(self.path).path
        ruta = posixpath.normpath(urllib.parse.unquote(ruta))
        if ruta in ('/', '/.'):
            return True
        return any(ruta == p or (p.endswith('/') and ruta.startswith(p)) for p in PERMITIDOS)

    def do_GET(self):
        if not self._permitido():
            self.send_error(404)
            return
        super().do_GET()

    def do_HEAD(self):
        if not self._permitido():
            self.send_error(404)
            return
        super().do_HEAD()

    def list_directory(self, path):
        self.send_error(404)
        return None

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_request(self, code='-', size='-'):
        # Solo se registran los fallos: una linea por archivo servido tapa lo que importa.
        if str(code).isdigit() and int(code) >= 400:
            super().log_request(code, size)

def main():
    puerto, raiz = int(sys.argv[1]), sys.argv[2]
    manejador = functools.partial(SoloFrontend, directory=raiz)
    with http.server.ThreadingHTTPServer(('127.0.0.1', puerto), manejador) as servidor:
        try:
            servidor.serve_forever()
        except KeyboardInterrupt:
            pass

main()
'@

$archivoServidor = Join-Path ([IO.Path]::GetTempPath()) "calculadora-geam-servidor-$PID.py"
[IO.File]::WriteAllText($archivoServidor, $codigoServidor, (New-Object Text.UTF8Encoding($false)))

$url = "http://127.0.0.1:$Puerto/"
$proceso = $null
try {
    Escribir-Paso "Frontend: sirviendo $raiz"
    $proceso = Start-Process -FilePath $python.Source `
        -ArgumentList "`"$archivoServidor`"", $Puerto, "`"$raiz`"" `
        -NoNewWindow -PassThru

    if (-not (Esperar-Puerto $Puerto $esperaFrontendSeg)) {
        Salir-ConError "El servidor del frontend no abrio el puerto $Puerto en $esperaFrontendSeg s."
    }

    Write-Host ''
    Write-Host "  Calculadora             $url" -ForegroundColor Green
    Write-Host "  Referencia de diseno    ${url}docs/diseno/referencia.html"
    Write-Host '  Ctrl+C detiene el frontend. El backend sigue arriba.'
    Write-Host ''

    if (-not $SinNavegador) { Start-Process $url }

    Wait-Process -Id $proceso.Id
} finally {
    if ($proceso -and -not $proceso.HasExited) { Stop-Process -Id $proceso.Id -Force -ErrorAction SilentlyContinue }
    Remove-Item -LiteralPath $archivoServidor -Force -ErrorAction SilentlyContinue
    Write-Host '-> Frontend detenido. El backend sigue arriba; para pararlo: docker compose stop' -ForegroundColor Cyan
}
