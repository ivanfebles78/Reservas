# Reservas

Aplicación web para registrar y seguir las reservas de calzado de los clientes de la tienda.

- **Alta de peticiones**: datos del cliente (nombre, teléfono, correo) y uno o varios zapatos por
  reserva (marca, modelo, color, niño/niña/unisex, talla, unidades y un campo libre de detalle).
- **Seguimiento**: tabla con todas las reservas, buscador, filtros y cambio de estado en línea.
- **Estados**: `solicitada` · `reservada` · `entregada` · `cancelada` · `caducada`.

## Stack

| Capa      | Tecnología                                            |
| --------- | ----------------------------------------------------- |
| Cliente   | React 19 + Vite + TypeScript + Tailwind CSS 4          |
| Servidor  | Node 20+ · Express 5 · Zod                             |
| Datos     | PostgreSQL (driver `pg`, SQL propio, sin ORM)          |
| Pruebas   | Vitest + Supertest (unitarias y de integración)        |
| Despliegue| Railway (un único servicio: el API sirve el build web) |

## Puesta en marcha en local

```bash
# 1. Base de datos (o usa tu propio PostgreSQL)
docker compose up -d

# 2. Variables de entorno
cp .env.example .env

# 3. Dependencias
npm install

# 4. Arranque en modo desarrollo (API en :3001, web en :3000)
npm run dev
```

> El servidor de Vite usa el puerto 3000 en vez del 5173 por defecto: en Windows, 5173 suele caer
> dentro de los rangos que Hyper-V/WSL reservan y falla con `EACCES`. Cámbialo con `VITE_PORT`
> en el `.env` si te hace falta (`netsh interface ipv4 show excludedportrange protocol=tcp`
> lista los rangos ocupados).

El esquema se aplica solo al arrancar el servidor. Para aplicarlo a mano: `npm run migrate`.

Para probar el modo producción tal cual se ejecuta en Railway:

```bash
npm run build && npm start
```

## Pruebas

```bash
npm test              # suite completa
npm run test:coverage # con informe de cobertura
```

Las pruebas del repositorio necesitan un PostgreSQL real. Se ejecutan solo si defines
`TEST_DATABASE_URL` en el `.env`; si no está, se saltan y el resto de la suite sigue pasando.

```bash
# base de datos de pruebas sobre el contenedor de docker compose
docker exec reservas-db createdb -U reservas reservas_test
```

## Despliegue en Railway

1. **New Project → Deploy from GitHub repo** y elige `ivanfebles78/Reservas`.
2. **New → Database → Add PostgreSQL** dentro del mismo proyecto.
3. En el servicio de la app, pestaña **Variables**, añade:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (referencia al servicio Postgres).
   - `CLIENT_ORIGIN` no hace falta: el API y la web se sirven desde el mismo dominio.
4. Railway detecta el `Dockerfile` (`railway.json` lo fija explícitamente) y publica el servicio.
   El healthcheck apunta a `/api/health`.

No hay paso de migración manual: al arrancar, el servidor aplica `server/src/db/schema.sql`, que es
idempotente.

## API

| Método   | Ruta                            | Descripción                                     |
| -------- | ------------------------------- | ----------------------------------------------- |
| `GET`    | `/api/health`                   | Comprobación de vida (healthcheck de Railway).   |
| `GET`    | `/api/meta`                     | Catálogo de estados y públicos.                  |
| `GET`    | `/api/reservations`             | Lista con `status`, `q`, `limit` y `offset`.     |
| `GET`    | `/api/reservations/:id`         | Una reserva con sus zapatos.                     |
| `POST`   | `/api/reservations`             | Crea la reserva (estado inicial `solicitada`).   |
| `PUT`    | `/api/reservations/:id`         | Reemplaza los datos y los zapatos.               |
| `PATCH`  | `/api/reservations/:id/status`  | Cambia solo el estado.                           |
| `DELETE` | `/api/reservations/:id`         | Elimina la reserva y sus zapatos (en cascada).   |

Respuesta correcta: `{ "ok": true, "data": ..., "meta": ... }`.
Respuesta con error: `{ "ok": false, "error": "...", "fields": { "email": "..." } }`.

## Estructura

```
client/                 React + Vite
  src/api/              cliente HTTP y tipos compartidos
  src/components/       Layout, Field, ShoeFields, ReservationRow
  src/pages/            NuevaReserva, Reservas
server/
  src/domain/           constantes y validación (Zod)
  src/repositories/     acceso a PostgreSQL
  src/routes/           rutas Express
  src/db/               pool, esquema SQL y migración
  tests/                unitarias, de rutas y de integración
```

## Notas

- El estado `caducada` se marca a mano desde la tabla; no hay caducidad automática por fecha.
- Cada reserva recibe una referencia legible correlativa (`R-0001`, `R-0002`, …).
- Las escrituras del API están limitadas a 60 peticiones por minuto y por IP.
