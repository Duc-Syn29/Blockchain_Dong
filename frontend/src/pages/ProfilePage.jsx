import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { authService } from "../services/authService";
import { organizerService } from "../services/organizerService";
import { ticketService } from "../services/ticketService";

const PROFILE_TABS = {
  user: [
    { id: "info", label: "Thông tin" },
    { id: "wallet", label: "Ví" },
    { id: "history", label: "Lịch sử" },
  ],
  organizer: [
    { id: "organization", label: "Hồ sơ tổ chức" },
    { id: "wallet", label: "Ví nhận tiền" },
    { id: "stats", label: "Thống kê" },
    { id: "settings", label: "Cài đặt" },
  ],
};

const defaultOrganizerSettings = {
  contactPhone: "",
  contactBio: "",
  showEmailPublic: true,
  showWalletPublic: true,
  showAvatarPublic: true,
};

const formatDateTime = (value) => {
  if (!value) {
    return "Chưa có dữ liệu";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Chưa có dữ liệu";
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

const EVENT_VISUALS = [
  { from: "#14213d", to: "#1d3557", glow: "rgba(255, 196, 92, 0.28)" },
  { from: "#4f000b", to: "#9d0208", glow: "rgba(255, 140, 120, 0.26)" },
  { from: "#283618", to: "#606c38", glow: "rgba(255, 214, 102, 0.24)" },
  { from: "#3d405b", to: "#6d597a", glow: "rgba(255, 200, 162, 0.26)" },
];

const hashTitle = (value) =>
  String(value || "")
    .split("")
    .reduce((total, char) => total + char.charCodeAt(0), 0);

const escapePosterUrl = (value) => String(value || "").replace(/"/g, '\\"');

const getPosterStyle = (event) => {
  const palette = EVENT_VISUALS[hashTitle(event?.title) % EVENT_VISUALS.length];

  if (!event?.posterUrl) {
    return {
      background:
        `radial-gradient(circle at top right, ${palette.glow}, transparent 36%), ` +
        `linear-gradient(145deg, ${palette.from}, ${palette.to})`,
    };
  }

  return {
    backgroundImage: `linear-gradient(180deg, rgba(20, 33, 61, 0.14), rgba(20, 33, 61, 0.38)), url("${escapePosterUrl(event.posterUrl)}")`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
};

export function ProfilePage() {
  const { user, updateProfile, updateTicketPin, linkWallet, logout, isLoading } = useAuth();
  const isOrganizer = user?.role === "organizer";
  const isUserAccount = user?.role === "user";
  const isWalletLinked = Boolean(user?.walletLinked);
  const tabs = isOrganizer ? PROFILE_TABS.organizer : PROFILE_TABS.user;
  const [activeTab, setActiveTab] = useState(tabs[0]?.id || "info");
  const [showWallet, setShowWallet] = useState(false);
  const [isLinkingWallet, setIsLinkingWallet] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const formatHash = (hash) => {
    if (!hash) {
      return "";
    }

    if (hash.length <= 12) {
      return hash;
    }

    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };
  const formatWallet = (wallet) => formatHash(wallet);
  const roleLabel = user?.role === "organizer" ? "Ban tổ chức" : "Người dùng";
  const [profileValues, setProfileValues] = useState({
    name: "",
    email: "",
    avatarUrl: "",
  });
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [organizerStats, setOrganizerStats] = useState({
    totalEvents: 0,
    totalTickets: 0,
    soldTickets: 0,
    checkedInCount: 0,
    totalRevenue: 0,
    soldOutEvents: 0,
  });
  const [statsMessage, setStatsMessage] = useState("");
  const [statsError, setStatsError] = useState("");
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [settingsValues, setSettingsValues] = useState(defaultOrganizerSettings);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [ticketPinValues, setTicketPinValues] = useState({
    ticketPin: "",
    confirmTicketPin: "",
  });
  const [hasTicketPinState, setHasTicketPinState] = useState(Boolean(user?.hasTicketPin));
  const [historyEvents, setHistoryEvents] = useState([]);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [historyMessage, setHistoryMessage] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const displayName = user?.name || (isOrganizer ? "Ban tổ chức" : "Người dùng");
  const avatarSeed = (displayName || user?.email || "U").trim();
  const avatarFallback = avatarSeed.slice(0, 1).toUpperCase();
  const visibleEmail = !isOrganizer || settingsValues.showEmailPublic;
  const visibleWallet = !isOrganizer || settingsValues.showWalletPublic;
  const visibleAvatar = !isOrganizer || settingsValues.showAvatarPublic;
  const hasTicketPin = Boolean(hasTicketPinState || user?.hasTicketPin);

  useEffect(() => {
    setProfileValues({
      name: user?.name || "",
      email: user?.email || "",
      avatarUrl: user?.avatarUrl || "",
    });
  }, [user]);

  useEffect(() => {
    setHasTicketPinState(Boolean(user?.hasTicketPin));
  }, [user?.hasTicketPin]);

  useEffect(() => {
    setActiveTab(tabs[0]?.id || "info");
  }, [isOrganizer]);

  useEffect(() => {
    if (!isOrganizer) {
      setSettingsValues(defaultOrganizerSettings);
      return;
    }

    let isCancelled = false;

    const loadOrganizerSettings = async () => {
      try {
        const response = await authService.getOrganizerSettings();
        if (isCancelled) {
          return;
        }

        setSettingsValues({
          ...defaultOrganizerSettings,
          ...(response.settings || {}),
        });
      } catch (error) {
        if (!isCancelled) {
          setSettingsValues(defaultOrganizerSettings);
        }
      }
    };

    loadOrganizerSettings();

    return () => {
      isCancelled = true;
    };
  }, [isOrganizer, user?.id]);

  const loadOrganizerStats = async () => {
    if (!isOrganizer) {
      return;
    }

    setIsLoadingStats(true);
    setStatsError("");
    setStatsMessage("");

    try {
      const events = await organizerService.listEvents();
      const summary = events.reduce(
        (accumulator, eventItem) => {
          const totalTickets = Number(eventItem.totalTickets || 0);
          const soldTickets = Number(eventItem.soldTickets || 0);
          const checkedInCount = Number(eventItem.checkedInCount || 0);
          const revenue = Number(eventItem.revenue || 0);

          return {
            totalEvents: accumulator.totalEvents + 1,
            totalTickets: accumulator.totalTickets + totalTickets,
            soldTickets: accumulator.soldTickets + soldTickets,
            checkedInCount: accumulator.checkedInCount + checkedInCount,
            totalRevenue: accumulator.totalRevenue + revenue,
            soldOutEvents:
              accumulator.soldOutEvents + (totalTickets > 0 && soldTickets >= totalTickets ? 1 : 0),
          };
        },
        {
          totalEvents: 0,
          totalTickets: 0,
          soldTickets: 0,
          checkedInCount: 0,
          totalRevenue: 0,
          soldOutEvents: 0,
        }
      );

      setOrganizerStats(summary);
      if (summary.totalEvents === 0) {
        setStatsMessage("Bạn chưa có sự kiện nào để thống kê.");
      }
    } catch (error) {
      setStatsError(error.message || "Không tải được thống kê.");
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    if (isOrganizer && activeTab === "stats") {
      loadOrganizerStats();
    }
  }, [isOrganizer, activeTab]);

  const loadHistoryEvents = async () => {
    if (!isUserAccount) {
      return;
    }

    if (!isWalletLinked) {
      setHistoryEvents([]);
      setHistoryMessage("Liên kết ví MetaMask để theo dõi lịch sử tham gia sự kiện.");
      setHistoryError("");
      return;
    }

    setIsLoadingHistory(true);
    setHistoryMessage("");
    setHistoryError("");

    try {
      const tickets = await ticketService.getMine();
      const usedTickets = tickets.filter((ticket) => ticket.isUsed || ticket.status === "Used");
      const pendingTickets = tickets.filter((ticket) => !(ticket.isUsed || ticket.status === "Used"));

      const uniqueEventMap = new Map();
      usedTickets.forEach((ticket) => {
        const eventItem = ticket.Event;
        if (!eventItem?.id || uniqueEventMap.has(eventItem.id)) {
          return;
        }

        uniqueEventMap.set(eventItem.id, {
          id: eventItem.id,
          title: eventItem.title || "Sự kiện chưa có tên",
          date: eventItem.date,
          location: eventItem.location || "Chưa cập nhật",
          checkedInAt: ticket.usedAt || null,
          tokenId: ticket.tokenId,
        });
      });

      const nextHistoryEvents = Array.from(uniqueEventMap.values()).sort(
        (left, right) => new Date(right.checkedInAt || right.date) - new Date(left.checkedInAt || left.date)
      );

      const pendingEventMap = new Map();
      pendingTickets.forEach((ticket) => {
        const eventItem = ticket.Event;
        if (!eventItem?.id || pendingEventMap.has(`${eventItem.id}-${ticket.id}`)) {
          return;
        }

        pendingEventMap.set(`${eventItem.id}-${ticket.id}`, {
          id: `${eventItem.id}-${ticket.id}`,
          title: eventItem.title || "Sự kiện chưa có tên",
          date: eventItem.date,
          location: eventItem.location || "Chưa cập nhật",
          tokenId: ticket.tokenId,
          posterUrl: eventItem.posterUrl || "",
        });
      });

      setHistoryEvents(nextHistoryEvents);
      setPendingEvents(Array.from(pendingEventMap.values()).sort(
        (left, right) => new Date(left.date) - new Date(right.date)
      ));
      if (nextHistoryEvents.length === 0) {
        setHistoryMessage(
          pendingTickets.length > 0 ? "" : "Bạn chưa tham gia sự kiện nào."
        );
      }
    } catch (error) {
      setHistoryEvents([]);
      setPendingEvents([]);
      setHistoryError(error.message || "Không tải được lịch sử tham gia.");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (!isOrganizer && activeTab === "history") {
      loadHistoryEvents();
    }
  }, [isOrganizer, isWalletLinked, activeTab]);

  const handleProfileChange = (event) => {
    const { name, value } = event.target;

    setProfileValues((current) => ({
      ...current,
      [name]: value,
    }));
    setProfileError("");
    setProfileMessage("");
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setProfileError("");
    setProfileMessage("");

    try {
      await updateProfile({
        name: profileValues.name.trim(),
        email: profileValues.email.trim(),
        avatarUrl: profileValues.avatarUrl.trim(),
      });
      setProfileMessage("Cập nhật hồ sơ thành công.");
    } catch (error) {
      setProfileError(error.message);
    }
  };

  const handleLinkWallet = async () => {
    setProfileError("");
    setProfileMessage("");

    if (!window.ethereum) {
      setProfileError("Không tìm thấy MetaMask. Vui lòng cài MetaMask trước.");
      return;
    }

    setIsLinkingWallet(true);

    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const nextWalletAddress = accounts?.[0];

      if (!nextWalletAddress) {
        throw new Error("Không lấy được địa chỉ ví từ MetaMask.");
      }

      await linkWallet({ walletAddress: nextWalletAddress });
      setProfileMessage("Liên kết ví MetaMask thành công.");
      setShowWallet(false);
    } catch (error) {
      setProfileError(error.message || "Không thể liên kết ví MetaMask.");
    } finally {
      setIsLinkingWallet(false);
    }
  };

  const handleCopy = async (value, successMessage) => {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setProfileError("");
      setProfileMessage(successMessage);
    } catch (error) {
      setProfileError("Không thể sao chép dữ liệu.");
    }
  };

  const handleAvatarUpload = async (file) => {
    if (!file) {
      return;
    }

    setProfileError("");
    setProfileMessage("");
    setIsUploadingAvatar(true);

    try {
      const response = await authService.uploadAvatar(file);
      setProfileValues((current) => ({
        ...current,
        avatarUrl: response.avatarUrl || current.avatarUrl,
      }));
      setProfileMessage("Đã tải ảnh đại diện từ thiết bị.");
    } catch (error) {
      setProfileError(error.message || "Không thể tải ảnh đại diện.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSettingsChange = (event) => {
    const { name, type, checked, value } = event.target;

    setSettingsValues((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
    setSettingsMessage("");
  };

  const handleSettingsSubmit = (event) => {
    event.preventDefault();
    setSettingsMessage("");
    setProfileError("");

    authService
      .updateOrganizerSettings(settingsValues)
      .then((response) => {
        setSettingsValues({
          ...defaultOrganizerSettings,
          ...(response.settings || {}),
        });
        setSettingsMessage("Đã lưu cài đặt hồ sơ ban tổ chức.");
      })
      .catch((error) => {
        setProfileError(error.message || "Không thể lưu cài đặt hồ sơ.");
      });
  };

  const handleTicketPinChange = (event) => {
    const { name, value } = event.target;
    const normalizedValue = value.replace(/\D/g, "").slice(0, 4);

    setTicketPinValues((current) => ({
      ...current,
      [name]: normalizedValue,
    }));
    setProfileError("");
    setProfileMessage("");
  };

  const handleTicketPinSubmit = async (event) => {
    event.preventDefault();
    setProfileError("");
    setProfileMessage("");

    if (!/^\d{4}$/.test(ticketPinValues.ticketPin)) {
      setProfileError("Mã PIN phải gồm đúng 4 chữ số.");
      return;
    }

    if (ticketPinValues.ticketPin !== ticketPinValues.confirmTicketPin) {
      setProfileError("Xác nhận PIN không khớp.");
      return;
    }

    try {
      const response = await updateTicketPin(ticketPinValues);
      setTicketPinValues({
        ticketPin: "",
        confirmTicketPin: "",
      });
      setHasTicketPinState(true);
      setProfileMessage(response.message || "Đã lưu mã PIN vé.");
    } catch (error) {
      setProfileError(error.message || "Không thể cập nhật mã PIN vé.");
    }
  };

  return (
    <section className="page-stack">
      <section className="profile-card">
        <div className="profile-header">
          {visibleAvatar ? (
            <div className="profile-avatar">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={displayName} />
              ) : (
                <span>{avatarFallback}</span>
              )}
            </div>
          ) : null}
          <div className="profile-heading">
            <h1>{displayName}</h1>
          </div>
        </div>

        <dl className="profile-grid">
          <div>
            <dt>Email</dt>
            <dd>{visibleEmail ? user?.email || "Chưa có email" : "Đang ẩn trong hồ sơ"}</dd>
          </div>
          <div>
            <dt>Vai trò</dt>
            <dd>{user?.role ? roleLabel : "Người dùng"}</dd>
          </div>
          <div>
            <dt>Ví</dt>
            <dd className="inline-actions">
              <span>
                {visibleWallet && isWalletLinked && user?.walletAddress
                  ? showWallet
                    ? user.walletAddress
                    : formatWallet(user.walletAddress)
                  : visibleWallet
                    ? "Chưa liên kết"
                    : "Đang ẩn trong hồ sơ"}
              </span>
              {visibleWallet && isWalletLinked && user?.walletAddress ? (
                <button
                  className="icon-button"
                  type="button"
                  title={showWallet ? "Ẩn địa chỉ ví" : "Hiện địa chỉ ví"}
                  aria-label={showWallet ? "Ẩn địa chỉ ví" : "Hiện địa chỉ ví"}
                  onClick={() => setShowWallet((current) => !current)}
                >
                  {showWallet ? (
                    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
                      <path d="M12 5.25c-4.81 0-8.7 3.14-10.5 6.75 1.8 3.61 5.69 6.75 10.5 6.75s8.7-3.14 10.5-6.75C20.7 8.39 16.81 5.25 12 5.25Zm0 11.25a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Zm0-7.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
                    </svg>
                  ) : (
                    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
                      <path d="M3.28 4.34a.75.75 0 0 1 1.06 0l3.03 3.03A10.92 10.92 0 0 1 12 5.25c4.81 0 8.7 3.14 10.5 6.75a11.62 11.62 0 0 1-4.24 4.82l3.15 3.15a.75.75 0 1 1-1.06 1.06l-17.07-17.07a.75.75 0 0 1 0-1.06Zm6.2 6.2 4.98 4.98c.34-.39.54-.9.54-1.46a3 3 0 0 0-4.5-2.52Zm-1.53 1.53a3 3 0 0 0 3.92 3.92l-3.92-3.92Zm-2.1-2.1-2.82-2.82A11.4 11.4 0 0 0 1.5 12c1.8 3.61 5.69 6.75 10.5 6.75 1.63 0 3.18-.33 4.6-.92l-1.94-1.94a4.5 4.5 0 0 1-6.68-4.78Z" />
                    </svg>
                  )}
                </button>
              ) : null}
            </dd>
          </div>
        </dl>
      </section>

      <section className="panel-card profile-content-card">
        <div className="profile-tabs profile-tabs-compact" role="tablist" aria-label="Tab hồ sơ">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={activeTab === tab.id ? "profile-tab active" : "profile-tab"}
              type="button"
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {(activeTab === "info" || activeTab === "organization") ? (
          <>
            <div className="panel-heading">
              <div>
                <h2>{isOrganizer ? "Cập nhật hồ sơ tổ chức" : "Cập nhật thông tin cá nhân"}</h2>
              </div>
            </div>

            <form className="profile-form" onSubmit={handleProfileSubmit}>
              <label className="form-field">
                <span>{isOrganizer ? "Tên tổ chức" : "Tên hiển thị"}</span>
                <input
                  name="name"
                  value={profileValues.name}
                  onChange={handleProfileChange}
                  placeholder={isOrganizer ? "Tên ban tổ chức" : "Tên của bạn"}
                />
              </label>

              <label className="form-field">
                <span>Email</span>
                <input
                  name="email"
                  type="email"
                  value={profileValues.email}
                  onChange={handleProfileChange}
                  placeholder="email@example.com"
                />
              </label>

              <label className="form-field">
                <span>{isOrganizer ? "Logo / ảnh đại diện (URL)" : "Ảnh đại diện (URL)"}</span>
                <input
                  name="avatarUrl"
                  value={profileValues.avatarUrl}
                  onChange={handleProfileChange}
                  placeholder="https://.../avatar.jpg"
                />
              </label>

              <label className="form-field">
                <span>Tải ảnh từ thiết bị</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(event) => handleAvatarUpload(event.target.files?.[0])}
                />
                {isUploadingAvatar ? <span className="field-hint">Đang tải ảnh lên...</span> : null}
              </label>

              <div className="profile-avatar-preview">
                <span>Xem trước</span>
                <div className="profile-avatar profile-avatar-large">
                  {profileValues.avatarUrl ? (
                    <img src={profileValues.avatarUrl} alt={profileValues.name || "Ảnh đại diện"} />
                  ) : (
                    <span>{avatarFallback}</span>
                  )}
                </div>
              </div>

              <div className="form-actions">
                <button className="primary-button" disabled={isLoading} type="submit">
                  {isLoading ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </>
        ) : null}

        {activeTab === "wallet" ? (
          <>
            <div className="panel-heading">
              <div>
                <h2>{isOrganizer ? "Ví nhận tiền" : "Ví MetaMask"}</h2>
              </div>
            </div>

            {!isWalletLinked ? (
              <div className="wallet-link-panel wallet-link-panel-compact">
                <button
                  className="secondary-button"
                  type="button"
                  disabled={isLinkingWallet}
                  onClick={handleLinkWallet}
                >
                  {isLinkingWallet ? "Đang liên kết MetaMask..." : "Liên kết ví MetaMask"}
                </button>
              </div>
            ) : (
              <div className="wallet-link-panel wallet-link-panel-compact">
                <p className="page-feedback page-feedback-success">
                  {isOrganizer
                    ? "Ví nhận tiền đã được liên kết và sẵn sàng dùng cho sự kiện."
                    : "Tài khoản đã liên kết ví MetaMask."}
                </p>
                <div className="table-card">
                  <div className="table-grid">
                    <div className="table-row">
                      <strong>Trạng thái</strong>
                      <span>Đã liên kết</span>
                    </div>
                    <div className="table-row">
                      <strong>Địa chỉ ví</strong>
                      <span>{user?.walletAddress || "Chưa có dữ liệu"}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!isOrganizer ? (
              <div className="table-card">
                <div className="panel-heading">
                  <div>
                    <h3>Mã PIN vé</h3>
                  </div>
                </div>
                <form className="profile-form" onSubmit={handleTicketPinSubmit}>
                  <label className="form-field">
                    <span>Mã PIN mới</span>
                    <input
                      name="ticketPin"
                      value={ticketPinValues.ticketPin}
                      onChange={handleTicketPinChange}
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="Nhập 4 chữ số"
                    />
                  </label>
                  <label className="form-field">
                    <span>Xác nhận PIN</span>
                    <input
                      name="confirmTicketPin"
                      value={ticketPinValues.confirmTicketPin}
                      onChange={handleTicketPinChange}
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="Nhập lại 4 chữ số"
                    />
                  </label>
                  <p className="field-hint">
                    Trạng thái hiện tại: {hasTicketPin ? "Đã thiết lập PIN" : "Chưa thiết lập PIN"}
                  </p>
                  <div className="form-actions">
                    <button className="primary-button" type="submit">
                      {hasTicketPin ? "Cập nhật mã PIN vé" : "Tạo mã PIN vé"}
                    </button>
                  </div>
                </form>
              </div>
            ) : null}
          </>
        ) : null}

        {activeTab === "history" ? (
          <>
            <div className="panel-heading">
              <div>
                <h2>{isOrganizer ? "Lịch sử" : "Các sự kiện đã tham gia"}</h2>
              </div>
            </div>

            {isOrganizer ? null : (
              <>
                {isLoadingHistory ? <p className="page-feedback">Đang tải lịch sử tham gia...</p> : null}
                {historyMessage ? <p className="page-feedback">{historyMessage}</p> : null}
                {historyError ? (
                  <p className="page-feedback page-feedback-error">{historyError}</p>
                ) : null}

                {historyEvents.length > 0 ? (
                  <div className="ticket-section ticket-section-compact">
                    <div className="panel-heading">
                      <div>
                        <h3>Đã tham gia</h3>
                      </div>
                    </div>
                    <div className="ticket-list">
                      {historyEvents.map((eventItem) => (
                        <article className="ticket-card" key={eventItem.id}>
                          <div className="event-visual ticket-visual" style={getPosterStyle(eventItem)}>
                            {eventItem.posterUrl ? (
                              <img
                                className="poster-media-image poster-media-image-cover"
                                src={eventItem.posterUrl}
                                alt={eventItem.title}
                                loading="lazy"
                                decoding="async"
                                draggable="false"
                              />
                            ) : null}
                            <span className="event-visual-chip">Đã check-in</span>
                          </div>
                          <div>
                            <h3>{eventItem.title}</h3>
                          </div>
                          <dl className="ticket-details">
                            <div>
                              <dt>Thời gian sự kiện</dt>
                              <dd>{formatDateTime(eventItem.date)}</dd>
                            </div>
                            <div>
                              <dt>Địa điểm</dt>
                              <dd>{eventItem.location}</dd>
                            </div>
                            <div>
                              <dt>Check-in lúc</dt>
                              <dd>{formatDateTime(eventItem.checkedInAt)}</dd>
                            </div>
                            <div>
                              <dt>Mã token</dt>
                              <dd>{eventItem.tokenId}</dd>
                            </div>
                          </dl>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : null}

                {pendingEvents.length > 0 ? (
                  <div className="ticket-section ticket-section-compact">
                    <div className="panel-heading">
                      <div>
                        <h3>Đã mua / chưa tham gia</h3>
                      </div>
                    </div>
                    <div className="ticket-list">
                      {pendingEvents.map((eventItem) => (
                        <article className="ticket-card" key={eventItem.id}>
                          <div className="event-visual ticket-visual" style={getPosterStyle(eventItem)}>
                            {eventItem.posterUrl ? (
                              <img
                                className="poster-media-image poster-media-image-cover"
                                src={eventItem.posterUrl}
                                alt={eventItem.title}
                                loading="lazy"
                                decoding="async"
                                draggable="false"
                              />
                            ) : null}
                            <span className="event-visual-chip">Chưa check-in</span>
                          </div>
                          <div>
                            <h3>{eventItem.title}</h3>
                          </div>
                          <dl className="ticket-details">
                            <div>
                              <dt>Thời gian sự kiện</dt>
                              <dd>{formatDateTime(eventItem.date)}</dd>
                            </div>
                            <div>
                              <dt>Địa điểm</dt>
                              <dd>{eventItem.location}</dd>
                            </div>
                            <div>
                              <dt>Trạng thái</dt>
                              <dd>Đã mua vé</dd>
                            </div>
                            <div>
                              <dt>Mã token</dt>
                              <dd>{eventItem.tokenId}</dd>
                            </div>
                          </dl>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="form-actions">
                  <Link className="secondary-button" to="/my-tickets">
                    Vé của tôi
                  </Link>
                </div>
              </>
            )}
          </>
        ) : null}

        {activeTab === "stats" ? (
          <>
            <div className="panel-heading">
              <div>
                <h2>Thống kê</h2>
              </div>
              <button className="ghost-button compact" type="button" onClick={loadOrganizerStats}>
                Làm mới
              </button>
            </div>

            {isLoadingStats ? <p className="page-feedback">Đang tải thống kê...</p> : null}
            {statsMessage ? <p className="page-feedback">{statsMessage}</p> : null}
            {statsError ? <p className="page-feedback page-feedback-error">{statsError}</p> : null}

            <dl className="event-stats">
              <div>
                <dt>
                  Tổng sự kiện: <span>{organizerStats.totalEvents}</span>
                </dt>
              </div>
              <div>
                <dt>
                  Tổng vé: <span>{organizerStats.totalTickets}</span>
                </dt>
              </div>
              <div>
                <dt>
                  Đã bán: <span>{organizerStats.soldTickets}</span>
                </dt>
              </div>
              <div>
                <dt>
                  Check-in: <span>{organizerStats.checkedInCount}</span>
                </dt>
              </div>
              <div>
                <dt>
                  Doanh thu:{" "}
                  <span>
                    {Number(organizerStats.totalRevenue || 0).toLocaleString("vi-VN")}{" "}
                    {import.meta.env.VITE_CURRENCY_LABEL || "ROSE"}
                  </span>
                </dt>
              </div>
              <div>
                <dt>
                  Sự kiện hết vé: <span>{organizerStats.soldOutEvents}</span>
                </dt>
              </div>
            </dl>

            <div className="form-actions">
              <Link className="secondary-button" to="/organizer">
                Quản lý sự kiện
              </Link>
            </div>
          </>
        ) : null}

        {activeTab === "settings" ? (
          <>
            <div className="panel-heading">
              <div>
                <h2>Cài đặt</h2>
              </div>
            </div>

            <form className="profile-form" onSubmit={handleSettingsSubmit}>
              <div className="table-card">
                <div className="panel-heading">
                  <div>
                    <h3>Thông tin liên hệ tổ chức</h3>
                  </div>
                </div>
                <div className="table-grid">
                  <label className="form-field">
                    <span>Số điện thoại liên hệ</span>
                    <input
                      name="contactPhone"
                      value={settingsValues.contactPhone}
                      onChange={handleSettingsChange}
                      placeholder="Số điện thoại liên hệ"
                    />
                  </label>
                  <label className="form-field">
                    <span>Mô tả ngắn</span>
                    <textarea
                      name="contactBio"
                      rows="4"
                      value={settingsValues.contactBio}
                      onChange={handleSettingsChange}
                      placeholder="Giới thiệu ngắn về ban tổ chức"
                    />
                  </label>
                </div>
              </div>

              <div className="table-card">
                <div className="panel-heading">
                  <div>
                    <h3>Ví liên kết</h3>
                  </div>
                </div>
                <div className="table-grid">
                  <div className="table-row">
                    <strong>Trạng thái ví nhận tiền</strong>
                    <span>{isWalletLinked ? "Đã liên kết" : "Chưa liên kết"}</span>
                  </div>
                  <div className="table-row">
                    <strong>Ví nhận tiền</strong>
                    <span>{user?.walletAddress || "Chưa liên kết MetaMask"}</span>
                  </div>
                  <div className="form-actions">
                    <button
                      className="ghost-button compact"
                      type="button"
                      onClick={() =>
                        handleCopy(user?.walletAddress, "Đã sao chép địa chỉ ví nhận tiền.")
                      }
                      disabled={!user?.walletAddress}
                    >
                      Sao chép ví nhận tiền
                    </button>
                    <button
                      className="secondary-button compact"
                      type="button"
                      onClick={() => setActiveTab("wallet")}
                    >
                      Tab ví nhận tiền
                    </button>
                  </div>
                </div>
              </div>

              <div className="table-card">
                <div className="panel-heading">
                  <div>
                    <h3>Tùy chọn hiển thị hồ sơ</h3>
                  </div>
                </div>
                <div className="settings-switches">
                  <label className="settings-toggle">
                    <input
                      type="checkbox"
                      name="showEmailPublic"
                      checked={settingsValues.showEmailPublic}
                      onChange={handleSettingsChange}
                    />
                    <span>Hiển thị email trong hồ sơ</span>
                  </label>
                  <label className="settings-toggle">
                    <input
                      type="checkbox"
                      name="showWalletPublic"
                      checked={settingsValues.showWalletPublic}
                      onChange={handleSettingsChange}
                    />
                    <span>Hiển thị ví trong hồ sơ</span>
                  </label>
                  <label className="settings-toggle">
                    <input
                      type="checkbox"
                      name="showAvatarPublic"
                      checked={settingsValues.showAvatarPublic}
                      onChange={handleSettingsChange}
                    />
                    <span>Hiển thị ảnh đại diện trong hồ sơ</span>
                  </label>
                </div>
              </div>

              <div className="table-card">
                <div className="panel-heading">
                  <div>
                    <h3>Bảo mật tài khoản</h3>
                  </div>
                </div>
                <div className="table-grid">
                  <div className="table-row">
                    <strong>Explorer đang dùng</strong>
                    <span>{import.meta.env.VITE_BLOCK_EXPLORER_BASE_URL || "Chưa cấu hình"}</span>
                  </div>
                  <div className="table-row">
                    <strong>Đơn vị tiền</strong>
                    <span>{import.meta.env.VITE_CURRENCY_LABEL || "ROSE"}</span>
                  </div>
                  <div className="form-actions">
                    <Link className="secondary-button compact" to="/organizer">
                      Quản lý sự kiện
                    </Link>
                    <Link className="secondary-button compact" to="/check-in">
                      Soát vé
                    </Link>
                    <button className="ghost-button compact" type="button" onClick={logout}>
                      Đăng xuất
                    </button>
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button className="primary-button" type="submit">
                  Lưu cài đặt
                </button>
              </div>
            </form>

            {settingsMessage ? (
              <p className="page-feedback page-feedback-success">{settingsMessage}</p>
            ) : null}
          </>
        ) : null}

        {profileMessage ? (
          <p className="page-feedback page-feedback-success">{profileMessage}</p>
        ) : null}
        {profileError ? <p className="page-feedback page-feedback-error">{profileError}</p> : null}
      </section>
    </section>
  );
}
