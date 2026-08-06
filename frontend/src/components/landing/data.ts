import {
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Globe,
  Image as ImageIcon,
  Plug,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react'

// Cycled by index across steps/features so each card gets its own color identity
// instead of everything being the same red — full literal class strings so
// Tailwind's static scan picks them all up.
export const ACCENTS = [
  { text: 'text-accent-red', tile: 'from-accent-red/15 to-accent-red/5', glow: 'hover:shadow-accent-red/15' },
  {
    text: 'text-accent-purple',
    tile: 'from-accent-purple/15 to-accent-purple/5',
    glow: 'hover:shadow-accent-purple/15',
  },
  { text: 'text-accent-blue', tile: 'from-accent-blue/15 to-accent-blue/5', glow: 'hover:shadow-accent-blue/15' },
  {
    text: 'text-accent-green',
    tile: 'from-accent-green/15 to-accent-green/5',
    glow: 'hover:shadow-accent-green/15',
  },
]

export const STEPS = [
  {
    icon: Globe,
    label: 'Add a site',
    text: 'Point it at any site you own. Give it a name, a domain, and how often it should be crawled — daily, weekly, or on demand.',
  },
  {
    icon: CheckCircle2,
    label: 'Crawl pages',
    text: 'It fetches each page and extracts the title, meta description, hero image, and key points pulled from your headers and bold text — respecting robots.txt, with automatic retries on failure.',
  },
  {
    icon: Sparkles,
    label: 'Generate posts',
    text: 'Claude drafts a platform-native post: a 3–8 tweet thread with a hook in the first tweet, a LinkedIn post tuned for a professional feed, or a Reddit self-post written to avoid sounding like an ad.',
  },
  {
    icon: Plug,
    label: 'Connect a platform',
    text: 'OAuth 2.0 with PKCE, tokens encrypted at rest. Connect an account once — every future post can publish through it, with tokens refreshed automatically before they expire.',
  },
  {
    icon: CalendarClock,
    label: 'Schedule or publish',
    text: 'Publish immediately or queue it for later — a background worker fires it at the exact time, and retries automatically (up to 3 attempts, backing off 5/10/20 minutes) if a platform call fails.',
  },
]

export const FEATURES = [
  {
    icon: TrendingUp,
    title: 'Checks trends, then posts for you',
    text: "Pulls current trending topics on a schedule and offers them to the AI as candidates — it only works one in if it's genuinely relevant to your content, and never forces it. Each trend can be referenced in at most 2 posts, so it never reads as trend-chasing. This is what keeps posts going out on autopilot instead of waiting on you.",
  },
  {
    icon: Sparkles,
    title: 'AI-generated, platform-native copy',
    text: "Claude writes for each platform's own conventions, not one draft copy-pasted three times: a proper Twitter thread (each tweet under 280 characters, no manual numbering), a LinkedIn post with a hook line built to survive the \"see more\" cutoff, and a Reddit post written first-person and conversational — Reddit's culture actively penalizes anything that reads like marketing.",
  },
  {
    icon: Send,
    title: 'Multi-platform distribution',
    text: "Publishes through each platform's real, official API — X/Twitter threads, LinkedIn UGC posts, Reddit self-posts (with subreddit rules and account karma checked before submitting). No scraping, no headless-browser workarounds.",
  },
  {
    icon: CalendarClock,
    title: 'Smart scheduling',
    text: 'Suggests posting times from your own historical click data, bucketed by weekday and hour — not generic "best time to post" advice. Falls back to sensible defaults until you have enough history. Can also generate 2–3 A/B variants of a post, each written in a different tone, and tracks which one actually earns more clicks.',
  },
  {
    icon: ImageIcon,
    title: 'Branded flyers',
    text: 'Claude writes a creative brief from the page content, Stability AI paints a unique background from it, and the headline, subheadline, and call-to-action are composited on top — a different flyer every time, not a template with text swapped in.',
  },
  {
    icon: BarChart3,
    title: 'First-party click analytics',
    text: "Every post's link routes through your own tracked redirect before landing on the real page, so the click count you see is a real visit to your site — not an impression estimate reported back by the platform.",
  },
]

export const PRINCIPLES = [
  {
    icon: ShieldCheck,
    title: 'Only your own sites',
    text: 'No third-party scraping, no spam. Every post promotes a page you actually own — the system was built around that constraint, not bolted on after.',
  },
  {
    icon: Plug,
    title: 'Official APIs only',
    text: "Every publish goes through each platform's real, documented API. Rate limits are tracked and respected, and nothing here works around a platform's terms of service to get extra reach.",
  },
  {
    icon: RefreshCw,
    title: 'Built to actually retry',
    text: "A failed publish is retried automatically with exponential backoff before it's ever marked failed for good — and when it is, you see exactly why in the schedule, not a silent drop.",
  },
  {
    icon: BarChart3,
    title: 'Data feeds back in',
    text: "Click performance from posts you've already published shapes future scheduling suggestions and which trend candidates get offered — the system gets sharper the more it runs, not static after setup.",
  },
]

export const FAQS = [
  {
    q: 'Do I need to spend anything on ads?',
    a: 'No — the entire point is organic distribution. The only costs are the AI generation calls themselves and whatever the platforms charge for API access at your tier (X, for example, gates some endpoints behind paid API credits).',
  },
  {
    q: 'Which platforms are supported right now?',
    a: 'X/Twitter, LinkedIn, and Reddit, each through its own official OAuth-authenticated connector. Newsletter distribution is on the roadmap.',
  },
  {
    q: 'Will automating posts get my account flagged?',
    a: "It's designed specifically to avoid that: official APIs only, your own content only, no reply-spam into other people's threads, and trend usage is capped and relevance-gated rather than forced onto every post.",
  },
  {
    q: 'Do I review posts before they go out, or is it fully automatic?',
    a: "Both work. Every generated post starts as a draft you can edit and approve before it's schedulable — or you can let it run hands-off once you're comfortable with the output it produces.",
  },
  {
    q: 'What happens if a scheduled post fails to publish?',
    a: "It's retried automatically up to 3 times with increasing delay (5, then 10, then 20 minutes). If it still fails, the post is marked failed with the actual error message from the platform, not a generic notice — and you can re-approve and reschedule it.",
  },
  {
    q: 'How is click tracking done without relying on the platform?',
    a: "Every post's link points to a redirect route on your own domain, which logs the click and then forwards the visitor to the real page. That's first-party data you control, independent of what each platform chooses to report back.",
  },
]
