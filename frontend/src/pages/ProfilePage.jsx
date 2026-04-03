import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { ticketService } from "../services/ticketService";

const formatDateTime = (value) => {
  if (!value) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

export function ProfilePage() {
  const { user, updateProfile, isLoading } = useAuth();
  const [profileValues, setProfileValues] = useState({
    name: "",
    walletAddress: "",
  });
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [tickets, setTickets] = useState([]);
  const [ticketMessage, setTicketMessage] = useState("");
  const [ticketError, setTicketError] = useState("");
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);

  useEffect(() => {
    setProfileValues({
      name: user?.name || "",
      walletAddress: user?.walletAddress || "",
    });
  }, [user]);

  const loadTickets = async () => {
    setIsLoadingTickets(true);
    setTicketError("");
    setTicketMessage("");

    try {
      const response = await ticketService.getMine();
      setTickets(response);

      if (response.length === 0) {
        setTicketMessage("Bạn chưa có vé nào.");
      }
    } catch (error) {
      setTickets([]);
      setTicketError(error.message);
    } finally {
      setIsLoadingTickets(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

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
        walletAddress: profileValues.walletAddress.trim(),
      });
      setProfileMessage("Cập nhật hồ sơ thành công.");
      await loadTickets();
    } catch (error) {
      setProfileError(error.message);
    }
  };

  return (
    <section className="page-stack">
      <section className="profile-card">
        <div>
          <p className="eyebrow">Profile</p>
          <h1>{user?.name}</h1>
        </div>

        <dl className="profile-grid">
          <div>
            <dt>Email</dt>
            <dd>{user?.email || "No email"}</dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd>{user?.role || "user"}</dd>
          </div>
          <div>
            <dt>Wallet</dt>
            <dd>{user?.walletAddress || "Not connected yet"}</dd>
          </div>
          <div>
            <dt>User ID</dt>
            <dd>{user?.id || "Unknown"}</dd>
          </div>
        </dl>
      </section>

      <section className="panel-card">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Account</p>
            <h2>Cập nhật hồ sơ</h2>
          </div>
        </div>

        <form className="profile-form" onSubmit={handleProfileSubmit}>
          <label className="form-field">
            <span>Tên hiển thị</span>
            <input
              name="name"
              value={profileValues.name}
              onChange={handleProfileChange}
              placeholder="Tên của bạn"
            />
          </label>
          <label className="form-field">
            <span>Wallet address</span>
            <input
              name="walletAddress"
              value={profileValues.walletAddress}
              onChange={handleProfileChange}
              placeholder="0x..."
              disabled
            />
            <small className="field-hint">
              Wallet được cố định theo schema `Ticket.sql`, nên hiện chỉ hiển thị để tham chiếu.
            </small>
          </label>

          <div className="form-actions">
            <button className="primary-button" disabled={isLoading} type="submit">
              {isLoading ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </form>

        {profileMessage ? (
          <p className="page-feedback page-feedback-success">{profileMessage}</p>
        ) : null}
        {profileError ? <p className="page-feedback page-feedback-error">{profileError}</p> : null}
      </section>

      <section className="panel-card">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Tickets API</p>
            <h2>Vé của tôi</h2>
          </div>
          <button className="ghost-button" type="button" onClick={loadTickets}>
            Tải lại
          </button>
        </div>

        {isLoadingTickets ? <p className="page-feedback">Đang tải vé...</p> : null}
        {ticketMessage ? <p className="page-feedback">{ticketMessage}</p> : null}
        {ticketError ? <p className="page-feedback page-feedback-error">{ticketError}</p> : null}

        <div className="ticket-list">
          {tickets.map((ticket) => (
            <article className="ticket-card" key={ticket.id}>
              <div>
                <p className="eyebrow">{ticket.status}</p>
                <h3>{ticket.Event?.title || "Unnamed event"}</h3>
              </div>
              <dl className="ticket-details">
                <div>
                  <dt>Token ID</dt>
                  <dd>{ticket.tokenId}</dd>
                </div>
                <div>
                  <dt>Ngày diễn ra</dt>
                  <dd>{formatDateTime(ticket.Event?.date)}</dd>
                </div>
                <div>
                  <dt>Địa điểm</dt>
                  <dd>{ticket.Event?.location || "Chưa cập nhật"}</dd>
                </div>
                <div>
                  <dt>Transaction</dt>
                  <dd>{ticket.transactionHash}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
