# poll.blue

poll.blue is a polling app for Bluesky. Posting instructions available on the landing page: [https://poll.blue](https://poll.blue).

### Testing locally

You will need to install deno and postgres to run locally. Create the necessary
tables by running

```
deno task nessie:local migrate
```

Then start the server:

```
deno task start
```

This will watch the project directory and restart as necessary. Bot logic
doesn't run locally currently, but there are a few unit tests.
