import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function TestSupabasePage() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("posts")
    .select("id")
    .limit(1);

  if (error) {
    return (
      <div style={{ padding: 40 }}>
        <h1>Supabase connection failed ❌</h1>
        <pre>{error.message}</pre>
      </div>
    );
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Supabase connected successfully ✅</h1>
      <p>Posts table is accessible.</p>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}