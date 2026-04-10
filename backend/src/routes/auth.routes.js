const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const auth = require("../middleware/auth.middleware");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/me", auth, authController.getCurrentUser);
router.put("/profile", auth, authController.updateProfile);
router.post("/link-wallet", auth, authController.linkWallet);

module.exports = router;
