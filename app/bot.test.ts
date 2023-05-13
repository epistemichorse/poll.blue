import { assertEquals } from "https://deno.land/std@0.183.0/testing/asserts.ts";
import { Bot, generatePollResultsText, DbPoll } from "./bot.ts";
import {
    default as Agent,
    AppBskyNotificationListNotifications,
    AppBskyFeedPost,
    ComAtprotoRepoCreateRecord
} from "https://esm.sh/v115/@atproto/api@0.2.3";
import notificationsFixture from './fixtures/notifications.json' assert { type: "json" };
import questionsFixture from './fixtures/questions.json' assert { type: "json" };
import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";
import {
    assertSpyCall,
    spy,
    Spy
} from "https://deno.land/std@0.177.0/testing/mock.ts";
import TTL from "https://deno.land/x/ttl@1.0.1/mod.ts";

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
                    },
                    feed: {
                        post: {
                            create: spy((_params: Omit<ComAtprotoRepoCreateRecord.InputSchema, 'collection' | 'record'>, _record: AppBskyFeedPost.Record, _headers?: Record<string, string>) => {
                                return;
                            }),
                            get: (params: { repo: string, rkey: string }) => {
                                const repos: Record<string, Record<string, any>> = {
                                    'did:plc:3rpxqcxyf5aqs3s7jpd36gbm': {
                                        '3jtjczuf2ls2s': {
                                            uri: 'at://test',
                                            cid: 'abcdef',
                                            value: {}
                                        }
                                    }
                                }
                                return repos[params.repo][params.rkey];
                            }
                        },
                        like: {
                            create: spy(() => {
                                return;
                            })
                        }
                    }
                }
            },
            com: {
                atproto: {
                    identity: {
                        resolveHandle: () => {
                            return {
                                data: {
                                    did: "did:plc:3rpxqcxyf5aqs3s7jpd36gbm"
                                }
                            }
                        }
                    }
                }
            }
        }
    } as unknown as Agent
}

function fakeDbClient(): Client {
    return {
        queryObject: () => {
            return {
                rows: []
            }
        }
    } as unknown as Client
}

async function setup(): Promise<Bot> {
    const bot = new Bot({
        username: "bottestaccount.bsky.social",
        password: "password",
        dbClient: fakeDbClient(),
        postUriCache: new Map() as unknown as TTL<boolean>
    });
    const agent = fakeAgent();
    await bot.setupAgent(agent);
    return bot;
}

function makeReplyRef(): AppBskyFeedPost.ReplyRef {
    return {
        parent: {
            cid: 'a',
            uri: 'at://did:plc:3rpxqcxyf5aqs3s7jpd36gbm/app.bsky.feed.post/3jtjczuf2ls2s',
        },
        root: {
            cid: 'c',
            uri: 'd',
        }
    }
}

Deno.test("filters notifications", async () => {
    const bot = await setup();
    const notifs = await bot.getNotifications();
    assertEquals(notifs.length, 1)
})

Deno.test("parses notifications", async () => {
    const bot = await setup();
    for (const question of questionsFixture) {
        const parsed = bot.parseNotification(question.text);
        assertEquals(parsed.question, question.question);
        for (const [index, answer] of question.answers.entries()) {
            assertEquals(parsed.answers[index], answer);
        }
    }
})

