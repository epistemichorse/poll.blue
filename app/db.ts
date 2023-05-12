import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

let client: Client;

export interface DbSettings {
    user: string;
    password: string;
    database: string;
    hostname: string;
}

export async function connectToDb(settings: DbSettings) {
    client = new Client(
        {
            user: settings.user,
            password: settings.password,
            database: settings.database,
            hostname: settings.hostname,
            port: 5432,
            connection: {
                attempts: 5,
                interval: 500,
            }
        });
    await client.connect();
}

export async function closeDbConnection() {
    await client.end();
}

export function getDbClient(): Client {
    return client;
}