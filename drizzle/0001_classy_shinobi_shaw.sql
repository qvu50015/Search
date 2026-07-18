CREATE EXTENSION IF NOT EXISTS vector;
CREATE TYPE "public"."index_status" AS ENUM('pending', 'running', 'complete', 'failed');--> statement-breakpoint
CREATE TABLE "chunks" (
	"id" serial PRIMARY KEY NOT NULL,
	"repo_id" text NOT NULL,
	"file_path" text NOT NULL,
	"start_line" integer NOT NULL,
	"end_line" integer NOT NULL,
	"code" text NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repos" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"default_branch" text NOT NULL,
	"last_indexed_sha" text,
	"status" "index_status" DEFAULT 'pending' NOT NULL,
	"chunks_count" integer DEFAULT 0 NOT NULL,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_repo_id_repos_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repos" ADD CONSTRAINT "repos_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chunks_embedding_idx" ON "chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "chunks_repo_id_idx" ON "chunks" USING btree ("repo_id");--> statement-breakpoint
CREATE INDEX "repos_user_id_idx" ON "repos" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "repos_status_idx" ON "repos" USING btree ("status");