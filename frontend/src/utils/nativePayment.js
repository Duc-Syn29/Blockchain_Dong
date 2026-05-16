const formatAddress = (value) => {
  const normalizedValue = String(value || "").trim();

  if (normalizedValue.length <= 12) {
    return normalizedValue;
  }

  return `${normalizedValue.slice(0, 6)}...${normalizedValue.slice(-4)}`;
};

const normalizeAddress = (value) => String(value || "").trim().toLowerCase();

const waitForReceipt = async (transactionHash) => {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    const receipt = await window.ethereum.request({
      method: "eth_getTransactionReceipt",
      params: [transactionHash],
    });

    if (receipt) {
      if (receipt.status === "0x1") {
        return receipt;
      }

      throw new Error("Giao dịch thanh toán đã thất bại hoặc bị từ chối.");
    }

    await new Promise((resolve) => window.setTimeout(resolve, 1500));
  }

  throw new Error("Không nhận được xác nhận giao dịch thanh toán từ MetaMask.");
};

export const sendNativePayment = async ({
  ownerAddress,
  recipientAddress,
  amountWei,
  chainId,
}) => {
  if (!window.ethereum) {
    throw new Error("Không tìm thấy MetaMask.");
  }

  const requiredChainId = `0x${Number(chainId).toString(16)}`;
  const currentChainId = await window.ethereum.request({ method: "eth_chainId" });

  if (String(currentChainId).toLowerCase() !== requiredChainId.toLowerCase()) {
    throw new Error(`MetaMask đang ở sai mạng. Hãy chuyển sang Sapphire Testnet (chain ${chainId}).`);
  }

  const connectedAccounts = await window.ethereum.request({
    method: "eth_requestAccounts",
  });
  const selectedAddress = String(window.ethereum.selectedAddress || connectedAccounts?.[0] || "").trim();

  if (!selectedAddress) {
    throw new Error("Không lấy được tài khoản MetaMask để thanh toán.");
  }

  if (normalizeAddress(selectedAddress) !== normalizeAddress(ownerAddress)) {
    throw new Error(
      `MetaMask đang active ví ${formatAddress(selectedAddress)}, nhưng tài khoản này đã liên kết ví ${formatAddress(ownerAddress)}.`
    );
  }

  const transactionHash = await window.ethereum.request({
    method: "eth_sendTransaction",
    params: [
      {
        from: selectedAddress,
        to: recipientAddress,
        value: `0x${BigInt(amountWei).toString(16)}`,
      },
    ],
  });

  await waitForReceipt(transactionHash);
  return transactionHash;
};
