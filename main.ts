/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { start } from "$fresh/server.ts";
import manifest from "./fresh.gen.ts";

import twindPlugin from "$fresh/plugins/twind.ts";
import twindConfig from "./twind.config.ts";

import { connectToDb } from './db.ts';
import { config } from "https://deno.land/x/dotenv@v3.2.2/mod.ts";
import * as log from "https://deno.land/std@0.183.0/log/mod.ts";
import { setupBotClient } from "./bot-client.ts";

const env = config();

const username = env["BSKY_USERNAME"];
if (!username) {
    throw new Error("BSKY_USERNAME not set");
}
const password = env["BSKY_PASSWORD"];
if (!password) {
    throw new Error("BSKY_PASSWORD not set");
}

await connectToDb();
await setupBotClient();

log.info("Running in env", env.ENV)

await start(manifest, { plugins: [twindPlugin(twindConfig)] });
