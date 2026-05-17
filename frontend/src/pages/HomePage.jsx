import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { eventService } from "../services/eventService";
import { LandingHero } from "../components/home/LandingHero";
import { EventDiscoveryBar } from "../components/home/EventDiscoveryBar";
import { EventShowcaseCard } from "../components/home/EventShowcaseCard";
import { SectionShell } from "../components/home/SectionShell";

const sortEventsByNearestUpcoming = (events) => {
  const now = Date.now();

  return [...events].sort((left, right) => {
    const leftTime = new Date(left.date).getTime();
    const rightTime = new Date(right.date).getTime();
    const leftIsUpcoming = Number.isFinite(leftTime) && leftTime >= now;
    const rightIsUpcoming = Number.isFinite(rightTime) && rightTime >= now;

    if (leftIsUpcoming && !rightIsUpcoming) {
      return -1;
    }

    if (!leftIsUpcoming && rightIsUpcoming) {
      return 1;
    }

    if (leftIsUpcoming && rightIsUpcoming) {
      return leftTime - rightTime;
    }

    return rightTime - leftTime;
  });
};

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
  const location = useLocation();
  const currencyLabel = import.meta.env.VITE_CURRENCY_LABEL || "TEST";
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [activePosterIndex, setActivePosterIndex] = useState(0);
  const [dragStartX, setDragStartX] = useState(null);
  const [dragOffsetX, setDragOffsetX] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [locationTerm, setLocationTerm] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [soldFilter, setSoldFilter] = useState("all");

  const loadEvents = async () => {
    setIsLoading(true);
    setPageError("");

    try {
      const response = await eventService.list();
      setEvents(sortEventsByNearestUpcoming(response));
    } catch (error) {
      setPageError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [location.key, location.state?.refreshAt]);

  const filteredEvents = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();
    const normalizedLocationTerm = locationTerm.trim().toLowerCase();
    const parsedMinPrice = minPrice === "" ? null : Number(minPrice);
    const parsedMaxPrice = maxPrice === "" ? null : Number(maxPrice);
    const now = new Date();
    const nowTime = now.getTime();
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);
    const nextSevenDays = new Date(nowTime + 7 * 24 * 60 * 60 * 1000);
    const nextThirtyDays = new Date(nowTime + 30 * 24 * 60 * 60 * 1000);

    return sortEventsByNearestUpcoming(events.filter((event) => {
      const searchableTitle = String(event.title || "").toLowerCase();

      if (normalizedSearchTerm && !searchableTitle.includes(normalizedSearchTerm)) {
        return false;
      }

      if (normalizedLocationTerm) {
        const eventLocation = String(event.location || "").toLowerCase();
        if (!eventLocation.includes(normalizedLocationTerm)) {
          return false;
        }
      }

      const eventPrice = Number(event.price || 0);
      if (parsedMinPrice !== null && !Number.isNaN(parsedMinPrice) && eventPrice < parsedMinPrice) {
        return false;
      }

      if (parsedMaxPrice !== null && !Number.isNaN(parsedMaxPrice) && eventPrice > parsedMaxPrice) {
        return false;
      }

      const eventDate = new Date(event.date);
      const eventTime = eventDate.getTime();
      if (dateFilter !== "all" && !Number.isNaN(eventTime)) {
        if (dateFilter === "today" && (eventTime < nowTime || eventTime > endOfToday.getTime())) {
          return false;
        }

        if (dateFilter === "week" && (eventTime < nowTime || eventTime > nextSevenDays.getTime())) {
          return false;
        }

        if (dateFilter === "month" && (eventTime < nowTime || eventTime > nextThirtyDays.getTime())) {
          return false;
        }
      }

      const soldTickets = Number(event.soldTickets || 0);
      const totalTickets = Number(event.totalTickets || 0);
      const remainingRatio = totalTickets > 0 ? (totalTickets - soldTickets) / totalTickets : 1;

      if (soldFilter === "available" && soldTickets !== 0) {
        return false;
      }

      if (soldFilter === "active" && soldTickets < 1) {
        return false;
      }

      if (soldFilter === "hot" && soldTickets < 10) {
        return false;
      }

      if (soldFilter === "almost-sold-out" && !(soldTickets > 0 && remainingRatio <= 0.2)) {
        return false;
      }

      return true;
    }));
  }, [dateFilter, events, locationTerm, maxPrice, minPrice, searchTerm, soldFilter]);

  const featuredEvents = useMemo(() => {
    const source = filteredEvents.length > 0 ? filteredEvents : events;
    const posterEvents = source.filter((event) => Boolean(event.posterUrl));
    return (posterEvents.length > 0 ? posterEvents : source).slice(0, 5);
  }, [events, filteredEvents]);

  const availableLocations = useMemo(
    () =>
      Array.from(
        new Set(
          events
            .map((event) => String(event.location || "").trim())
            .filter(Boolean)
        )
      ).sort((left, right) => left.localeCompare(right, "vi")),
    [events]
  );

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

  const resetFilters = () => {
    setSearchTerm("");
    setLocationTerm("");
    setMinPrice("");
    setMaxPrice("");
    setDateFilter("all");
    setSoldFilter("all");
  };

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
          availableLocations={availableLocations}
          locationTerm={locationTerm}
          onLocationChange={setLocationTerm}
          minPrice={minPrice}
          onMinPriceChange={setMinPrice}
          maxPrice={maxPrice}
          onMaxPriceChange={setMaxPrice}
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
          soldFilter={soldFilter}
          onSoldFilterChange={setSoldFilter}
          onReset={resetFilters}
        />

        {isLoading ? <p className="page-feedback">Đang tải sự kiện...</p> : null}

        {!isLoading && filteredEvents.length > 0 ? (
          <div
            className={
              filteredEvents.length === 1
                ? "showcase-grid showcase-grid-single"
                : "showcase-grid"
            }
          >
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

        {!isLoading && filteredEvents.length === 0 ? (
          <div className="empty-state-panel">
            <strong>Không tìm thấy sự kiện phù hợp.</strong>
            <p>Thử từ khóa khác hoặc tải lại dữ liệu để cập nhật danh sách mở bán mới nhất.</p>
            <div className="empty-state-actions">
              <button
                className="secondary-button compact"
                type="button"
                onClick={resetFilters}
              >
                Xóa bộ lọc
              </button>
              <button className="ghost-button compact" type="button" onClick={loadEvents}>
                Tải lại sự kiện
              </button>
            </div>
          </div>
        ) : null}
      </SectionShell>
    </section>
  );
}
