import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { eventService } from "../services/eventService";
import { useAuth } from "../hooks/useAuth";

const createInitialForm = (eventItem) => ({
  title: eventItem?.title || "",
  introLine: eventItem?.introLine || "",
  description: eventItem?.description || "",
  posterUrl: eventItem?.posterUrl || "",
  date: eventItem?.date ? new Date(eventItem.date).toISOString().slice(0, 16) : "",
  location: eventItem?.location || "",
  totalTickets: String(eventItem?.totalTickets || 0),
  price: String(eventItem?.price || 0),
});

export function OrganizerEventEditPage() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const { user } = useAuth();
  const canManage = user?.role === "organizer";
  const hasLinkedWallet = Boolean(user?.walletLinked);
  const [eventItem, setEventItem] = useState(null);
  const [formValues, setFormValues] = useState(createInitialForm());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPoster, setIsUploadingPoster] = useState(false);
  const [pageError, setPageError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    if (!canManage || !eventId) {
      setIsLoading(false);
      return;
    }

    let isCancelled = false;

    const loadEvent = async () => {
      setIsLoading(true);
      setPageError("");

      try {
        const response = await eventService.getById(eventId);

        if (isCancelled) {
          return;
        }

        setEventItem(response);
        setFormValues(createInitialForm(response));
      } catch (error) {
        if (!isCancelled) {
          setPageError(error.message || "Không tải được sự kiện.");
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
  }, [canManage, eventId]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormValues((current) => ({
      ...current,
      [name]: value,
    }));
    setSaveMessage("");
    setPageError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setSaveMessage("");
    setPageError("");

    try {
      const response = await eventService.update(eventId, {
        title: formValues.title.trim(),
        introLine: formValues.introLine.trim(),
        description: formValues.description.trim(),
        posterUrl: formValues.posterUrl.trim(),
        date: formValues.date,
        location: formValues.location.trim(),
        totalTickets: Number(formValues.totalTickets),
        price: Number(formValues.price),
      });

      setEventItem(response.event);
      setFormValues(createInitialForm(response.event));
      setSaveMessage("Cập nhật sự kiện thành công.");
    } catch (error) {
      setPageError(error.message || "Không thể cập nhật sự kiện.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePosterUpload = async (file) => {
    if (!file) {
      return;
    }

    setPageError("");
    setSaveMessage("");
    setIsUploadingPoster(true);

    try {
      const response = await eventService.uploadPoster(file);
      setFormValues((current) => ({
        ...current,
        posterUrl: response.posterUrl || "",
      }));
    } catch (error) {
      setPageError(error.message || "Không thể tải poster.");
    } finally {
      setIsUploadingPoster(false);
    }
  };

  if (!canManage) {
    return (
      <section className="panel-card">
        <h2>Chỉnh sửa sự kiện</h2>
        <p className="page-feedback">Chỉ ban tổ chức mới có quyền truy cập.</p>
      </section>
    );
  }

  if (!hasLinkedWallet) {
    return (
      <section className="panel-card">
        <h2>Chỉnh sửa sự kiện</h2>
        <p className="page-feedback">
          Bạn cần liên kết ví MetaMask trong hồ sơ trước khi chỉnh sửa sự kiện.
        </p>
        <Link className="secondary-button" to="/profile">
          Đi tới hồ sơ
        </Link>
      </section>
    );
  }

  return (
    <section className="page-stack">
      <section className="panel-card event-editor-card">
        <div className="panel-heading">
          <div>
            <h1>Chỉnh sửa sự kiện</h1>
          </div>
          <div className="hero-actions">
            <button
              className="ghost-button"
              type="button"
              onClick={() => navigate("/organizer")}
            >
              Quay lại quản lý
            </button>
          </div>
        </div>

        {isLoading ? <p className="page-feedback">Đang tải dữ liệu sự kiện...</p> : null}
        {pageError ? <p className="page-feedback page-feedback-error">{pageError}</p> : null}

        {!isLoading && !pageError ? (
          <form className="event-editor-form" onSubmit={handleSubmit}>
            <div className="event-editor-grid">
              <label className="form-field">
                <span>Tên sự kiện</span>
                <input
                  name="title"
                  value={formValues.title}
                  onChange={handleChange}
                  placeholder="Tên sự kiện"
                  required
                />
              </label>

              <label className="form-field">
                <span>Dòng giới thiệu</span>
                <input
                  name="introLine"
                  value={formValues.introLine}
                  onChange={handleChange}
                  placeholder="Ví dụ: Đại tiệc fantasy cho fan kiếm hiệp"
                  maxLength="255"
                />
              </label>

              <label className="form-field">
                <span>Thời gian</span>
                <input
                  name="date"
                  type="datetime-local"
                  value={formValues.date}
                  onChange={handleChange}
                  required
                />
              </label>

              <label className="form-field event-editor-span">
                <span>Mô tả</span>
                <textarea
                  name="description"
                  value={formValues.description}
                  onChange={handleChange}
                  placeholder="Mô tả ngắn về sự kiện"
                  rows="6"
                />
              </label>

              <label className="form-field event-editor-span">
                <span>Poster sự kiện (URL ảnh)</span>
                <input
                  name="posterUrl"
                  value={formValues.posterUrl}
                  onChange={handleChange}
                  placeholder="https://.../poster.jpg"
                />
              </label>
              <label className="form-field event-editor-span">
                <span>Tải poster từ máy</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(event) => handlePosterUpload(event.target.files?.[0])}
                />
              </label>

              <label className="form-field">
                <span>Địa điểm</span>
                <input
                  name="location"
                  value={formValues.location}
                  onChange={handleChange}
                  placeholder="Địa điểm"
                />
              </label>

              <label className="form-field">
                <span>Tổng số vé</span>
                <input
                  name="totalTickets"
                  type="number"
                  min="1"
                  value={formValues.totalTickets}
                  onChange={handleChange}
                />
              </label>

              <label className="form-field">
                <span>Giá vé</span>
                <input
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formValues.price}
                  onChange={handleChange}
                />
              </label>
            </div>

            {formValues.posterUrl ? (
              <div className="event-poster-preview">
                <img alt={`Poster ${formValues.title || "sự kiện"}`} src={formValues.posterUrl} />
              </div>
            ) : (
              <div className="event-poster-preview event-poster-preview-empty">
                <span>Chưa có poster.</span>
              </div>
            )}
            {isUploadingPoster ? <p className="page-feedback">Đang tải poster lên...</p> : null}

            <div className="form-actions">
              <button className="primary-button" disabled={isSaving} type="submit">
                {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
                {isSaving ? <span className="button-spinner" /> : null}
              </button>
              <Link className="secondary-button" to="/organizer">
                Hủy
              </Link>
            </div>

            {saveMessage ? (
              <p className="page-feedback page-feedback-success">{saveMessage}</p>
            ) : null}
          </form>
        ) : null}
      </section>
    </section>
  );
}
