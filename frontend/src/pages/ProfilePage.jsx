import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { useAuth } from "../hooks/useAuth";
import { ticketService } from "../services/ticketService";

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

export function ProfilePage() {
  const { user, updateProfile, linkWallet, isLoading } = useAuth();
  const explorerBaseUrl = import.meta.env.VITE_BLOCK_EXPLORER_BASE_URL || "";
  const isOrganizer = user?.role === "organizer";
  const isWalletLinked = Boolean(user?.walletLinked);
  const [showWallet, setShowWallet] = useState(false);
  const [expandedTicketId, setExpandedTicketId] = useState(null);
  const [isLinkingWallet, setIsLinkingWallet] = useState(false);
  const buildTxUrl = (hash) => {
    if (!explorerBaseUrl || !hash) {
      return "";
    }

    return `${explorerBaseUrl.replace(/\/$/, "")}/tx/${hash}`;
  };
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
  const handleCopy = async (value) => {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
    } catch (error) {
      return;
    }
  };
  const handleToggleQr = (ticketId) => {
    setExpandedTicketId((current) => (current === ticketId ? null : ticketId));
  };
  const buildQrValue = (ticket) =>
    JSON.stringify({
      ticketId: ticket.id,
      tokenId: ticket.tokenId,
      eventId: ticket.eventId,
      ownerWallet: ticket.ownerWallet,
    });
  const handleDownloadQr = (ticketId) => {
    const canvas = document.getElementById(`qr-canvas-${ticketId}`);
    if (!canvas) {
      return;
    }

    const url = canvas.toDataURL("image/png");
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ticket-${ticketId}.png`;
    anchor.click();
  };
  const roleLabel = user?.role === "organizer" ? "Ban tổ chức" : "Người dùng";
  const [profileValues, setProfileValues] = useState({
    name: "",
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
    });
  }, [user]);

  const loadTickets = async () => {
    if (!user) {
      return;
    }

    if (!user?.walletLinked) {
      setTickets([]);
      setTicketError("");
      setTicketMessage("Liên kết ví MetaMask để bắt đầu mua vé.");
      setIsLoadingTickets(false);
      return;
    }

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
    if (!isOrganizer) {
      loadTickets();
    }
  }, [user?.walletLinked, isOrganizer]);

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

  return (
    <section className="page-stack">
      <section className="profile-card">
        <div>
          <h1>{user?.name}</h1>
        </div>

        <dl className="profile-grid">
          <div>
            <dt>Email</dt>
            <dd>{user?.email || "Chưa có email"}</dd>
          </div>
          <div>
            <dt>Vai trò</dt>
            <dd>{user?.role ? roleLabel : "Người dùng"}</dd>
          </div>
          <div>
            <dt>Ví</dt>
            <dd className="inline-actions">
              <span>
                {isWalletLinked && user?.walletAddress
                  ? showWallet
                    ? user.walletAddress
                    : formatWallet(user.walletAddress)
                  : "Chưa liên kết"}
              </span>
              {isWalletLinked && user?.walletAddress ? (
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

      <section className="panel-card">
        <div className="panel-heading">
          <div>
            <h2>Cập nhật hồ sơ</h2>
          </div>
        </div>

        {!isWalletLinked ? (
          <div className="wallet-link-panel">
            <p className="page-feedback">
              Tài khoản này chưa liên kết ví. Bạn cần liên kết MetaMask trước khi mua vé hoặc tạo sự kiện.
            </p>
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
          <p className="page-feedback page-feedback-success">
            Tài khoản đã liên kết ví MetaMask.
          </p>
        )}

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

      {!isOrganizer ? (
        <section className="panel-card">
          <div className="panel-heading">
            <div>
              <h2>Vé của tôi</h2>
            </div>
            <button className="ghost-button compact" type="button" onClick={loadTickets}>
              Tải lại
            </button>
          </div>

          {isLoadingTickets ? <p className="page-feedback">Đang tải vé...</p> : null}
          {ticketMessage ? <p className="page-feedback">{ticketMessage}</p> : null}
          {ticketError ? <p className="page-feedback page-feedback-error">{ticketError}</p> : null}

          <div className="ticket-list">
            {tickets.map((ticket) => {
              const isUsed = ticket.isUsed || ticket.status === "Used";

              return (
                <article className="ticket-card" key={ticket.id}>
                  {buildTxUrl(ticket.transactionHash) ? (
                    <a
                      className="ghost-button compact"
                      href={buildTxUrl(ticket.transactionHash)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Xem giao dịch
                    </a>
                  ) : null}
                  <div>
                    <h3>{ticket.Event?.title || "Sự kiện chưa có tên"}</h3>
                  </div>
                  <dl className="ticket-details">
                    <div>
                      <dt>Mã Token</dt>
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
                      <dt>Trạng thái</dt>
                      <dd>{isUsed ? "Đã sử dụng" : "Chưa sử dụng"}</dd>
                    </div>
                    <div>
                      <dt>Giao dịch</dt>
                      <dd className="inline-actions">
                        <span>{formatHash(ticket.transactionHash)}</span>
                        <button
                          className="icon-button"
                          type="button"
                          title="Sao chép mã giao dịch"
                          aria-label="Sao chép mã giao dịch"
                          onClick={() => handleCopy(ticket.transactionHash)}
                        >
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            focusable="false"
                          >
                            <path
                              d="M9 3.75A2.25 2.25 0 0 1 11.25 1.5h6A2.25 2.25 0 0 1 19.5 3.75v9A2.25 2.25 0 0 1 17.25 15h-6A2.25 2.25 0 0 1 9 12.75v-9Zm2.25-.75a.75.75 0 0 0-.75.75v9c0 .414.336.75.75.75h6a.75.75 0 0 0 .75-.75v-9a.75.75 0 0 0-.75-.75h-6Z"
                            />
                            <path
                              d="M4.5 6.75A2.25 2.25 0 0 1 6.75 4.5h.75a.75.75 0 0 1 0 1.5h-.75a.75.75 0 0 0-.75.75v9c0 .414.336.75.75.75h6a.75.75 0 0 0 .75-.75v-.75a.75.75 0 0 1 1.5 0v.75A2.25 2.25 0 0 1 12.75 18h-6A2.25 2.25 0 0 1 4.5 15.75v-9Z"
                            />
                          </svg>
                        </button>
                      </dd>
                    </div>
                  </dl>
                  {!isUsed ? (
                    <>
                      <button
                        className="ghost-button compact"
                        type="button"
                        onClick={() => handleToggleQr(ticket.id)}
                      >
                        {expandedTicketId === ticket.id ? "Ẩn QR" : "Hiện QR"}
                      </button>
                      <button
                        className="ghost-button compact"
                        type="button"
                        onClick={() => handleDownloadQr(ticket.id)}
                        disabled={expandedTicketId !== ticket.id}
                      >
                        Tải QR
                      </button>
                      {expandedTicketId === ticket.id ? (
                        <div className="ticket-qr">
                          <QRCodeCanvas
                            value={buildQrValue(ticket)}
                            size={140}
                            id={`qr-canvas-${ticket.id}`}
                          />
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <p className="page-feedback">Vé đã sử dụng, không thể lấy QR.</p>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </section>
  );
}
