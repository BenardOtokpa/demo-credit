import axios from "axios";
import { KarmaCheckResult } from "../types";
import logger from "../utils/logger";

const ADJUTOR_BASE_URL =
  process.env.ADJUTOR_BASE_URL || "https://adjutor.lendsqr.com/v2";
const ADJUTOR_API_KEY = process.env.ADJUTOR_API_KEY || "";

export class AdjutorService {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(baseUrl = ADJUTOR_BASE_URL, apiKey = ADJUTOR_API_KEY) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async checkKarmaBlacklist(identity: string): Promise<KarmaCheckResult> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/verification/karma/${identity}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        },
      );

      if (response.data && response.data.status === "success") {
        const karmaData = response.data.data;
        if (karmaData) {
          return {
            is_blacklisted: true,
            karma_identity: karmaData.karma_identity,
            reason: karmaData.reason || "User found on Karma blacklist",
          };
        }
      }

      return { is_blacklisted: false };
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        // 404 = not on blacklist = user is clean
        if (error.response?.status === 404) {
          return { is_blacklisted: false };
        }
        logger.error(
          "Adjutor API error:",
          error.response?.data || error.message,
        );
      }
      // Network failure — fail open, log warning
      logger.warn("Could not verify karma blacklist. Proceeding with caution.");
      return { is_blacklisted: false };
    }
  }
}

// Export a single instance — used everywhere in the app
export const adjutorService = new AdjutorService();
