/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { start } from "$fresh/server.ts";
import manifest from "./fresh.gen.ts";

import twindPlugin from "$fresh/plugins/twind.ts";
import twindConfig from "./twind.config.ts";

import { getClient, connectToDb } from './db.ts';
import { Bot } from "./bot/bot.ts";
import { default as Agent } from "https://esm.sh/v115/@atproto/api@0.2.3"
import { config } from "https://deno.land/x/dotenv@v3.2.2/mod.ts";
import * as log from "https://deno.land/std@0.183.0/log/mod.ts";
import TTL from "https://deno.land/x/ttl/mod.ts";

const env = config();

const username = env["BSKY_USERNAME"];
if (!username) {
    throw new Error("BSKY_USERNAME not set");
}
const password = env["BSKY_PASSWORD"];
if (!password) {
    throw new Error("BSKY_PASSWORD not set");
}

connectToDb();

log.info("Running in env", env.ENV)

if (env.ENV === "prod") {
    const bot = new Bot({
        username,
        password,
        dbClient: getClient(),
        postUriCache: new TTL(1000 * 60 * 60 * 24)
    });
    await bot.setupAgent(new Agent({ service: "https://bsky.social" }));

    setInterval(async () => {
        try {
            await bot.runJobs();
        } catch (e) {
            console.error(e);
        }
    }, 10 * 1000)
}

await start(manifest, { plugins: [twindPlugin(twindConfig)] });