Deno.test("posts polls", async () => {
    const bot = await setup();
    const poll = {
        question: "Question",
        answers: ["Answer 1", "Answer 2", "Answer 3", "你好世界"]
    }
    const { visibleId: id, createdAt } = (await bot.postPoll({
        question: poll.question,
        answers: poll.answers,
        enumeration: 'lower',
    }, makeReplyRef(), 'epistemic.horse'))!;
    assertSpyCall(bot.Agent?.api.app.bsky.feed.post.create! as unknown as Spy, 0,
        {
            args: [
                { repo: undefined },
                {
                    text: `"Question" asked by @epistemic.horse. Vote below!\n\n🅰 Answer 1\n🅱 Answer 2\n🅲 Answer 3\n🅳 你好世界\n\n📊 Show results`,
                    reply: {
                        parent: {
                            cid: "a",
                            uri: 'at://did:plc:3rpxqcxyf5aqs3s7jpd36gbm/app.bsky.feed.post/3jtjczuf2ls2s'
                        },
                        root: {
                            cid: "c",
                            uri: "d"
                        }
                    },
                    facets: [
                        { index: { byteStart: 20, byteEnd: 36 }, features: [{ $type: "app.bsky.richtext.facet#link", uri: `https://staging.bsky.app/profile/epistemic.horse/post/3jtjczuf2ls2s` }] },
                        { index: { byteStart: 56, byteEnd: 64 }, features: [{ $type: "app.bsky.richtext.facet#link", uri: `https://poll.blue/p/${id}/1` }] },
                        { index: { byteStart: 70, byteEnd: 78 }, features: [{ $type: "app.bsky.richtext.facet#link", uri: `https://poll.blue/p/${id}/2` }] },
                        { index: { byteStart: 84, byteEnd: 92 }, features: [{ $type: "app.bsky.richtext.facet#link", uri: `https://poll.blue/p/${id}/3` }] },
                        { index: { byteStart: 98, byteEnd: 110 }, features: [{ $type: "app.bsky.richtext.facet#link", uri: `https://poll.blue/p/${id}/4` }] },
                        { index: { byteStart: 112, byteEnd: 129 }, features: [{ $type: "app.bsky.richtext.facet#link", uri: `https://poll.blue/p/${id}/0` }] },
                        { features: [{ "$type": "app.pollblue.poll.facet#question", },], index: { byteEnd: 10, byteStart: 0, }, },
                        { features: [{ "$type": "app.pollblue.poll.facet#option", number: 1, },], index: { byteEnd: 64, byteStart: 56, }, },
                        { features: [{ "$type": "app.pollblue.poll.facet#option", number: 2, },], index: { byteEnd: 78, byteStart: 70, }, },
                        { features: [{ "$type": "app.pollblue.poll.facet#option", number: 3, },], index: { byteEnd: 92, byteStart: 84, }, },
                        { features: [{ "$type": "app.pollblue.poll.facet#option", number: 4, },], index: { byteEnd: 110, byteStart: 98, }, },
                    ],
                    createdAt,
                }
            ]
        });
    assertSpyCall(bot.Agent?.api.app.bsky.feed.like.create! as unknown as Spy, 0, {});
})

Deno.test("truncates long polls", async () => {
    const bot = await setup();
    const poll = {
        question: Array.from({ length: 200 }).join("a"),
        answers: ["Answer 1", "Answer 2", "Answer 3", "你好世界"]
    }
    await bot.postPoll({
        question: poll.question,
        answers: poll.answers,
        enumeration: 'lower',
    }, makeReplyRef(), 'epistemic.horse');
    assertSpyCall(bot.Agent?.api.app.bsky.feed.post.create! as unknown as Spy, 0, {});
    assertSpyCall(bot.Agent?.api.app.bsky.feed.like.create! as unknown as Spy, 0, {});
})

Deno.test("creates poll results", () => {
    const text = generatePollResultsText({ question: 'test', answers: ["option 1", "option 2", "option 3", "option 4"], results: [90, 1, 2, 3, 7] } as DbPoll)
    const expected = `Poll results after 24 hours: test

1️⃣ option 1
🟦⬜️⬜️⬜️⬜️⬜️⬜️⬜️⬜️⬜️ (1)

2️⃣ option 2
🟦🟦⬜️⬜️⬜️⬜️⬜️⬜️⬜️⬜️ (2)

3️⃣ option 3
🟦🟦⬜️⬜️⬜️⬜️⬜️⬜️⬜️⬜️ (3)

4️⃣ option 4
🟦🟦🟦🟦🟦⬜️⬜️⬜️⬜️⬜️ (7)`;

    assertEquals(text, expected);
});

Deno.test("produces a ReplyRef from a link", async () => {
    const bot = await setup();
    const expected = {
        parent: {
            cid: "abcdef",
            uri: "at://test",
            value: {},
        },
        root: {
            cid: "abcdef",
            uri: "at://test",
            value: {},
        },
    };
    const replyRef1 = await bot.linkToReplyRef("https://staging.bsky.app/profile/epistemic.horse/post/3jtjczuf2ls2s");
    const replyRef2 = await bot.linkToReplyRef("https://bsky.app/profile/epistemic.horse/post/3jtjczuf2ls2s");
    const replyRef3 = await bot.linkToReplyRef("at://did:plc:3rpxqcxyf5aqs3s7jpd36gbm/app.bsky.feed.post/3jtjczuf2ls2s");
    assertEquals(replyRef1, expected);
    assertEquals(replyRef2, expected);
    assertEquals(replyRef3, expected);

    assertEquals(await bot.linkToReplyRef("garbage"), undefined);
})