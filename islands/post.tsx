import { useState } from "preact/hooks";
import { postUriToBskyLink } from "../app/poll-utils.ts";

export default function PostPoll() {
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [postUri, setPostUri] = useState("");
  const [error, setError] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [replyTo, setReplyTo] = useState(undefined);
  async function postPoll(evt: Event) {
    evt.preventDefault();
    const response = await fetch("/api/poll", {
      method: "POST",
      body: JSON.stringify({
        handle,
        password,
        question,
        answers: options.filter((opt) => opt != ""),
        user_agent: "poll.blue",
        reply_to: replyTo,
      }),
    });
    if (response.status === 200) {
      setPostUri((await response.json()).post_uri);
      setError("");
    } else {
      setPostUri("");
      setError(await response.json());
    }
  }
  return (
    <>
      <form class="px-8 pt-6 pb-8 mb-4" onSubmit={(evt) => postPoll(evt)}>
        <div class="mb-4">
          <label
            class="block text-gray-400 text-sm font-bold mb-2"
            for="handle"
          >
            Handle (without the @)
          </label>
          <input
            class="appearance-none border rounded mb-2 w-full py-2 px-3 text-gray-400 leading-tight focus:outline-none focus:shadow-outline"
            id="handle"
            type="text"
            value={handle}
            maxLength={50}
            onInput={({ target }) => {
              setHandle(target && (target as any).value);
            }}
            placeholder="something.bsky.social"
          />
        </div>
        <div class="mb-4">
          <label
            class="block text-gray-400 text-sm font-bold mb-2"
            for="password"
          >
            Password (not your main password pls)
          </label>
          <input
            class="appearance-none border rounded mb-2 w-full py-2 px-3 text-gray-400 leading-tight focus:outline-none focus:shadow-outline"
            id="password"
            type="password"
            value={password}
            maxLength={50}
            onInput={({ target }) => {
              setPassword(target && (target as any).value);
            }}
            placeholder=""
          />
        </div>
        <div class="mb-4">
          <label
            class="block text-gray-400 text-sm font-bold mb-2"
            for="question"
          >
            Question
          </label>
          <input
            class="appearance-none border rounded mb-2 w-full py-2 px-3 text-gray-400 leading-tight focus:outline-none focus:shadow-outline"
            id="question"
            type="text"
            value={question}
            maxLength={200}
            onInput={({ target }) => {
              setQuestion(target && (target as any).value);
            }}
            placeholder=""
          />
        </div>
        {options.map((option, i) => (
          <div class="mb-4">
            <label
              class="block text-gray-400 text-sm font-bold mb-2"
              for={"option" + i}
            >
              Option {i + 1}
            </label>
            <input
              class="appearance-none border rounded mb-2 w-full py-2 px-3 text-gray-400 leading-tight focus:outline-none focus:shadow-outline"
              id={"option" + i}
              type="text"
              value={options[i]}
              maxLength={50}
              onInput={({ target }) => {
                setOptions(
                  options.map((o, j) => (i == j ? (target as any).value : o)),
                );
              }}
              placeholder=""
            />
          </div>
        ))}
        <div class="mb-4">
          <p class="text-gray-400 text-sm font-bold mb-2">
            <a href="#" onClick={() => setShowAdvanced(!showAdvanced)}>
              Advanced options (Toggle)
            </a>
          </p>
          <div class={showAdvanced ? "" : "hidden"}>
            <label
              class="block text-gray-400 text-sm font-bold mb-2"
              for="reply_to"
            >
              Reply to (bsky app URL or at:// URI)
            </label>
            <input
              class="appearance-none border rounded mb-2 w-full py-2 px-3 text-gray-400 leading-tight focus:outline-none focus:shadow-outline"
              id="reply_to"
              type="text"
              value={replyTo}
              maxLength={200}
              onInput={({ target }) => {
                setReplyTo(target && (target as any).value);
              }}
              placeholder="https://staging.bsky.app/profile/jay.bsky.team/post/3juflvnb3d62u"
            />
          </div>
        </div>
        {options.filter((opt) => opt != "").length >= 2 &&
          (
            <div
              class="p-4 my-4 text-xl bg-gray-400 rounded"
              style="overflow-wrap: break-word"
            >
              <p class="mb-4">
                {question}
              </p>
              <ol>
                {options.filter((opt) => opt != "").map((opt, idx) => (
                  <li>
                    {["1️⃣", "2️⃣", "3️⃣", "4️⃣"][idx]} {opt}
                  </li>
                ))}
              </ol>
              <p class="mt-6">
                📊 Show results
              </p>
            </div>
          )}
        <div class="flex items-center justify-between">
          <button
            class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled"
            type="submit"
            disabled={handle === "" || password == "" ||
              options.filter((opt) => opt != "").length < 2}
            onClick={() => {}}
          >
            Post poll
          </button>
        </div>
        {postUri && (
          <div class="my-6 p-4 mx-auto max-w-screen-md bg-green-500 rounded">
            <p class="text-center text-xl">
              <a
                class="hover:underline text-blue-800"
                href={postUriToBskyLink(postUri)}
              >
                Poll posted!
              </a>
            </p>
          </div>
        )}
        {error !== "" && (
          <div class="my-6 p-4 mx-auto max-w-screen-md bg-red-500 rounded">
            <p class="text-center text-xl">
              Error: {(error as { error?: string }).error}
            </p>
          </div>
        )}
      </form>
    </>
  );
}
