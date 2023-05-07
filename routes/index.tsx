import { Head } from "$fresh/runtime.ts";

export default function Home() {
  return (
    <>
      <Head>
        <title>poll.blue</title>
        <style>
          {`
          html {
            background-color: rgb(20, 20, 23);
            font: 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          }
          `}
        </style>
      </Head>
      <div class="p-4 mx-auto max-w-screen-md">
        <p class="my-6 text-white">
          poll.blue is a polling app for Bluesky made by{" "}
          <a
            href="https://staging.bsky.app/profile/epistemic.horse"
            class="hover:underline text-blue-500"
          >
            @epistemic.horse
          </a>. To make a poll, go to the{" "}
          <a href="/post" class="hover:underline text-blue-500">
            posting page
          </a>.
        </p>
        <p class="my-6 text-white">
          Duplicate votes are prevented by only allowing one vote per IP. This
          can of course be circumvented, but hopefully polls are not important
          enough to be worth the effort.
        </p>
      </div>
    </>
  );
}
