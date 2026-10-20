import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { POSTS } from "../content/posts";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  const rows = POSTS.map((post) => ({
    slug: post.slug,
    title: post.title,
    description: post.description,
    date: post.date,
    updated: post.updated ?? null,
    published: post.published,
    read_minutes: post.readMinutes,
    image: post.image,
    image_alt: post.imageAlt,
    tags: JSON.stringify(post.tags),
    sections: post.sections,
  }));

  const { data, error } = await supabase
    .from("posts")
    .upsert(rows, { onConflict: "slug" })
    .select();

  if (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }

  console.log(`Successfully migrated ${data.length} posts.`);
}

migrate();