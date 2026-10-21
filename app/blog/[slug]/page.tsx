import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import PostSections from "@/components/PostSections";
import { getPostBySlug, getPublishedPosts } from "@/content/posts";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

type Props = {
  params: Promise<{ slug: string }>;
};

const AUTHOR_NAME = "Muhammad Tahir";
const AUTHOR_ROLE = "Creator of Snow Day Calculator";
const AUTHOR_BIO =
  "I work on Snow Day Calculator to help families in the United States and Canada understand snow day chances, winter weather, and possible school closures.";
const AUTHOR_INITIALS = "MT";

// Scoped styles: every selector is prefixed with .author-box, so nothing else on the page is affected.
const AUTHOR_BOX_CSS = `
.author-box {
  --ab-accent: var(--accent, #2563eb);
  position: relative;
  display: flex;
  align-items: center;
  gap: 20px;
  margin: 48px 0 0;
  padding: 24px 26px 24px 30px;
  border: 1px solid color-mix(in srgb, currentColor 14%, transparent);
  border-radius: 16px;
  background: color-mix(in srgb, currentColor 4%, transparent);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04), 0 8px 24px -12px rgba(0, 0, 0, 0.12);
  overflow: hidden;
}
.author-box::before {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  background: linear-gradient(180deg, var(--ab-accent), color-mix(in srgb, var(--ab-accent) 40%, #7dd3fc));
}
.author-box .author-box__avatar {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--ab-accent), color-mix(in srgb, var(--ab-accent) 55%, #0ea5e9));
  color: #fff;
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--ab-accent) 18%, transparent);
  user-select: none;
}
.author-box .author-box__body {
  min-width: 0;
}
.author-box .author-box__eyebrow {
  margin: 0 0 4px;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ab-accent);
}
.author-box .author-box__name {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  line-height: 1.3;
}
.author-box .author-box__role {
  margin: 2px 0 10px;
  font-size: 0.92rem;
  font-weight: 500;
  opacity: 0.7;
}
.author-box .author-box__bio {
  margin: 0;
  font-size: 0.97rem;
  line-height: 1.65;
  opacity: 0.88;
}
@media (max-width: 560px) {
  .author-box {
    flex-direction: column;
    align-items: flex-start;
    gap: 14px;
    padding: 22px 20px 22px 24px;
    margin-top: 36px;
  }
  .author-box .author-box__avatar {
    width: 56px;
    height: 56px;
    font-size: 1.15rem;
  }
}
`;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const post = await getPostBySlug((await params).slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      images: [post.image],
      publishedTime: post.date,
    },
  };
}

export default async function PostPage({ params }: Props) {
  const post = await getPostBySlug((await params).slug);
  if (!post) notFound();
  const more = (await getPublishedPosts())
    .filter((item) => item.slug !== post.slug)
    .slice(0, 2);
  return (
    <article className="section">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description: post.description,
          datePublished: post.date,
          dateModified: post.updated ?? post.date,
          image: /^https?:\/\//.test(post.image)
            ? post.image
            : `${SITE_URL}${post.image}`,
          author: {
            "@type": "Person",
            name: AUTHOR_NAME,
          },
          publisher: {
            "@type": "Organization",
            name: SITE_NAME,
          },
          mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
        }}
      />
      <div className="container prose">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link> / <Link href="/blog">Blog</Link>
        </nav>
        <h1 style={{ fontSize: "clamp(2rem, 4.5vw, 3rem)" }}>
          {post.title}
        </h1>
        <p className="post-meta">
          {new Date(`${post.date}T12:00:00Z`).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
            timeZone: "UTC",
          })}{" "}
          · {post.readMinutes} min read
        </p>
        <div className="post-hero">
          <Image
            src={post.image}
            alt={post.imageAlt}
            fill
            priority
            sizes="(max-width: 820px) 100vw, 780px"
            unoptimized
          />
        </div>
        <PostSections sections={post.sections} />

        <style dangerouslySetInnerHTML={{ __html: AUTHOR_BOX_CSS }} />
        <aside className="author-box" aria-label="About the author">
          <div className="author-box__avatar" aria-hidden="true">
            {AUTHOR_INITIALS}
          </div>
          <div className="author-box__body">
            <p className="author-box__eyebrow">Written by</p>
            <p className="author-box__name">{AUTHOR_NAME}</p>
            <p className="author-box__role">{AUTHOR_ROLE}</p>
            <p className="author-box__bio">{AUTHOR_BIO}</p>
          </div>
        </aside>

        <div className="callout" style={{ marginTop: 40 }}>
          <p>
            <strong>Want a real number for tomorrow?</strong>{" "}
            <Link href="/#calculator">Check your snow day chance</Link> with
            your ZIP or postal code.
          </p>
        </div>
        {more.length > 0 && (
          <>
            <h2 style={{ fontSize: "1.4rem" }}>Keep reading</h2>
            <ul>
              {more.map((item) => (
                <li key={item.slug}>
                  <Link href={`/blog/${item.slug}`}>{item.title}</Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </article>
  );
}
