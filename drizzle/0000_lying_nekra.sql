CREATE TABLE `creators` (
	`id` text PRIMARY KEY NOT NULL,
	`login` text NOT NULL,
	`name` text NOT NULL,
	`avatar` text DEFAULT '' NOT NULL,
	`demo` integer DEFAULT 0 NOT NULL,
	`access` text,
	`refresh` text,
	`expires` integer,
	`validated` integer
);
--> statement-breakpoint
CREATE TABLE `entries` (
	`id` text PRIMARY KEY NOT NULL,
	`roundId` text NOT NULL,
	`guest` text NOT NULL,
	`nickname` text NOT NULL,
	`mode` text NOT NULL,
	`headline` text NOT NULL,
	`detail` text NOT NULL,
	`fingerprint` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`synthetic` integer DEFAULT 0 NOT NULL,
	`suggested` integer DEFAULT 0 NOT NULL,
	`reason` text,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `round_fingerprint` ON `entries` (`roundId`,`fingerprint`);--> statement-breakpoint
CREATE INDEX `entry_round` ON `entries` (`roundId`);--> statement-breakpoint
CREATE TABLE `limits` (
	`id` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rounds` (
	`id` text PRIMARY KEY NOT NULL,
	`creatorId` text NOT NULL,
	`title` text NOT NULL,
	`context` text NOT NULL,
	`clipType` text NOT NULL,
	`clipUrl` text NOT NULL,
	`mode` text NOT NULL,
	`duration` integer NOT NULL,
	`limit` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created` integer NOT NULL,
	`ends` integer,
	`remaining` integer,
	`overlayToken` text NOT NULL,
	`revealId` text,
	`winnerId` text,
	`shortlistSource` text,
	`shortlistNote` text,
	`aiCalls` integer DEFAULT 0 NOT NULL,
	`aiLock` integer DEFAULT 0 NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `round_owner` ON `rounds` (`creatorId`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`creatorId` text NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `uploads` (
	`id` text PRIMARY KEY NOT NULL,
	`creatorId` text NOT NULL,
	`type` text NOT NULL,
	`created` integer NOT NULL
);
