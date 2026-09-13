import "server-only";

import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { BlogPost, PostInput, PostStatus } from "@/lib/types";

const dataFile = path.join(process.cwd(), "data", "posts.json");

async function ensureDataFile() {
  await fs.mkdir(path.dirname(dataFile), { recursive: true });
  try {
    await fs.access(dataFile);
  } catch {
    await fs.writeFile(dataFile, "[]\n", "utf8");
  }
}

async function readPosts(): Promise<BlogPost[]> {
  await ensureDataFile();
  const raw = await fs.readFile(dataFile, "utf8");
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function writePosts(posts: BlogPost[]) {
  await ensureDataFile();
  const temporaryFile = `${dataFile}.tmp`;
  await fs.writeFile(temporaryFile, `${JSON.stringify(posts, null, 2)}\n`, "utf8");
  await fs.rename(temporaryFile, dataFile);
}

export function makeSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 90) || "post";
}

function cleanText(value: unknown, maxLength = 10_000) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

// The editor only creates the tags below. This removes scripts, inline events and unsafe links.
export function sanitizeHtml(value: unknown) {
  const html = cleanText(value, 100_000);
  return html
    .replace(/<\/?(script|style|iframe|object|embed|form)[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/<(?!\/?(?:p|br|strong|b|em|i|u|h2|h3|blockquote|ul|ol|li|a|img|figure|figcaption)\b)[^>]*>/gi, "");
}

function normalizeInput(input: Partial<PostInput>): PostInput {
  const requestedStatus = cleanText(input.status, 20) as PostStatus;
  return {
    title: cleanText(input.title, 140),
    slug: makeSlug(cleanText(input.slug, 100) || cleanText(input.title, 140)),
    excerpt: cleanText(input.excerpt, 220),
    content: sanitizeHtml(input.content),
    status: requestedStatus === "published" ? "published" : "draft",
    featuredImage: cleanText(input.featuredImage, 300),
    metaTitle: cleanText(input.metaTitle, 160),
    metaDescription: cleanText(input.metaDescription, 170),
    metaKeywords: cleanText(input.metaKeywords, 240),
  };
}

function uniqueSlug(posts: BlogPost[], requestedSlug: string, currentId?: string) {
  const base = makeSlug(requestedSlug);
  let candidate = base;
  let count = 2;
  while (posts.some((post) => post.slug === candidate && post.id !== currentId)) {
    candidate = `${base}-${count++}`;
  }
  return candidate;
}

function sortNewest(posts: BlogPost[]) {
  return [...posts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getAllPosts() {
  return sortNewest(await readPosts());
}

export async function getPublishedPosts() {
  return (await getAllPosts()).filter((post) => post.status === "published");
}

export async function getPost(id: string) {
  return (await readPosts()).find((post) => post.id === id) ?? null;
}

export async function getPublishedPostBySlug(slug: string) {
  return (await readPosts()).find((post) => post.slug === slug && post.status === "published") ?? null;
}

export async function savePost(input: Partial<PostInput>, id?: string) {
  const posts = await readPosts();
  const values = normalizeInput(input);
  if (!values.title) throw new Error("Please add a post title.");
  if (!values.excerpt) throw new Error("Please add a short description for the blog card.");
  if (!values.content.replace(/<[^>]+>/g, "").trim()) throw new Error("Please write some post content.");

  const now = new Date().toISOString();
  values.slug = uniqueSlug(posts, values.slug, id);
  const existingIndex = id ? posts.findIndex((post) => post.id === id) : -1;

  if (existingIndex >= 0) {
    const saved = { ...posts[existingIndex], ...values, updatedAt: now };
    posts[existingIndex] = saved;
    await writePosts(posts);
    return saved;
  }

  const saved: BlogPost = {
    ...values,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  posts.push(saved);
  await writePosts(posts);
  return saved;
}

export async function deletePost(id: string) {
  const posts = await readPosts();
  const filtered = posts.filter((post) => post.id !== id);
  if (filtered.length === posts.length) return false;
  await writePosts(filtered);
  return true;
}
