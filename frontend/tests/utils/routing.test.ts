import {
  isGameRoomPath,
  shouldLeaveRoomOnBackNavigation,
} from "@/utils/routing";

describe("routing utils", () => {
  describe("isGameRoomPath", () => {
    it("returns true for the game room route pattern", () => {
      expect(isGameRoomPath("/arena/alice")).toBe(true);
    });

    it("returns false for non-room routes", () => {
      expect(isGameRoomPath("/")).toBe(false);
      expect(isGameRoomPath("/test-socket")).toBe(false);
      expect(isGameRoomPath("/arena/alice/stats")).toBe(false);
    });
  });

  describe("shouldLeaveRoomOnBackNavigation", () => {
    it("returns true on POP when leaving an active room route", () => {
      expect(
        shouldLeaveRoomOnBackNavigation({
          navigationType: "POP",
          previousPathname: "/arena/alice",
          currentPathname: "/",
          activeRoomId: "arena",
        }),
      ).toBe(true);
    });

    it("returns false when navigation is not POP", () => {
      expect(
        shouldLeaveRoomOnBackNavigation({
          navigationType: "PUSH",
          previousPathname: "/arena/alice",
          currentPathname: "/",
          activeRoomId: "arena",
        }),
      ).toBe(false);
    });

    it("returns false when there is no active room", () => {
      expect(
        shouldLeaveRoomOnBackNavigation({
          navigationType: "POP",
          previousPathname: "/arena/alice",
          currentPathname: "/",
          activeRoomId: null,
        }),
      ).toBe(false);
    });

    it("returns false when previous path is not a room route", () => {
      expect(
        shouldLeaveRoomOnBackNavigation({
          navigationType: "POP",
          previousPathname: "/test-socket",
          currentPathname: "/",
          activeRoomId: "arena",
        }),
      ).toBe(false);
    });

    it("returns false when path did not change", () => {
      expect(
        shouldLeaveRoomOnBackNavigation({
          navigationType: "POP",
          previousPathname: "/arena/alice",
          currentPathname: "/arena/alice",
          activeRoomId: "arena",
        }),
      ).toBe(false);
    });
  });
});
