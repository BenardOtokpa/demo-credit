import { AdjutorService } from "../services/adjutor.service";
import axios from "axios";

// Replace entire axios with a mock version
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("AdjutorService", () => {
  let adjutorService: AdjutorService;

  beforeEach(() => {
    // Create fresh instance before each test
    adjutorService = new AdjutorService(
      "https://adjutor.lendsqr.com/v2",
      "test-api-key",
    );
    jest.clearAllMocks();
    // Tell Jest that axios.isAxiosError is a function
    mockedAxios.isAxiosError = jest.fn().mockReturnValue(true) as any;
  });

  // ─── POSITIVE TESTS ──────────────────────────────────────────
  describe("checkKarmaBlacklist - positive scenarios", () => {
    it("should return is_blacklisted=true when identity is on karma list", async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          status: "success",
          data: {
            karma_identity: "bad@actor.com",
            reason: "Loan default",
          },
        },
      });

      const result = await adjutorService.checkKarmaBlacklist("bad@actor.com");

      expect(result.is_blacklisted).toBe(true);
      expect(result.karma_identity).toBe("bad@actor.com");
      expect(result.reason).toBe("Loan default");
    });

    it("should return is_blacklisted=false when API returns 404", async () => {
      mockedAxios.get.mockRejectedValue({
        isAxiosError: true,
        response: { status: 404, data: { message: "Not found" } },
        message: "Request failed with status code 404",
      });

      const result = await adjutorService.checkKarmaBlacklist("clean@user.com");

      expect(result.is_blacklisted).toBe(false);
    });

    it("should return is_blacklisted=false when karma data is null", async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          status: "success",
          data: null,
        },
      });

      const result =
        await adjutorService.checkKarmaBlacklist("test@example.com");

      expect(result.is_blacklisted).toBe(false);
    });

    it("should use default reason when reason is null", async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          status: "success",
          data: {
            karma_identity: "bad@actor.com",
            reason: null, // ← null reason from API
          },
        },
      });

      const result = await adjutorService.checkKarmaBlacklist("bad@actor.com");

      expect(result.is_blacklisted).toBe(true);
      expect(result.reason).toBe("User found on Karma blacklist");
    });
  });

  // ─── NEGATIVE TESTS ──────────────────────────────────────────
  describe("checkKarmaBlacklist - negative scenarios", () => {
    it("should fail open on network error", async () => {
      mockedAxios.get.mockRejectedValue(new Error("Network Error"));

      const result =
        await adjutorService.checkKarmaBlacklist("anyone@example.com");

      // Fails open — does not block user on network failure
      expect(result.is_blacklisted).toBe(false);
    });

    it("should fail open on 500 server error", async () => {
      mockedAxios.get.mockRejectedValue({
        isAxiosError: true,
        response: { status: 500, data: { message: "Internal server error" } },
        message: "Request failed with status code 500",
      });

      const result =
        await adjutorService.checkKarmaBlacklist("test@example.com");

      expect(result.is_blacklisted).toBe(false);
    });

    it("should call the correct API endpoint", async () => {
      mockedAxios.get.mockResolvedValue({
        data: { status: "success", data: null },
      });

      await adjutorService.checkKarmaBlacklist("test@example.com");

      expect(mockedAxios.get).toHaveBeenCalledWith(
        "https://adjutor.lendsqr.com/v2/verification/karma/test@example.com",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-api-key",
          }),
        }),
      );
    });

    it("should set correct timeout on API call", async () => {
      mockedAxios.get.mockResolvedValue({
        data: { status: "success", data: null },
      });

      await adjutorService.checkKarmaBlacklist("test@example.com");

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          timeout: 10000,
        }),
      );
    });
  });
});
