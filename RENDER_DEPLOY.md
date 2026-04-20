# Deploy Tren Render

Tai lieu nay chuan bi rieng cho du an `Blockchain_Dong`.

## Kien truc de xuat

Render cho du an nay nen tach thanh 2 phan:

1. `blockchain-dong-web`
   - Render Web Service
   - chay backend Node.js
   - phuc vu luon `frontend/dist`
   - co persistent disk cho:
     - `uploads`
     - `storage`

2. `blockchain-dong-mysql`
   - Render Private Service
   - chay MySQL 8
   - co persistent disk rieng cho du lieu MySQL

## Trang thai repo hien tai

Repo da duoc chuan bi san:

- `render.yaml` de tao web service tren Render
- backend co `GET /healthz`
- backend co the phuc vu frontend production tu `frontend/dist`
- backend ho tro dat duong dan persistent qua:
  - `UPLOADS_DIR`
  - `STORAGE_DIR`

## A. Tao MySQL private service tren Render

Render khong cung cap MySQL managed giong Postgres, nen voi MySQL ban nen tao `Private Service` rieng va gan disk.

### Cach tao

1. Vao Render Dashboard.
2. Chon `New` -> `Private Service`.
3. Chon cach deploy MySQL theo tai lieu Render:
   - dung repo mau MySQL cua Render
   - hoac dung official image MySQL neu ban quen voi Docker
4. Dat ten goi y: `blockchain-dong-mysql`
5. Chon region giong voi web service, goi y: `Singapore`
6. Them env:

```env
MYSQL_DATABASE=blockchain_dong
MYSQL_USER=blockchain_dong
MYSQL_PASSWORD=<mat-khau-rat-manh>
MYSQL_ROOT_PASSWORD=<mat-khau-root-rat-manh>
```

7. Gan persistent disk:
   - Mount Path: `/var/lib/mysql`
   - Size: `10 GB` tro len

Sau khi deploy xong, private URL thuong co dang:

```text
blockchain-dong-mysql:3306
```

## B. Tao web service bang Blueprint

Repo da co san `render.yaml`, ban co the dung Blueprint de Render tao service.

### Cach tao

1. Push repo len GitHub.
2. Vao Render Dashboard.
3. Chon `New` -> `Blueprint`.
4. Ket noi toi repo nay.
5. Render se doc file `render.yaml` va tao service `blockchain-dong-web`.

## C. Gia tri env can nhap cho web service

Trong `render.yaml`, cac bien `sync: false` can ban nhap tay tren Render.

### Bat buoc

```env
DATABASE_URL=mysql://blockchain_dong:<MYSQL_PASSWORD>@blockchain-dong-mysql:3306/blockchain_dong
FRONTEND_ORIGIN=https://<ten-web-cua-ban>.onrender.com
VITE_API_BASE_URL=https://<ten-web-cua-ban>.onrender.com
```

### Neu dung blockchain mint NFT

```env
RPC_URL=https://testnet.sapphire.oasis.io
TESTNET_RPC_URL=https://testnet.sapphire.oasis.io
PRIVATE_KEY=0x...
DEPLOYER_PRIVATE_KEY=0x...
CONTRACT_ADDRESS=0x...
```

### Da duoc set san trong Blueprint

```env
NODE_ENV=production
PORT=10000
DB_SYNC=false
UPLOADS_DIR=/var/data/uploads
STORAGE_DIR=/var/data/storage
VITE_BLOCK_EXPLORER_BASE_URL=https://explorer.oasis.io/testnet/sapphire
VITE_CURRENCY_LABEL=ROSE
MINT_FUNCTION_NAME=mintTicket
```

## D. Import database

Sau khi MySQL song, ban can import `Ticket.sql`.

Co 3 cach:

1. Ket noi vao MySQL bang MySQL Workbench tu may cua ban neu mo network phu hop.
2. Dung shell/SSH trong Render de import.
3. Import tu local vao MySQL service bang lenh `mysql`.

Neu ban muon an toan nhat, hay import schema truoc khi mo web production.

## E. Kiem tra sau deploy

1. Mo:

```text
https://<ten-web-cua-ban>.onrender.com/healthz
```

Phai tra ve:

```json
{"ok":true}
```

2. Mo trang chu web.
3. Thu dang ky / dang nhap.
4. Thu tao su kien.
5. Thu upload poster.
6. Thu reload lai de chac chan anh van con.

## F. Luu y quan trong

- Persistent disk cua web service la bat buoc neu ban muon giu:
  - avatar
  - poster
  - file JSON trong `storage`
- Persistent disk cua MySQL phai gan dung mount path `/var/lib/mysql`
- Khi co disk, Render se khong zero-downtime deploy cho service do
- Neu sau nay muon on dinh hon nua:
  - chuyen anh sang Cloudinary / S3
  - chuyen file JSON trong `storage` vao database

## G. Thu tu lam thuc te de it loi nhat

1. Push code len GitHub
2. Tao MySQL private service truoc
3. Gan disk cho MySQL
4. Import `Ticket.sql`
5. Tao Blueprint web service
6. Dien `DATABASE_URL`, `FRONTEND_ORIGIN`, `VITE_API_BASE_URL`
7. Deploy
8. Test `healthz`
9. Test giao dien
