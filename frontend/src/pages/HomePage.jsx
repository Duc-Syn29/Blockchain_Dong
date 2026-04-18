import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { eventService } from "../services/eventService";

const sortEventsByDate = (events) =>
  [...events].sort((left, right) => new Date(left.date) - new Date(right.date));

const EVENT_VISUALS = [
  { from: "#14213d", to: "#1d3557", glow: "rgba(255, 196, 92, 0.28)" },
  { from: "#4f000b", to: "#9d0208", glow: "rgba(255, 140, 120, 0.26)" },
  { from: "#283618", to: "#606c38", glow: "rgba(255, 214, 102, 0.24)" },
  { from: "#3d405b", to: "#6d597a", glow: "rgba(255, 200, 162, 0.26)" },
];

const getOrganizerDisplayName = (event) =>
  event.organizerName || event.organizerDisplayName || event.organizerId || "Ban tổ chức";

const hashTitle = (value) =>
  String(value || "")
    .split("")
    .reduce((total, char) => total + char.charCodeAt(0), 0);

const getEventVisualStyle = (title) => {
  const palette = EVENT_VISUALS[hashTitle(title) % EVENT_VISUALS.length];

  return {
    "--event-visual-from": palette.from,
    "--event-visual-to": palette.to,
    "--event-visual-glow": palette.glow,
  };
};

