# Sempai Clash

Browser TCG narrativo con cliente Vite/Phaser y backend Fastify/WebSocket.

## Stack

- Cliente: Vite 4, TypeScript, Phaser 3.
- Backend: Node.js, TypeScript, Fastify 4, `@fastify/websocket`, `@fastify/jwt`, Argon2.
- Motor compartido: paquetes locales `@tcg/shared` y `@tcg/game-engine`.
- Persistencia local: JSON atomico en `apps/server/data/db.json` o en `STORE_DB_PATH`.

## Instalacion

```bash
cd apps/server
npm install

cd ../client
npm install
```

## Ejecucion local

Backend:

```bash
cd apps/server
npm run dev
```

Cliente:

```bash
cd apps/client
npm run dev
```

Por defecto el backend escucha en `http://127.0.0.1:3002` y el cliente Vite en `http://127.0.0.1:8080` o el siguiente puerto libre.

Paginas principales:

- Usuario: `http://127.0.0.1:8080/auth.html`
- Builder: `http://127.0.0.1:8080/build.html`
- Matchmaking: `http://127.0.0.1:8080/match.html`
- Battle: `http://127.0.0.1:8080/battle.html`
- Admin: `http://127.0.0.1:8080/admin.html`
- Wiki: `http://127.0.0.1:8080/wiki.html`

## Demo

Desde `auth.html`, el boton `Jugar demo sin cuenta` crea una sesion temporal con usuario y mazo pre-armado.

Tambien se pueden generar usuarios demo persistentes:

```bash
cd apps/server
npm run seed:demo
```

Credenciales por defecto:

- Usuarios: `demo01` a `demo10`
- Password: `demo1234`

Variables opcionales:

```bash
set DEMO_USER_COUNT=20
set DEMO_PASSWORD=otra-password
npm run seed:demo
```

## Admin

Credenciales locales por defecto:

- Usuario: `admin`
- Password: `admin1234`

En produccion configurar:

```bash
ADMIN_USERNAME=...
ADMIN_PASSWORD=...
JWT_SECRET=...
STORE_DB_PATH=./data/db.json
```

El admin permite gestionar cartas, CSV, usuarios, medios, UI/FX, Wiki y decks pre-armados. Las ediciones de cartas se guardan como overrides persistentes en la base JSON.

## Tests

```bash
cd apps/server
npm test
npm run test:smoke
npm run test:e2e:publication
npm run balance:playtest

cd ../client
npm run build
```

`test:e2e:publication` requiere un backend corriendo. Se puede apuntar a otro host:

```bash
set E2E_BASE_URL=http://127.0.0.1:3014
npm run test:e2e:publication
```

## Backup

La persistencia operativa esta en `apps/server/data/db.json` salvo que `STORE_DB_PATH` apunte a otro archivo.

Backup manual en PowerShell:

```powershell
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
Copy-Item apps/server/data/db.json "apps/server/data/db-$stamp.backup.json"
```

Restore:

```powershell
Copy-Item apps/server/data/db-YYYYMMDD-HHMMSS.backup.json apps/server/data/db.json -Force
```

Recomendacion operativa:

- Hacer backup antes de importar CSV masivo.
- Hacer backup antes de actualizar servidor o redeployar RenderLite.
- No commitear `data/db.json`; contiene usuarios, hashes, medios base64 y configuracion admin.
- Para mover la app a otra maquina, copiar `data/db.json` junto con el repo instalado.

## Publicacion

Para exponer en red local:

- Backend: escuchar en `0.0.0.0`.
- Cliente: usar `window.location.origin` para API.
- WebSocket: usar `ws(s)://window.location.host/ws`.

El proxy de Vite ya enruta `/auth`, `/decks`, `/cards`, `/admin`, `/cpu-match`, `/ui-settings`, `/wiki-content`, `/prebuilt-decks`, `/health` y `/ws`.

### Panel de servidor Windows

Desde la carpeta raiz `C:\sempai-clash`, abrir:

```text
SempaiClash-Servidor.cmd
```

El panel permite:

- Encender, apagar o reiniciar backend y cliente.
- Abrir el juego o el admin panel.
- Copiar el enlace de juego accesible en la red local.
- Revisar logs y generar un backup de `data/db.json`.

El enlace copiado sirve para registro/login, builder, partidas online por lobby o matchmaking y partidas contra CPU, siempre que los jugadores esten en la misma red y Windows Firewall permita el puerto `8080`.

Para compartir el juego fuera de la red local se necesita publicar la aplicacion o utilizar un tunel HTTPS/WebSocket seguro; el panel no abre puertos del router ni crea exposicion publica por si solo.

## Android APK

La app Android vive en `apps/android` y abre Senpai Clash dentro de un WebView con soporte para sesion local, JavaScript y WebSocket. Como el juego depende del backend, la APK necesita una URL accesible que sirva el cliente web y sus rutas proxy.

Para probar desde un telefono en la misma red:

```bash
cd apps/server
npm run dev

cd ../client
npm run dev
```

Instalar el APK y, en `Servidor`, ingresar la IP de la computadora:

```text
http://192.168.1.20:8080/auth.html
```

Reemplazar `192.168.1.20` por la IP local real. En el emulador Android, la URL predeterminada es `http://10.0.2.2:8080/auth.html`. Para un despliegue fuera de la red local, configurar una URL `https://` que exponga tambien el WebSocket seguro (`wss://`).

Build debug instalable:

```powershell
cd apps/android
.\gradlew.bat assembleDebug
```

Salida:

```text
apps/android/app/build/outputs/apk/debug/app-debug.apk
```
