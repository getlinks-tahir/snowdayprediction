
"use server";

import { randomUUID } from "node:crypto";
import { requireAdmin } from "@/lib/admin/auth";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
} as const;

export async function uploadBlogImage(formData: FormData) {
  try {
    const { supabase } = await requireAdmin();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return { ok: false as const, error: "Please select an image." };
    }

    if (!(file.type in ALLOWED_TYPES)) {
      return {
        ok: false as const,
        error: "Only JPG, PNG, WebP, and GIF images are allowed.",
      };
    }

    if (file.size > MAX_FILE_SIZE) {
      return {
        ok: false as const,
        error: "Image must be 5 MB or smaller.",
      };
    }

    const extension =
      ALLOWED_TYPES[file.type as keyof typeof ALLOWED_TYPES];

    const path = `${randomUUID()}.${extension}`;

    const { error } = await supabase.storage
      .from("blog-images")
      .upload(path, file, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error("Blog image upload failed:", error.message);
      return {
        ok: false as const,
        error: "Upload failed. Check your Storage permissions and try again.",
      };
    }

    const { data } = supabase.storage
      .from("blog-images")
      .getPublicUrl(path);

    return { ok: true as const, url: data.publicUrl };
  } catch (error) {
    console.error("Blog image upload error:", error);
    return {
      ok: false as const,
      error: "Could not upload the image. Please try again.",
    };
  }
}
