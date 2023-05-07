import { default as Agent, AppBskyNotificationListNotifications, AppBskyFeedPost, AppBskyFeedDefs, AppBskyFeedLike } from "https://esm.sh/v115/@atproto/api@0.2.3"
import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";
import TTL from "https://deno.land/x/ttl/mod.ts";
import * as log from "https://deno.land/std@0.183.0/log/mod.ts";
import { Enumeration, Poll, byteLength, generateId, generatePollText } from "../lib/poll-utils.ts";

// lord forgive me
const pollRegexes: [Enumeration, RegExp][] = [
    ['upper', /*  */ /^.*?@([a-zA-Z0-9_.]+)[\s\n]*(.*)\s*\n+\s*A\s*[\.\-:)]\s*(.*?)\s*\n\s*B\s*[\.\-:)]\s*(.*?)\s*(?:\n\s*C\s*[\.\-:)]\s*(.*?)\s*(?:\n\s*D\s*[\.\-:)]\s*(.*?))?)?\s*$/m],
    ['lower', /*  */ /^.*?@([a-zA-Z0-9_.]+)[\s\n]*(.*)\s*\n+\s*a\s*[\.\-:)]\s*(.*?)\s*\n\s*b\s*[\.\-:)]\s*(.*?)\s*(?:\n\s*c\s*[\.\-:)]\s*(.*?)\s*(?:\n\s*d\s*[\.\-:)]\s*(.*?))?)?\s*$/m],
    ['number', /* */ /^.*?@([a-zA-Z0-9_.]+)[\s\n]*(.*)\s*\n+\s*1\s*[\.\-:)]\s*(.*?)\s*\n\s*2\s*[\.\-:)]\s*(.*?)\s*(?:\n\s*3\s*[\.\-:)]\s*(.*?)\s*(?:\n\s*4\s*[\.\-:)]\s*(.*?))?)?\s*$/m],
]

export type PostPollResult = {
    createdAt: string;
    visibleId: string;
}

export interface DbPoll {
    id: number;
    post_uri: string;
    results_posted: boolean;
    question: string;
    answers: string[];
    results: number[];
}

export class Bot {
    private agent: Agent | undefined;
    private username: string;
    private password: string;
    private dbClient: Client;
    private postUriCache: TTL<boolean>;

    constructor(options: { username: string, password: string, dbClient: Client, postUriCache: TTL<boolean> }) {
        this.username = options.username;
        this.password = options.password;
        this.dbClient = options.dbClient;
        this.postUriCache = options.postUriCache;
    }

    get Agent() {
        return this.agent;
    }

    async setupAgent(agent: Agent) {
        await agent.login({
            identifier: this.username,
            password: this.password,
        });

        this.agent = agent;
    }

    async runJobs() {
        log.info("Running postResults")
        try {
            await this.postResults();
        } catch (e) {
            log.error(e);
        }

        log.info("Running postLegacyPolls")
        try {
            await this.postLegacyPolls();
        } catch (e) {
            log.error(e);
        }
    }

    async postResults() {
        const polls = await this.dbClient.queryObject<DbPoll>`SELECT * FROM polls WHERE results_posted = false AND created_at < NOW() - INTERVAL '24 hours'`;
        await this.dbClient.queryObject`UPDATE polls SET results_posted = true WHERE id = ANY(${polls.rows.map(p => p.id)})`;
        for (const poll of polls.rows) {
            let threadResp;
            try {
                threadResp = await this.agent?.api.app.bsky.feed.getPostThread({ uri: poll.post_uri });
            } catch (e) {
                log.error(e);
                continue;
            }
            const thread = threadResp?.data.thread;
            if (!thread || thread.notFound || !thread.post) {
                continue;
            }
            const threadViewPost = thread as AppBskyFeedDefs.ThreadViewPost;
            const post = threadViewPost.post;
            const replyRef = { parent: { cid: post.cid, uri: post.uri }, root: { cid: post.cid, uri: post.uri } };
            const createdAt = new Date().toISOString();
            const postTemplate = generatePollResultsText(poll);
            if (byteLength(postTemplate) > 300) {
                continue;
            }
            try {
                await this.agent?.api.app.bsky.feed.post.create(
                    { repo: this.agent.session?.did },
                    {
                        text: postTemplate,
                        reply: replyRef,
                        createdAt
                    })
            } catch (e) {
                log.error(e);
                continue;
            }
        }
    }

    async postLegacyPolls() {
        const notifs = await this.getNotifications();

        for await (const notif of notifs) {
            const relevant = await this.isNotificationRelevant(notif);
            const postUri = notif.uri;
            if (!relevant) {
                log.debug(`skipping notification ${notif.id}`);
                continue;
            }
            const text = (notif.record as { text: string })?.text;
            const replyRef = {
                parent: {
                    cid: notif.cid,
                    uri: notif.uri,
                },
                root: {
                    cid: (notif?.record as { reply?: { root?: { cid?: string, uri?: string } } })?.reply?.root?.cid || notif.cid,
                    uri: (notif?.record as { reply?: { root?: { cid?: string, uri?: string } } })?.reply?.root?.uri || notif.uri,
                }
            }
            if (!text || !postUri) {
                continue;
            }
            try {
                const poll = this.parseNotification(text);
                const author = notif.author.handle;
                await this.postPoll(poll, replyRef, author);
            } catch (e) {
                log.error(e);
                continue;
            }
        }
    }

