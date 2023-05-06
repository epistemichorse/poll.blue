import { AbstractMigration, Info, ClientPostgreSQL } from "https://deno.land/x/nessie@2.0.10/mod.ts";

export default class extends AbstractMigration<ClientPostgreSQL> {
    /** Runs on migrate */
    async up(info: Info): Promise<void> {
        this.client.queryObject`ALTER TABLE polls ALTER COLUMN post_uri DROP NOT NULL;`;
    }

    /** Runs on rollback */
    async down(info: Info): Promise<void> {
        this.client.queryObject`ALTER TABLE polls ALTER COLUMN post_uri SET NOT NULL;`
    }
}
