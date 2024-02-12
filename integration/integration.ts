import { ClientPostgreSQL } from "https://deno.land/x/nessie@2.0.10/mod.ts";
import { FileEntryT } from "https://deno.land/x/nessie@2.0.10/types.ts";
import { resolve } from "https://deno.land/std@0.185.0/path/mod.ts";
import { DbSettings, closeDbConnection, connectToDb } from "../app/db.ts";
import { start } from "$fresh/server.ts";
import manifest from "../fresh.gen.ts";
import twindPlugin from "$fresh/plugins/twind.ts";
import twindConfig from "../twind.config.ts";
import { sleep } from "https://deno.land/x/sleep@v1.2.1/mod.ts";
import { MockBsky } from '../app/mock-bsky.ts';
import { getConfig, loadConfigFromEnv, setConfig } from "../app/config.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.160.0/testing/asserts.ts";
import { setupBotClient } from "../app/bot-client.ts";

const TEST_DB_NAME = "poll_blue_test";
const TEST_PORT = 8001;
const MOCK_BSKY_PORT = 8003;

export async function integrationTest(t: Deno.TestContext) {
    const dbConnSettings = {
        user: 'postgres',
        password: Deno.env.get('POSTGRES_PASSWORD') ?? '',
        database: TEST_DB_NAME,
        hostname: Deno.env.get('POSTGRES_HOST') ?? 'localhost',
    };
    await createDb(dbConnSettings);
    await migrate(dbConnSettings);
    await connectToDb(dbConnSettings);
    const abortServer = new AbortController();
    const mockBsky = new MockBsky();
    mockBsky.listen(MOCK_BSKY_PORT);
    await loadConfigFromEnv();
    setConfig('BSKY_HOST', mockBsky.getHost())
    setupBotClient({
        username: 'empty',
        password: 'password',
        host: mockBsky.getHost(),
    })
    start(manifest, { plugins: [twindPlugin(twindConfig)], port: TEST_PORT, signal: abortServer.signal });
    await sleep(1);

    let pollId: string | null = null;

    await t.step('create poll', async () => {
        const response = await fetch(`http://localhost:${TEST_PORT}/api/poll`, {
            method: 'POST',
            headers: new Headers({
                'Content-Type': 'application/json',
            }),
            body: JSON.stringify({
                question: 'this is a poll',
                answers: ['one', 'two'],
                handle: 'test.poll.blue',
                password: 'password',
                user_agent: 'integration test',
            })
        });
        const json = await response.json();
        assertExists(json.id);
        assertExists(json.post_uri);
        assertEquals(mockBsky.getCalls(), [
            '/xrpc/com.atproto.server.createSession', // poll.blue agent
            '/xrpc/com.atproto.server.createSession', // poll poster agent
            '/xrpc/com.atproto.repo.createRecord', // post
            '/xrpc/com.atproto.repo.createRecord', // like
            '/xrpc/com.atproto.repo.createRecord', // repost
        ]);
        pollId = json.id;
    });

    await t.step('get poll', async () => {
        const response = await fetch(`http://localhost:${TEST_PORT}/api/poll/${pollId}`, {
            headers: new Headers({
                'Content-Type': 'application/json',
            })
        });
        const json = await response.json();
        assertEquals(json.question, 'this is a poll');
        assertEquals(json.answers, ['one', 'two']);
        assertEquals(json.results, [0, 0, 0]);
        assertEquals(json.posted_by, 'epistemic.horse');
        assertExists(json.created_at);
    });

    abortServer.abort();
    mockBsky.close();
    await closeDbConnection();
}

async function createDb(settings: DbSettings) {
    const db = new ClientPostgreSQL({
        database: 'postgres',
        user: 'postgres',
        password: settings.password,
        hostname: settings.hostname,
    });
    await db.query(`DROP DATABASE IF EXISTS ${TEST_DB_NAME}`);
    await db.query(`CREATE DATABASE ${TEST_DB_NAME}`);
    await db.close();
}

async function migrate(settings: DbSettings) {
    const db = new ClientPostgreSQL({
        database: TEST_DB_NAME,
        user: 'postgres',
        password: settings.password,
        hostname: settings.hostname,
    });
    const migrations: FileEntryT[] = [];
    for await (const migration of Deno.readDir('./db/migrations')) {
        migrations.push({
            name: migration.name,
            path: 'file://' + resolve(Deno.cwd(), `./db/migrations/${migration.name}`),
        });
    }
    db.migrationFiles = migrations.sort((a, b) => a.name.localeCompare(b.name));
    await db.prepare();
    await db.migrate(Infinity);
    await db.close();
}