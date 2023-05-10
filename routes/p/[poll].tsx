import { PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import { Handlers } from "$fresh/server.ts";
import type { Results } from "../api/poll/[poll].ts";
import { postUriToBskyLink } from "../../lib/poll-utils.ts";
import { getConfig } from "../../config.ts";

export const handler: Handlers<Results | null> = {
  async GET(_, ctx) {
    const { poll } = ctx.params;
    const resp = await fetch(`${getConfig("LOCALHOST")}/api/poll/${poll}`);
    if (resp.status === 404) {
      return ctx.render(null);
    }
    const results: Results = await resp.json();
    return ctx.render(results);
  },
};

export default function Home(props: PageProps<Results>) {
  if (!props.data) {
    return <div>404</div>;
  }
  const {
    posted_by: postedBy,
    created_at: createdAt,
    post_uri: postUri,
    question,
    answers,
    results,
  } = props.data;
  const createdAtFormatted = new Date(createdAt).toLocaleString();
  const pollSum = results.slice(1).reduce((a, b) => a + b, 0);
  const pollPercentages = results.map((result) => {
    const percentage = 100 * result / pollSum;
    if (Number.isNaN(percentage)) {
      return 0;
    }
    return percentage;
  });
  const voted = Number(props.url.searchParams.get("v"));
  const interactions = results.reduce((a, b) => a + b, 0);

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

          .blue {
            background-color: rgb(0, 133, 255);
          }

          .slide {
            border-radius: 4px;
            animation: slide-in 2s forwards cubic-bezier(0, 0, 0.09, 0.99);
            max-width: 0%;
          }

          @keyframes slide-in {
              100% { max-width: 100%; }
          }
        `}
        </style>
      </Head>
      <div class="p-4 mx-auto max-w-screen-md">
        <p class="text-white text-center text-2xl">{question}</p>
        <div class="my-6">
          {pollPercentages.slice(1).map((result, i) => (
            <div class="flex relative overflow-hidden">
              <div class="flex flex-auto">
                <div
                  class="blue text-white m-2 p-2 slide whitespace-nowrap"
                  style={"width: " + (Math.max(result, 1)) + "%"}
                >
                </div>
                <div class="m-2 p-2 text-right flex-auto text-white number whitespace-nowrap">
                </div>
                <span class="absolute text-white p-4 whitespace-nowrap">
                  {answers[i]} {voted === i + 1 && (
                    <span>
                      ✓
                    </span>
                  )}
                </span>
              </div>
              <div
                class="p-4 text-right text-white number whitespace-nowrap"
                style="z-index: 1; background-color: rgb(20, 20, 23)"
              >
                {result.toFixed(1)}% ({results.slice(1)[i]})
              </div>
            </div>
          ))}
        </div>
        <p
          class="text-gray-500 text-center my-4"
          title={`Voting or clicking "Show results" counts as an interaction`}
        >
          {interactions} {interactions === 1 ? "interaction" : "interactions"}
        </p>
        {!!postUri && (
          <p class="text-white text-center">
            <a
              href={postUriToBskyLink(postUri)}
              class="hover:underline text-blue-500"
            >
              Posted {!!postedBy && `by @${postedBy}`} on {createdAtFormatted}
            </a>
          </p>
        )}
      </div>
    </>
  );
}
