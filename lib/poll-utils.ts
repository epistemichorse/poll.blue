import { AppBskyFeedPost, AppBskyRichtextFacet } from "https://esm.sh/v115/@atproto/api@0.2.3"

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function generateId(length: number) {
    let result = '';
    for (let i = 0; i < length; i++) {
        result += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return result;
}

export type Enumeration = 'upper' | 'lower' | 'number';

export type Poll = {
    question: string;
    answers: string[];
    enumeration: Enumeration;
}

interface Template {
    text: string;
    link?: string;
    truncate: 'yes' | 'no';
}

interface GenerationOptions {
    visibleId: string;
    poll: Poll;
    replyRef?: AppBskyFeedPost.ReplyRef;
    author: string;
    pollStyle: 'plain' | 'bot'
}

export function generatePollText(options: GenerationOptions): [string, AppBskyRichtextFacet.Main[]] {
    const emojiNumbers = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];
    const emojiLetters = ['🅰', '🅱', '🅲', '🅳']
    const { visibleId, poll, replyRef, author } = options;
    const postId = replyRef?.parent.uri.split('/').slice(-1)[0];
    let postTemplate: Template[] = [];
    if (options.pollStyle === 'plain') {
        postTemplate = [
            { text: `${poll.question}\n\n`, link: undefined, truncate: 'no' },
        ];
    } else {
        postTemplate = [
            { text: `"${poll.question}"`, link: undefined, truncate: 'no' },
            { text: ` asked by `, link: undefined, truncate: 'yes' },
            { text: `@${author}`, link: `https://staging.bsky.app/profile/${author}/post/${postId}`, truncate: 'yes' },
            { text: `. Vote below!`, link: undefined, truncate: 'yes' },
            { text: `\n\n`, link: undefined, truncate: 'no' },
        ];
    }
    for (const [i, _answer] of options.poll.answers.entries()) {
        const item = poll.enumeration === 'number' ? emojiNumbers[i] : emojiLetters[i];
        postTemplate.push({ text: `${item} `, link: undefined, truncate: 'no' });
        postTemplate.push({ text: `${options.poll.answers[i]}`, link: `https://poll.blue/p/${visibleId}/${i + 1}`, truncate: 'no' });
        postTemplate.push({ text: '\n', link: undefined, truncate: 'no' });
    }
    postTemplate.push({ text: `\n`, link: undefined, truncate: 'no' });
    postTemplate.push({ text: `📊 Show results`, link: `https://poll.blue/p/${visibleId}/0`, truncate: 'no' });
    let [text, links] = buildTemplate(postTemplate);
    if (text.length > 300) {
        [text, links] = buildTemplate(postTemplate.filter(t => t.truncate === 'no'))
    }
    if (text.length > 300) {
        throw new Error(`post too long: ${text.length} bytes`)
    }
    return [text, links];
}

function buildTemplate(template: Template[]): [string, AppBskyRichtextFacet.Main[]] {
    const links: AppBskyRichtextFacet.Main[] = [];
    for (let i = 0, len = 0; i < template.length; len += byteLength(template[i].text), i++) {
        if (template[i].link) {
            links.push({
                index: { byteStart: len, byteEnd: len + byteLength(template[i].text) },
                features: [{
                    $type: 'app.bsky.richtext.facet#link',
                    uri: template[i].link
                }]
            })
        }
    }
    const text = template.map(t => t.text).join('');
    return [text, links];
}

export function byteLength(s: string): number {
    return (new TextEncoder().encode(s)).length
}

export function postUriToBskyLink(postUri: string) {
    if (!postUri) {
        return "";
    }
    // at://did:plc:hxqb73a2mcqwgyg64ibvw7ts/app.bsky.feed.post/3jtiwzc4lfh2o
    const [did, , post] = postUri.split("/").slice(-3);
    return `https://staging.bsky.app/profile/${did}/post/${post}`;
}
