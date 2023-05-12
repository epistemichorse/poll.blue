# poll.blue

poll.blue is a polling app for Bluesky. Posting instructions available on the
landing page: [https://poll.blue](https://poll.blue).

## Running locally

You will need to install deno and postgres to run locally. Create the necessary
tables by running

```
deno task nessie:local migrate
```

Then start the server:

```
deno task start
```

This will watch the project directory and restart as necessary.

## Tests

There are a few unit tests, which you can run using:

```
deno test
```

There are also integration tests which run on CI.

```
INTEGRATION_TESTS=true deno test -A --unstable
```
