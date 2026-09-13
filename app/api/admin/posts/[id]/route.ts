import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { deletePost, getPost, savePost } from "@/lib/posts";

function unauthorized() {
  return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
}

type Context = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Context) {
  if (!(await isAdmin())) return unauthorized();
  const post = await getPost((await params).id);
  return post ? NextResponse.json(post) : NextResponse.json({ error: "Post not found." }, { status: 404 });
}

export async function PATCH(request: Request, { params }: Context) {
  if (!(await isAdmin())) return unauthorized();
  const id = (await params).id;
  if (!(await getPost(id))) return NextResponse.json({ error: "Post not found." }, { status: 404 });
  try {
    return NextResponse.json(await savePost(await request.json(), id));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the post.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: Context) {
  if (!(await isAdmin())) return unauthorized();
  const deleted = await deletePost((await params).id);
  return deleted ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Post not found." }, { status: 404 });
}
