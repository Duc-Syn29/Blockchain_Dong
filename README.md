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

## 8. Neu gap loi

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
