CREATE TABLE IF NOT EXISTS "skills" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "enabled" boolean DEFAULT true NOT NULL,
  "category" text,
  "version" text,
  "author" text,
  "node_ids" text DEFAULT '[]' NOT NULL,
  "config" text DEFAULT '{}' NOT NULL,
  "created_at" text NOT NULL,
  "updated_at" text NOT NULL
);
