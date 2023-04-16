import { assertEquals } from "https://deno.land/std@0.183.0/testing/asserts.ts";
import { Bot } from "./bot.ts";
import { default as Agent, AppBskyNotificationListNotifications } from "https://esm.sh/v115/@atproto/api@0.2.3"
import notificationsFixture from './fixtures/notifications.json' assert { type: "json" };
import questionsFixture from './fixtures/questions.json' assert { type: "json" };
import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

function fakeAgent(): Agent {
    return {
        login: () => { },
        api: {
            app: {
                bsky: {
                    notification: {
                        listNotifications: (_params?: AppBskyNotificationListNotifications.QueryParams | undefined, _opts?: AppBskyNotificationListNotifications.CallOptions | undefined): Promise<AppBskyNotificationListNotifications.Response> => {
                            return Promise.resolve(notificationsFixture);
                        }
                    }
                }
            }
        }
    } as unknown as Agent
}

function setup(): Bot {
    const bot = new Bot({ username: "bottestaccount.bsky.social", password: "password", dbClient: {} as Client });
    const agent = fakeAgent();
    bot.setupAgent(agent);
    return bot;
}

Deno.test("filters notifications", async () => {
    const bot = await setup();
    const notifs = await bot.getNotifications();
    assertEquals(notifs.length, 1)
})

Deno.test("parses notifications", () => {
    const bot = setup();
    for (const question of questionsFixture) {
        const parsed = bot.parseNotification(question.text);
        assertEquals(parsed.question, question.question);
        for (const [index, answer] of question.answers.entries()) {
            assertEquals(parsed.answers[index], answer);
        }
    }
})