import { NextResponse } from "next/server";
import { createAdminSession, loginIsValid } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!loginIsValid(username, password)) {
    return NextResponse.json({ error: "That username or password is not correct." }, { status: 401 });
  }

  await createAdminSession();
  return NextResponse.json({ ok: true });
}
