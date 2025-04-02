import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Define the type for our environment bindings
export type Bindings = {
  DB: D1Database;
  ASSETS: KVNamespace;
};

// Schema for A/B tests
export const tests = sqliteTable("tests", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  variationA: text("variation_a").notNull(),
  variationB: text("variation_b").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// Schema for tracking views
export const views = sqliteTable("views", {
  id: text("id").primaryKey(),
  testId: text("test_id")
    .notNull()
    .references(() => tests.id),
  variation: text("variation").notNull(), // "A" or "B"
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// Types for our database schema
export type Test = typeof tests.$inferSelect & {
  embedCode?: string;
  embedUrl?: string;
  analyticsUrl?: string;
};
export type NewTest = typeof tests.$inferInsert;
export type View = typeof views.$inferSelect;
export type NewView = typeof views.$inferInsert; 