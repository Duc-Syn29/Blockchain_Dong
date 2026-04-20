# Blockchain_Dong

Ung dung web quan ly su kien va ve NFT, gom:

- `backend/`: Node.js + Express + Sequelize + MySQL + blockchain integration
- `frontend/`: React + Vite

Project hien da noi duoc `frontend` va `backend` cho cac luong:

- Dang ky
- Dang nhap
- Xem danh sach su kien
- Tao su kien voi vai tro `organizer`
- Cap nhat profile
- Xem ve cua toi
- Mua ve NFT neu da cau hinh blockchain day du

## Cau truc thu muc

```text
backend/
  contracts/
  scripts/
  src/
frontend/
  src/
README.md
```

## Yeu cau

- Node.js 18+
- npm
- MySQL 8+

## 1. Tao file moi truong

### Backend

Tao file `backend/.env` tu `backend/.env.example`.

Gia tri toi thieu de chay auth + events:

```env
PORT=5000
DATABASE_URL=mysql://root:password@localhost:3306/blockchain_dong
DB_SYNC=false
JWT_SECRET=replace_with_a_long_random_secret
FRONTEND_ORIGIN=http://localhost:5173
```

Neu muon mua ve NFT tren blockchain, bo sung them:

```env
RPC_URL=https://testnet.sapphire.oasis.io
TESTNET_RPC_URL=https://testnet.sapphire.oasis.io
PRIVATE_KEY=0xYOUR_PRIVATE_KEY
DEPLOYER_PRIVATE_KEY=0xYOUR_DEPLOYER_PRIVATE_KEY
CONTRACT_ADDRESS=0xYOUR_CONTRACT_ADDRESS
MINT_FUNCTION_NAME=mintTicket
CONTRACT_NAME=Event Ticket NFT
CONTRACT_SYMBOL=ETIX
BASE_TOKEN_URI=
```

### Frontend

Tao file `frontend/.env` tu `frontend/.env.example`.

```env
VITE_API_BASE_URL=http://localhost:5000
```

## 2. Tao database MySQL va import Ticket.sql

Tao database co ten `blockchain_dong`, hoac doi `DATABASE_URL` theo database ban muon dung.

Vi du trong MySQL:

```sql
CREATE DATABASE blockchain_dong;
```

Sau do import file [Ticket.sql](c:/Users/HP/Blockchain_Dong/Ticket.sql):

```powershell
mysql -u root -p blockchain_dong < Ticket.sql
```

Hoac mo MySQL Workbench / phpMyAdmin va chay noi dung file `Ticket.sql`.

## 3. Cai dependency

### Backend

```powershell
cd backend
npm install
```

### Frontend

```powershell
cd frontend
npm install
```

## 4. Chay du an

Can mo 2 terminal.

### Terminal 1: Backend

```powershell
cd backend
npm run dev
```

Backend mac dinh chay tai:

```text
http://localhost:5000
```

### Terminal 2: Frontend

```powershell
cd frontend
npm run dev
```

Frontend mac dinh chay tai:

```text
http://localhost:5173
```

## 5. Cac luong co the test

### Auth + profile + event

Ban co the chay duoc ngay neu da co:

- MySQL da import `Ticket.sql`
- `DATABASE_URL`
- `JWT_SECRET`
- `FRONTEND_ORIGIN`

Co the test:

- Dang ky tai khoan
- Dang nhap
- Cap nhat ten hien thi
- Tao su kien neu dang ky role `organizer`
- Xem danh sach su kien

### Mua ve NFT

Luong nay can them:

- Smart contract da deploy
- `CONTRACT_ADDRESS` dung
- `PRIVATE_KEY` hop le
- ABI hop le trong `backend/src/config/contractAbi.json` hoac `CONTRACT_ABI`

Neu chua cau hinh blockchain day du, app van co the chay auth + events, nhung mua ve se loi.

## 6. Script co san

### Backend

```powershell
npm run dev
npm start
npm run contract:compile
npm run contract:deploy:testnet
npm run contract:export-abi
```

### Frontend

```powershell
npm run dev
npm run build
npm run preview
```

## 7. Luu y

- Backend dang duoc map theo schema trong `Ticket.sql`.
- Mac dinh `DB_SYNC=false` de tranh Sequelize tu sua schema MySQL da import.
- `frontend` goi API backend qua `VITE_API_BASE_URL`.
- Backend cho phep CORS tu `FRONTEND_ORIGIN`.
- File `.env` khong nen commit len Git.
- Theo schema `Ticket.sql`, `walletAddress` la dinh danh chinh cua user, nen dang ky bat buoc phai co vi.
- Khi deploy production, backend co the phuc vu luon `frontend/dist` neu ban build frontend truoc.

## 8. Deploy production

### Cach don gian nhat

Deploy theo mo hinh:

- 1 backend Node.js
- 1 MySQL production
- frontend duoc build thanh `frontend/dist` va backend phuc vu cung domain

Neu ban dung Render, xem tai lieu chi tiet trong [RENDER_DEPLOY.md](c:/Users/HP/Blockchain_Dong/RENDER_DEPLOY.md).

### Build production

```powershell
cd frontend
npm install
npm run build

cd ../backend
npm install
npm start
```

Neu thu muc `frontend/dist` ton tai, backend se tu dong phuc vu giao dien web.

### Bien moi truong production toi thieu

```env
PORT=5000
DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/blockchain_dong
JWT_SECRET=mot_chuoi_bi_mat_rat_dai
DB_SYNC=false
FRONTEND_ORIGIN=https://ten-mien-cua-ban.com
UPLOADS_DIR=
STORAGE_DIR=
```

Frontend can duoc build voi:

```env
VITE_API_BASE_URL=https://ten-mien-api-cua-ban.com
VITE_CURRENCY_LABEL=ROSE
VITE_BLOCK_EXPLORER_BASE_URL=https://explorer.oasis.io/testnet/sapphire
```

Neu ban deploy frontend chung domain voi backend, co the dat `VITE_API_BASE_URL` bang chinh domain backend.

### Lenh build/start goi y cho Render hoac VPS

Build command:

```powershell
cd frontend && npm ci && npm run build && cd ../backend && npm ci
```

Start command:

```powershell
cd backend && npm start
```

### Luu y quan trong khi deploy

- Thu muc `backend/uploads` hien dang luu poster/avatar local. Neu host khong co persistent disk, anh co the mat sau khi restart hoac redeploy.
- Thu muc `backend/storage` dang luu mot so file JSON noi bo. Thu muc nay cung nen nam tren persistent disk neu ban muon giu du lieu on dinh.
- Neu muon deploy ben vung hon, nen chuyen upload sang S3 / Cloudinary va chuyen cac file JSON tam sang database.
- Neu bat blockchain mint NFT, can cau hinh them `RPC_URL`, `PRIVATE_KEY`, `CONTRACT_ADDRESS` va ABI nhu o phan tren.

## 9. Neu gap loi

### Backend khong len

Kiem tra lai:

- MySQL dang chay
- Database da import `Ticket.sql`
- `DATABASE_URL` dung
- `JWT_SECRET` da set

### Frontend goi API that bai

Kiem tra lai:

- Backend da chay o cong `5000`
- `frontend/.env` co `VITE_API_BASE_URL=http://localhost:5000`
- `backend/.env` co `FRONTEND_ORIGIN=http://localhost:5173`

### Mua ve bi loi

Kiem tra lai:

- Contract da deploy
- `CONTRACT_ADDRESS` dung
- `PRIVATE_KEY` dung
- ABI ton tai trong `backend/src/config/contractAbi.json`
