let shouldIgnoreIntegrationTests = true;

try {
    shouldIgnoreIntegrationTests = Deno.env.get('INTEGRATION_TESTS') !== 'true'
} catch {
    // ignore
}

Deno.test({
    name: 'integration test',
    ignore: shouldIgnoreIntegrationTests,
    sanitizeResources: false,
    sanitizeOps: false,
    async fn(t) {
        const { integrationTest } = await import("./integration.ts");
        await integrationTest(t);
    }
});
