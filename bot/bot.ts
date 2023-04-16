import { default as Agent, AppBskyNotificationListNotifications, AppBskyFeedPost, AppBskyRichtextFacet } from "https://esm.sh/v115/@atproto/api@0.2.3"
import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";
import TTL from "https://deno.land/x/ttl/mod.ts";
import * as log from "https://deno.land/std@0.183.0/log/mod.ts";

type Enumeration = 'upper' | 'lower' | 'number';

// lord forgive me
const pollRegexes: [Enumeration, RegExp][] = [
    ['upper', /*  */ /^\.?@([a-zA-Z0-9_.]+) (.*)\s*\n+\s*A\s*[\.\-:]\s*(.*?)\s*\n\s*B\s*[\.\-:]\s*(.*?)\s*(?:\n\s*C\s*[\.\-:]\s*(.*?)\s*(?:\n\s*D\s*[\.\-:]\s*(.*?))?)?\s*$/m],
    ['lower', /*  */ /^\.?@([a-zA-Z0-9_.]+) (.*)\s*\n+\s*a\s*[\.\-:]\s*(.*?)\s*\n\s*b\s*[\.\-:]\s*(.*?)\s*(?:\n\s*c\s*[\.\-:]\s*(.*?)\s*(?:\n\s*d\s*[\.\-:]\s*(.*?))?)?\s*$/m],
    ['number', /* */ /^\.?@([a-zA-Z0-9_.]+) (.*)\s*\n+\s*1\s*[\.\-:]\s*(.*?)\s*\n\s*2\s*[\.\-:]\s*(.*?)\s*(?:\n\s*3\s*[\.\-:]\s*(.*?)\s*(?:\n\s*4\s*[\.\-:]\s*(.*?))?)?\s*$/m],
]

export type Poll = {
    question: string;
    answers: string[];
    enumeration: Enumeration;
}

export class Bot {
    private agent: Agent | undefined;
    private username: string;
    private password: string;
    private dbClient: Client;
    private postUriCache: TTL<boolean>;

    constructor(options: { username: string, password: string, dbClient: Client }) {
        this.username = options.username;
        this.password = options.password;
        this.dbClient = options.dbClient;
        this.postUriCache = new TTL(1000 * 60 * 60 * 24);
    }

    async setupAgent(agent: Agent) {
        await agent.login({
            identifier: this.username,
            password: this.password,
        });

        this.agent = agent;
    }

    async runJobs() {
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
                this.postPoll(poll, replyRef, author);
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

    postPoll(poll: Poll, replyRef: AppBskyFeedPost.ReplyRef, author: string) {
        const visibleId = generateId(6);
        const results = poll.answers.map(() => 0).concat([0]);
        const postUri = replyRef.parent.uri;
        try {
            this.dbClient.queryObject`INSERT INTO polls (posted_by, post_uri, question, answers, results, visible_id) VALUES (${author}, ${postUri}, ${poll.question}, ${JSON.stringify(poll.answers)}, ${JSON.stringify(results)}, ${visibleId})`;
        } catch (e) {
            log.error(e);
            return;
        }
        this.postUriCache.set(replyRef.parent.uri, true);
        log.info(`posted poll ${visibleId} for ${postUri}`);
        let postTemplate = '';
        const links: AppBskyRichtextFacet.Main[] = [];
        for (const [i, _answer] of poll.answers.entries()) {
            const startIndex = postTemplate.length;
            if (poll.enumeration === 'upper') {
                postTemplate += `Vote ${String.fromCharCode(65 + i)}`;
            } else if (poll.enumeration === 'lower') {
                postTemplate += `Vote ${String.fromCharCode(97 + i)}`;
            } else if (poll.enumeration === 'number') {
                postTemplate += `Vote ${i + 1}`;
            }
            links.push({
                index: { byteStart: startIndex, byteEnd: postTemplate.length },
                features: [{
                    $type: 'app.bsky.richtext.facet#link',
                    uri: `https://poll.blue/p/${visibleId}/${i + 1}`
                }]
            });
            postTemplate += '\n';
        }
        const resultsStart = postTemplate.length;
        postTemplate += `\nShow results`;
        links.push({
            index: { byteStart: resultsStart, byteEnd: postTemplate.length },
            features: [{
                $type: 'app.bsky.richtext.facet#link',
                uri: `https://poll.blue/p/${visibleId}/0`
            }]
        })
        this.agent?.api.app.bsky.feed.post.create(
            { repo: this.agent.session?.did },
            {
                text: postTemplate,
                reply: replyRef,
                facets: links,
                createdAt: (new Date()).toISOString()
            },
        );
        this.agent?.api.app.bsky.feed.like.create(
            { repo: this.agent.session?.did },
            {
                subject: { uri: replyRef.parent.uri, cid: replyRef.parent.cid },
                createdAt: (new Date()).toISOString(),
            }
        );
    }
}

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function generateId(length: number) {
    let result = '';
    for (let i = 0; i < length; i++) {
        result += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return result;
}