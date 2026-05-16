import { useEffect, useMemo, useRef, useState } from "react";

export function EventDiscoveryBar({
  searchTerm,
  onSearch,
  availableLocations,
  locationTerm,
  onLocationChange,
  minPrice,
  onMinPriceChange,
  maxPrice,
  onMaxPriceChange,
  dateFilter,
  onDateFilterChange,
  soldFilter,
  onSoldFilterChange,
  onReset,
}) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isLocationMenuOpen, setIsLocationMenuOpen] = useState(false);
  const locationFieldRef = useRef(null);
  const locationSuggestions = useMemo(
    () =>
      availableLocations.filter((location) =>
        locationTerm.trim()
          ? location.toLowerCase().includes(locationTerm.trim().toLowerCase())
          : true
      ),
    [availableLocations, locationTerm]
  );

  useEffect(() => {
    if (!isLocationMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!locationFieldRef.current?.contains(event.target)) {
        setIsLocationMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [isLocationMenuOpen]);

  useEffect(() => {
    if (!isFilterOpen) {
      setIsLocationMenuOpen(false);
    }
  }, [isFilterOpen]);

  return (
    <div className="discovery-bar">
      <div className="discovery-toolbar">
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

        <button
          className={isFilterOpen ? "filter-toggle-button active" : "filter-toggle-button"}
          type="button"
          onClick={() => setIsFilterOpen((current) => !current)}
          aria-expanded={isFilterOpen}
          aria-controls="landing-event-filters"
        >
          <span className="filter-toggle-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M3.75 5.25A.75.75 0 0 1 4.5 4.5h15a.75.75 0 0 1 .53 1.28l-5.78 5.78v5.19a.75.75 0 0 1-.4.66l-3 1.5a.75.75 0 0 1-1.1-.67v-6.68L3.97 5.78a.75.75 0 0 1-.22-.53Z" />
            </svg>
          </span>
          <span>Bộ lọc</span>
          <span className="filter-toggle-caret" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M6.97 8.97a.75.75 0 0 1 1.06 0L12 12.94l3.97-3.97a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 0 1 0-1.06Z" />
            </svg>
          </span>
        </button>
      </div>

      {isFilterOpen ? (
        <div className="discovery-filters" id="landing-event-filters">
          <div
            className="discovery-filter-field discovery-filter-field-wide"
            ref={locationFieldRef}
          >
            <span>Địa điểm</span>
            <div className="discovery-location-combobox">
              <div className="discovery-location-input-shell">
                <input
                  id="landing-event-location"
                  className="discovery-input"
                  value={locationTerm}
                  onChange={(event) => {
                    onLocationChange(event.target.value);
                    setIsLocationMenuOpen(true);
                  }}
                  onFocus={() => setIsLocationMenuOpen(true)}
                  placeholder="Nhập hoặc chọn địa điểm sự kiện"
                  autoComplete="off"
                />
                <button
                  className="discovery-location-toggle"
                  type="button"
                  aria-label="Mở danh sách địa điểm"
                  onClick={() => setIsLocationMenuOpen((current) => !current)}
                >
                  <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                    <path d="M6.97 8.97a.75.75 0 0 1 1.06 0L12 12.94l3.97-3.97a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 0 1 0-1.06Z" />
                  </svg>
                </button>
              </div>

              {isLocationMenuOpen ? (
                <div className="discovery-location-menu">
                  <button
                    className={
                      locationTerm.trim() === ""
                        ? "discovery-location-option active"
                        : "discovery-location-option"
                    }
                    type="button"
                    onClick={() => {
                      onLocationChange("");
                      setIsLocationMenuOpen(false);
                    }}
                  >
                    Tất cả địa điểm
                  </button>
                  {locationSuggestions.length > 0 ? (
                    locationSuggestions.map((location) => (
                      <button
                        key={location}
                        className={
                          location.toLowerCase() === locationTerm.trim().toLowerCase()
                            ? "discovery-location-option active"
                            : "discovery-location-option"
                        }
                        type="button"
                        onClick={() => {
                          onLocationChange(location);
                          setIsLocationMenuOpen(false);
                        }}
                      >
                        {location}
                      </button>
                    ))
                  ) : (
                    <div className="discovery-location-empty">Không có địa điểm phù hợp</div>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          <label className="discovery-filter-field" htmlFor="landing-event-min-price">
            <span>Giá từ</span>
            <input
              id="landing-event-min-price"
              className="discovery-input"
              type="number"
              min="0"
              value={minPrice}
              onChange={(event) => onMinPriceChange(event.target.value)}
              placeholder="0"
            />
          </label>

          <label className="discovery-filter-field" htmlFor="landing-event-max-price">
            <span>Đến giá</span>
            <input
              id="landing-event-max-price"
              className="discovery-input"
              type="number"
              min="0"
              value={maxPrice}
              onChange={(event) => onMaxPriceChange(event.target.value)}
              placeholder="Không giới hạn"
            />
          </label>

          <label className="discovery-filter-field" htmlFor="landing-event-date-filter">
            <span>Thời gian</span>
            <select
              id="landing-event-date-filter"
              className="form-select discovery-select"
              value={dateFilter}
              onChange={(event) => onDateFilterChange(event.target.value)}
            >
              <option value="all">Tất cả</option>
              <option value="today">Hôm nay</option>
              <option value="week">7 ngày tới</option>
              <option value="month">30 ngày tới</option>
            </select>
          </label>

          <label className="discovery-filter-field" htmlFor="landing-event-sold-filter">
            <span>Đã bán</span>
            <select
              id="landing-event-sold-filter"
              className="form-select discovery-select"
              value={soldFilter}
              onChange={(event) => onSoldFilterChange(event.target.value)}
            >
              <option value="all">Tất cả</option>
              <option value="almost-sold-out">Sắp hết vé</option>
            </select>
          </label>

          <button className="ghost-button compact" type="button" onClick={onReset}>
            Xóa bộ lọc
          </button>
        </div>
      ) : null}
    </div>
  );
}
