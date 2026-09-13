import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getAllPosts, savePost } from "@/lib/posts";

function unauthorized() {
  return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
}

export async function GET() {
  if (!(await isAdmin())) return unauthorized();
  return NextResponse.json(await getAllPosts());
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return unauthorized();
  try {
    const post = await savePost(await request.json());
    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the post.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
