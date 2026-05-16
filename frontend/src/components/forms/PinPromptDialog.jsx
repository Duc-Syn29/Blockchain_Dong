import { useEffect, useRef, useState } from "react";

export function PinPromptDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  onCancel,
  onConfirm,
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setValue("");
      return;
    }

    const focusTimeoutId = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 20);

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      window.clearTimeout(focusTimeoutId);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="pin-dialog-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="pin-dialog-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pin-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="pin-dialog-copy">
          <h2 id="pin-dialog-title">{title}</h2>
          {message ? <p>{message}</p> : null}
        </div>

        <form
          className="pin-dialog-form"
          onSubmit={(event) => {
            event.preventDefault();
            onConfirm(value);
          }}
        >
          <label className="form-field">
            <span>Mã PIN</span>
            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              value={value}
              onChange={(event) => setValue(event.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="Nhập 4 chữ số"
            />
          </label>

          <div className="form-actions">
            <button className="ghost-button" type="button" onClick={onCancel}>
              {cancelLabel}
            </button>
            <button className="primary-button" type="submit" disabled={value.length !== 4}>
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
