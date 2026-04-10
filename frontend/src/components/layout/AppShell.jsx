import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export function AppShell() {
  const { isAuthenticated, logout, user } = useAuth();
  const canCheckIn = user?.role === "organizer" || user?.role === "staff";
  const canManageEvents = user?.role === "organizer";

  return (
    <div className="app-shell">
      <header className="topbar">
        <nav className="nav-links">
          <NavLink to="/">Trang chủ</NavLink>
          {isAuthenticated ? (
            <>
              <NavLink to="/profile">Hồ sơ</NavLink>
              {canManageEvents ? <NavLink to="/organizer">Quản lý sự kiện</NavLink> : null}
              {canCheckIn ? <NavLink to="/check-in">Soát vé</NavLink> : null}
              <button className="ghost-button" type="button" onClick={logout}>
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login">Đăng nhập</NavLink>
            </>
          )}
        </nav>
      </header>

      <main className="page-container">
        <Outlet />
      </main>
    </div>
  );
}
