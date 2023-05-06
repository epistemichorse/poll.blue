import { HandlerContext } from "$fresh/server.ts";
import { getClient } from '../db.ts';
import * as log from "https://deno.land/std@0.183.0/log/mod.ts";
import { Poll, generateId, generatePollText } from "../lib/poll-utils.ts";
import { default as Agent } from "https://esm.sh/v115/@atproto/api@0.2.3"

export const handler = async (req: Request, _ctx: HandlerContext): Promise<Response> => {
    const client = getClient();
    const body: any = (await req?.json());
    const poll = body as Poll;
    const author = body.handle as string;
    const password = body.password as string;
    if (!author ||
        author.length > 100 ||
        !poll.question ||
        poll.question.length > 200 ||
        !poll.answers ||
        poll.answers.length < 2 ||
        poll.answers.length > 4 ||
        !poll.answers.every((answer) => typeof answer === "string" && answer.length <= 50)) {
        return new Response(JSON.stringify({
            "ok": false,
            "error": "invalid poll",
        }), { status: 400 });
    }
    poll.answers = poll.answers.filter((answer: string) => answer.length > 0);
    poll.enumeration = "number";
    const visibleId = generateId(6);
    const results = poll.answers.map(() => 0).concat([0]);
    const [postTemplate, links] = generatePollText({
        visibleId,
        poll,
        author,
        pollStyle: 'plain'
    });
    const createdAt = (new Date()).toISOString();
    const agent = new Agent({ service: "https://bsky.social" });
    try {
        await agent.login({
            identifier: author,
            password: password,
        });
        await agent?.api.app.bsky.feed.post.create(
            { repo: agent.session?.did },
            {
                text: postTemplate,
                facets: links,
                createdAt
            })
    } catch (e) {
        log.error(e);
        return new Response(JSON.stringify({
            "ok": false,
            "error": "failed to post poll to bsky",
        }), { status: 500 });
    }
    try {
        await client.queryObject`INSERT INTO polls (posted_by, post_uri, question, answers, results, visible_id) VALUES (${author}, ${null}, ${poll.question}, ${JSON.stringify(poll.answers)}, ${JSON.stringify(results)}, ${visibleId})`;
    } catch (e) {
        log.error(e);
        return new Response(JSON.stringify({
            "ok": false,
            "error": "failed to insert poll into db"
        }), { status: 500 });
    }
    return new Response(JSON.stringify({
        "ok": postTemplate
    }));
};
