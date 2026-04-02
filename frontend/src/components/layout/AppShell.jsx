import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export function AppShell() {
  const { isAuthenticated, logout, user } = useAuth();

  return (
    <div className="app-shell">
      <header className="topbar">
        <nav className="nav-links">
          <NavLink to="/">Home</NavLink>
          {isAuthenticated ? (
            <>
              <NavLink to="/profile">Profile</NavLink>
              <button className="ghost-button" type="button" onClick={logout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login">Login</NavLink>
            </>
          )}
        </nav>
      </header>

      <main className="page-container">
        {isAuthenticated && user ? (
          <div className="status-banner">
            Logged in as <strong>{user.name}</strong> ({user.role})
          </div>
        ) : null}

        <Outlet />
      </main>
    </div>
  );
}
