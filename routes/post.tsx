import { Head } from "$fresh/runtime.ts";
import PostPoll from "../islands/post.tsx";

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

          .disabled:disabled {
            background: #ddd;
            color: #888;
            // transition: background 0.5s ease-in-out;
          }
          `}
        </style>
      </Head>
      <div class="p-4 mx-auto max-w-screen-md">
        <p class="my-2 text-white">
          poll.blue is a polling app for Bluesky made by{" "}
          <a
            href="https://staging.bsky.app/profile/epistemic.horse"
            class="hover:underline text-blue-500"
          >
            @epistemic.horse
          </a>.
        </p>
        <p class="my-2 text-white">
          Post a poll directly from your account here! You'll need to put in
          your account credentials down below. Make sure to use an app password
          (Settings → App passwords) and not your main password.
        </p>
        <PostPoll />
      </div>
    </>
  );
}
