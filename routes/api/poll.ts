import { HandlerContext } from "$fresh/server.ts";
import { getDbClient } from '../../db.ts';
import { getBotClient } from '../../bot-client.ts';
import * as log from "https://deno.land/std@0.183.0/log/mod.ts";
import { generateId, generatePollText } from "../../lib/poll-utils.ts";
import { default as Agent } from "https://esm.sh/v115/@atproto/api@0.2.3"
import { z } from "https://deno.land/x/zod@v3.16.1/mod.ts";
import { getConfig } from "../../config.ts";

const postPollSchema = z.object({
    question: z.string().min(1).max(200),
    answers: z.array(z.string().min(1).max(50)).min(2).max(4),
    handle: z.string().max(100),
    password: z.string(),
    user_agent: z.string().max(100),
});

export const handler = async (req: Request, _ctx: HandlerContext): Promise<Response> => {
    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
    }
    const client = getDbClient();
    const body: any = (await req.json());
    const pollParse = postPollSchema.safeParse(body);
    if (!pollParse.success) {
        return new Response(JSON.stringify({
            "error": pollParse.error.format()
        }), { status: 400 });
    }
    const { question, answers, handle, password, user_agent: userAgent } = pollParse.data;
    const enumeration = "number";
    const visibleId = generateId(6);
    const results = answers.map(() => 0).concat([0]);
    let postTemplate, links;
    try {
        [postTemplate, links] = generatePollText({
            visibleId,
            poll: { question, answers, enumeration },
            author: handle,
            pollStyle: 'plain'
        });
    } catch {
        return new Response(JSON.stringify({
            "error": "poll too long",
        }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    const createdAt = (new Date()).toISOString();
    const agent = new Agent({ service: getConfig('BSKY_HOST') });
    try {
        await agent.login({
            identifier: handle,
            password: password,
        });
    } catch (e) {
        log.error(e);
        return new Response(JSON.stringify({
            "error": "invalid bsky credentials",
        }), { status: 400 });
    }
    let postUri = null;
    let createdPost: { uri: string, cid: string } | undefined;
    try {
        createdPost = await agent?.api.app.bsky.feed.post.create(
            { repo: agent.session?.did },
            {
                text: postTemplate,
                facets: links,
                createdAt
            });
        postUri = createdPost?.uri;
    } catch (e) {
        log.error(e);
        return new Response(JSON.stringify({
            "error": "failed to post poll to bsky",
        }), { status: 500 });
    }
    try {
        await client.queryObject`INSERT INTO polls (
            posted_by,
            post_uri,
            question,
            answers,
            results,
            visible_id,
            results_posted,
            user_agent) VALUES (
                ${handle},
                ${postUri},
                ${question},
                ${JSON.stringify(answers)},
                ${JSON.stringify(results)},
                ${visibleId},
                ${false},
                ${userAgent})`;
    } catch (e) {
        log.error(e);
        return new Response(JSON.stringify({
            "error": "failed to insert poll into db"
        }), { status: 500 });
    }
    likeAndRepost: try {
        const botClient = getBotClient();
        if (!botClient || !createdPost) {
            break likeAndRepost;
        }
        const replyRef = {
            parent: { cid: createdPost.cid, uri: createdPost.uri, },
            root: { cid: createdPost.cid, uri: createdPost.uri, }
        };
        await botClient?.likePost(replyRef);
        await botClient?.repost(replyRef);
    } catch (e) {
        log.error(e);
    }
    return new Response(JSON.stringify({
        "id": visibleId,
        "post_uri": postUri,
    }));
};
