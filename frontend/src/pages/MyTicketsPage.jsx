import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { useAuth } from "../hooks/useAuth";
import { authService } from "../services/authService";
import { ticketService } from "../services/ticketService";

const EVENT_VISUALS = [
  { from: "#14213d", to: "#1d3557", glow: "rgba(255, 196, 92, 0.28)" },
  { from: "#4f000b", to: "#9d0208", glow: "rgba(255, 140, 120, 0.26)" },
  { from: "#283618", to: "#606c38", glow: "rgba(255, 214, 102, 0.24)" },
  { from: "#3d405b", to: "#6d597a", glow: "rgba(255, 200, 162, 0.26)" },
];

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

const formatHash = (hash) => {
  if (!hash) {
    return "";
  }

  if (hash.length <= 12) {
    return hash;
  }

  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
};

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

export function MyTicketsPage() {
  const { user } = useAuth();
  const explorerBaseUrl = import.meta.env.VITE_BLOCK_EXPLORER_BASE_URL || "";
  const canViewTickets = user?.role === "user";
  const isWalletLinked = Boolean(user?.walletLinked);
  const [tickets, setTickets] = useState([]);
  const [ticketMessage, setTicketMessage] = useState("");
  const [ticketError, setTicketError] = useState("");
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);
  const [expandedTicketId, setExpandedTicketId] = useState(null);
  const [activeTicketTab, setActiveTicketTab] = useState("unused");
  const [verifiedPinsByTicket, setVerifiedPinsByTicket] = useState({});

  const buildTxUrl = (hash) => {
    if (!explorerBaseUrl || !hash) {
      return "";
    }

    return `${explorerBaseUrl.replace(/\/$/, "")}/tx/${hash}`;
  };

  const buildQrValue = (ticket) =>
    JSON.stringify({
      tokenId: String(ticket.tokenId || ""),
      ticketPin: verifiedPinsByTicket[ticket.id] || "",
    });

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

  const handleToggleQr = async (ticketId) => {
    if (expandedTicketId === ticketId) {
      setExpandedTicketId(null);
      return;
    }

    if (!user?.hasTicketPin) {
      setTicketError("Bạn cần tạo mã PIN vé trong hồ sơ trước khi hiển thị QR.");
      return;
    }

    const ticketPin = window.prompt("Nhập mã PIN vé gồm 4 số để hiển thị QR:");
    if (ticketPin === null) {
      return;
    }

    try {
      await authService.verifyTicketPin({ ticketPin });
      setVerifiedPinsByTicket((current) => ({
        ...current,
        [ticketId]: ticketPin,
      }));
      setExpandedTicketId(ticketId);
      setTicketError("");
    } catch (error) {
      setTicketError(error.message || "Không thể xác thực mã PIN vé.");
    }
  };

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

  const loadTickets = async () => {
    if (!canViewTickets) {
      setIsLoadingTickets(false);
      return;
    }

    if (!isWalletLinked) {
      setTickets([]);
      setTicketError("");
      setTicketMessage("Liên kết ví MetaMask trong hồ sơ để bắt đầu mua vé.");
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
    loadTickets();
  }, [canViewTickets, isWalletLinked]);

  const upcomingTickets = tickets.filter((ticket) => !(ticket.isUsed || ticket.status === "Used"));
  const usedTickets = tickets.filter((ticket) => ticket.isUsed || ticket.status === "Used");

  const renderTicketCard = (ticket, isUsed) => (
    <article className={`ticket-card ${isUsed ? "ticket-card-used" : "ticket-card-active"}`} key={ticket.id}>
      <div className="event-visual ticket-visual" style={getPosterStyle(ticket.Event)}>
        {ticket.Event?.posterUrl ? (
          <img
            className="poster-media-image poster-media-image-cover"
            src={ticket.Event.posterUrl}
            alt={ticket.Event?.title || "Poster sự kiện"}
            loading="lazy"
            decoding="async"
            draggable="false"
          />
        ) : null}
        <span className={`event-visual-chip ${isUsed ? "event-visual-chip-muted" : "event-visual-chip-ready"}`}>
          {isUsed ? "Đã tham gia" : "Sẵn sàng check-in"}
        </span>
      </div>

      <div className="ticket-card-body">
        <div className="ticket-card-head">
          <div className="ticket-card-heading">
            <span className="ticket-card-kicker">{isUsed ? "Vé đã sử dụng" : "Vé của bạn"}</span>
            <h3>{ticket.Event?.title || "Sự kiện chưa có tên"}</h3>
          </div>
          {buildTxUrl(ticket.transactionHash) ? (
            <a
              className="ghost-button compact ticket-card-link"
              href={buildTxUrl(ticket.transactionHash)}
              target="_blank"
              rel="noreferrer"
            >
              Xem giao dịch
            </a>
          ) : null}
        </div>

        <div className="ticket-card-meta">
          <span>{formatDateTime(ticket.Event?.date)}</span>
          <span>{ticket.Event?.location || "Chưa cập nhật"}</span>
          <span className={isUsed ? "ticket-card-status ticket-card-status-used" : "ticket-card-status"}>
            {isUsed ? "Đã sử dụng" : "Chưa sử dụng"}
          </span>
        </div>

        <dl className="ticket-details ticket-details-premium">
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
                <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
                  <path d="M9 3.75A2.25 2.25 0 0 1 11.25 1.5h6A2.25 2.25 0 0 1 19.5 3.75v9A2.25 2.25 0 0 1 17.25 15h-6A2.25 2.25 0 0 1 9 12.75v-9Zm2.25-.75a.75.75 0 0 0-.75.75v9c0 .414.336.75.75.75h6a.75.75 0 0 0 .75-.75v-9a.75.75 0 0 0-.75-.75h-6Z" />
                  <path d="M4.5 6.75A2.25 2.25 0 0 1 6.75 4.5h.75a.75.75 0 0 1 0 1.5h-.75a.75.75 0 0 0-.75.75v9c0 .414.336.75.75.75h6a.75.75 0 0 0 .75-.75v-.75a.75.75 0 0 1 1.5 0v.75A2.25 2.25 0 0 1 12.75 18h-6A2.25 2.25 0 0 1 4.5 15.75v-9Z" />
                </svg>
              </button>
            </dd>
          </div>
        </dl>

        {!isUsed ? (
          <>
            <div className="card-actions ticket-card-actions">
              <button
                className="ghost-button compact"
                type="button"
                onClick={() => handleToggleQr(ticket.id)}
              >
                {expandedTicketId === ticket.id ? "Ẩn QR" : "Hiện QR"}
              </button>
              <button
                className="secondary-button compact"
                type="button"
                onClick={() => handleDownloadQr(ticket.id)}
                disabled={expandedTicketId !== ticket.id}
              >
                Tải QR
              </button>
            </div>
            {expandedTicketId === ticket.id ? (
              <div className="ticket-qr ticket-qr-shell">
                <QRCodeCanvas
                  value={buildQrValue(ticket)}
                  size={220}
                  includeMargin
                  id={`qr-canvas-${ticket.id}`}
                />
              </div>
            ) : null}
          </>
        ) : (
          <p className="page-feedback ticket-card-note">
            Vé đã sử dụng, không thể lấy QR. Check-in lúc: {formatDateTime(ticket.usedAt)}
          </p>
        )}
      </div>
    </article>
  );

  if (!canViewTickets) {
    return (
      <section className="panel-card">
        <h2>Vé của tôi</h2>
        <p className="page-feedback">Tab này dành cho tài khoản người dùng.</p>
      </section>
    );
  }

  return (
    <section className="page-stack">
      <section className="panel-card">
        <div className="panel-heading">
          <div>
            <h1>Vé của tôi</h1>
          </div>
        </div>
      </section>

      <section className="panel-card">
        {isLoadingTickets ? <p className="page-feedback">Đang tải vé...</p> : null}
        {ticketMessage ? <p className="page-feedback">{ticketMessage}</p> : null}
        {ticketError ? <p className="page-feedback page-feedback-error">{ticketError}</p> : null}

        <div className="ticket-section">
          <div className="ticket-tab-list" role="tablist" aria-label="Phân loại vé">
            <button
              className={activeTicketTab === "unused" ? "profile-tab active" : "profile-tab"}
              type="button"
              onClick={() => setActiveTicketTab("unused")}
            >
              Vé chưa tham gia
            </button>
            <button
              className={activeTicketTab === "used" ? "profile-tab active" : "profile-tab"}
              type="button"
              onClick={() => setActiveTicketTab("used")}
            >
              Vé đã sử dụng
            </button>
          </div>

          {activeTicketTab === "unused" ? (
            <>
              {upcomingTickets.length === 0 && !isLoadingTickets ? (
                <p className="page-feedback">Bạn không còn vé nào chưa sử dụng.</p>
              ) : null}

              <div className="ticket-list">
                {upcomingTickets.map((ticket) => {
                  return renderTicketCard(ticket, false);
                })}
              </div>
            </>
          ) : (
            <>
              {usedTickets.length === 0 && !isLoadingTickets ? (
                <p className="page-feedback">Bạn chưa có vé nào đã tham gia.</p>
              ) : null}
              <div className="ticket-list">
                {usedTickets.map((ticket) => {
                  return renderTicketCard(ticket, true);
                })}
              </div>
            </>
          )}
        </div>
      </section>
    </section>
  );
}
