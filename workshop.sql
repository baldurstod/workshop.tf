CREATE TABLE published_files (
	id SERIAL,
	publishedfileid TEXT PRIMARY KEY,
	creator TEXT NOT NULL,
	title TEXT NOT NULL,
	time_created BIGINT NOT NULL,
	time_updated BIGINT NOT NULL,
	tags text[] NOT NULL,
	file_size BIGINT NOT NULL,
	file_url TEXT NOT NULL,
	preview_url TEXT NOT NULL,
	subscriptions BIGINT NOT NULL,
	creator_appid BIGINT NOT NULL,
	consumer_appid BIGINT NOT NULL,
	disabled BOOLEAN DEFAULT false,
	detail JSONB NOT NULL
);

CREATE TABLE uploaded_files (
	id SERIAL,
	publishedfileid TEXT PRIMARY KEY,
	style INTEGER NOT NULL,
	time_uploaded TIMESTAMPTZ NOT NULL,
	time_updated TIMESTAMPTZ NOT NULL
);
