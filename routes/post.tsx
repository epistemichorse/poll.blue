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
      <PostPoll />
    </>
  );
}
