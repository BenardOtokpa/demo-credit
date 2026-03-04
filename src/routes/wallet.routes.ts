import { Router } from "express";
import { walletController } from "../controllers/wallet.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  fundWalletSchema,
  transferFundsSchema,
  withdrawFundsSchema,
} from "../utils/validators";

const router = Router();

// All wallet routes require authentication
router.use(authenticate);

router.get("/balance", walletController.getBalance.bind(walletController));

router.post(
  "/fund",
  validate(fundWalletSchema),
  walletController.fundWallet.bind(walletController),
);

router.post(
  "/transfer",
  validate(transferFundsSchema),
  walletController.transferFunds.bind(walletController),
);

router.post(
  "/withdraw",
  validate(withdrawFundsSchema),
  walletController.withdrawFunds.bind(walletController),
);

router.get(
  "/transactions",
  walletController.getTransactionHistory.bind(walletController),
);

export default router;
