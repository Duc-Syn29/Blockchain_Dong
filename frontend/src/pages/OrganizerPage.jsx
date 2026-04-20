import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { organizerService } from "../services/organizerService";
import { eventService } from "../services/eventService";
import { useAuth } from "../hooks/useAuth";

const initialEventForm = {
  title: "",
  description: "",
  posterUrl: "",
  date: "",
  location: "",
  totalTickets: "50",
  price: "0",
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

const formatDateOnly = (value) => {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
  }).format(new Date(value));
};

const toCsv = (rows) => {
  const headers = [
    "ticketId",
    "tokenId",
    "ownerWallet",
    "ownerName",
    "ownerEmail",
    "status",
    "usedAt",
  ];
  const lines = [headers.join(",")];

  rows.forEach((row) => {
    const values = headers.map((header) => {
      const raw = row[header] ?? "";
      const safe = String(raw).replace(/\"/g, '""');
      return `"${safe}"`;
    });
    lines.push(values.join(","));
  });

  return lines.join("\n");
};

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
    backgroundImage: `linear-gradient(180deg, rgba(20, 33, 61, 0.14), rgba(20, 33, 61, 0.38)), url("${escapePosterUrl(event.posterUrl)}")`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
};

const getEventStateLabel = (eventItem) =>
  eventItem.isClosed ? "Sự kiện đã đóng" : "Sự kiện đang mở";

const getEventChipLabel = (eventItem) =>
  eventItem.isClosed ? "ĐÃ ĐÓNG" : "ĐANG QUẢN LÝ";

