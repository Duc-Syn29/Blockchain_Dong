import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { organizerService } from "../services/organizerService";
import { eventService } from "../services/eventService";
import { useAuth } from "../hooks/useAuth";

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

export function OrganizerPage() {
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
  const [editEventId, setEditEventId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editMessage, setEditMessage] = useState("");
  const [editError, setEditError] = useState("");

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

  const handleToggleTickets = async (eventId) => {
    setExpandedEventId((current) => (current === eventId ? null : eventId));
    setEditMessage("");
    setEditError("");

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
    setEditMessage("");
    setEditError("");

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

  const handleEditClick = (eventItem) => {
    setEditEventId(eventItem.id);
    setEditForm({
      title: eventItem.title || "",
      description: eventItem.description || "",
      date: eventItem.date ? new Date(eventItem.date).toISOString().slice(0, 16) : "",
      location: eventItem.location || "",
      totalTickets: String(eventItem.totalTickets || 0),
      price: String(eventItem.price || 0),
    });
    setEditMessage("");
    setEditError("");
  };

  const handleEditSubmit = async (eventId) => {
    setEditMessage("");
    setEditError("");

    try {
      const payload = {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        date: editForm.date,
        location: editForm.location.trim(),
        totalTickets: Number(editForm.totalTickets),
        price: Number(editForm.price),
      };
      const response = await eventService.update(eventId, payload);
      setEvents((current) =>
        current.map((item) =>
          item.id === eventId ? { ...item, ...response.event } : item
        )
      );
      setEditMessage("Cập nhật sự kiện thành công.");
      setEditEventId(null);
    } catch (error) {
      setEditError(error.message || "Không thể cập nhật sự kiện.");
    }
  };

  const selectedTickets = useMemo(
    () => (expandedEventId ? ticketsByEvent[expandedEventId] || [] : []),
    [expandedEventId, ticketsByEvent]
  );

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
            <h2>Quản lý sự kiện</h2>
          </div>
          <button className="ghost-button compact" type="button" onClick={loadEvents}>
            Tải lại
          </button>
        </div>

        {isLoading ? <p className="page-feedback">Đang tải sự kiện...</p> : null}
        {pageError ? <p className="page-feedback page-feedback-error">{pageError}</p> : null}
      </section>

      <section className="event-grid">
        {events.map((eventItem) => (
          <article className="event-card" key={eventItem.id}>
            <div className="event-card-top">
              <h3>{eventItem.title}</h3>
              <p className="event-meta">{formatDateTime(eventItem.date)}</p>
              <p className="event-meta">{eventItem.location || "Chưa cập nhật"}</p>
            </div>

            <dl className="event-stats">
              <div>
                <dt>Đã bán</dt>
                <dd>{eventItem.soldTickets ?? 0}</dd>
              </div>
              <div>
                <dt>Tổng vé</dt>
                <dd>{eventItem.totalTickets ?? 0}</dd>
              </div>
              <div>
                <dt>Doanh thu</dt>
                <dd>
                  {Number(eventItem.revenue || 0).toLocaleString("vi-VN")} {currencyLabel}
                </dd>
              </div>
              <div>
                <dt>Check-in</dt>
                <dd>{eventItem.checkedInCount ?? 0}</dd>
              </div>
            </dl>

            <div className="card-actions">
              <button
                className="secondary-button compact"
                type="button"
                onClick={() => handleEditClick(eventItem)}
              >
                Chỉnh sửa
              </button>
              <button
                className="ghost-button compact"
                type="button"
                onClick={() => handleToggleTickets(eventItem.id)}
              >
                {expandedEventId === eventItem.id ? "Ẩn vé" : "Xem vé"}
              </button>
              <button
                className="ghost-button compact"
                type="button"
                onClick={() => handleToggleCheckins(eventItem.id)}
              >
                {expandedCheckinEventId === eventItem.id ? "Ẩn check-in" : "Check-in theo ngày"}
              </button>
              <button
                className="ghost-button compact"
                type="button"
                onClick={() => handleExportCsv(eventItem.id, eventItem.title)}
              >
                Xuất CSV
              </button>
            </div>

            {editEventId === eventItem.id ? (
              <form
                className="event-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  handleEditSubmit(eventItem.id);
                }}
              >
                <label className="form-field">
                  <span>Tên sự kiện</span>
                  <input
                    value={editForm.title || ""}
                    onChange={(event) =>
                      setEditForm((current) => ({ ...current, title: event.target.value }))
                    }
                  />
                </label>
                <label className="form-field">
                  <span>Mô tả</span>
                  <textarea
                    value={editForm.description || ""}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="form-field">
                  <span>Thời gian</span>
                  <input
                    type="datetime-local"
                    value={editForm.date || ""}
                    onChange={(event) =>
                      setEditForm((current) => ({ ...current, date: event.target.value }))
                    }
                  />
                </label>
                <label className="form-field">
                  <span>Địa điểm</span>
                  <input
                    value={editForm.location || ""}
                    onChange={(event) =>
                      setEditForm((current) => ({ ...current, location: event.target.value }))
                    }
                  />
                </label>
                <label className="form-field">
                  <span>Tổng vé</span>
                  <input
                    type="number"
                    min="1"
                    value={editForm.totalTickets || ""}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        totalTickets: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="form-field">
                  <span>Giá vé</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.price || ""}
                    onChange={(event) =>
                      setEditForm((current) => ({ ...current, price: event.target.value }))
                    }
                  />
                </label>
                <div className="form-actions">
                  <button className="primary-button compact" type="submit">
                    Lưu
                  </button>
                  <button
                    className="ghost-button compact"
                    type="button"
                    onClick={() => setEditEventId(null)}
                  >
                    Hủy
                  </button>
                </div>
                {editMessage ? (
                  <p className="page-feedback page-feedback-success">{editMessage}</p>
                ) : null}
                {editError ? <p className="page-feedback page-feedback-error">{editError}</p> : null}
              </form>
            ) : null}

            {expandedEventId === eventItem.id ? (
              <div className="table-card">
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
    </section>
  );
}
