import { config } from "https://deno.land/x/dotenv@v3.2.2/mod.ts";
import { Bot } from "./bot/bot.ts";
import { getDbClient, connectToDb } from './db.ts';
import { default as Agent } from "https://esm.sh/v115/@atproto/api@0.2.3"
import TTL from "https://deno.land/x/ttl/mod.ts";
import * as log from "https://deno.land/std@0.183.0/log/mod.ts";

const env = config();

let bot: Bot | undefined;

export async function setupBotClient() {
    if (env.ENV !== "prod") {
        log.info("Skipping bot initialization, not in prod");
        return;
    }
    const username = env["BSKY_USERNAME"];
    if (!username) {
        throw new Error("BSKY_USERNAME not set");
    }
    const password = env["BSKY_PASSWORD"];
    if (!password) {
        throw new Error("BSKY_PASSWORD not set");
    }
    bot = new Bot({
        username,
        password,
        dbClient: getDbClient(),
        postUriCache: new TTL(1000 * 60 * 60 * 24)
    });
    await bot.setupAgent(new Agent({ service: "https://bsky.social" }));
    setInterval(async () => {
        try {
            await bot?.runJobs();
        } catch (e) {
            console.error(e);
        }
    }, 10 * 1000)
    return bot;
}

export function getBotClient(): Bot | undefined {
    return bot;
}