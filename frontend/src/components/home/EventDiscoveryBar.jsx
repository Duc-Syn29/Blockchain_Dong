export function EventDiscoveryBar({ searchTerm, onSearch, resultCount }) {
  return (
    <div className="discovery-bar">
      <label className="discovery-search" htmlFor="landing-event-search">
        <span className="discovery-search-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M10.5 4a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13Zm0 1.5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm8.53 11.97 1.94 1.94a.75.75 0 1 1-1.06 1.06l-1.94-1.94a.75.75 0 0 1 1.06-1.06Z" />
          </svg>
        </span>
        <input
          id="landing-event-search"
          value={searchTerm}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Tìm theo tên sự kiện, địa điểm hoặc ban tổ chức"
        />
      </label>
      <div className="discovery-meta">
        <strong>{resultCount}</strong>
        <span>sự kiện đang hiển thị</span>
      </div>
    </div>
  );
}
