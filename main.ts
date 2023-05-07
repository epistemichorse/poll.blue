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

log.info("env", env);

log.info("Running in env", env.ENV)

await connectToDb();
await setupBotClient();

await start(manifest, { plugins: [twindPlugin(twindConfig)] });
