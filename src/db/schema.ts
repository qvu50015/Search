// db/schema.ts
import { relations } from 'drizzle-orm';
import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  vector,
  index,
  pgEnum,
  boolean,
} from 'drizzle-orm/pg-core';



export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [index('session_userId_idx').on(table.userId)],
);

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('account_userId_idx').on(table.userId)],
);

export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)],
);

//APP TABLES


export const indexStatus = pgEnum('index_status', [
  'pending',
  'running',
  'complete',
  'failed',
]);

export const repos = pgTable(
  'repos',
  {
    // GitHub's "owner/name" — naturally unique, human-readable
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    defaultBranch: text('default_branch').notNull(),
    lastIndexedSha: text('last_indexed_sha'),
    status: indexStatus('status').notNull().default('pending'),
    chunksCount: integer('chunks_count').notNull().default(0),
    error: text('error'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('repos_user_id_idx').on(table.userId),
    index('repos_status_idx').on(table.status),
  ],
);

export const chunks = pgTable(
  'chunks',
  {
    id: serial('id').primaryKey(),
    repoId: text('repo_id')
      .notNull()
      .references(() => repos.id, { onDelete: 'cascade' }),
    filePath: text('file_path').notNull(),      // "src/auth/session.ts"
    startLine: integer('start_line').notNull(), // 1-indexed, inclusive
    endLine: integer('end_line').notNull(),     // 1-indexed, inclusive
    code: text('code').notNull(),               // raw source of this chunk
    // Dimension MUST match embedding model output.
    // text-embedding-3-small = 1536. Changing this requires re-embedding everything.
    embedding: vector('embedding', { dimensions: 1536 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    // HNSW index for fast cosine-similarity search.
    // Must match the operator used in queries (<=> for cosine).
    index('chunks_embedding_idx').using(
      'hnsw',
      table.embedding.op('vector_cosine_ops'),
    ),
    // Speeds up the repoId filter that precedes every vector search.
    index('chunks_repo_id_idx').on(table.repoId),
  ],
);

// ─────────────────────────────────────────────────────────────
// RELATIONS

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  repos: many(repos),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const reposRelations = relations(repos, ({ one, many }) => ({
  user: one(user, {
    fields: [repos.userId],
    references: [user.id],
  }),
  chunks: many(chunks),
}));

export const chunksRelations = relations(chunks, ({ one }) => ({
  repo: one(repos, {
    fields: [chunks.repoId],
    references: [repos.id],
  }),
}));

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export type User = typeof user.$inferSelect;
export type Session = typeof session.$inferSelect;
export type Account = typeof account.$inferSelect;
export type Repo = typeof repos.$inferSelect;
export type NewRepo = typeof repos.$inferInsert;
export type Chunk = typeof chunks.$inferSelect;
export type NewChunk = typeof chunks.$inferInsert;