const express = require("express");
const router = express.Router();
const ticketController = require("../controllers/ticket.controller");
const auth = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");

// User mua vé (Ai đăng nhập cũng mua được)
router.post("/buy", auth, ticketController.buyTicket);

// User xem vé của mình
router.get("/my", auth, ticketController.getMyTickets);

// Nhân viên hoặc Ban tổ chức mới được phép soát vé
router.post("/check-in", auth, checkRole("staff", "organizer"), ticketController.checkIn);

module.exports = router;