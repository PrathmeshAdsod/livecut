import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";
export const creators = sqliteTable("creators", {
  id: text().primaryKey(),
  login: text().notNull(),
  name: text().notNull(),
  avatar: text().notNull().default(""),
  demo: integer().notNull().default(0),
  access: text(),
  refresh: text(),
  expires: integer(),
  validated: integer(),
});
export const sessions = sqliteTable("sessions", {
  id: text().primaryKey(),
  creatorId: text().notNull(),
  expires: integer().notNull(),
});
export const rounds = sqliteTable(
  "rounds",
  {
    id: text().primaryKey(),
    creatorId: text().notNull(),
    title: text().notNull(),
    context: text().notNull(),
    clipType: text().notNull(),
    clipUrl: text().notNull(),
    mode: text().notNull(),
    duration: integer().notNull(),
    limit: integer().notNull(),
    status: text().notNull().default("draft"),
    created: integer().notNull(),
    ends: integer(),
    remaining: integer(),
    overlayToken: text().notNull(),
    revealId: text(),
    winnerId: text(),
    shortlistSource: text(),
    shortlistNote: text(),
    aiCalls: integer().notNull().default(0),
    aiLock: integer().notNull().default(0),
    revision: integer().notNull().default(0),
  },
  (t) => [index("round_owner").on(t.creatorId)],
);
export const entries = sqliteTable(
  "entries",
  {
    id: text().primaryKey(),
    roundId: text().notNull(),
    guest: text().notNull(),
    nickname: text().notNull(),
    mode: text().notNull(),
    headline: text().notNull(),
    detail: text().notNull(),
    fingerprint: text().notNull(),
    status: text().notNull().default("pending"),
    synthetic: integer().notNull().default(0),
    suggested: integer().notNull().default(0),
    reason: text(),
    created: integer().notNull(),
  },
  (t) => [
    uniqueIndex("round_fingerprint").on(t.roundId, t.fingerprint),
    index("entry_round").on(t.roundId),
  ],
);
export const limits = sqliteTable("limits", {
  id: text().primaryKey(),
  count: integer().notNull(),
  expires: integer().notNull(),
});
export const uploads = sqliteTable("uploads", {
  id: text().primaryKey(),
  creatorId: text().notNull(),
  type: text().notNull(),
  created: integer().notNull(),
});
