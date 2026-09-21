import Link from "next/link";
export default function NotFound() {
  return (
    <div className="empty-state">
      <h1>Company or page not found.</h1>
      <p className="subtitle">
        Choose a company from the configured research universe.
      </p>
      <Link className="text-link mt-6" href="/screener">
        Return to screener
      </Link>
    </div>
  );
}
