const express = require("express");
const router = express.Router();
const eventController = require("../controllers/event.controller");

// Import 2 middleware
const auth = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");

// 🟢 PUBLIC ROUTES (Ai cũng xem được)
router.get("/", eventController.getEvents);
router.get("/:id", eventController.getEventById);

// 🔴 PROTECTED ROUTES (Bắt buộc phải đăng nhập VÀ có role là "organizer")
// Chú ý thứ tự: Phải qua `auth` trước để lấy req.user, sau đó mới qua `checkRole`
router.post(
  "/poster-upload",
  auth,
  checkRole("organizer"),
  express.raw({
    type: [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
      "application/octet-stream",
    ],
    limit: "6mb",
  }),
  eventController.uploadPoster
);
router.post("/", auth, checkRole("organizer"), eventController.createEvent);
router.put("/:id", auth, checkRole("organizer"), eventController.updateEvent);
router.put("/:id/close", auth, checkRole("organizer"), eventController.closeEvent);
router.put("/:id/reopen", auth, checkRole("organizer"), eventController.reopenEvent);
router.delete("/:id", auth, checkRole("organizer"), eventController.deleteEvent);

module.exports = router;
