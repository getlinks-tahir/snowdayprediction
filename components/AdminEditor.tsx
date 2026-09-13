"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BlogPost, PostInput } from "@/lib/types";

const emptyPost: PostInput = { title: "", slug: "", excerpt: "", content: "", status: "draft", featuredImage: "", metaTitle: "", metaDescription: "", metaKeywords: "" };

function slugify(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 90);
}

export function AdminEditor({ post }: { post?: BlogPost }) {
  const router = useRouter();
  const editorRef = useRef<HTMLDivElement>(null);
  const contentImageInput = useRef<HTMLInputElement>(null);
  const featuredImageInput = useRef<HTMLInputElement>(null);
  const [fields, setFields] = useState<PostInput>(post ? {
    title: post.title, slug: post.slug, excerpt: post.excerpt, content: post.content, status: post.status,
    featuredImage: post.featuredImage, metaTitle: post.metaTitle, metaDescription: post.metaDescription, metaKeywords: post.metaKeywords,
  } : emptyPost);
  const [slugEdited, setSlugEdited] = useState(Boolean(post?.slug));
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { if (editorRef.current) editorRef.current.innerHTML = fields.content; }, []); // Set initial rich text once.

  function update(name: keyof PostInput, value: string) {
    setFields((current) => {
      const next = { ...current, [name]: value };
      if (name === "title" && !slugEdited) next.slug = slugify(value);
      return next;
    });
  }

  function runCommand(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    update("content", editorRef.current?.innerHTML || "");
  }

  function insertLink() {
    const url = window.prompt("Paste the link URL:");
    if (url) runCommand("createLink", url);
  }

  async function uploadImage(file: File) {
    const form = new FormData();
    form.set("image", file);
    setUploading(true); setError("");
    try {
      const response = await fetch("/api/admin/upload", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Image upload failed.");
      return data.url as string;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Image upload failed.");
      return null;
    } finally { setUploading(false); }
  }

  async function addContentImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const url = await uploadImage(file);
    if (url) runCommand("insertImage", url);
  }

  async function addFeaturedImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const url = await uploadImage(file);
    if (url) update("featuredImage", url);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setError(""); setSuccess(""); setSaving(true);
    const payload = { ...fields, content: editorRef.current?.innerHTML || "" };
    try {
      const response = await fetch(post ? `/api/admin/posts/${post.id}` : "/api/admin/posts", {
        method: post ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save the post.");
      setSuccess(data.status === "published" ? "Saved and published. It is now visible in the Blog section." : "Draft saved. Publish it whenever you are ready.");
      if (!post) router.replace(`/admin/edit/${data.id}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the post.");
    } finally { setSaving(false); }
  }

  async function deleteThisPost() {
    if (!post || !window.confirm("Delete this post permanently?")) return;
    const response = await fetch(`/api/admin/posts/${post.id}`, { method: "DELETE" });
    if (response.ok) router.replace("/admin");
    else setError("Could not delete this post. Please try again.");
  }

  return (
    <form className="admin-form" onSubmit={save}>
      {success && <p className="success-message">{success}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="editor-grid">
        <div className="editor-fields">
          <div>
            <label className="form-label" htmlFor="title">Post title</label>
            <input id="title" value={fields.title} onChange={(event) => update("title", event.target.value)} maxLength={140} placeholder="Your post title" required />
          </div>
          <div>
            <label className="form-label" htmlFor="slug">Page address</label>
            <input id="slug" value={fields.slug} onChange={(event) => { setSlugEdited(true); update("slug", event.target.value); }} maxLength={90} placeholder="your-post-title" required />
            <p className="field-note">Your article will be at /blog/{fields.slug || "your-post-title"}</p>
          </div>
          <div>
            <label className="form-label" htmlFor="excerpt">Short description</label>
            <textarea id="excerpt" rows={3} value={fields.excerpt} onChange={(event) => update("excerpt", event.target.value)} maxLength={220} placeholder="A short summary shown on the Blog page" required />
            <p className="field-note">{fields.excerpt.length}/220 characters</p>
          </div>
          <div>
            <label className="form-label">Article content</label>
            <div className="rich-editor">
              <div className="rich-editor-toolbar" aria-label="Formatting tools">
                <button type="button" onClick={() => runCommand("bold")} aria-label="Bold">B</button>
                <button type="button" onClick={() => runCommand("italic")} aria-label="Italic"><em>I</em></button>
                <button type="button" onClick={() => runCommand("formatBlock", "h2")} aria-label="Heading">H2</button>
                <button type="button" onClick={() => runCommand("insertUnorderedList")} aria-label="Bullet list">• List</button>
                <button type="button" onClick={() => runCommand("insertOrderedList")} aria-label="Numbered list">1. List</button>
                <button type="button" onClick={insertLink} aria-label="Add link">Link</button>
                <button type="button" onClick={() => contentImageInput.current?.click()} disabled={uploading} aria-label="Add image">{uploading ? "…" : "Image"}</button>
                <input ref={contentImageInput} hidden type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={addContentImage} />
              </div>
              <div ref={editorRef} className="editable-area" contentEditable suppressContentEditableWarning data-placeholder="Write your article here…" onInput={(event) => update("content", event.currentTarget.innerHTML)} />
            </div>
            <p className="field-note">Use the toolbar to format the article and add images. You can also paste normal text directly.</p>
          </div>
        </div>

        <aside>
          <section className="sidebar-section">
            <h2>Publish</h2>
            <label className="form-label" htmlFor="status">Post status</label>
            <select id="status" value={fields.status} onChange={(event) => update("status", event.target.value)}>
              <option value="draft">Save as draft</option>
              <option value="published">Publish now</option>
            </select>
            <p className="field-note">Published posts appear automatically on the public Blog page and home page.</p>
          </section>
          <section className="sidebar-section">
            <h2>Featured image</h2>
            <button className="button button-secondary button-small" type="button" disabled={uploading} onClick={() => featuredImageInput.current?.click()}>{uploading ? "Uploading…" : "Upload image"}</button>
            <input ref={featuredImageInput} hidden type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={addFeaturedImage} />
            {fields.featuredImage && <img className="featured-preview" src={fields.featuredImage} alt="Featured image preview" />}
          </section>
          <section className="sidebar-section">
            <h2>Search preview (optional)</h2>
            <label className="form-label" htmlFor="metaTitle">Search title</label>
            <input id="metaTitle" value={fields.metaTitle} onChange={(event) => update("metaTitle", event.target.value)} maxLength={160} />
            <label className="form-label" htmlFor="metaDescription">Search description</label>
            <textarea id="metaDescription" rows={3} value={fields.metaDescription} onChange={(event) => update("metaDescription", event.target.value)} maxLength={170} />
            <label className="form-label" htmlFor="metaKeywords">Keywords</label>
            <input id="metaKeywords" value={fields.metaKeywords} onChange={(event) => update("metaKeywords", event.target.value)} maxLength={240} placeholder="snow day, school closure" />
          </section>
        </aside>
      </div>
      <div className="editor-actions">
        <button className="button button-primary" disabled={saving || uploading}>{saving ? "Saving…" : post ? "Save changes" : "Create post"}</button>
        <Link className="button button-secondary" href="/admin">Cancel</Link>
        {post?.status === "published" && <Link className="button button-secondary" href={`/blog/${post.slug}`} target="_blank">View post</Link>}
        {post && <button className="button button-danger" type="button" onClick={deleteThisPost}>Delete post</button>}
      </div>
    </form>
  );
}