export function OrganizerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSection = searchParams.get("section") === "manage" ? "manage" : "create";
  const { user } = useAuth();
  const canManage = user?.role === "organizer";
  const hasLinkedWallet = Boolean(user?.walletLinked);
  const currencyLabel = import.meta.env.VITE_CURRENCY_LABEL || "ROSE";
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [expandedEventId, setExpandedEventId] = useState(null);
  const [expandedCheckinEventId, setExpandedCheckinEventId] = useState(null);
  const [ticketsByEvent, setTicketsByEvent] = useState({});
  const [checkinsByEvent, setCheckinsByEvent] = useState({});
  const [createForm, setCreateForm] = useState(initialEventForm);
  const [createMessage, setCreateMessage] = useState("");
  const [createError, setCreateError] = useState("");
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [isUploadingPoster, setIsUploadingPoster] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState("date-asc");
  const [ticketSearchTerm, setTicketSearchTerm] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [activeSection, setActiveSection] = useState(initialSection);
  const [closingEventId, setClosingEventId] = useState("");
  const [reopeningEventId, setReopeningEventId] = useState("");
  const [actionMenuEventId, setActionMenuEventId] = useState("");

  const loadEvents = async () => {
    setIsLoading(true);
    setPageError("");

    try {
      const response = await organizerService.listEvents();
      setEvents(response);
    } catch (error) {
      setPageError(error.message || "Không tải được sự kiện.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (canManage) {
      loadEvents();
    }
  }, [canManage]);

  useEffect(() => {
    const sectionFromUrl = searchParams.get("section") === "manage" ? "manage" : "create";
    setActiveSection(sectionFromUrl);
  }, [searchParams]);

  useEffect(() => {
    setActionMenuEventId("");
  }, [activeSection]);

  const handleSectionChange = (nextSection) => {
    setActiveSection(nextSection);
    setSearchParams((current) => {
      const nextParams = new URLSearchParams(current);
      nextParams.set("section", nextSection);
      return nextParams;
    });
  };

  const handleCreateFormChange = (event) => {
    const { name, value } = event.target;

    setCreateForm((current) => ({
      ...current,
      [name]: value,
    }));
    setCreateMessage("");
    setCreateError("");
  };

  const handleCreateEvent = async (event) => {
    event.preventDefault();
    setCreateMessage("");
    setCreateError("");
    setIsCreatingEvent(true);

    try {
      await eventService.create({
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        posterUrl: createForm.posterUrl.trim(),
        date: createForm.date,
        location: createForm.location.trim(),
        totalTickets: Number(createForm.totalTickets),
        price: Number(createForm.price),
      });

      setCreateForm(initialEventForm);
      setCreateMessage("Tạo sự kiện thành công.");
      await loadEvents();
    } catch (error) {
      setCreateError(error.message || "Không thể tạo sự kiện.");
    } finally {
      setIsCreatingEvent(false);
    }
  };

  const handlePosterUpload = async (file) => {
    if (!file) {
      return;
    }

    setCreateError("");
    setCreateMessage("");
    setIsUploadingPoster(true);

    try {
      const response = await eventService.uploadPoster(file);
      setCreateForm((current) => ({
        ...current,
        posterUrl: response.posterUrl || "",
      }));
    } catch (error) {
      setCreateError(error.message || "Không thể tải poster.");
    } finally {
      setIsUploadingPoster(false);
    }
  };

  const handleToggleTickets = async (eventId) => {
    setExpandedEventId((current) => (current === eventId ? null : eventId));
    setTicketSearchTerm("");

    if (ticketsByEvent[eventId]) {
      return;
    }

    try {
      const response = await organizerService.getEventTickets(eventId);
      setTicketsByEvent((current) => ({ ...current, [eventId]: response }));
    } catch (error) {
      setPageError(error.message || "Không tải được vé.");
    }
  };

  const handleToggleCheckins = async (eventId) => {
    setExpandedCheckinEventId((current) => (current === eventId ? null : eventId));

    if (checkinsByEvent[eventId]) {
      return;
    }

    try {
      const response = await organizerService.getEventCheckins(eventId);
      setCheckinsByEvent((current) => ({ ...current, [eventId]: response }));
    } catch (error) {
      setPageError(error.message || "Không tải được dữ liệu check-in.");
    }
  };

  const handleExportCsv = async (eventId, eventTitle) => {
    let tickets = ticketsByEvent[eventId];
    if (!tickets) {
      try {
        tickets = await organizerService.getEventTickets(eventId);
        setTicketsByEvent((current) => ({ ...current, [eventId]: tickets }));
      } catch (error) {
        setPageError(error.message || "Không tải được vé để xuất CSV.");
        return;
      }
    }

    const rows = (tickets || []).map((ticket) => ({
      ticketId: ticket.id,
      tokenId: ticket.tokenId,
      ownerWallet: ticket.ownerWallet,
      ownerName: ticket.Owner?.name || "",
      ownerEmail: ticket.Owner?.email || "",
      status: ticket.status,
      usedAt: ticket.usedAt || "",
    }));

    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${eventTitle || "tickets"}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleCloseEvent = async (eventId) => {
    const shouldClose = window.confirm(
      "Đóng sự kiện sẽ gỡ sự kiện khỏi trang chủ. Bạn vẫn xem được lịch sử trong quản lý sự kiện. Tiếp tục?"
    );

    if (!shouldClose) {
      return;
    }

    try {
      setPageError("");
      setActionMessage("");
      setClosingEventId(String(eventId));
      const response = await eventService.close(eventId);
      setActionMessage(response.message || "Đã đóng sự kiện.");
      setEvents((current) =>
        current.map((eventItem) =>
          eventItem.id === eventId
            ? {
                ...eventItem,
                status: "Cancelled",
                visibility: "Unlisted",
                isClosed: true,
              }
            : eventItem
        )
      );
    } catch (error) {
      setPageError(error.message || "Không thể đóng sự kiện.");
    } finally {
      setClosingEventId("");
    }
  };

  const handleReopenEvent = async (eventId) => {
    const shouldReopen = window.confirm(
      "Sự kiện sẽ được mở bán lại nếu ngày tổ chức hiện đang ở tương lai. Tiếp tục?"
    );

    if (!shouldReopen) {
      return;
    }

    try {
      setPageError("");
      setActionMessage("");
      setReopeningEventId(String(eventId));
      const response = await eventService.reopen(eventId);
      setActionMessage(response.message || "Đã mở bán lại sự kiện.");
      setEvents((current) =>
        current.map((eventItem) =>
          eventItem.id === eventId
            ? {
                ...eventItem,
                ...(response.event || {}),
                status: "Published",
                visibility: "Public",
                isClosed: false,
              }
            : eventItem
        )
      );
    } catch (error) {
      setPageError(error.message || "Không thể mở bán lại sự kiện.");
    } finally {
      setReopeningEventId("");
    }
  };

  const selectedTickets = useMemo(
    () => {
      const currentTickets = expandedEventId ? ticketsByEvent[expandedEventId] || [] : [];
      const normalizedQuery = ticketSearchTerm.trim().toLowerCase();

      if (!normalizedQuery) {
        return currentTickets;
      }

      return currentTickets.filter((ticket) => {
        const searchableText = [
          ticket.tokenId,
          ticket.ownerWallet,
          ticket.Owner?.name,
          ticket.Owner?.email,
          ticket.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedQuery);
      });
    },
    [expandedEventId, ticketsByEvent, ticketSearchTerm]
  );

  const filteredEvents = useMemo(() => {
    const now = Date.now();
    const normalizedQuery = searchTerm.trim().toLowerCase();

    const nextEvents = events.filter((eventItem) => {
      const isSoldOut =
        Number(eventItem.totalTickets || 0) > 0 &&
        Number(eventItem.soldTickets || 0) >= Number(eventItem.totalTickets || 0);
      const isPast = new Date(eventItem.date).getTime() < now;
      const searchableText = [
        eventItem.title,
        eventItem.location,
        eventItem.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (normalizedQuery && !searchableText.includes(normalizedQuery)) {
        return false;
      }

      if (statusFilter === "sold-out" && !isSoldOut) {
        return false;
      }

      if (statusFilter === "selling" && (isSoldOut || isPast || eventItem.isClosed)) {
        return false;
      }

      if (statusFilter === "past" && !isPast) {
        return false;
      }

      if (statusFilter === "closed" && !eventItem.isClosed) {
        return false;
      }

      return true;
    });

    nextEvents.sort((left, right) => {
      if (sortKey === "date-desc") {
        return new Date(right.date) - new Date(left.date);
      }

      if (sortKey === "revenue-desc") {
        return Number(right.revenue || 0) - Number(left.revenue || 0);
      }

      if (sortKey === "sold-desc") {
        return Number(right.soldTickets || 0) - Number(left.soldTickets || 0);
      }

      return new Date(left.date) - new Date(right.date);
    });

    return nextEvents;
  }, [events, searchTerm, statusFilter, sortKey]);

  if (!canManage) {
    return (
      <section className="panel-card">
        <h2>Quản lý sự kiện</h2>
        <p className="page-feedback">Chỉ ban tổ chức mới có quyền truy cập.</p>
      </section>
    );
  }

  if (!hasLinkedWallet) {
    return (
      <section className="panel-card">
        <h2>Quản lý sự kiện</h2>
        <p className="page-feedback">
          Bạn cần liên kết ví MetaMask trong hồ sơ trước khi quản lý sự kiện.
        </p>
        <Link className="secondary-button compact" to="/profile">
          Đi tới hồ sơ
        </Link>
      </section>
    );
  }

  return (
    <section className="page-stack">
      <section className="panel-card">
        <div className="panel-heading">
          <div>
            <h2>Không gian sự kiện</h2>
          </div>
        </div>

        <div className="ticket-tab-list" role="tablist" aria-label="Điều hướng sự kiện">
          <button
            className={activeSection === "create" ? "profile-tab active" : "profile-tab"}
            type="button"
            onClick={() => handleSectionChange("create")}
          >
            Tạo mới sự kiện
          </button>
          <button
            className={activeSection === "manage" ? "profile-tab active" : "profile-tab"}
            type="button"
            onClick={() => handleSectionChange("manage")}
          >
            Quản lý sự kiện
          </button>
        </div>

        {isLoading ? <p className="page-feedback">Đang tải sự kiện...</p> : null}
        {actionMessage ? <p className="page-feedback page-feedback-success">{actionMessage}</p> : null}
        {pageError ? <p className="page-feedback page-feedback-error">{pageError}</p> : null}

        {activeSection === "create" ? (
          <>
            <form className="event-form" onSubmit={handleCreateEvent}>
              <label className="form-field">
                <span>Tên sự kiện</span>
                <input
                  name="title"
                  value={createForm.title}
                  onChange={handleCreateFormChange}
                  placeholder="Tên sự kiện"
                  required
                />
              </label>
              <label className="form-field">
                <span>Mô tả</span>
                <textarea
                  name="description"
                  value={createForm.description}
                  onChange={handleCreateFormChange}
                  placeholder="Mô tả ngắn về sự kiện"
                  rows="4"
                />
              </label>
              <label className="form-field">
                <span>Poster sự kiện (URL ảnh)</span>
                <input
                  name="posterUrl"
                  value={createForm.posterUrl}
                  onChange={handleCreateFormChange}
                  placeholder="https://.../poster.jpg"
                />
              </label>
              <label className="form-field">
                <span>Tải poster từ máy</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(event) => handlePosterUpload(event.target.files?.[0])}
                />
              </label>
              {isUploadingPoster ? <p className="page-feedback">Đang tải poster lên...</p> : null}
              {createForm.posterUrl ? (
                <div className="event-poster-preview">
                  <img alt={`Poster ${createForm.title || "sự kiện"}`} src={createForm.posterUrl} />
                </div>
              ) : null}
              <label className="form-field">
                <span>Thời gian</span>
                <input
                  name="date"
                  type="datetime-local"
                  value={createForm.date}
                  onChange={handleCreateFormChange}
                  required
                />
              </label>
              <label className="form-field">
                <span>Địa điểm</span>
                <input
                  name="location"
                  value={createForm.location}
                  onChange={handleCreateFormChange}
                  placeholder="Địa điểm"
                />
              </label>
              <label className="form-field">
                <span>Số lượng vé</span>
                <input
                  name="totalTickets"
                  type="number"
                  min="1"
                  value={createForm.totalTickets}
                  onChange={handleCreateFormChange}
                />
              </label>
              <label className="form-field">
                <span>Giá vé</span>
                <input
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={createForm.price}
                  onChange={handleCreateFormChange}
                />
              </label>

              <div className="form-actions">
                <button className="primary-button" disabled={isCreatingEvent} type="submit">
                  {isCreatingEvent ? "Đang tạo..." : "Tạo sự kiện"}
                  {isCreatingEvent ? <span className="button-spinner" /> : null}
                </button>
              </div>
            </form>

            {createMessage ? (
              <p className="page-feedback page-feedback-success">{createMessage}</p>
            ) : null}
            {createError ? <p className="page-feedback page-feedback-error">{createError}</p> : null}
          </>
        ) : (
          <>
            <div className="form-actions">
              <button className="ghost-button compact" type="button" onClick={loadEvents}>
                Tải lại
              </button>
            </div>

            <div className="event-editor-grid">
              <label className="form-field">
                <span>Tìm sự kiện</span>
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Nhập tên, địa điểm hoặc chủ đề"
                />
              </label>
              <label className="form-field">
                <span>Lọc trạng thái</span>
                <select
                  className="form-select"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="all">Tất cả</option>
                  <option value="selling">Đang mở bán</option>
                  <option value="sold-out">Đã hết vé</option>
                  <option value="past">Đã diễn ra</option>
                  <option value="closed">Đã đóng</option>
                </select>
              </label>
              <label className="form-field">
                <span>Sắp xếp</span>
                <select
                  className="form-select"
                  value={sortKey}
                  onChange={(event) => setSortKey(event.target.value)}
                >
                  <option value="date-asc">Ngày gần nhất</option>
                  <option value="date-desc">Ngày xa nhất</option>
                  <option value="revenue-desc">Doanh thu cao nhất</option>
                  <option value="sold-desc">Bán nhiều nhất</option>
                </select>
              </label>
            </div>

            <section className="event-grid">
              {filteredEvents.map((eventItem) => (
                <article className="event-card organizer-event-card event-card-compact" key={eventItem.id}>
                  <div className="event-visual organizer-event-visual" style={getPosterStyle(eventItem)}>
                    {eventItem.posterUrl ? (
                      <img
                        className="poster-media-image poster-media-image-cover"
                        src={eventItem.posterUrl}
                        alt={eventItem.title}
                        loading="lazy"
                        decoding="async"
                        draggable="false"
                      />
                    ) : null}
                    <span className="event-visual-chip">{getEventChipLabel(eventItem)}</span>
                  </div>
                  <div className="event-card-top organizer-event-top">
                    <h3>{eventItem.title}</h3>
                    <p className="event-meta">{formatDateTime(eventItem.date)}</p>
                    <p className="event-meta">{eventItem.location || "Chưa cập nhật"}</p>
                    <p className="organizer-event-state">{getEventStateLabel(eventItem)}</p>
                  </div>

                  <div className="event-price-band">
                    <span>Giá vé:</span>
                    <strong>{Number(eventItem.price || 0).toLocaleString("vi-VN")} {currencyLabel}</strong>
                  </div>

                  <div className="card-actions organizer-event-actions">
                    <div className="organizer-event-actions-main">
                      <Link className="secondary-button compact" to={`/events/${eventItem.id}`}>
                        Chi tiết
                      </Link>
                      <Link
                        className="secondary-button compact"
                        to={`/organizer/events/${eventItem.id}/edit`}
                      >
                        Chỉnh sửa
                      </Link>
                    </div>

                    <div className="organizer-event-primary-action">
                      <button
                        className="ghost-button compact"
                        type="button"
                        onClick={() =>
                          setActionMenuEventId((current) =>
                            current === String(eventItem.id) ? "" : String(eventItem.id)
                          )
                        }
                      >
                        Thao tác
                      </button>
                      {eventItem.isClosed ? (
                        <button
                          className="ghost-button compact"
                          type="button"
                          onClick={() => handleReopenEvent(eventItem.id)}
                          disabled={reopeningEventId === String(eventItem.id)}
                        >
                          {reopeningEventId === String(eventItem.id)
                            ? "Đang mở bán..."
                            : "Mở bán lại"}
                        </button>
                      ) : (
                        <button
                          className="ghost-button compact"
                          type="button"
                          onClick={() => handleCloseEvent(eventItem.id)}
                          disabled={closingEventId === String(eventItem.id)}
                        >
                          {closingEventId === String(eventItem.id) ? "Đang đóng..." : "Đóng sự kiện"}
                        </button>
                      )}
                      {actionMenuEventId === String(eventItem.id) ? (
                        <div className="organizer-event-menu">
                          <button
                            className="ghost-button compact"
                            type="button"
                            onClick={() => {
                              handleToggleTickets(eventItem.id);
                              setActionMenuEventId("");
                            }}
                          >
                            {expandedEventId === eventItem.id ? "Ẩn vé" : "Xem vé"}
                          </button>
                          <button
                            className="ghost-button compact"
                            type="button"
                            onClick={() => {
                              handleToggleCheckins(eventItem.id);
                              setActionMenuEventId("");
                            }}
                          >
                            {expandedCheckinEventId === eventItem.id ? "Ẩn check-in" : "Check-in theo ngày"}
                          </button>
                          <button
                            className="ghost-button compact"
                            type="button"
                            onClick={() => {
                              handleExportCsv(eventItem.id, eventItem.title);
                              setActionMenuEventId("");
                            }}
                          >
                            Xuất CSV
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {expandedEventId === eventItem.id ? (
                    <div className="table-card">
                      <label className="form-field">
                        <span>Tìm người mua / token</span>
                        <input
                          value={ticketSearchTerm}
                          onChange={(event) => setTicketSearchTerm(event.target.value)}
                          placeholder="Tên, email, ví hoặc token"
                        />
                      </label>
                      {selectedTickets.length === 0 ? (
                        <p className="page-feedback">Chưa có vé nào.</p>
                      ) : (
                        <div className="table-grid">
                          {selectedTickets.map((ticket) => (
                            <div className="table-row" key={ticket.id}>
                              <div>
                                <strong>Token</strong>
                                <span>{ticket.tokenId}</span>
                              </div>
                              <div>
                                <strong>Người mua</strong>
                                <span>{ticket.Owner?.name || "Chưa có tên"}</span>
                              </div>
                              <div>
                                <strong>Email</strong>
                                <span>{ticket.Owner?.email || "Chưa có email"}</span>
                              </div>
                              <div>
                                <strong>Ví</strong>
                                <span>{ticket.ownerWallet}</span>
                              </div>
                              <div>
                                <strong>Trạng thái</strong>
                                <span>{ticket.status}</span>
                              </div>
                              <div>
                                <strong>UsedAt</strong>
                                <span>{ticket.usedAt ? formatDateOnly(ticket.usedAt) : "Chưa dùng"}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}

                  {expandedCheckinEventId === eventItem.id ? (
                    <div className="table-card">
                      {(checkinsByEvent[eventItem.id] || []).length === 0 ? (
                        <p className="page-feedback">Chưa có dữ liệu check-in.</p>
                      ) : (
                        <div className="table-grid">
                          {(checkinsByEvent[eventItem.id] || []).map((row) => (
                            <div className="table-row" key={row.date}>
                              <div>
                                <strong>Ngày</strong>
                                <span>{formatDateOnly(row.date)}</span>
                              </div>
                              <div>
                                <strong>Số check-in</strong>
                                <span>{row.count}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </article>
              ))}
            </section>
          </>
        )}
      </section>
      {!isLoading && activeSection === "manage" && filteredEvents.length === 0 ? (
        <section className="panel-card">
          <p className="page-feedback">Không có sự kiện nào khớp bộ lọc hiện tại.</p>
        </section>
      ) : null}
    </section>
  );
}
