CREATE TABLE `game_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` text NOT NULL,
	`seq` integer NOT NULL,
	`type` text NOT NULL,
	`player` text,
	`data` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `games` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'waiting' NOT NULL,
	`player1_id` text NOT NULL,
	`player1_name` text DEFAULT 'Player 1' NOT NULL,
	`player2_id` text,
	`player2_name` text,
	`dice` text,
	`p1_lives` integer DEFAULT 3 NOT NULL,
	`p2_lives` integer DEFAULT 3 NOT NULL,
	`current_claim` text,
	`original_caller` text,
	`turn_player` text,
	`round_phase` text,
	`round_number` integer DEFAULT 1 NOT NULL,
	`winner` text,
	`challenge_result` text,
	`challenge_acks` text DEFAULT '[]' NOT NULL,
	`round_end_acks` text DEFAULT '[]' NOT NULL,
	`cpu_player` text,
	`created_at` text NOT NULL
);
