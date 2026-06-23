CREATE TABLE "daily_summaries" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"date" date NOT NULL,
	"total_calories" real DEFAULT 0 NOT NULL,
	"total_protein" real DEFAULT 0 NOT NULL,
	"total_fiber" real DEFAULT 0 NOT NULL,
	"total_carbs" real DEFAULT 0 NOT NULL,
	"total_fat" real DEFAULT 0 NOT NULL,
	"protein_gap" real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meals" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"image_url" text,
	"meal_type" varchar(32),
	"analysis_json" jsonb,
	"calories" real,
	"protein_g" real,
	"fiber_g" real,
	"carbs_g" real,
	"fat_g" real,
	"food_items" jsonb DEFAULT '[]'::jsonb,
	"portion_multiplier" real DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"glp1_drug" varchar(64),
	"dosage_stage" varchar(64),
	"weight_current" real,
	"weight_goal" real,
	"dietary_preferences" jsonb DEFAULT '[]'::jsonb,
	"protein_target" real DEFAULT 100 NOT NULL,
	"calorie_target" real DEFAULT 1800 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"device_id" varchar(128) NOT NULL,
	"name" text,
	"email" varchar(320),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_signed_in" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "daily_summaries" ADD CONSTRAINT "daily_summaries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meals" ADD CONSTRAINT "meals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "users_device_id_idx" ON "users" USING btree ("device_id");