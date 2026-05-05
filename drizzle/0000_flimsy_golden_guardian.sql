CREATE TABLE `game_moves` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` text NOT NULL,
	`seq` integer NOT NULL,
	`type` text NOT NULL,
	`player` integer,
	`data` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `games` (
	`id` text PRIMARY KEY NOT NULL,
	`players` text DEFAULT '[]' NOT NULL,
	`starting_lives` integer DEFAULT 5 NOT NULL,
	`winner` text,
	`created_at` text NOT NULL
);
