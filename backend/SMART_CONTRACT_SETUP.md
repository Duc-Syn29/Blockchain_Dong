# Thiết lập Hợp đồng Thông minh

Dự án này hiện đã bao gồm một hợp đồng ticket ERC-721 tối thiểu để triển khai trên mạng thử nghiệm.

Quy trình biên dịch sử dụng gói `solc` cục bộ nên có thể hoạt động mà không cần Hardhat tải xuống trình biên dịch.

## Các tập tin

- `contracts/EventTicketNFT.sol`: Hợp đồng thông minh vé NFT
- `hardhat.config.js`: Cấu hình Hardhat tùy chọn để sử dụng sau này
- `scripts/compile-contract.js`: Biên dịch hợp đồng cục bộ bằng `solc`
- `scripts/deploy-contract.js`: Triển khai hợp đồng và ghi ABI cho máy chủ phụ trợ
- `scripts/export-contract-abi.js`: Xuất lại ABI sau khi biên dịch lại

## Các giá trị `.env` bắt buộc

Quy trình triển khai sử dụng lại cùng một tập tin môi trường như máy chủ phụ trợ:

- `TESTNET_RPC_URL` hoặc `RPC_URL`

- `DEPLOYER_PRIVATE_KEY` hoặc một `PRIVATE_KEY` hợp lệ

Sau khi triển khai, cập nhật `.env` với:

- `CONTRACT_ADDRESS=<địa chỉ đã triển khai>`
- `MINT_FUNCTION_NAME=mintTicket`

Các giá trị tùy chọn:

- `CONTRACT_NAME`
- `CONTRACT_SYMBOL`
- `BASE_TOKEN_URI`
- `CONTRACT_OWNER_ADDRESS`

## Các lệnh

Cài đặt công cụ Solidity:

```powershell
npm install
```

Biên dịch hợp đồng:

```powershell
npm run contract:compile
```

Khi triển khai lên mạng thử nghiệm Oasis Sapphire, hãy biên dịch với `EVM version = paris`.

Kho lưu trữ này đã thực hiện điều đó cho bạn vì Sapphire không hỗ trợ `PUSH0`
từ phiên bản `shanghai` trở lên.

Triển khai lên mạng thử nghiệm đã cấu hình:

```powershell
npm run contract:deploy:testnet
```

Xuất lại ABI nếu cần:

```powershell
npm run contract:export-abi
```

## Tích hợp backend

Sau khi triển khai thành công:

1. Sao chép `CONTRACT_ADDRESS` đã in vào `.env`
2. Giữ nguyên `RPC_URL` và `PRIVATE_KEY` trỏ đến cùng một ví testnet/minter
3. Khởi động lại backend:

```powershell
node src/app.js
```

Backend sau đó sẽ đọc:

- `CONTRACT_ADDRESS` từ `.env`
- ABI từ `src/config/contractAbi.json`