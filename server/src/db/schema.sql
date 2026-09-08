-- Esquema de la aplicacion de reservas.
-- Es idempotente: se ejecuta en cada arranque y solo crea lo que falta.

CREATE TABLE IF NOT EXISTS reservations (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  seq           bigserial   NOT NULL UNIQUE,
  customer_name text        NOT NULL,
  phone         text        NOT NULL,
  email         text        NOT NULL,
  notes         text        NOT NULL DEFAULT '',
  status        text        NOT NULL DEFAULT 'solicitada'
                            CHECK (status IN ('solicitada', 'reservada', 'entregada', 'cancelada', 'caducada')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reservation_items (
  id             uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid    NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  position       integer NOT NULL,
  brand          text    NOT NULL,
  model          text    NOT NULL,
  color          text    NOT NULL,
  audience       text    NOT NULL CHECK (audience IN ('nino', 'nina', 'unisex')),
  size           text    NOT NULL,
  quantity       integer NOT NULL CHECK (quantity > 0),
  details        text    NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS reservation_items_reservation_id_idx
  ON reservation_items (reservation_id);

CREATE INDEX IF NOT EXISTS reservations_status_created_at_idx
  ON reservations (status, created_at DESC);

CREATE INDEX IF NOT EXISTS reservations_created_at_idx
  ON reservations (created_at DESC);
