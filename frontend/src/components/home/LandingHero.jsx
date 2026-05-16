import { Link } from "react-router-dom";

export function LandingHero({
  event,
  featuredEvents,
  activeIndex,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
  dragOffsetX,
  getPosterStyle,
  formatDateTime,
  getOrganizerDisplayName,
  currencyLabel,
}) {
  if (!event) {
    return null;
  }

  const spotlightEvents = featuredEvents.slice(0, 5);

  return (
    <section className="landing-hero">
      <div className="landing-hero-copy">
        <h1>{event.title}</h1>

        <div className="landing-hero-inline">
          <span>{formatDateTime(event.date)}</span>
          <span>{event.location || "Chưa cập nhật"}</span>
          <span>{getOrganizerDisplayName(event)}</span>
        </div>

        <div className="landing-hero-actions">
          <Link className="primary-button" to={`/events/${event.id}`}>
            Xem chi tiết sự kiện
          </Link>
          <a className="secondary-button" href="#discover-events">
            Khám phá sự kiện
          </a>
        </div>

        <p className="landing-price-line">
          <span>Giá vé:</span> {Number(event.price || 0).toLocaleString("vi-VN")} {currencyLabel}
        </p>
        {event.introLine ? (
          <div className="landing-intro-card">
            <span className="landing-intro-label">Giới thiệu</span>
            <p className="landing-intro-line">{event.introLine}</p>
          </div>
        ) : null}
      </div>

      <div className="landing-hero-stage">
        <div
          className="landing-hero-spotlight"
          onTouchStart={(eventTouch) => onDragStart(eventTouch.touches[0].clientX)}
          onTouchMove={(eventTouch) => onDragMove(eventTouch.touches[0].clientX)}
          onTouchEnd={onDragEnd}
          onTouchCancel={onDragEnd}
          onMouseDown={(eventMouse) => onDragStart(eventMouse.clientX)}
          onMouseMove={(eventMouse) => onDragMove(eventMouse.clientX)}
          onMouseUp={onDragEnd}
          onMouseLeave={onDragEnd}
        >
          <div
            className="landing-hero-spotlight-track"
            style={{
              transform: `translateX(calc(-${activeIndex * 100}% + ${dragOffsetX}px))`,
            }}
          >
            {spotlightEvents.map((spotlightEvent) => (
              <article className="landing-hero-slide" key={spotlightEvent.id}>
                <div className="landing-hero-poster" style={getPosterStyle(spotlightEvent)}>
                  {spotlightEvent.posterUrl ? (
                    <img
                      className="poster-media-image poster-media-image-cover"
                      src={spotlightEvent.posterUrl}
                      alt={spotlightEvent.title}
                      loading="eager"
                      decoding="async"
                      draggable="false"
                    />
                  ) : null}
                  <span className="landing-hero-chip">Sự kiện nổi bật</span>
                  <div className="landing-hero-poster-copy">
                    <strong>{spotlightEvent.title}</strong>
                    <span>{formatDateTime(spotlightEvent.date)}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        {spotlightEvents.length > 1 ? (
          <div className="landing-hero-dots" aria-label="Chuyển sự kiện nổi bật">
            {spotlightEvents.map((spotlightEvent, index) => (
              <button
                key={spotlightEvent.id}
                className={index === activeIndex ? "landing-hero-dot active" : "landing-hero-dot"}
                type="button"
                onClick={() => onSelect(index)}
                aria-label={`Xem sự kiện nổi bật ${index + 1}`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
