import { AbstractMigration, Info, ClientPostgreSQL } from "https://deno.land/x/nessie@2.0.10/mod.ts";

export default class extends AbstractMigration<ClientPostgreSQL> {
    /** Runs on migrate */
    async up(_info: Info): Promise<void> {
        this.client.queryObject`
        CREATE TABLE votes (
            id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            ip integer,
            poll_id integer REFERENCES polls(id),
            vote smallint
        );
        
        -- Indices -------------------------------------------------------
        
        CREATE UNIQUE INDEX votes_idx ON votes(ip int4_ops,poll_id int4_ops);
        `
    }

    /** Runs on rollback */
    async down(_info: Info): Promise<void> {
        this.client.queryObject`DROP TABLE votes`;
    }
}
