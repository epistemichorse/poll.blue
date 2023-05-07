import { AbstractMigration, Info, ClientPostgreSQL } from "https://deno.land/x/nessie@2.0.10/mod.ts";

export default class extends AbstractMigration<ClientPostgreSQL> {
    /** Runs on migrate */
    async up(info: Info): Promise<void> {
        this.client.queryObject`ALTER TABLE polls ADD COLUMN results_posted boolean NOT NULL DEFAULT true;`;
        this.client.queryObject`CREATE INDEX polls_created_at_idx ON polls(created_at);`;
    }

    /** Runs on rollback */
    async down(info: Info): Promise<void> {
        this.client.queryObject`ALTER TABLE polls DROP COLUMN results_posted;`;
        this.client.queryObject`DROP INDEX polls_created_at_idx;`;
    }
}
