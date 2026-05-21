# Sprint de publicacion browser

Fecha: 2026-05-20

## Alcance

- QA desktop/mobile con capturas.
- E2E login -> builder -> match -> battle -> rematch.
- Modo demo sin cuenta y usuarios seed.
- Documentacion de instalacion, operacion y backup.
- Evaluacion general de sprints previos.

## Cambios implementados

- `POST /auth/demo`: crea usuario temporal, mazo pre-armado activo y devuelve JWT.
- Boton `Jugar demo sin cuenta` en `auth.html`.
- `npm run seed:demo`: crea `demo01` a `demo10` con password `demo1234` y mazos activos.
- `npm run test:e2e:publication`: cubre registro, login, `auth/me`, builder por deck pre-armado, CPU match, rejoin por WebSocket, accion de batalla, rematch y sesion demo.
- Ajuste responsive del HUD de batalla mobile: encabezado, botones, panel de objetivo, campo y mano ya no se pisan en 390 px.
- README actualizado con instalacion, operacion, demo, tests y backup/restore de `data/db.json`.

## Evidencia QA

Capturas guardadas:

- `docs/qa/publication-auth-desktop.png`
- `docs/qa/publication-auth-mobile.png`
- `docs/qa/publication-match-desktop.png`
- `docs/qa/publication-match-mobile.png`
- `docs/qa/publication-battle-desktop.png`
- `docs/qa/publication-battle-mobile.png`

Resultados automatizados:

- Server build: OK
- Client build: OK
- `npm test`: OK
- `npm run test:smoke`: OK contra backend temporal `3014`
- `npm run test:e2e:publication`: OK contra backend temporal `3014`
- `npm run balance:playtest`: OK, sin finales tempranos reportados
- `npm run seed:demo`: OK con 10 usuarios en DB temporal

## Evaluacion general de sprints

### Fundacion tecnica

Estado: correcto.

El proyecto tiene separacion clara entre cliente, servidor, tipos compartidos y motor de reglas. Fastify/WS y Phaser/Vite compilan. La escucha en `0.0.0.0` y los URLs dinamicos permiten correr por proxy local.

Riesgo restante: el bundle de `BattleScene` supera 500 KB minificado. No bloquea publicacion local, pero conviene dividir carga Phaser/battle en otro sprint de performance.

### Persistencia y admin

Estado: correcto.

`MemoryStore` persiste usuarios, decks, UI/FX, medios, Wiki, decks pre-armados y overrides de cartas. La escritura atomica reduce riesgo de JSON corrupto. El admin valida CSV antes de importar y muestra auditoria visual.

Riesgo restante: `data/db.json` puede crecer rapido si se suben muchos medios en base64. Para uso publico sostenido conviene migrar media a archivos o storage externo.

### Contenido/cartas/reglas

Estado: correcto para beta browser.

El catalogo audita 369 cartas sin errores ni advertencias. El motor impide retirar cartas de turnos anteriores, resuelve efectos, aplica bloqueos y checkpoints narrativos. El playtest de balance no reporta finales tempranos.

Riesgo restante: muchas victorias siguen llegando por filler en varios arquetipos. No es bug bloqueante, pero merece balance fino de win conditions para que el evento final tenga mas peso.

### Builder/match/battle

Estado: correcto con correccion responsive aplicada.

Builder carga plantillas, guarda mazos, selecciona tema y habilita match. CPU match crea partida, WebSocket permite rejoin y batalla muestra campo, mano, log, efectos y acciones de cierre.

Riesgo restante: el boton Rematch actualmente vuelve a matchmaking o el E2E crea un nuevo CPU match por API. Un rematch directo desde pantalla final con los mismos parametros seria una mejora de UX.

### Publicacion browser

Estado: listo para prueba externa local.

Hay modo demo sin cuenta, seed users, documentacion de backup y E2E reproducible. Las capturas desktop/mobile quedan versionadas como evidencia del sprint.

Riesgo restante: falta pipeline CI real que ejecute build/test/e2e automaticamente antes de push o deploy.

## Recomendaciones siguientes

1. Crear rematch directo desde `BattleScene` para CPU y lobby, sin pasar por `match.html`.
2. Separar medios base64 de `db.json`.
3. Agregar CI local/remote que ejecute `build`, `test`, `test:e2e:publication` y `balance:playtest`.
4. Optimizar bundle Phaser con code splitting o carga diferida.
