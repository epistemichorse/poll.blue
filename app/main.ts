/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { start } from "$fresh/server.ts";
import manifest from "../fresh.gen.ts";

import twindPlugin from "$fresh/plugins/twind.ts";
import twindConfig from "../twind.config.ts";

import { connectToDb } from './db.ts';
import * as log from "https://deno.land/std@0.183.0/log/mod.ts";
import { setupBotClient } from "./bot-client.ts";
import { loadConfigFromEnv } from "./config.ts";

const config = await loadConfigFromEnv();

log.info("Running in env " + config.ENV)

await connectToDb({
    user: config.PG_USERNAME,
    password: config.PG_PASSWORD,
    database: config.PG_DATABASE,
    hostname: config.PG_HOST,
});

await setupBotClient({
    username: config.BSKY_USERNAME,
    password: config.BSKY_PASSWORD,
    host: config.BSKY_HOST,
});

await start(manifest, { plugins: [twindPlugin(twindConfig)] });
