import { useEffect, useMemo, useState } from "react";
import { eventService } from "../services/eventService";
import { LandingHero } from "../components/home/LandingHero";
import { EventDiscoveryBar } from "../components/home/EventDiscoveryBar";
import { EventShowcaseCard } from "../components/home/EventShowcaseCard";
import { SectionShell } from "../components/home/SectionShell";

const sortEventsByDate = (events) =>
  [...events].sort((left, right) => new Date(left.date) - new Date(right.date));

const EVENT_VISUALS = [
  { from: "#151a33", to: "#6c5ce7", glow: "rgba(108, 92, 231, 0.28)" },
  { from: "#101828", to: "#384152", glow: "rgba(255, 138, 0, 0.22)" },
  { from: "#172036", to: "#3f5efb", glow: "rgba(140, 118, 255, 0.22)" },
  { from: "#1b2437", to: "#6a4bff", glow: "rgba(255, 138, 0, 0.18)" },
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
    backgroundImage: `linear-gradient(180deg, rgba(15, 23, 42, 0.08), rgba(15, 23, 42, 0.5)), url("${escapePosterUrl(event.posterUrl)}")`,
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

  const filteredEvents = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    return events.filter((event) => {
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
  }, [events, searchTerm]);

  const featuredEvents = useMemo(() => {
    const source = filteredEvents.length > 0 ? filteredEvents : events;
    const posterEvents = source.filter((event) => Boolean(event.posterUrl));
    return (posterEvents.length > 0 ? posterEvents : source).slice(0, 5);
  }, [events, filteredEvents]);

  useEffect(() => {
    if (featuredEvents.length === 0) {
      setActivePosterIndex(0);
      return undefined;
    }

    setActivePosterIndex((current) => current % featuredEvents.length);

    if (featuredEvents.length === 1) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setActivePosterIndex((current) => (current + 1) % featuredEvents.length);
    }, 6200);

    return () => window.clearInterval(intervalId);
  }, [featuredEvents.length]);

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
    if (dragStartX === null || featuredEvents.length === 0) {
      return;
    }

    if (dragOffsetX <= -80) {
      setActivePosterIndex((current) => (current + 1) % featuredEvents.length);
    } else if (dragOffsetX >= 80) {
      setActivePosterIndex((current) => (current - 1 + featuredEvents.length) % featuredEvents.length);
    }

    setDragStartX(null);
    setDragOffsetX(0);
  };

  const spotlightEvent = featuredEvents[activePosterIndex] || filteredEvents[0] || events[0] || null;

  return (
    <section className="page-stack landing-page">
      <LandingHero
        event={spotlightEvent}
        featuredEvents={featuredEvents}
        activeIndex={activePosterIndex}
        onSelect={setActivePosterIndex}
        onDragStart={handlePosterDragStart}
        onDragMove={handlePosterDragMove}
        onDragEnd={handlePosterDragEnd}
        dragOffsetX={dragOffsetX}
        getPosterStyle={getPosterStyle}
        formatDateTime={formatDateTime}
        getOrganizerDisplayName={getOrganizerDisplayName}
        currencyLabel={currencyLabel}
      />

      {pageError ? <p className="page-feedback page-feedback-error">{pageError}</p> : null}

      <SectionShell
        id="discover-events"
        title="Sự kiện đang mở bán"
        action={
          <button className="ghost-button" type="button" onClick={loadEvents}>
            Tải lại
          </button>
        }
      >
        <EventDiscoveryBar
          searchTerm={searchTerm}
          onSearch={setSearchTerm}
          resultCount={filteredEvents.length}
        />

        {isLoading ? <p className="page-feedback">Đang tải sự kiện...</p> : null}

        {!isLoading && filteredEvents.length > 0 ? (
          <div className="showcase-grid">
            {filteredEvents.map((event) => (
              <EventShowcaseCard
                key={event.id}
                event={event}
                formatDateTime={formatDateTime}
                getPosterStyle={getPosterStyle}
                getOrganizerDisplayName={getOrganizerDisplayName}
                currencyLabel={currencyLabel}
              />
            ))}
          </div>
        ) : null}
      </SectionShell>
    </section>
  );
}
