import { AbstractMigration, Info, ClientPostgreSQL } from "https://deno.land/x/nessie@2.0.10/mod.ts";

export default class extends AbstractMigration<ClientPostgreSQL> {
    /** Runs on migrate */
    async up(info: Info): Promise<void> {
        this.client.queryObject`ALTER TABLE polls ADD COLUMN user_agent varchar(100) NOT NULL DEFAULT 'poll.blue';`;
    }

    /** Runs on rollback */
    async down(info: Info): Promise<void> {
        this.client.queryObject`ALTER TABLE polls DROP COLUMN user_agent;`;
    }
}
