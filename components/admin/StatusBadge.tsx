export default function StatusBadge({ published }: { published: boolean }) {
  return <span className={`a-badge ${published ? "a-badge-live" : "a-badge-draft"}`}>{published ? "Published" : "Draft"}</span>;
}
