import { load } from "https://deno.land/std@0.186.0/dotenv/mod.ts";
import { z } from "https://deno.land/x/zod@v3.16.1/mod.ts";

const configSchema = z.object({
    ENV: z.string(),
    HOSTNAME: z.string(),
    LOCALHOST: z.string(),
    BSKY_USERNAME: z.string(),
    BSKY_PASSWORD: z.string(),
    BSKY_HOST: z.string(),
    PG_USERNAME: z.string(),
    PG_PASSWORD: z.string(),
    PG_DATABASE: z.string(),
    PG_HOST: z.string(),
})

let config: z.infer<typeof configSchema> | undefined;

export async function loadConfigFromEnv(): Promise<z.infer<typeof configSchema>> {
    const env = await load();
    config = configSchema.parse(env);
    return config;
}

export function setConfig(key: keyof z.infer<typeof configSchema>, value: string) {
    if (!config) {
        throw new Error("config not loaded");
    }
    config[key] = value;
}

export function getConfig(key: keyof z.infer<typeof configSchema>): string {
    if (!config) {
        throw new Error("config not loaded");
    }
    return config[key];
}