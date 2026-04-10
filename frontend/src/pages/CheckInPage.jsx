import { useEffect, useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { ticketService } from "../services/ticketService";

const parseTokenId = (payload) => {
  if (!payload) {
    return "";
  }

  try {
    const parsed = JSON.parse(payload);
    const candidate = parsed?.tokenId ?? parsed?.tokenID ?? parsed?.token;
    if (candidate !== undefined && candidate !== null) {
      return String(candidate);
    }
  } catch (error) {
    // Ignore JSON parse failures.
  }

  if (/^\d+$/.test(payload)) {
    return payload;
  }

  return "";
};

export function CheckInPage() {
  const { user } = useAuth();
  const canCheckIn = user?.role === "organizer" || user?.role === "staff";
  const scannerRef = useRef(null);
  const fileScannerRef = useRef(null);
  const scannerStartedRef = useRef(false);
  const [scanMessage, setScanMessage] = useState("");
  const [scanError, setScanError] = useState("");
  const [manualTokenId, setManualTokenId] = useState("");
  const [isChecking, setIsChecking] = useState(false);

  const handleCheckIn = async (tokenId, shouldRestartScanner = true) => {
    if (!tokenId) {
      setScanError("Không đọc được mã vé.");
      return;
    }

    setIsChecking(true);
    setScanError("");
    setScanMessage("");

    try {
      const response = await ticketService.checkIn(tokenId);
      setScanMessage(response.message || "Soát vé thành công.");
    } catch (error) {
      setScanError(error.message || "Soát vé thất bại.");
    } finally {
      setIsChecking(false);
      if (shouldRestartScanner) {
        setRestartScannerToken((current) => current + 1);
      }
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
      const tokenId = parseTokenId(decodedText);
      await handleCheckIn(tokenId, false);
    } catch (error) {
      setScanError("Không đọc được ảnh QR. Hãy thử lại.");
    }
  };

  const [restartScannerToken, setRestartScannerToken] = useState(0);

  useEffect(() => {
    if (!canCheckIn) {
      return undefined;
    }

    let isMounted = true;
    let qrScanner = null;

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

    const startScanner = async () => {
      try {
        if (scannerStartedRef.current) {
          return;
        }

        if (typeof window === "undefined") {
          return;
        }

        const { Html5Qrcode } = await import("html5-qrcode");
        const container = document.getElementById("qr-reader");
        if (!container) {
          return;
        }

        if (!isMounted) {
          return;
        }

        container.innerHTML = "";

        qrScanner = new Html5Qrcode("qr-reader");
        scannerRef.current = qrScanner;
        scannerStartedRef.current = true;

        await qrScanner.start(
          { facingMode: "environment" },
          { fps: 8, qrbox: { width: 220, height: 220 } },
          async (decodedText) => {
            if (isChecking) {
              return;
            }

            const tokenId = parseTokenId(decodedText);
            await handleCheckIn(tokenId);
            try {
              await safeStop(qrScanner);
            } finally {
              scannerStartedRef.current = false;
            }
          },
          () => {}
        );
      } catch (error) {
        scannerStartedRef.current = false;
        if (isMounted) {
          setScanError("Không thể mở camera. Hãy kiểm tra quyền truy cập.");
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      if (scannerRef.current) {
        safeStop(scannerRef.current);
        safeClear(scannerRef.current);
        scannerStartedRef.current = false;
      }
    };
  }, [canCheckIn, restartScannerToken]);

  if (!canCheckIn) {
    return (
      <section className="panel-card">
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
          <p className="field-hint">
            Dùng camera để quét QR trên vé. Nếu không mở được camera, hãy dùng nhập tay.
          </p>
        </div>

        {scanMessage ? (
          <p className="page-feedback page-feedback-success">{scanMessage}</p>
        ) : null}
        {scanError ? <p className="page-feedback page-feedback-error">{scanError}</p> : null}
      </section>

      <section className="panel-card">
        <div className="panel-heading">
          <h2>Nhập mã vé</h2>
        </div>
        <form
          className="profile-form"
          onSubmit={(event) => {
            event.preventDefault();
            handleCheckIn(manualTokenId.trim());
          }}
        >
          <label className="form-field">
            <span>Mã Token</span>
            <input
              value={manualTokenId}
              onChange={(event) => setManualTokenId(event.target.value)}
              placeholder="Ví dụ: 123"
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
    </section>
  );
}
