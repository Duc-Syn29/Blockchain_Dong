const express = require("express");
const router = express.Router();
const organizerController = require("../controllers/organizer.controller");
const auth = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");

router.get("/events", auth, checkRole("organizer"), organizerController.getOrganizerEvents);
router.get(
  "/events/:id/tickets",
  auth,
  checkRole("organizer"),
  organizerController.getOrganizerEventTickets
);
router.get(
  "/events/:id/checkins",
  auth,
  checkRole("organizer"),
  organizerController.getOrganizerEventCheckins
);

module.exports = router;
