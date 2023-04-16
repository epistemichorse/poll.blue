import { AbstractMigration, Info, ClientPostgreSQL } from "https://deno.land/x/nessie@2.0.10/mod.ts";

export default class extends AbstractMigration<ClientPostgreSQL> {
    /** Runs on migrate */
    async up(_info: Info): Promise<void> {
        await this.client.queryObject(
            `CREATE TABLE polls (
            id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            post_uri character varying(100) NOT NULL UNIQUE,
            question character varying(100) NOT NULL,
            answers jsonb NOT NULL,
            results jsonb NOT NULL,
            visible_id character varying(16) NOT NULL UNIQUE
        );

        -- Indices -------------------------------------------------------
        
        CREATE UNIQUE INDEX polls_visible_id_idx ON polls(visible_id varchar_pattern_ops); 
        `)
    }

    /** Runs on rollback */
    async down(_info: Info): Promise<void> {
        await this.client.queryObject(`DROP TABLE polls;`)
    }
}
