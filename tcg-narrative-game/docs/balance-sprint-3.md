# Balance Sprint 3

## Objetivo de Experiencia

El jugador debe sentir que la partida se estructura como un episodio con tres actos:

- Inicio: ocupar slots, encontrar afinidades y preparar el primer evento.
- Medio: comparar tempo, sostener presion de Filler y decidir si acelerar o estabilizar.
- Final: cerrar por evento final o castigar al rival si dejo que el Filler se fuera de control.

## Hipotesis De Balance

Los valores actuales son puntos de partida para playtest, no valores definitivos.

| Variable | Valor | Rango objetivo | Razon |
| --- | ---: | ---: | --- |
| `INITIAL_HAND_SIZE` | 5 | 5-6 | Da opciones sin revelar todo el plan. |
| `CARDS_DRAWN_PER_TURN` | 2 | 1-2 | Mantiene flujo de mano para un TCG de slots fijos. |
| `STORY_POINTS_PER_TURN` | 2 | 1-3 | Asegura avance aunque el jugador no robe evento perfecto. |
| `STORY_POINTS_EVENT_COMPLETE` | 5 | 4-6 | Los eventos deben sentirse como avance de arco. |
| `FILLER_POINTS_EVENT_COMPLETE` | 2 | 1-2 | El evento presiona al rival sin decidir solo la partida. |
| `FILLER_BLOCK_THRESHOLD` | 14 | 12-16 | Filler debe ser amenaza de acto final, no derrota temprana. |

## Criterios De Salud

Una tanda normal de simulaciones deberia cumplir:

- Promedio de duracion por arquetipo: 10-18 turnos.
- Cierres antes del turno 8: excepcionales.
- Eventos completados por partida: al menos 1, idealmente 4+ sumando ambos jugadores.
- Razones de victoria: Filler puede existir, pero evento final debe aparecer en algunos arquetipos.
- Timeouts: no deberian dominar las simulaciones.

## Comando De Playtest

Desde `apps/server`:

```bash
npm run balance:playtest
```

Variables utiles:

```bash
BALANCE_GAMES_PER_ARCHETYPE=10
BALANCE_MAX_TURNS=36
BALANCE_DIFFICULTY=normal
```

## Resultado De Referencia

Con `BALANCE_GAMES_PER_ARCHETYPE=4`, dificultad `normal` y `FILLER_BLOCK_THRESHOLD=14`:

- Duracion media observada: 11-15.5 turnos segun arquetipo.
- Cierres tempranos: 0.
- Timeouts: 0.
- Eventos completados promedio: 4.25-8.5.
- Eventos finales aparecen en Slice of Life, Shojo, Harem, Spokon y parte de Harem Inverso.
- Filler sigue dominando Shonen, Mecha, Isekai, Survival Game y Kaiju; esos arquetipos necesitan ajuste fino de cartas/eventos en el siguiente pase.

## Proximo Pase

El siguiente sprint de balance deberia ajustar cartas por arquetipo, no subir/bajar solo constantes globales:

- Reducir Filler ofensivo en arquetipos que cierran casi siempre por Filler.
- Agregar mejores caminos hacia evento final en Shonen, Mecha, Isekai, Survival Game y Kaiju.
- Separar identidad: algunos arquetipos pueden ganar mas por Filler, pero no todos deberian hacerlo igual.
