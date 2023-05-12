import { HandlerContext } from "$fresh/server.ts";
import { getConfig } from "../../app/config.ts";
import { json } from "../../app/utils.ts";

export const handler = (_req: Request, _ctx: HandlerContext): Response => {
    const host = getConfig('HOSTNAME');
    return json({
        '@context': ['https://www.w3.org/ns/did/v1'],
        id: `did:web:${host}`,
        service: [
            {
                id: '#bsky_fg',
                type: 'BskyFeedGenerator',
                serviceEndpoint: `https://${host}`,
            },
        ],
    });
};
