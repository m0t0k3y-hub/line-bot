CREATE TABLE "daily_usage" (
	"chat_id" uuid NOT NULL,
	"date" date NOT NULL,
	"reply_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "daily_usage_chat_id_date_pk" PRIMARY KEY("chat_id","date")
);
--> statement-breakpoint
ALTER TABLE "daily_usage" ADD CONSTRAINT "daily_usage_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;