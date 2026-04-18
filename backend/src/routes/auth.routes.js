const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const auth = require("../middleware/auth.middleware");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/me", auth, authController.getCurrentUser);
router.get("/organizer-settings", auth, authController.getOrganizerSettings);
router.put("/organizer-settings", auth, authController.updateOrganizerSettings);
router.post(
  "/avatar-upload",
  auth,
  express.raw({
    type: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    limit: "4mb",
  }),
  authController.uploadAvatar
);
router.put("/profile", auth, authController.updateProfile);
router.put("/ticket-pin", auth, authController.updateTicketPin);
router.post("/ticket-pin/verify", auth, authController.verifyTicketPin);
router.post("/link-wallet", auth, authController.linkWallet);

module.exports = router;
