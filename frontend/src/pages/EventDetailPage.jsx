import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { eventService } from "../services/eventService";
import { ticketService } from "../services/ticketService";
import { useAuth } from "../hooks/useAuth";
import { usePinPrompt } from "../hooks/usePinPrompt";
import { addAppNotification } from "../utils/notifications";

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
    backgroundImage: `linear-gradient(180deg, rgba(20, 33, 61, 0.12), rgba(20, 33, 61, 0.4)), url("${escapePosterUrl(event.posterUrl)}")`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
};

const formatDateTime = (value) => {
  if (!value) {
    return "Chưa có lịch";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Chưa có lịch";
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

export function EventDetailPage() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const { isAuthenticated, user } = useAuth();
  const isOrganizer = user?.role === "organizer";
  const hasLinkedWallet = Boolean(user?.walletLinked);
  const currencyLabel = import.meta.env.VITE_CURRENCY_LABEL || "ROSE";
  const [eventItem, setEventItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [message, setMessage] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [isBuying, setIsBuying] = useState(false);
  const { promptPin, pinPromptDialog } = usePinPrompt();

  useEffect(() => {
    let isCancelled = false;

    const loadEvent = async () => {
      setIsLoading(true);
      setPageError("");

      try {
        const response = await eventService.getById(eventId);
        if (!isCancelled) {
          setEventItem(response);
        }
      } catch (error) {
        if (!isCancelled) {
          setPageError(error.message || "Không tải được chi tiết sự kiện.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadEvent();

    return () => {
      isCancelled = true;
    };
  }, [eventId]);

  const soldTickets = Number(eventItem?.soldTickets || 0);
  const totalTickets = Number(eventItem?.totalTickets || 0);
  const remainingTickets = Math.max(totalTickets - soldTickets, 0);
  const maxSelectable = Math.min(3, Math.max(1, remainingTickets));
  const isClosed = Boolean(eventItem?.isClosed);

  const handleBuy = async () => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: { pathname: `/events/${eventId}` } } });
      return;
    }

    if (isOrganizer) {
      setPageError("Ban tổ chức không thể mua vé.");
      return;
    }

    if (!hasLinkedWallet) {
      setPageError("Vui lòng liên kết ví MetaMask trong hồ sơ trước khi mua vé.");
      navigate("/profile");
      return;
    }

    setIsBuying(true);
    setPageError("");
    setMessage("");

    try {
      const ticketPin = await promptPin({
        title: "Xác thực mua vé",
        message: "Nhập mã PIN vé gồm 4 số để xác thực giao dịch.",
        confirmLabel: "Mua vé",
      });

      if (ticketPin === null) {
        setIsBuying(false);
        return;
      }

      const response = await ticketService.buy(eventId, quantity, ticketPin);
      const successMessage = response.message || `Mua ${quantity} vé thành công.`;
      setMessage(successMessage);
      addAppNotification({
        title: "Mua vé thành công",
        message: `${eventItem?.title || "Sự kiện"}: ${successMessage}`,
        type: "success",
      });
    } catch (error) {
      setPageError(error.message || "Không thể mua vé.");
    } finally {
      setIsBuying(false);
    }
  };

  return (
    <section className="page-stack">
      {pinPromptDialog}
      <section className="panel-card">
        {isLoading ? <p className="page-feedback">Đang tải chi tiết sự kiện...</p> : null}
        {pageError ? <p className="page-feedback page-feedback-error">{pageError}</p> : null}
        {message ? <p className="page-feedback page-feedback-success">{message}</p> : null}

        {!isLoading && eventItem ? (
          <div className="page-stack event-detail-stack">
            <div className="event-detail-grid">
              <div className="event-detail-main">
                <div className="hero-slider-window event-detail-hero">
                  <div className="hero-slide-poster" style={getPosterStyle(eventItem)}>
                    {eventItem.posterUrl ? (
                      <img
                        className="poster-media-image poster-media-image-cover"
                        src={eventItem.posterUrl}
                        alt={eventItem.title}
                        loading="eager"
                        decoding="async"
                        draggable="false"
                      />
                    ) : null}
                    <span className="hero-poster-chip">
                      {isClosed ? "Đã đóng" : soldTickets >= totalTickets ? "Đã hết vé" : "Đang mở bán"}
                    </span>
                    <div className="hero-slide-overlay">
                      <strong>{eventItem.title}</strong>
                      <span>{formatDateTime(eventItem.date)}</span>
                      <small>
                        {eventItem.location || "Chưa cập nhật"} • {eventItem.organizerName || "Ban tổ chức"}
                      </small>
                    </div>
                  </div>
                </div>

                <dl className="event-details">
                  <div>
                    <dt>Chủ đề:</dt>
                    <dd>{eventItem.description || "Chưa cập nhật"}</dd>
                  </div>
                  <div>
                    <dt>Địa điểm:</dt>
                    <dd>{eventItem.location || "Chưa cập nhật"}</dd>
                  </div>
                  <div>
                    <dt>Người tổ chức:</dt>
                    <dd>{eventItem.organizerName || "Ban tổ chức"}</dd>
                  </div>
                </dl>
              </div>

              <aside className="panel-card event-detail-side">
                <div className="event-detail-side-head">
                  <span className="event-detail-side-kicker">Giao dịch an toàn</span>
                  <strong>Mua vé và check-in trên chuỗi với xác thực PIN</strong>
                </div>

                <dl className="event-stats event-stats-compact">
                  <div>
                    <dt>
                      Giá: <span>{Number(eventItem.price || 0).toLocaleString("vi-VN")} {currencyLabel}</span>
                    </dt>
                  </div>
                  <div>
                    <dt>
                      Tổng vé: <span>{totalTickets}</span>
                    </dt>
                  </div>
                  <div>
                    <dt>
                      Đã bán: <span>{soldTickets}</span>
                    </dt>
                  </div>
                </dl>

                <div className="event-detail-progress-card">
                  <div className="event-progress">
                    <div
                      className="event-progress-bar"
                      style={{
                        width: totalTickets > 0 ? `${(soldTickets / totalTickets) * 100}%` : "0%",
                      }}
                    />
                  </div>
                  <p className="event-remaining">Còn lại {remainingTickets} vé</p>
                </div>

                <div className="card-actions event-detail-actions">
                  <label className="form-field">
                    <span>Số vé</span>
                    <select
                      className="form-select"
                      value={quantity}
                      onChange={(event) => setQuantity(Number(event.target.value))}
                      disabled={isBuying || soldTickets >= totalTickets || isClosed}
                    >
                      {Array.from({ length: maxSelectable }, (_, index) => {
                        const value = index + 1;
                        return (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                  <button
                    className="primary-button"
                    type="button"
                    onClick={handleBuy}
                    disabled={isBuying || soldTickets >= totalTickets || isClosed}
                  >
                    {isClosed
                      ? "Sự kiện đã đóng"
                      : soldTickets >= totalTickets
                      ? "Hết vé"
                      : isBuying
                        ? "Đang xử lý..."
                        : isOrganizer
                          ? "Ban tổ chức không thể mua"
                          : isAuthenticated && !hasLinkedWallet
                            ? "Liên kết ví để mua"
                            : "Mua vé"}
                  </button>
                </div>
              </aside>
            </div>
          </div>
        ) : null}
      </section>
    </section>
  );
}
