import { HandlerContext } from "$fresh/server.ts";
import * as log from "https://deno.land/std@0.183.0/log/mod.ts";
import { json } from "../../../../../app/utils.ts";

export const handler = (_req: Request, _ctx: HandlerContext): Response => {
    log.info('getFeedSkeleton');
    return json({ "ok": true });
};
