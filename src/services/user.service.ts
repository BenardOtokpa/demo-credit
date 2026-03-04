import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../models/db";
import { CreateUserDTO, User, Wallet, AuthPayload } from "../types";
import { adjutorService } from "../services/adjutor.service";
import logger from "../utils/logger";

const JWT_SECRET = process.env.JWT_SECRET || "demo-credit-secret-key";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";
const SALT_ROUNDS = 10;

export class UserService {
  async createUser(dto: CreateUserDTO): Promise<{
    user: Omit<User, "password_hash">;
    wallet: Wallet;
    token: string;
  }> {
    // STEP 1 — Check Karma blacklist for email
    const emailKarma = await adjutorService.checkKarmaBlacklist(dto.email);
    if (emailKarma.is_blacklisted) {
      throw new Error(
        "BLACKLISTED: User is on the Karma blacklist and cannot be onboarded",
      );
    }

    // STEP 2 — Check Karma blacklist for BVN
    const bvnKarma = await adjutorService.checkKarmaBlacklist(dto.bvn);
    if (bvnKarma.is_blacklisted) {
      throw new Error(
        "BLACKLISTED: User BVN is on the Karma blacklist and cannot be onboarded",
      );
    }

    // STEP 3 — Check for duplicate email, phone or BVN
    const existingUser = await db("users")
      .where("email", dto.email)
      .orWhere("phone_number", dto.phone_number)
      .orWhere("bvn", dto.bvn)
      .first();

    if (existingUser) {
      if (existingUser.email === dto.email) {
        throw new Error("DUPLICATE: A user with this email already exists");
      }
      if (existingUser.phone_number === dto.phone_number) {
        throw new Error(
          "DUPLICATE: A user with this phone number already exists",
        );
      }
      if (existingUser.bvn === dto.bvn) {
        throw new Error("DUPLICATE: A user with this BVN already exists");
      }
    }

    // STEP 4 — Hash the password
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    // STEP 5 — Create user and wallet inside a transaction
    const userId = uuidv4();
    const walletId = uuidv4();

    await db.transaction(async (trx) => {
      await trx("users").insert({
        id: userId,
        full_name: dto.full_name,
        email: dto.email,
        phone_number: dto.phone_number,
        password_hash: passwordHash,
        bvn: dto.bvn,
        is_blacklisted: false,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await trx("wallets").insert({
        id: walletId,
        user_id: userId,
        balance: 0.0,
        currency: "NGN",
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });
    });

    logger.info(`New user created: ${dto.email}`);

    // STEP 6 — Fetch created records and return
    const user = await this.findUserById(userId);
    const wallet = await this.findWalletByUserId(userId);
    const token = this.generateToken({ userId, email: dto.email });

    return {
      user: this.sanitizeUser(user!),
      wallet: wallet!,
      token,
    };
  }

  async loginUser(
    email: string,
    password: string,
  ): Promise<{
    user: Omit<User, "password_hash">;
    wallet: Wallet;
    token: string;
  }> {
    // STEP 1 — Find user by email
    const user = (await db("users").where("email", email).first()) as
      | User
      | undefined;

    if (!user) {
      throw new Error("AUTH: Invalid email or password");
    }

    // STEP 2 — Check if blacklisted
    if (user.is_blacklisted) {
      throw new Error("BLACKLISTED: This account has been blacklisted");
    }

    // STEP 3 — Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error("AUTH: Invalid email or password");
    }

    // STEP 4 — Get wallet and generate token
    const wallet = await this.findWalletByUserId(user.id);
    const token = this.generateToken({ userId: user.id, email: user.email });

    logger.info(`User logged in: ${email}`);

    return {
      user: this.sanitizeUser(user),
      wallet: wallet!,
      token,
    };
  }

  async findUserById(id: string): Promise<User | undefined> {
    return db("users").where("id", id).first();
  }

  async findUserByEmail(email: string): Promise<User | undefined> {
    return db("users").where("email", email).first();
  }

  async findWalletByUserId(userId: string): Promise<Wallet | undefined> {
    return db("wallets").where("user_id", userId).first();
  }

  generateToken(payload: AuthPayload): string {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    } as jwt.SignOptions);
  }

  verifyToken(token: string): AuthPayload {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  }

  sanitizeUser(user: User): Omit<User, "password_hash"> {
    const { password_hash, ...sanitized } = user;
    return sanitized;
  }
}

export const userService = new UserService();
