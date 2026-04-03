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

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

export function HomePage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [eventForm, setEventForm] = useState(initialEventForm);
  const [eventFormError, setEventFormError] = useState("");
  const [eventFormSuccess, setEventFormSuccess] = useState("");
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);
  const [buyingEventId, setBuyingEventId] = useState("");
  const [purchaseMessage, setPurchaseMessage] = useState("");

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

    setBuyingEventId(eventId);
    setPurchaseMessage("");
    setPageError("");

    try {
      const response = await ticketService.buy(eventId);
      setPurchaseMessage(response.message || "Mua vé thành công.");
    } catch (error) {
      setPageError(error.message);
    } finally {
      setBuyingEventId("");
    }
  };

  return (
    <section className="page-stack">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Frontend + Backend live</p>
          <h1>Khám phá sự kiện, tạo sự kiện và mua vé NFT ngay trên cùng một app</h1>
          <p>
            Frontend hiện đã gọi trực tiếp API của backend cho đăng ký, đăng nhập, xem
            sự kiện, tạo sự kiện và lấy vé của người dùng.
          </p>
        </div>

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
      </section>

      {purchaseMessage ? (
        <p className="page-feedback page-feedback-success">{purchaseMessage}</p>
      ) : null}
      {pageError ? <p className="page-feedback page-feedback-error">{pageError}</p> : null}

      {user?.role === "organizer" ? (
        <section className="panel-card">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Organizer tools</p>
              <h2>Tạo sự kiện mới</h2>
            </div>
          </div>

          <form className="event-form" onSubmit={handleCreateEvent}>
            <label className="form-field">
              <span>Tên sự kiện</span>
              <input
                name="title"
                value={eventForm.title}
                onChange={handleEventFormChange}
                placeholder="Blockchain Builder Night"
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
                placeholder="Ho Chi Minh City"
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
              </button>
            </div>
          </form>

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
            <p className="eyebrow">Events API</p>
            <h2>Danh sách sự kiện</h2>
          </div>
          <button className="ghost-button" type="button" onClick={loadEvents}>
            Tải lại
          </button>
        </div>

        {isLoading ? <p className="page-feedback">Đang tải sự kiện...</p> : null}

        {!isLoading && events.length === 0 ? (
          <p className="page-feedback">Chưa có sự kiện nào. Organizer có thể tạo sự kiện đầu tiên.</p>
        ) : null}

        <div className="event-grid">
          {events.map((event) => (
            <article className="event-card" key={event.id}>
              <div className="event-card-top">
                <p className="eyebrow">Event</p>
                <h3>{event.title}</h3>
                <p className="event-meta">{formatDateTime(event.date)}</p>
                <p className="event-meta">{event.location || "Địa điểm sẽ cập nhật sau"}</p>
              </div>

              <p className="event-description">
                {event.description || "Sự kiện chưa có mô tả chi tiết."}
              </p>

              <dl className="event-stats">
                <div>
                  <dt>Giá</dt>
                  <dd>{Number(event.price || 0).toLocaleString("vi-VN")}</dd>
                </div>
                <div>
                  <dt>Tổng vé</dt>
                  <dd>{event.totalTickets ?? 0}</dd>
                </div>
              </dl>

              <div className="card-actions">
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => handleBuyTicket(event.id)}
                  disabled={buyingEventId === event.id}
                >
                  {buyingEventId === event.id ? "Đang xử lý..." : "Mua vé"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
