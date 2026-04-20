import { Link } from "react-router-dom";

export function EventShowcaseCard({
  event,
  formatDateTime,
  getPosterStyle,
  getOrganizerDisplayName,
  currencyLabel,
}) {
  const soldTickets = Number(event.soldTickets ?? 0);
  const totalTickets = Number(event.totalTickets ?? 0);
  const isSoldOut = totalTickets > 0 && soldTickets >= totalTickets;
  const badgeClassName = isSoldOut
    ? "showcase-card-badge showcase-card-badge-soldout"
    : "showcase-card-badge showcase-card-badge-live";

  return (
    <article className="showcase-card">
      <div className="showcase-card-media" style={getPosterStyle(event)}>
        {event.posterUrl ? (
          <img
            className="poster-media-image poster-media-image-cover"
            src={event.posterUrl}
            alt={event.title}
            loading="lazy"
            decoding="async"
            draggable="false"
          />
        ) : null}
        <span className={badgeClassName}>{isSoldOut ? "Đã bán hết" : "Đang mở bán"}</span>
        <div className="showcase-card-overlay">
          <span>{formatDateTime(event.date)}</span>
          <strong>{event.location || "Chưa cập nhật"}</strong>
        </div>
      </div>

      <div className="showcase-card-body">
        <div className="showcase-card-copy">
          <h3>
            <Link to={`/events/${event.id}`}>{event.title}</Link>
          </h3>
          <p>{getOrganizerDisplayName(event)}</p>
        </div>

        <div className="showcase-card-meta showcase-card-meta-compact">
          <div>
            <span>Giá vé: {Number(event.price || 0).toLocaleString("vi-VN")} {currencyLabel}</span>
          </div>
        </div>

        <div className="showcase-card-actions">
          <Link className="secondary-button compact" to={`/events/${event.id}`}>
            Chi tiết
          </Link>
        </div>
      </div>
    </article>
  );
}
