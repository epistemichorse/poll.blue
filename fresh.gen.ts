// DO NOT EDIT. This file is generated by fresh.
// This file SHOULD be checked into source version control.
// This file is automatically updated during development when running `dev.ts`.

import config from "./deno.json" assert { type: "json" };
import * as $0 from "./routes/index.tsx";
import * as $1 from "./routes/p/[poll].tsx";
import * as $2 from "./routes/p/[poll]/[vote].tsx";
import * as $3 from "./routes/p/[poll]/results.ts";
import * as $4 from "./routes/post-poll.ts";
import * as $5 from "./routes/post.tsx";
import * as $6 from "./routes/status.ts";
import * as $$0 from "./islands/post.tsx";

const manifest = {
  routes: {
    "./routes/index.tsx": $0,
    "./routes/p/[poll].tsx": $1,
    "./routes/p/[poll]/[vote].tsx": $2,
    "./routes/p/[poll]/results.ts": $3,
    "./routes/post-poll.ts": $4,
    "./routes/post.tsx": $5,
    "./routes/status.ts": $6,
  },
  islands: {
    "./islands/post.tsx": $$0,
  },
  baseUrl: import.meta.url,
  config,
};

export default manifest;
