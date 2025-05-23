import express from "express";
import {
    checkEmail,
    checkPhone,
    login,
    loginAdmin,
    loginWithGoogle,
    logout,
    refreshAccessToken,
    register,
    sendNewVerifyEmail,
    verifyEmail
} from "../controllers/authController";

const router = express.Router();
router.post("/register", register);
router.post("/verify-email", verifyEmail);
router.post("/verify-otp", verifyEmail);
router.post("/new-verify", sendNewVerifyEmail);
router.post("/login", login);
router.post("/login-google", loginWithGoogle);
router.post("/login-admin", loginAdmin);
router.post("/check-email", checkEmail);
router.post("/check-phone", checkPhone);
router.post("/logout", logout);
router.post("/refresh-token", refreshAccessToken);

export default router;
