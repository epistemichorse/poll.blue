import { assert } from "https://deno.land/std@0.183.0/testing/asserts.ts";
import { postLengthValid } from "./poll-utils.ts";

Deno.test("validates post length", () => {
    assert(postLengthValid("a".repeat(300)));
    assert(!postLengthValid("a".repeat(301)));
    assert(postLengthValid("🟦".repeat(300)));
})