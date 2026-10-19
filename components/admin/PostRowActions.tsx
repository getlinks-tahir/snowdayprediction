"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deletePost, setPublished } from "@/lib/admin/actions";
import ConfirmDialog from "./ConfirmDialog";
import Icon from "./Icon";
import { useToast } from "./Toast";

interface Props { id: number; title: string; slug: string; published: boolean }

export default function PostRowActions({ id, title, slug, published }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState<"delete" | "unpublish" | null>(null);

  function togglePublish() {
    start(async () => {
      const res = await setPublished(id, !published);
      setConfirm(null);
      if (!res.ok) { toast.push(res.error, "error"); return; }
      toast.push(published ? "Unpublished. The post is now a draft." : "Published. The post is live.", "success");
      router.refresh();
    });
  }

  function remove() {
    start(async () => {
      const res = await deletePost(id);
      setConfirm(null);
      if (!res.ok) { toast.push(res.error, "error"); return; }
      toast.push("Post deleted.", "success");
      router.refresh();
    });
  }

  return (
    <>
      <div className="a-row-actions">
        <Link className="icon-btn" href={`/admin/posts/${id}/edit`} aria-label={`Edit ${title}`} title="Edit"><Icon name="edit" /></Link>
        <Link className="icon-btn" href={`/admin/posts/${id}/preview`} aria-label={`Preview ${title}`} title="Preview"><Icon name="eye" /></Link>
        {published && (
          <a className="icon-btn" href={`/blog/${slug}`} target="_blank" rel="noopener noreferrer" aria-label={`View ${title} on the site`} title="View live"><Icon name="external" /></a>
        )}
        <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => (published ? setConfirm("unpublish") : togglePublish())}>
          <Icon name={published ? "download" : "upload"} /> {published ? "Unpublish" : "Publish"}
        </button>
        <button type="button" className="icon-btn a-danger" disabled={pending} onClick={() => setConfirm("delete")} aria-label={`Delete ${title}`} title="Delete"><Icon name="trash" /></button>
      </div>

      <ConfirmDialog open={confirm === "delete"} title="Delete this post?" confirmLabel="Delete post" danger busy={pending} onConfirm={remove} onCancel={() => setConfirm(null)}>
        <p><strong>{title || "Untitled"}</strong> will be deleted permanently. {published ? "Its page will stop working and visitors will see a 404." : ""} This can't be undone.</p>
      </ConfirmDialog>
      <ConfirmDialog open={confirm === "unpublish"} title="Unpublish this post?" confirmLabel="Unpublish" busy={pending} onConfirm={togglePublish} onCancel={() => setConfirm(null)}>
        <p><strong>{title || "Untitled"}</strong> becomes a draft and disappears from the blog, home page and sitemap. You can publish it again any time.</p>
      </ConfirmDialog>
    </>
  );
}
