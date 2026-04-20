# Deploy Tren Render

Tai lieu nay duoc toi uu de deploy truc tiep tu repo GitHub nay bang `Blueprint` tren Render.

## Kien truc sau khi sync Blueprint

File [render.yaml](C:/Users/HP/Blockchain_Dong/render.yaml) hien tai se tao 2 service:

1. `blockchain-dong-mysql`
   - Render `Private Service`
   - runtime `docker`
   - dung image MySQL 8 tu Dockerfile trong repo
   - co persistent disk tai `/var/lib/mysql`
   - tu dong init schema tu file `Ticket.sql` trong lan khoi tao dau tien

2. `blockchain-dong-web`
   - Render `Web Service`
   - runtime `node`
   - build frontend Vite thanh `frontend/dist`
   - backend Express phuc vu luon frontend production
   - co persistent disk tai `/var/data` de giu:
     - `uploads`
     - `storage`

## Nhung gi repo da duoc chuan bi san

- `render.yaml` tao duoc ca web va mysql trong cung mot Blueprint
- [deploy/render/mysql/Dockerfile](C:/Users/HP/Blockchain_Dong/deploy/render/mysql/Dockerfile) copy `Ticket.sql` vao `docker-entrypoint-initdb.d`
- backend co `GET /healthz`
- backend ho tro persistent path qua:
  - `UPLOADS_DIR`
  - `STORAGE_DIR`
- backend co the ket noi DB bang:
  - `DATABASE_URL`
  - hoac `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`

## Cac gia tri ban se duoc Render hoi khi tao Blueprint

Do trong `render.yaml` co `sync: false`, Render se prompt ban nhap:

### Cho MySQL

```env
MYSQL_PASSWORD=<mat-khau-rat-manh>
MYSQL_ROOT_PASSWORD=<mat-khau-root-rat-manh>
```

### Cho Web

```env
FRONTEND_ORIGIN=https://<ten-web-cua-ban>.onrender.com
VITE_API_BASE_URL=https://<ten-web-cua-ban>.onrender.com
```

### Neu bat blockchain mint NFT

```env
RPC_URL=https://testnet.sapphire.oasis.io
TESTNET_RPC_URL=https://testnet.sapphire.oasis.io
PRIVATE_KEY=0x...
DEPLOYER_PRIVATE_KEY=0x...
CONTRACT_ADDRESS=0x...
```

Neu chua can mint NFT, ban co the de trong cac bien blockchain va deploy phan auth + profile + events truoc.

## Quy trinh deploy dung nhat

1. Push code moi nhat len GitHub.
2. Dang nhap Render.
3. Chon `New` -> `Blueprint`.
4. Chon repo GitHub:

```text
https://github.com/nguyendoantay05-byte/blockchain.git
```

5. Chon nhanh chua code can deploy.
   - Neu ban dang dung nhanh `feat/backend`, hay chon nhanh nay.
   - Neu sau nay merge vao `main`, thi chon `main`.
6. Render doc `render.yaml` va hien 2 service se duoc tao.
7. Dien cac secret ma Render prompt.
8. Bam `Apply`.

## Sau khi deploy lan dau

### Kiem tra web service

Mo:

```text
https://<ten-web-cua-ban>.onrender.com/healthz
```

Phai nhan:

```json
{"ok":true}
```

### Kiem tra du lieu DB

Vi MySQL duoc init tu `Ticket.sql` trong lan khoi tao dau tien, schema se co san neu disk MySQL la moi.

## Cach Render dang noi 2 service voi nhau

Blueprint da map tu dong:

- `DB_HOST` <- private hostname cua `blockchain-dong-mysql`
- `DB_NAME` <- `MYSQL_DATABASE`
- `DB_USER` <- `MYSQL_USER`
- `DB_PASSWORD` <- `MYSQL_PASSWORD`

Nen `blockchain-dong-web` khong can ban tu ghep `DATABASE_URL` nua.

## Luu y rat quan trong

### 1. `Ticket.sql` chi tu dong import khi disk MySQL la moi

Neu ban da deploy MySQL service roi va disk da co data, MySQL se khong chay lai script init.

### 2. Anh upload va file JSON can disk

Web service dang can disk `/var/data` de giu:

- avatar
- poster
- `storage/ticket-pin-settings.json`
- `storage/organizer-profile-settings.json`

Neu bo disk, cac file nay co the mat sau restart/redeploy.

### 3. Service co disk se khong zero-downtime deploy

Day la han che binh thuong cua Render persistent disk.

### 4. Blockchain la tuy chon

Neu chua dien:

- `RPC_URL`
- `PRIVATE_KEY`
- `CONTRACT_ADDRESS`

thi app van co the chay nhung luong:

- dang ky
- dang nhap
- cap nhat profile
- xem / tao su kien

nhung mua ve NFT se loi.

## Neu ban muon deploy nhanh nhat

Thu tu it loi nhat:

1. Dung chinh `render.yaml` hien tai
2. Tao Blueprint tu repo GitHub
3. Nhap `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`
4. Nhap `FRONTEND_ORIGIN`, `VITE_API_BASE_URL`
5. Deploy
6. Test `/healthz`
7. Test dang ky / dang nhap / tao su kien / upload poster
