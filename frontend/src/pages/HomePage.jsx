import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { eventService } from "../services/eventService";
import { ticketService } from "../services/ticketService";

const initialEventForm = {
  title: "",
  description: "",
  date: "",
  location: "",
  totalTickets: "50",
  price: "0",
};

const sortEventsByDate = (events) =>
  [...events].sort((left, right) => new Date(left.date) - new Date(right.date));

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

export function HomePage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const isOrganizer = user?.role === "organizer";
  const hasLinkedWallet = Boolean(user?.walletLinked);
  const currencyLabel = import.meta.env.VITE_CURRENCY_LABEL || "ROSE";
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [eventForm, setEventForm] = useState(initialEventForm);
  const [eventFormError, setEventFormError] = useState("");
  const [eventFormSuccess, setEventFormSuccess] = useState("");
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);
  const [buyingEventId, setBuyingEventId] = useState("");
  const [purchaseMessage, setPurchaseMessage] = useState("");
  const [selectedQuantities, setSelectedQuantities] = useState({});

  const loadEvents = async () => {
    setIsLoading(true);
    setPageError("");

    try {
      const response = await eventService.list();
      setEvents(sortEventsByDate(response));
    } catch (error) {
      setPageError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleEventFormChange = (event) => {
    const { name, value } = event.target;

    setEventForm((current) => ({
      ...current,
      [name]: value,
    }));
    setEventFormError("");
    setEventFormSuccess("");
  };

  const handleCreateEvent = async (event) => {
    event.preventDefault();

    if (!hasLinkedWallet) {
      setEventFormError("Vui lòng liên kết ví MetaMask trước khi tạo sự kiện.");
      return;
    }

    setIsSubmittingEvent(true);
    setEventFormError("");
    setEventFormSuccess("");

    try {
      const response = await eventService.create({
        title: eventForm.title.trim(),
        description: eventForm.description.trim(),
        date: eventForm.date,
        location: eventForm.location.trim(),
        totalTickets: Number(eventForm.totalTickets),
        price: Number(eventForm.price),
      });

      setEvents((current) => sortEventsByDate([...current, response.event]));
      setEventForm(initialEventForm);
      setEventFormSuccess("Tạo sự kiện thành công.");
    } catch (error) {
      setEventFormError(error.message);
    } finally {
      setIsSubmittingEvent(false);
    }
  };

  const handleBuyTicket = async (eventId) => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: { pathname: "/" } } });
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

    const targetEvent = events.find((eventItem) => eventItem.id === eventId);
    const soldTickets = Number(targetEvent?.soldTickets ?? 0);
    const totalTickets = Number(targetEvent?.totalTickets ?? 0);
    const remainingTickets = Math.max(totalTickets - soldTickets, 0);
    const maxSelectable = Math.min(3, Math.max(1, remainingTickets));
    const quantity = Math.min(Number(selectedQuantities[eventId] || 1), maxSelectable);

    setBuyingEventId(eventId);
    setPurchaseMessage("");
    setPageError("");

    try {
      const response = await ticketService.buy(eventId, quantity);
      setPurchaseMessage(response.message || `Mua ${quantity} vé thành công.`);
    } catch (error) {
      setPageError(error.message);
    } finally {
      setBuyingEventId("");
    }
  };

  return (
    <section className="page-stack">
      <section className="panel-card">
        <div className="panel-heading">
          <h1>Sự kiện</h1>
          <div className="hero-actions">
            <Link className="primary-button" to={isAuthenticated ? "/profile" : "/register"}>
              {isAuthenticated ? "Mở hồ sơ của tôi" : "Tạo tài khoản"}
            </Link>
            {!isAuthenticated ? (
              <Link className="secondary-button" to="/login">
                Đăng nhập
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {purchaseMessage ? (
        <p className="page-feedback page-feedback-success">{purchaseMessage}</p>
      ) : null}
      {pageError ? <p className="page-feedback page-feedback-error">{pageError}</p> : null}

      {user?.role === "organizer" ? (
        <section className="panel-card">
          <div className="panel-heading">
            <div>
              <h2>Tạo sự kiện mới</h2>
            </div>
          </div>

          {!hasLinkedWallet ? (
            <div className="wallet-link-panel">
              <p className="page-feedback">
                Ban tổ chức cần liên kết ví MetaMask trong hồ sơ trước khi tạo sự kiện.
              </p>
              <Link className="secondary-button" to="/profile">
                Đi tới hồ sơ để liên kết ví
              </Link>
            </div>
          ) : (
            <form className="event-form" onSubmit={handleCreateEvent}>
              <label className="form-field">
                <span>Tên sự kiện</span>
                <input
                  name="title"
                  value={eventForm.title}
                  onChange={handleEventFormChange}
                  placeholder="Tên sự kiện"
                  required
                />
              </label>
              <label className="form-field">
                <span>Mô tả</span>
                <textarea
                  name="description"
                  value={eventForm.description}
                  onChange={handleEventFormChange}
                  placeholder="Mô tả ngắn về sự kiện"
                  rows="4"
                />
              </label>
              <label className="form-field">
                <span>Thời gian</span>
                <input
                  name="date"
                  type="datetime-local"
                  value={eventForm.date}
                  onChange={handleEventFormChange}
                  required
                />
              </label>
              <label className="form-field">
                <span>Địa điểm</span>
                <input
                  name="location"
                  value={eventForm.location}
                  onChange={handleEventFormChange}
                  placeholder="Địa điểm"
                />
              </label>
              <label className="form-field">
                <span>Số lượng vé</span>
                <input
                  name="totalTickets"
                  type="number"
                  min="0"
                  value={eventForm.totalTickets}
                  onChange={handleEventFormChange}
                />
              </label>
              <label className="form-field">
                <span>Giá vé</span>
                <input
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={eventForm.price}
                  onChange={handleEventFormChange}
                />
              </label>

              <div className="form-actions">
                <button className="primary-button" disabled={isSubmittingEvent} type="submit">
                  {isSubmittingEvent ? "Đang tạo..." : "Tạo sự kiện"}
                  {isSubmittingEvent ? <span className="button-spinner" /> : null}
                </button>
              </div>
            </form>
          )}

          {eventFormSuccess ? (
            <p className="page-feedback page-feedback-success">{eventFormSuccess}</p>
          ) : null}
          {eventFormError ? (
            <p className="page-feedback page-feedback-error">{eventFormError}</p>
          ) : null}
        </section>
      ) : null}

      <section className="panel-card">
        <div className="panel-heading">
          <div>
            <h2>Danh sách sự kiện</h2>
          </div>
          <button className="ghost-button" type="button" onClick={loadEvents}>
            Tải lại
          </button>
        </div>

        {isLoading ? <p className="page-feedback">Đang tải sự kiện...</p> : null}

        {!isLoading && events.length === 0 ? (
          <p className="page-feedback">Chưa có sự kiện nào. Ban tổ chức có thể tạo sự kiện đầu tiên.</p>
        ) : null}

        <div className="event-grid">
          {events.map((event) => {
            const soldTickets = Number(event.soldTickets ?? 0);
            const totalTickets = Number(event.totalTickets ?? 0);
            const remainingTickets = Math.max(totalTickets - soldTickets, 0);
            const maxSelectable = Math.min(3, Math.max(1, remainingTickets));
            const selectedQuantity = Math.min(
              Number(selectedQuantities[event.id] || 1),
              maxSelectable
            );

            return (
              <article className="event-card" key={event.id}>
              {Number(event.soldTickets ?? 0) >= Number(event.totalTickets ?? 0) ? (
                <span className="event-badge">Hết vé</span>
              ) : null}
              <div className="event-card-top">
                <h3>{event.title}</h3>
              </div>

              <dl className="event-details">
                <div>
                  <dt>Chủ đề:</dt>
                  <dd>{event.description || "Chưa cập nhật"}</dd>
                </div>
                <div>
                  <dt>Địa điểm:</dt>
                  <dd>{event.location || "Chưa cập nhật"}</dd>
                </div>
                <div>
                  <dt>Thời gian:</dt>
                  <dd>{formatDateTime(event.date)}</dd>
                </div>
                <div>
                  <dt>Người tổ chức:</dt>
                  <dd>{isOrganizer ? user?.name || "Ban tổ chức" : "Ban tổ chức"}</dd>
                </div>
              </dl>

              <dl className="event-stats">
                <div>
                  <dt>
                    Giá:{" "}
                    <span>
                      {Number(event.price || 0).toLocaleString("vi-VN")} {currencyLabel}
                    </span>
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
              <div className="event-progress">
                <div
                  className="event-progress-bar"
                  style={{
                    width: totalTickets > 0 ? `${(soldTickets / totalTickets) * 100}%` : "0%",
                  }}
                />
              </div>
              <p className="event-remaining">
                Còn lại {remainingTickets} vé
              </p>

              {!isOrganizer ? (
                <div className="card-actions">
                  <label className="form-field">
                    <span>Số vé</span>
                    <select
                      className="form-select"
                      value={selectedQuantity}
                      onChange={(eventSelect) =>
                        setSelectedQuantities((current) => ({
                          ...current,
                          [event.id]: Number(eventSelect.target.value),
                        }))
                      }
                      disabled={
                        buyingEventId === event.id ||
                        (isAuthenticated && !hasLinkedWallet) ||
                        soldTickets >= totalTickets
                      }
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
                    onClick={() => handleBuyTicket(event.id)}
                    disabled={
                      buyingEventId === event.id ||
                      (isAuthenticated && !hasLinkedWallet) ||
                      soldTickets >= totalTickets
                    }
                  >
                    {soldTickets >= totalTickets
                      ? "Hết vé"
                      : isAuthenticated && !hasLinkedWallet
                        ? "Liên kết ví để mua"
                      : buyingEventId === event.id
                        ? "Đang xử lý..."
                        : "Mua vé"}
                    {buyingEventId === event.id ? <span className="button-spinner" /> : null}
                  </button>
                </div>
              ) : null}
            </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}
