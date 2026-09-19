import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import { getPostBySlug, getPublishedPosts } from "@/content/posts";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const revalidate = 3600;
export const dynamicParams = false;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getPublishedPosts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPostBySlug((await params).slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { type: "article", title: post.title, description: post.description, images: [post.image], publishedTime: post.date },
  };
}

export default async function PostPage({ params }: Props) {
  const post = await getPostBySlug((await params).slug);
  if (!post) notFound();
  const more = (await getPublishedPosts()).filter((p) => p.slug !== post.slug).slice(0, 2);

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
          image: `${SITE_URL}${post.image}`,
          author: { "@type": "Organization", name: SITE_NAME },
          publisher: { "@type": "Organization", name: SITE_NAME },
          mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
        }}
      />
      <div className="container prose">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link> / <Link href="/blog">Blog</Link>
        </nav>
        <h1 style={{ fontSize: "clamp(2rem, 4.5vw, 3rem)" }}>{post.title}</h1>
        <p className="post-meta">
          {new Date(`${post.date}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })} · {post.readMinutes} min read
        </p>
        <div className="post-hero">
          <Image src={post.image} alt={post.imageAlt} fill priority sizes="(max-width: 820px) 100vw, 780px" unoptimized />
        </div>
        {post.sections.map((s, i) => (
          <section key={i}>
            {s.heading && <h2 style={{ fontSize: "1.6rem" }}>{s.heading}</h2>}
            {s.paragraphs?.map((p) => <p key={p.slice(0, 30)}>{p}</p>)}
            {s.list && (
              <ul>
                {s.list.map((li) => <li key={li}>{li}</li>)}
              </ul>
            )}
            {s.callout && <div className="callout"><p>{s.callout}</p></div>}
          </section>
        ))}

        <div className="callout" style={{ marginTop: 40 }}>
          <p>
            <strong>Want a real number for tomorrow?</strong> <Link href="/#calculator">Check your snow day chance</Link> with
            your ZIP or postal code.
          </p>
        </div>

        {more.length > 0 && (
          <>
            <h2 style={{ fontSize: "1.4rem" }}>Keep reading</h2>
            <ul>
              {more.map((p) => (
                <li key={p.slug}><Link href={`/blog/${p.slug}`}>{p.title}</Link></li>
              ))}
            </ul>
          </>
        )}
      </div>
    </article>
  );
}
