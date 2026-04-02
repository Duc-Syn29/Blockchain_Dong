import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <section className="hero-panel">
      <div className="hero-copy">
        <p className="eyebrow">Week 1 foundation</p>
        <h1>Frontend skeleton for the event ticket dApp</h1>
        <p>
          This setup gives us routing, authentication state, API integration, and a profile
          page so we can keep building events, ticket purchase, and wallet flows next.
        </p>
      </div>

      <div className="hero-actions">
        <Link className="primary-button" to={isAuthenticated ? "/profile" : "/register"}>
          {isAuthenticated ? "Open profile" : "Create account"}
        </Link>
        <Link className="secondary-button" to="/login">
          Sign in
        </Link>
      </div>
    </section>
  );
}