    async getNotifications(): Promise<AppBskyNotificationListNotifications.Notification[]> {
        if (!this.agent) {
            throw new Error("agent not set up");
        }
        const notifs = await this.agent.api.app.bsky.notification.listNotifications({ limit: 50 })
        if (!notifs.success) {
            throw new Error("failed to get notifications");
        }
        const out: AppBskyNotificationListNotifications.Notification[] = [];
        for (const notif of notifs.data.notifications) {
            if (notif.reason !== "mention") {
                continue;
            }
            if ((notif.record as { text: string })?.text.startsWith(this.username)) {
                continue;
            }
            out.push(notif);
        }
        return out;
    }

    async isNotificationRelevant(notif: AppBskyNotificationListNotifications.Notification): Promise<boolean> {
        const postUri = notif.uri;
        if (!postUri) {
            return false;
        }
        if (this.postUriCache.has(postUri)) {
            return false;
        }
        const poll = await this.dbClient.queryObject`SELECT * FROM polls WHERE post_uri = ${postUri}`;
        if (poll.rows.length === 0) {
            return true;
        }
        this.postUriCache.set(postUri, true);
        return false;
    }

    parseNotification(text: string): Poll {
        for (const [enumeration, regex] of pollRegexes) {
            const match = regex.exec(text);
            if (match) {
                const parsed = {
                    question: match[2],
                    answers: match.slice(3).filter((a) => a !== undefined).map((a) => a.trim()),
                    enumeration
                };
                return parsed;
            }
        }
        throw new Error(`failed to parse notification: ${text}`);
    }

    async postPoll(poll: Poll, replyRef: AppBskyFeedPost.ReplyRef, author: string): Promise<PostPollResult | undefined> {
        const visibleId = generateId(6);
        const createdAt = (new Date()).toISOString();
        const results = poll.answers.map(() => 0).concat([0]);
        const postUri = replyRef.parent.uri;
        try {
            await this.dbClient.queryObject`INSERT INTO polls (posted_by, post_uri, question, answers, results, visible_id) VALUES (${author}, ${postUri}, ${poll.question}, ${JSON.stringify(poll.answers)}, ${JSON.stringify(results)}, ${visibleId})`;
        } catch (e) {
            log.error(e);
            return;
        }
        this.postUriCache.set(replyRef.parent.uri, true);
        log.info(`posted poll ${visibleId} by @${author} at ${postUri}`);
        const [postTemplate, links] = generatePollText({ visibleId, poll, replyRef, author, pollStyle: 'bot' });
        await Promise.all([
            this.agent?.api.app.bsky.feed.post.create(
                { repo: this.agent.session?.did },
                {
                    text: postTemplate,
                    reply: replyRef,
                    facets: links,
                    createdAt
                })
            ,
            this.agent?.api.app.bsky.feed.like.create(
                { repo: this.agent.session?.did },
                {
                    subject: { uri: replyRef.parent.uri, cid: replyRef.parent.cid },
                    createdAt
                }
            )
        ]);
        return { visibleId, createdAt };
    }

    likePost(replyRef: AppBskyFeedPost.ReplyRef): Promise<{ uri: string; cid: string; }> | undefined {
        const createdAt = (new Date()).toISOString();
        return this.agent?.api.app.bsky.feed.like.create(
            { repo: this.agent.session?.did },
            {
                subject: { uri: replyRef.parent.uri, cid: replyRef.parent.cid },
                createdAt
            }
        );
    }

    repost(replyRef: AppBskyFeedPost.ReplyRef): Promise<{ uri: string; cid: string; }> | undefined {
        const createdAt = (new Date()).toISOString();
        return this.agent?.api.app.bsky.feed.repost.create(
            { repo: this.agent.session?.did },
            {
                subject: { uri: replyRef.parent.uri, cid: replyRef.parent.cid },
                createdAt
            }
        );
    }
}

export function generatePollResultsText(poll: DbPoll): string {
    const { question, answers, results: resultsWithAbstentions } = poll;
    const results = resultsWithAbstentions.slice(1);
    const total = results.reduce((a, b) => a + b);
    const percentResults = results.map((r) => r / total);
    const emojiNumbers = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];
    function progressBar(percent: number) {
        const empty = '⬜️';
        const fill = '🟦';
        const filledBlocks = Math.round(percent * 10);
        return `${fill.repeat(filledBlocks)}${empty.repeat(10 - filledBlocks)}`;
    }
    const lines = [
        `Poll results after 24 hours: ${question}`,
        '',
        ...results.flatMap((_, i) => [
            `${emojiNumbers[i]} ${answers[i]}`,
            `${progressBar(percentResults[i])} (${results[i]})`,
            ''
        ]),
    ];
    return lines.join('\n').trim();
}