import { useEffect, useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { ticketService } from "../services/ticketService";

const parseTokenId = (payload) => {
  const emptyResult = { tokenId: "", ticketPin: "" };

  if (!payload) {
    return emptyResult;
  }

  try {
    const parsed = JSON.parse(payload);
    const candidate = parsed?.tokenId ?? parsed?.tokenID ?? parsed?.token;
    const ticketPin = parsed?.ticketPin ?? parsed?.pin;
    if (candidate !== undefined && candidate !== null) {
      return {
        tokenId: String(candidate),
        ticketPin: ticketPin ? String(ticketPin) : "",
      };
    }
  } catch (error) {
    // Ignore JSON parse failures.
  }

  if (/^\d+$/.test(payload)) {
    return { tokenId: payload, ticketPin: "" };
  }

  return emptyResult;
};

const formatDateTime = (value) => {
  if (!value) {
    return "Chưa có dữ liệu";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Chưa có dữ liệu";
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

export function CheckInPage() {
  const { user } = useAuth();
  const canCheckIn = user?.role === "organizer" || user?.role === "staff";
  const scannerRef = useRef(null);
  const fileScannerRef = useRef(null);
  const [scanMessage, setScanMessage] = useState("");
  const [scanError, setScanError] = useState("");
  const [manualTokenId, setManualTokenId] = useState("");
  const [manualTicketPin, setManualTicketPin] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isPreparingCamera, setIsPreparingCamera] = useState(false);
  const [cameraOptions, setCameraOptions] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [lastResult, setLastResult] = useState(null);
  const [recentScans, setRecentScans] = useState([]);
  const isCheckingRef = useRef(false);

  const pushScanHistory = (entry) => {
    setRecentScans((current) => [entry, ...current].slice(0, 6));
  };

  const handleCheckIn = async (tokenId, ticketPin = "") => {
    if (!tokenId) {
      setScanError("Không đọc được mã vé.");
      setLastResult({
        status: "error",
        title: "Không đọc được mã vé",
        subtitle: "Hãy kiểm tra lại QR hoặc mã token.",
      });
      pushScanHistory({
        id: `${Date.now()}-invalid`,
        status: "error",
        tokenId: "Không xác định",
        message: "Không đọc được mã vé",
        scannedAt: new Date().toISOString(),
      });
      return;
    }

    setIsChecking(true);
    isCheckingRef.current = true;
    setScanError("");
    setScanMessage("");

    try {
      const response = await ticketService.checkIn(tokenId, ticketPin);
      setScanMessage(response.message || "Soát vé thành công.");
      setLastResult({
        status: "success",
        title: response.ticket?.Event?.title || "Check-in thành công",
        subtitle: `Token ${tokenId} đã được xác nhận vào cổng.`,
        meta: {
          tokenId,
          eventDate: response.ticket?.Event?.date || "",
          location: response.ticket?.Event?.location || "",
        },
      });
      pushScanHistory({
        id: `${Date.now()}-${tokenId}`,
        status: "success",
        tokenId,
        message: response.message || "Check-in thành công",
        scannedAt: new Date().toISOString(),
      });
    } catch (error) {
      setScanError(error.message || "Soát vé thất bại.");
      setLastResult({
        status: "error",
        title: "Không thể check-in",
        subtitle: error.message || "Soát vé thất bại.",
        meta: {
          tokenId,
        },
      });
      pushScanHistory({
        id: `${Date.now()}-${tokenId}`,
        status: "error",
        tokenId,
        message: error.message || "Soát vé thất bại",
        scannedAt: new Date().toISOString(),
      });
    } finally {
      setIsChecking(false);
      isCheckingRef.current = false;
    }
  };

  const handleScanFile = async (file) => {
    setScanError("");
    setScanMessage("");

    if (!file) {
      return;
    }

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const container = document.getElementById("qr-file-reader");
      if (!container) {
        setScanError("Không thể đọc QR từ ảnh. Vui lòng tải lại trang.");
        return;
      }

      if (!fileScannerRef.current) {
        fileScannerRef.current = new Html5Qrcode("qr-file-reader");
      }

      const decodedText = await fileScannerRef.current.scanFile(file, true);
      const result = parseTokenId(decodedText);
      await handleCheckIn(result.tokenId, result.ticketPin);
    } catch (error) {
      setScanError("Không đọc được ảnh QR. Hãy thử lại.");
    }
  };

  useEffect(() => {
    if (!canCheckIn) {
      return undefined;
    }

    const safeStop = async (scanner) => {
      if (!scanner) {
        return;
      }

      try {
        await scanner.stop();
      } catch (error) {
        // Ignore stop errors.
      }
    };

    const safeClear = async (scanner) => {
      if (!scanner) {
        return;
      }

      try {
        await scanner.clear();
      } catch (error) {
        // Ignore clear errors.
      }
    };

    return () => {
      if (scannerRef.current) {
        safeStop(scannerRef.current);
        safeClear(scannerRef.current);
        scannerRef.current = null;
        setIsCameraActive(false);
      }
    };
  }, [canCheckIn]);

  const loadCameraOptions = async () => {
    const { Html5Qrcode } = await import("html5-qrcode");
    const cameras = await Html5Qrcode.getCameras();
    const normalizedCameras = cameras.map((camera) => ({
      id: camera.id,
      label: camera.label || `Camera ${camera.id}`,
    }));

    setCameraOptions(normalizedCameras);

    if (!selectedCameraId && normalizedCameras.length > 0) {
      const preferredCamera =
        normalizedCameras.find((camera) =>
          /back|rear|environment|sau/i.test(camera.label)
        ) || normalizedCameras[0];

      setSelectedCameraId(preferredCamera.id);
      return preferredCamera.id;
    }

    return selectedCameraId || normalizedCameras[0]?.id || "";
  };

  useEffect(() => {
    if (!canCheckIn) {
      return;
    }

    loadCameraOptions().catch(() => {});
  }, [canCheckIn]);

  const ensureScanner = async () => {
    if (typeof window === "undefined") {
      throw new Error("Browser only");
    }

    const container = document.getElementById("qr-reader");
    if (!container) {
      throw new Error("Missing container");
    }

    if (!scannerRef.current) {
      const { Html5Qrcode } = await import("html5-qrcode");
      container.innerHTML = "";
      scannerRef.current = new Html5Qrcode("qr-reader");
    }

    return scannerRef.current;
  };

  const handleStartCamera = async () => {
    if (isCameraActive) {
      return;
    }

    setScanError("");
    setScanMessage("");
    setIsPreparingCamera(true);

    try {
      const nextCameraId = await loadCameraOptions();
      if (!nextCameraId) {
        throw new Error("No camera");
      }

      const scanner = await ensureScanner();
      await scanner.start(
        nextCameraId,
        {
          fps: 10,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const size = Math.min(viewfinderWidth, viewfinderHeight, 260);
            return {
              width: size,
              height: size,
            };
          },
          aspectRatio: 1,
          disableFlip: false,
        },
        async (decodedText) => {
          if (isCheckingRef.current) {
            return;
          }

          setScanMessage("Đã nhận mã QR, đang kiểm tra...");
          setScanError("");
          const result = parseTokenId(decodedText);
          await handleCheckIn(result.tokenId, result.ticketPin);
          await handleStopCamera();
        },
        () => {}
      );
      setIsCameraActive(true);
      setScanMessage("Camera đã bật. Đưa QR vào giữa khung để quét.");
    } catch (error) {
      setIsCameraActive(false);
      setScanError("Không thể mở camera. Hãy kiểm tra quyền truy cập và chọn đúng camera.");
    } finally {
      setIsPreparingCamera(false);
    }
  };

  const handleStopCamera = async () => {
    if (!scannerRef.current) {
      setIsCameraActive(false);
      return;
    }

    try {
      await scannerRef.current.stop();
    } catch (error) {
      // Ignore stop errors.
    }

    try {
      await scannerRef.current.clear();
    } catch (error) {
      // Ignore clear errors.
    }

    scannerRef.current = null;
    setIsCameraActive(false);
  };

  if (!canCheckIn) {
    return (
      <section className="panel-card checkin-panel">
        <h2>Soát vé</h2>
        <p className="page-feedback">
          Chỉ ban tổ chức hoặc nhân viên mới có quyền soát vé.
        </p>
      </section>
    );
  }

  return (
    <section className="page-stack">
      <section className="panel-card">
        <div className="panel-heading">
          <h2>Soát vé</h2>
        </div>
        <div className="scanner-card">
          <div id="qr-reader" className="qr-reader" />
          {cameraOptions.length > 1 ? (
            <label className="form-field">
              <span>Chon camera</span>
              <select
                className="form-select"
                value={selectedCameraId}
                onChange={(event) => setSelectedCameraId(event.target.value)}
                disabled={isCameraActive || isPreparingCamera}
              >
                {cameraOptions.map((camera) => (
                  <option key={camera.id} value={camera.id}>
                    {camera.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <div className="scanner-actions">
            <button
              className="primary-button"
              type="button"
              onClick={handleStartCamera}
              disabled={isCameraActive || isPreparingCamera}
            >
              {isPreparingCamera
                ? "Đang mở camera..."
                : isCameraActive
                  ? "Camera đang bật"
                  : "Bật camera"}
            </button>
            <button
              className="ghost-button"
              type="button"
              onClick={handleStopCamera}
              disabled={!isCameraActive}
            >
              Tắt camera
            </button>
          </div>
        </div>

        {scanMessage ? (
          <p className="page-feedback page-feedback-success">{scanMessage}</p>
        ) : null}
        {scanError ? <p className="page-feedback page-feedback-error">{scanError}</p> : null}
        {lastResult ? (
          <div className={lastResult.status === "success" ? "table-card scan-summary scan-summary-success scan-summary-compact" : "table-card scan-summary scan-summary-error scan-summary-compact"}>
            <div className="table-grid">
              <div className="table-row">
                <strong>{lastResult.status === "success" ? "Kết quả mới nhất" : "Lỗi mới nhất"}</strong>
                <span>{lastResult.title}</span>
              </div>
              <div className="table-row">
                <strong>Chi tiết</strong>
                <span>{lastResult.subtitle}</span>
              </div>
              {lastResult.meta?.tokenId ? (
                <div className="table-row">
                  <strong>Mã token</strong>
                  <span>{lastResult.meta.tokenId}</span>
                </div>
              ) : null}
              {lastResult.meta?.eventDate ? (
                <div className="table-row">
                  <strong>Thời gian sự kiện</strong>
                  <span>{formatDateTime(lastResult.meta.eventDate)}</span>
                </div>
              ) : null}
              {lastResult.meta?.location ? (
                <div className="table-row">
                  <strong>Địa điểm</strong>
                  <span>{lastResult.meta.location}</span>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>

      <section className="panel-card manual-checkin-panel">
        <div className="panel-heading">
          <h2>Nhập mã vé</h2>
        </div>
        <form
          className="profile-form"
          onSubmit={(event) => {
            event.preventDefault();
            handleCheckIn(manualTokenId.trim(), manualTicketPin.trim());
          }}
        >
          <label className="form-field">
            <span>Mã Token</span>
            <input
              value={manualTokenId}
              onChange={(event) => setManualTokenId(event.target.value)}
              placeholder="Nhập mã vé"
            />
          </label>
          <label className="form-field">
            <span>Mã PIN vé</span>
            <input
              value={manualTicketPin}
              onChange={(event) => setManualTicketPin(event.target.value)}
              inputMode="numeric"
              maxLength={4}
              placeholder="Nhập mã PIN"
            />
          </label>
          <label className="form-field">
            <span>Tải ảnh QR</span>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => handleScanFile(event.target.files?.[0])}
            />
          </label>
          <button className="primary-button" disabled={isChecking} type="submit">
            {isChecking ? "Đang kiểm tra..." : "Xác nhận"}
          </button>
        </form>
        <div id="qr-file-reader" className="qr-reader qr-reader-hidden" />
      </section>

      <section className="panel-card recent-scans-panel">
        <div className="panel-heading">
          <h2>Lượt quét gần nhất</h2>
        </div>
        {recentScans.length === 0 ? (
          <p className="page-feedback">Chưa có lượt quét nào trong phiên làm việc này.</p>
        ) : (
          <div className="table-grid">
            {recentScans.map((scanItem) => (
              <div className="table-row" key={scanItem.id}>
                <strong>{scanItem.status === "success" ? "Thành công" : "Thất bại"}</strong>
                <span>Token: {scanItem.tokenId}</span>
                <span>{scanItem.message}</span>
                <span>{formatDateTime(scanItem.scannedAt)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
