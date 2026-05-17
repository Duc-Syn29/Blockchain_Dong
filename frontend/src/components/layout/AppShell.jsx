import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import {
  APP_NOTIFICATIONS_EVENT,
  clearAppNotifications,
  getAppNotifications,
  removeAppNotification,
} from "../../utils/notifications";

const formatNotificationTime = (value) => {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
};

export function AppShell() {
  const { isAuthenticated, logout, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const canCheckIn = user?.role === "organizer" || user?.role === "staff";
  const canManageEvents = user?.role === "organizer";
  const canViewMyTickets = user?.role === "user";
  const [notifications, setNotifications] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuShellRef = useRef(null);

  useEffect(() => {
    setNotifications(getAppNotifications());

    const handleNotificationsUpdated = (event) => {
      setNotifications(event.detail || getAppNotifications());
    };

    window.addEventListener(APP_NOTIFICATIONS_EVENT, handleNotificationsUpdated);

    return () => {
      window.removeEventListener(APP_NOTIFICATIONS_EVENT, handleNotificationsUpdated);
    };
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    if (!isMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!menuShellRef.current?.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isMenuOpen]);

  const handleHomeClick = (event) => {
    event.preventDefault();
    setIsMenuOpen(false);
    navigate("/", {
      state: {
        refreshAt: Date.now(),
      },
    });
  };

  const handleLogout = () => {
    setIsMenuOpen(false);
    logout();
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <NavLink className="brand-mark" to="/" onClick={handleHomeClick} aria-label="Trang chủ" />
        </div>
        <nav className="nav-links nav-links-surface">
          <NavLink className="nav-link-item" to="/" onClick={handleHomeClick}>
            Trang chủ
          </NavLink>
          {!isAuthenticated ? (
            <NavLink className="nav-link-item" to="/login">
              Đăng nhập
            </NavLink>
          ) : null}
          {isAuthenticated ? (
            <div className="nav-menu-shell" ref={menuShellRef}>
              <button
                className="ghost-button"
                type="button"
                onClick={() => setIsMenuOpen((current) => !current)}
              >
                Menu
                {notifications.length > 0 ? (
                  <span className="notification-count">{notifications.length}</span>
                ) : null}
              </button>
              {isMenuOpen ? (
                <div className="nav-menu-dropdown">
                  <NavLink to="/profile" onClick={() => setIsMenuOpen(false)}>
                    Hồ sơ
                  </NavLink>
                  {canViewMyTickets ? (
                    <NavLink to="/my-tickets" onClick={() => setIsMenuOpen(false)}>
                      Vé của tôi
                    </NavLink>
                  ) : null}
                  {canManageEvents ? (
                    <NavLink to="/organizer" onClick={() => setIsMenuOpen(false)}>
                      Quản lý sự kiện
                    </NavLink>
                  ) : null}
                  {canCheckIn ? (
                    <NavLink to="/check-in" onClick={() => setIsMenuOpen(false)}>
                      Soát vé
                    </NavLink>
                  ) : null}
                  <button
                    className="nav-menu-item-button"
                    type="button"
                    onClick={handleLogout}
                  >
                    Đăng xuất
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </nav>
      </header>

      <main className="page-container">
        {notifications.length > 0 ? (
          <section className="status-banner notification-stack">
            <div className="panel-heading">
              <div>
                <h2>Thông báo gần đây</h2>
              </div>
              <button className="ghost-button compact" type="button" onClick={clearAppNotifications}>
                Xóa hết
              </button>
            </div>
            <div className="table-grid">
              {notifications.map((notification) => (
                <div className="table-row" key={notification.id}>
                  <strong>{notification.title}</strong>
                  <span>{notification.message}</span>
                  <div className="inline-actions">
                    <span>{formatNotificationTime(notification.createdAt)}</span>
                    <button
                      className="ghost-button compact"
                      type="button"
                      onClick={() => removeAppNotification(notification.id)}
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
        <Outlet />
      </main>
    </div>
  );
}
