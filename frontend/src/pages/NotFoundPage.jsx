import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <section className="hero-panel">
      <div className="hero-copy">
        <p className="eyebrow">404</p>
        <h1>Page not found</h1>
        <p>The page you requested does not exist in the current frontend scaffold.</p>
      </div>
      <Link className="primary-button" to="/">
        Back to home
      </Link>
    </section>
  );
}
