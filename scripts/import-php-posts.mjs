/*
  One-time helper for the old PHP admin panel.
  Example (run from this project folder):
  node scripts/import-php-posts.mjs "C:\\path\\to\\admin\\includes\\data\\posts.json" "C:\\path\\to\\admin\\includes\\uploads"
*/
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const [sourceFile, legacyUploads] = process.argv.slice(2);
if (!sourceFile) {
  console.error("Give the path to your old posts.json file.");
  process.exit(1);
}

const root = process.cwd();
const targetFile = path.join(root, "data", "posts.json");
const targetUploads = path.join(root, "public", "uploads");
const oldPosts = JSON.parse(await fs.readFile(sourceFile, "utf8"));

function slugify(value) {
  return String(value || "post").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "post";
}

async function copyUpload(folder, name) {
  if (!legacyUploads || !name) return "";
  const source = path.join(legacyUploads, folder, path.basename(name));
  const destination = path.join(targetUploads, path.basename(name));
  try {
    await fs.copyFile(source, destination);
    return `/uploads/${path.basename(name)}`;
  } catch {
    return "";
  }
}

await fs.mkdir(targetUploads, { recursive: true });
const imported = [];
for (const old of oldPosts) {
  let content = String(old.content || "");
  const imageNames = [...content.matchAll(/\/uploads\/content\/([^"'<>/?]+)/gi)].map((match) => match[1]);
  for (const imageName of imageNames) {
    const replacement = await copyUpload("content", imageName);
    if (replacement) {
      const escaped = imageName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      content = content.replace(new RegExp(`https?:[^"'<>]*?/uploads/content/${escaped}`, "gi"), replacement);
      content = content.replaceAll(`/uploads/content/${imageName}`, replacement);
    }
  }
  const featuredImage = await copyUpload("featured", old.featured_image);
  imported.push({
    id: crypto.randomUUID(),
    title: String(old.title || "Untitled post"),
    slug: slugify(old.slug || old.title),
    excerpt: String(old.short_description || "Read this article on Snow Day Calculator."),
    content,
    status: old.status === "published" ? "published" : "draft",
    featuredImage,
    metaTitle: String(old.meta_title || ""),
    metaDescription: String(old.meta_description || ""),
    metaKeywords: String(old.meta_keywords || ""),
    createdAt: old.created_at ? new Date(old.created_at.replace(" ", "T")).toISOString() : new Date().toISOString(),
    updatedAt: old.updated_at ? new Date(old.updated_at.replace(" ", "T")).toISOString() : new Date().toISOString(),
  });
}
await fs.writeFile(targetFile, `${JSON.stringify(imported, null, 2)}\n`, "utf8");
console.log(`Imported ${imported.length} post(s).`);
