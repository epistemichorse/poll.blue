import {
    ClientPostgreSQL,
    NessieConfig,
} from "https://deno.land/x/nessie@2.0.10/mod.ts";

const client = new ClientPostgreSQL({
    database: "postgres",
    hostname: "localhost",
    port: 5432,
    user: "postgres",
    password: "",
});

/** This is the final config object */
const config: NessieConfig = {
    client,
    migrationFolders: ["./db/migrations"],
    seedFolders: ["./db/seeds"],
};

export default config;
