import { Request, Response, NextFunction } from "express";
import { userService } from "../services/user.service";
import { sendSuccess, sendError } from "../utils/response";
import { CreateUserDTO } from "../types";

export class UserController {
  async register(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const dto: CreateUserDTO = req.body;
      const result = await userService.createUser(dto);
      sendSuccess(res, "Account created successfully", result, 201);
    } catch (error) {
      const err = error as Error;
      if (err.message.startsWith("BLACKLISTED:")) {
        sendError(res, err.message.replace("BLACKLISTED: ", ""), 403);
      } else if (err.message.startsWith("DUPLICATE:")) {
        sendError(res, err.message.replace("DUPLICATE: ", ""), 409);
      } else {
        next(error);
      }
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const result = await userService.loginUser(email, password);
      sendSuccess(res, "Login successful", result);
    } catch (error) {
      const err = error as Error;
      if (
        err.message.startsWith("AUTH:") ||
        err.message.startsWith("BLACKLISTED:")
      ) {
        sendError(res, err.message.split(": ")[1], 401);
      } else {
        next(error);
      }
    }
  }

  async getProfile(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const user = await userService.findUserById(userId);

      if (!user) {
        sendError(res, "User not found", 404);
        return;
      }

      sendSuccess(
        res,
        "Profile retrieved successfully",
        userService.sanitizeUser(user),
      );
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
