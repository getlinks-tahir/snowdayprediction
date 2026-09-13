import Link from "next/link";
import { Calculator } from "@/components/Calculator";
import { PostCard } from "@/components/PostCard";
import { getPublishedPosts } from "@/lib/posts";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const newestPosts = (await getPublishedPosts()).slice(0, 3);
  return (
    <>
      <div className="page-shell home-shell">
        <Calculator />
        <section className="how-section" id="how-it-works">
          <p className="eyebrow">Simple, live, and local</p>
          <h2>How the calculator works</h2>
          <div className="steps-grid">
            <article><span>1</span><h3>Find your location</h3><p>Enter a ZIP code, Canadian postal code, or city name.</p></article>
            <article><span>2</span><h3>Read tomorrow&apos;s forecast</h3><p>We check snowfall, temperature, wind, precipitation and weather conditions.</p></article>
            <article><span>3</span><h3>Get a clear estimate</h3><p>The weather factors are combined into one easy percentage.</p></article>
          </div>
          <p className="fine-print">Real closure decisions also depend on local road conditions and district policy. Always follow your school district&apos;s official announcement.</p>
        </section>
      </div>
      <section className="blog-preview-section">
        <div className="page-shell">
          <div className="section-heading">
            <div><p className="eyebrow">From the blog</p><h2>Winter weather guidance</h2></div>
            <Link className="text-link" href="/blog">See all articles <span aria-hidden="true">→</span></Link>
          </div>
          {newestPosts.length ? <div className="posts-grid">{newestPosts.map((post) => <PostCard post={post} key={post.id} />)}</div> : (
            <div className="empty-public-state"><span>✍️</span><h3>Your blog is ready</h3><p>Publish your first post in the admin area and it will appear here automatically.</p></div>
          )}
        </div>
      </section>
    </>
  );
}
