import { useMemo, useRef, useState } from "react";
import { PinPromptDialog } from "../components/forms/PinPromptDialog";

export function usePinPrompt(defaultOptions = {}) {
  const resolverRef = useRef(null);
  const [options, setOptions] = useState(null);

  const closeDialog = (value) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setOptions(null);

    if (resolve) {
      resolve(value);
    }
  };

  const promptPin = (nextOptions = {}) =>
    new Promise((resolve) => {
      resolverRef.current = resolve;
      setOptions({
        ...defaultOptions,
        ...nextOptions,
      });
    });

  const dialog = useMemo(
    () => (
      <PinPromptDialog
        isOpen={Boolean(options)}
        title={options?.title || "Nhập mã PIN"}
        message={options?.message || ""}
        confirmLabel={options?.confirmLabel || "Xác nhận"}
        cancelLabel={options?.cancelLabel || "Hủy"}
        onCancel={() => closeDialog(null)}
        onConfirm={(value) => closeDialog(value)}
      />
    ),
    [options]
  );

  return { promptPin, pinPromptDialog: dialog };
}
