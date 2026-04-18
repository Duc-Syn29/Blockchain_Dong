import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
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
  const canCheckIn = user?.role === "organizer" || user?.role === "staff";
  const canManageEvents = user?.role === "organizer";
  const canViewMyTickets = user?.role === "user";
  const [notifications, setNotifications] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <NavLink className="brand-mark" to="/">
            Blockchain Dong
          </NavLink>
        </div>
        <nav className="nav-links">
          <NavLink to="/">Trang chủ</NavLink>
          {!isAuthenticated ? <NavLink to="/login">Đăng nhập</NavLink> : null}
          {isAuthenticated ? (
            <div className="nav-menu-shell">
              <button
                className="ghost-button"
                type="button"
                onClick={() => setIsMenuOpen((current) => !current)}
              >
                Menu
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
                    className="ghost-button compact"
                    type="button"
                    onClick={logout}
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