const escapePosterUrl = (value) => String(value || "").replace(/"/g, '\\"');

const getPosterStyle = (event) => {
  const visualStyle = getEventVisualStyle(event.title);

  if (!event.posterUrl) {
    return visualStyle;
  }

  return {
    backgroundImage: `linear-gradient(180deg, rgba(20, 33, 61, 0.10), rgba(20, 33, 61, 0.36)), url("${escapePosterUrl(event.posterUrl)}")`,
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

export function HomePage() {
  const currencyLabel = import.meta.env.VITE_CURRENCY_LABEL || "ROSE";
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [activePosterIndex, setActivePosterIndex] = useState(0);
  const [dragStartX, setDragStartX] = useState(null);
  const [dragOffsetX, setDragOffsetX] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

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

  const posterEvents = events.filter((event) => Boolean(event.posterUrl));
  const featuredPosterEvents = (posterEvents.length > 0 ? posterEvents : events).slice(0, 8);

  useEffect(() => {
    if (featuredPosterEvents.length === 0) {
      setActivePosterIndex(0);
      return undefined;
    }

    setActivePosterIndex((current) => current % featuredPosterEvents.length);

    if (featuredPosterEvents.length === 1) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setActivePosterIndex((current) => (current + 1) % featuredPosterEvents.length);
    }, 4500);

    return () => window.clearInterval(intervalId);
  }, [featuredPosterEvents.length]);

  const goToPoster = (nextIndex) => {
    if (featuredPosterEvents.length === 0) {
      return;
    }

    const normalizedIndex =
      ((nextIndex % featuredPosterEvents.length) + featuredPosterEvents.length) %
      featuredPosterEvents.length;

    setActivePosterIndex(normalizedIndex);
  };

  const handlePosterDragStart = (clientX) => {
    setDragStartX(clientX);
    setDragOffsetX(0);
  };

  const handlePosterDragMove = (clientX) => {
    if (dragStartX === null) {
      return;
    }

    setDragOffsetX(clientX - dragStartX);
  };

  const handlePosterDragEnd = () => {
    if (dragStartX === null) {
      return;
    }

    if (dragOffsetX <= -80) {
      goToPoster(activePosterIndex + 1);
    } else if (dragOffsetX >= 80) {
      goToPoster(activePosterIndex - 1);
    }

    setDragStartX(null);
    setDragOffsetX(0);
  };

  const filteredEvents = events.filter((event) => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    if (!normalizedSearchTerm) {
      return true;
    }

    const searchableText = [
      event.title,
      event.description,
      event.location,
      getOrganizerDisplayName(event),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchableText.includes(normalizedSearchTerm);
  });

  return (
    <section className="page-stack">
      <section className="hero-panel hero-showcase">
        <div className="hero-showcase-top">
          <h1>Sự kiện</h1>
          {featuredPosterEvents.length > 1 ? (
            <div className="hero-slider-dots" aria-label="Chuyển poster sự kiện">
              {featuredPosterEvents.map((event, index) => (
                <button
                  key={event.id}
                  className={index === activePosterIndex ? "hero-dot active" : "hero-dot"}
                  type="button"
                  onClick={() => goToPoster(index)}
                  aria-label={`Xem poster ${index + 1}`}
                />
              ))}
            </div>
          ) : null}
        </div>

        {featuredPosterEvents.length > 0 ? (
          <div className="hero-slider-window">
            <div
              className="hero-slider-track"
              style={{
                transform: `translateX(calc(-${activePosterIndex * 100}% + ${dragOffsetX}px))`,
                transition: dragStartX === null ? undefined : "none",
              }}
              onTouchStart={(event) => handlePosterDragStart(event.touches[0].clientX)}
              onTouchMove={(event) => handlePosterDragMove(event.touches[0].clientX)}
              onTouchEnd={handlePosterDragEnd}
              onTouchCancel={handlePosterDragEnd}
              onMouseDown={(event) => handlePosterDragStart(event.clientX)}
              onMouseMove={(event) => {
                if (dragStartX !== null) {
                  handlePosterDragMove(event.clientX);
                }
              }}
              onMouseUp={handlePosterDragEnd}
              onMouseLeave={handlePosterDragEnd}
            >
              {featuredPosterEvents.map((event) => (
                <article className="hero-slide" key={event.id}>
                  <div className="hero-slide-poster" style={getPosterStyle(event)}>
                    <span className="hero-poster-chip">Sự kiện đang mở bán</span>
                    {event.posterUrl ? (
                      <img
                        className="hero-slide-image"
                        src={event.posterUrl}
                        alt={event.title}
                        draggable="false"
                      />
                    ) : null}
                    <div className="hero-slide-overlay">
                      <strong>
                        <Link to={`/events/${event.id}`}>{event.title}</Link>
                      </strong>
                      <span>{formatDateTime(event.date)}</span>
                      <small>
                        {event.location || "Chưa cập nhật"} • {getOrganizerDisplayName(event)}
                      </small>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {pageError ? <p className="page-feedback page-feedback-error">{pageError}</p> : null}

      <section className="panel-card event-list-panel">
        <div className="panel-heading">
          <div>
            <h2>Danh sách sự kiện</h2>
          </div>
          <button className="ghost-button" type="button" onClick={loadEvents}>
            Tải lại
          </button>
        </div>

        {isLoading ? <p className="page-feedback">Đang tải sự kiện...</p> : null}

        <div className="event-toolbar">
          <label className="form-field event-search-field">
            <span>Tìm kiếm sự kiện</span>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Tên sự kiện, địa điểm, ban tổ chức..."
            />
          </label>
        </div>

        <div className="event-carousel-shell">
          <div className="event-carousel">
            {filteredEvents.map((event) => (
              <article className="event-card event-card-featured event-card-compact" key={event.id}>
                {Number(event.soldTickets ?? 0) >= Number(event.totalTickets ?? 0) ? (
                  <span className="event-badge">Hết vé</span>
                ) : null}

                <div className="event-visual" style={getPosterStyle(event)}>
                  <span className="event-visual-chip">Sự kiện đang mở bán</span>
                </div>

                <div className="event-card-top">
                  <h3>
                    <Link to={`/events/${event.id}`}>{event.title}</Link>
                  </h3>
                  <p className="event-meta">{formatDateTime(event.date)}</p>
                  <p className="event-meta">{event.location || "Chưa cập nhật"}</p>
                  <p className="organizer-event-state">Sự kiện đang mở</p>
                </div>

                <div className="event-price-band">
                  <span>Giá vé:</span>
                  <strong>{Number(event.price || 0).toLocaleString("vi-VN")} {currencyLabel}</strong>
                </div>

                <div className="form-actions">
                  <Link className="secondary-button compact" to={`/events/${event.id}`}>
                    Chi tiết
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </section>
  );
}
