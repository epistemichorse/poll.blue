import { serve } from "https://deno.land/std@0.178.0/http/server.ts";
import { generateId } from "./poll-utils.ts";

export class MockBsky {
    abortController: AbortController = new AbortController();
    calls: string[] = [];
    port: number | undefined;

    async listen(port: number) {
        this.port = port;
        const handler = (request: Request): Response => {
            const url = new URL(request.url);
            this.calls.push(url.pathname);
            if (url.pathname === '/xrpc/com.atproto.server.createSession') {
                return new Response(JSON.stringify({
                    "accessJwt": 'dummy',
                    "refreshJwt": 'dummy',
                    "handle": 'epistemic.horse',
                    "did": 'did:plc:3rpxqcxyf5aqs3s7jpd36gbm',
                }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            } else if (url.pathname === '/xrpc/com.atproto.repo.createRecord') {
                return new Response(JSON.stringify({
                    uri: `at://did:plc:3rpxqcxyf5aqs3s7jpd36gbm/app.bsky.feed.post/${generateId(13)}`,
                    cid: "bafyreiaiy55yhpmyyks5kxhzqwxqhwvxmnr3svqajjiblltnwft7kk3nou"
                }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }
            return new Response('', { status: 200 });
        };
        await serve(handler, { port, signal: this.abortController.signal });
    }

    getCalls(): string[] {
        return this.calls;
    }

    clearCalls() {
        this.calls = [];
    }

    getHost(): string {
        return `http://localhost:${this.port}`;
    }

    close() {
        this.abortController.abort();
    }
}