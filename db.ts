import { load } from "https://deno.land/std@0.186.0/dotenv/mod.ts";
import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

let client: Client;

export async function connectToDb() {
    const env = await load();
    client = new Client(
        {
            user: env.PG_USERNAME,
            password: env.PG_PASSWORD,
            database: "postgres",
            hostname: env.PG_HOST,
            port: 5432,
            connection: {
                attempts: 5,
                interval: 500,
            }
        });
    await client.connect();
}

export function getDbClient(): Client {
    return client;
}

connectToDb();