import { Bot } from "./bot.ts";
import { getDbClient } from './db.ts';
import { default as Agent } from "https://esm.sh/v115/@atproto/api@0.2.3"
import TTL from "https://deno.land/x/ttl@1.0.1/mod.ts";
import { getConfig } from "./config.ts";
import { MockBsky } from "./mock-bsky.ts";

let bot: Bot | undefined;

interface SetupBotSettings {
    host: string;
    username: string;
    password: string;
}

export async function setupBotClient(settings: SetupBotSettings) {
    if (getConfig('ENV') === 'dev') {
        const mock = new MockBsky();
        mock.listen(8002);
        return;
    }
    const { host, username, password } = settings;
    bot = new Bot({
        username,
        password,
        dbClient: getDbClient(),
        postUriCache: new TTL(1000 * 60 * 60 * 24)
    });
    await bot.setupAgent(new Agent({ service: host }));
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