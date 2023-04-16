import {
    ClientPostgreSQL,
    NessieConfig,
} from "https://deno.land/x/nessie@2.0.10/mod.ts";
import { config as dotenv } from "https://deno.land/x/dotenv@v3.2.2/mod.ts";

const env = dotenv({ path: './.prod.env' });

const client = new ClientPostgreSQL({
    database: "postgres",
    hostname: "127.0.0.1",
    port: 6432,
    user: "postgres",
    password: env.PG_PASSWORD,
    host_type: "tcp",
});

/** This is the final config object */
const config: NessieConfig = {
    client,
    migrationFolders: ["./db/migrations"],
    seedFolders: ["./db/seeds"],
};

export default config;
