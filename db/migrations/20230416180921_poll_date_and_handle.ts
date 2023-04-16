import { AbstractMigration, Info, ClientPostgreSQL } from "https://deno.land/x/nessie@2.0.10/mod.ts";

export default class extends AbstractMigration<ClientPostgreSQL> {
    /** Runs on migrate */
    async up(info: Info): Promise<void> {
        this.client.queryObject`
        ALTER TABLE polls
            ADD COLUMN posted_by varchar(100),
            ADD COLUMN created_at timestamp WITH TIME ZONE NOT NULL DEFAULT now();
        `
    }

    /** Runs on rollback */
    async down(info: Info): Promise<void> {
    }
}
