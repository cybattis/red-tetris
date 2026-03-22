import { renderHook } from "@testing-library/react";
import { useSocket } from "@/hooks";

// Mock the store hooks
const mockDispatch = jest.fn();
const mockSelector = jest.fn();

// Mock the store index module
jest.mock("../../src/store/index", () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: any) => mockSelector(selector),
}));

// Mock the connectionSlice selector
jest.mock("../../src/store/slices/connectionSlice", () => ({
  selectConnectionStatus: jest.fn(),
}));

describe("useSocket", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("initialization", () => {
    it("should dispatch initSocket when connection status is disconnected", () => {
      // Mock selector to return 'disconnected'
      mockSelector.mockReturnValue("disconnected");

      renderHook(() => useSocket());

      expect(mockDispatch).toHaveBeenCalledWith({
        type: "connection/initSocket",
      });
    });

    it("should not dispatch initSocket when already connected", () => {
      mockSelector.mockReturnValue("connected");

      renderHook(() => useSocket());

      expect(mockDispatch).not.toHaveBeenCalledWith({
        type: "connection/initSocket",
      });
    });

    it("should not dispatch initSocket when connecting", () => {
      mockSelector.mockReturnValue("connecting");

      renderHook(() => useSocket());

      expect(mockDispatch).not.toHaveBeenCalledWith({
        type: "connection/initSocket",
      });
    });

    it("should not dispatch initSocket when reconnecting", () => {
      mockSelector.mockReturnValue("reconnecting");

      renderHook(() => useSocket());

      expect(mockDispatch).not.toHaveBeenCalledWith({
        type: "connection/initSocket",
      });
    });

    it("should not dispatch initSocket when in error state", () => {
      mockSelector.mockReturnValue("error");

      renderHook(() => useSocket());

      expect(mockDispatch).not.toHaveBeenCalledWith({
        type: "connection/initSocket",
      });
    });
  });

  describe("cleanup", () => {
    it("should dispatch disconnectSocket on unmount", () => {
      mockSelector.mockReturnValue("disconnected");

      const { unmount } = renderHook(() => useSocket());

      // Clear the calls from initialization
      mockDispatch.mockClear();

      unmount();

      expect(mockDispatch).toHaveBeenCalledWith({
        type: "connection/disconnectSocket",
      });
    });

    it("should dispatch disconnectSocket on unmount even when connected", () => {
      mockSelector.mockReturnValue("connected");

      const { unmount } = renderHook(() => useSocket());

      unmount();

      expect(mockDispatch).toHaveBeenCalledWith({
        type: "connection/disconnectSocket",
      });
    });
  });

  describe("return values", () => {
    it("should return correct values for disconnected state", () => {
      mockSelector.mockReturnValue("disconnected");

      const { result } = renderHook(() => useSocket());

      expect(result.current).toEqual({
        connectionStatus: "disconnected",
        isConnected: false,
        isConnecting: false,
        isReconnecting: false,
        hasError: false,
      });
    });

    it("should return correct values for connected state", () => {
      mockSelector.mockReturnValue("connected");

      const { result } = renderHook(() => useSocket());

      expect(result.current).toEqual({
        connectionStatus: "connected",
        isConnected: true,
        isConnecting: false,
        isReconnecting: false,
        hasError: false,
      });
    });

    it("should return correct values for connecting state", () => {
      mockSelector.mockReturnValue("connecting");

      const { result } = renderHook(() => useSocket());

      expect(result.current).toEqual({
        connectionStatus: "connecting",
        isConnected: false,
        isConnecting: true,
        isReconnecting: false,
        hasError: false,
      });
    });

    it("should return correct values for reconnecting state", () => {
      mockSelector.mockReturnValue("reconnecting");

      const { result } = renderHook(() => useSocket());

      expect(result.current).toEqual({
        connectionStatus: "reconnecting",
        isConnected: false,
        isConnecting: false,
        isReconnecting: true,
        hasError: false,
      });
    });

    it("should return correct values for error state", () => {
      mockSelector.mockReturnValue("error");

      const { result } = renderHook(() => useSocket());

      expect(result.current).toEqual({
        connectionStatus: "error",
        isConnected: false,
        isConnecting: false,
        isReconnecting: false,
        hasError: true,
      });
    });
  });

  describe("state updates", () => {
    it("should react to connection status changes", () => {
      let currentStatus = "disconnected";
      mockSelector.mockImplementation(() => currentStatus);

      const { result, rerender } = renderHook(() => useSocket());

      // Initial state
      expect(result.current.connectionStatus).toBe("disconnected");
      expect(result.current.isConnected).toBe(false);

      // Simulate state change to connecting
      currentStatus = "connecting";
      rerender();

      expect(result.current.connectionStatus).toBe("connecting");
      expect(result.current.isConnecting).toBe(true);
      expect(result.current.isConnected).toBe(false);

      // Simulate state change to connected
      currentStatus = "connected";
      rerender();

      expect(result.current.connectionStatus).toBe("connected");
      expect(result.current.isConnected).toBe(true);
      expect(result.current.isConnecting).toBe(false);
    });

    it("should handle error state transitions", () => {
      let currentStatus = "connecting";
      mockSelector.mockImplementation(() => currentStatus);

      const { result, rerender } = renderHook(() => useSocket());

      // Initial connecting state
      expect(result.current.connectionStatus).toBe("connecting");
      expect(result.current.hasError).toBe(false);

      // Simulate error
      currentStatus = "error";
      rerender();

      expect(result.current.connectionStatus).toBe("error");
      expect(result.current.hasError).toBe(true);
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isConnecting).toBe(false);
    });

    it("should handle reconnection attempts", () => {
      let currentStatus = "connected";
      mockSelector.mockImplementation(() => currentStatus);

      const { result, rerender } = renderHook(() => useSocket());

      // Initial connected state
      expect(result.current.connectionStatus).toBe("connected");
      expect(result.current.isReconnecting).toBe(false);

      // Simulate reconnection attempt
      currentStatus = "reconnecting";
      rerender();

      expect(result.current.connectionStatus).toBe("reconnecting");
      expect(result.current.isReconnecting).toBe(true);
      expect(result.current.isConnected).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle multiple renders without side effects", () => {
      mockSelector.mockReturnValue("connected");

      const { rerender } = renderHook(() => useSocket());

      // Clear initial calls
      mockDispatch.mockClear();

      // Multiple rerenders
      rerender();
      rerender();
      rerender();

      // Should not dispatch any additional actions
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it("should handle undefined connection state gracefully", () => {
      mockSelector.mockReturnValue(undefined);

      const { result } = renderHook(() => useSocket());

      expect(result.current.connectionStatus).toBeUndefined();
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.isReconnecting).toBe(false);
      expect(result.current.hasError).toBe(false);
    });

    it("should handle rapid state changes", () => {
      let currentStatus = "disconnected";
      mockSelector.mockImplementation(() => currentStatus);

      const { result, rerender } = renderHook(() => useSocket());

      // Rapid state changes
      currentStatus = "connecting";
      rerender();
      currentStatus = "connected";
      rerender();
      currentStatus = "reconnecting";
      rerender();

      // Should reflect the final state
      expect(result.current.connectionStatus).toBe("reconnecting");
      expect(result.current.isReconnecting).toBe(true);
    });
  });

  describe("effect dependency handling", () => {
    it("should only run effect once on mount", () => {
      mockSelector.mockReturnValue("disconnected");

      renderHook(() => useSocket());

      // Should be called once for initialization
      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: "connection/initSocket",
      });
    });

    it("should not re-run effect on status changes", () => {
      let currentStatus = "disconnected";
      mockSelector.mockImplementation(() => currentStatus);

      const { rerender } = renderHook(() => useSocket());

      // Clear initial dispatch
      mockDispatch.mockClear();

      // Change status and rerender
      currentStatus = "connected";
      rerender();

      // Effect should not run again due to empty dependency array
      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });

  describe("integration scenarios", () => {
    it("should handle complete connection flow", () => {
      let currentStatus = "disconnected";
      mockSelector.mockImplementation(() => currentStatus);

      const { result, rerender, unmount } = renderHook(() => useSocket());

      // 1. Should initialize on mount (disconnected state)
      expect(mockDispatch).toHaveBeenCalledWith({
        type: "connection/initSocket",
      });
      expect(result.current.connectionStatus).toBe("disconnected");

      mockDispatch.mockClear();

      // 2. Simulate connection process
      currentStatus = "connecting";
      rerender();
      expect(result.current.isConnecting).toBe(true);

      currentStatus = "connected";
      rerender();
      expect(result.current.isConnected).toBe(true);

      // 3. Should cleanup on unmount
      unmount();
      expect(mockDispatch).toHaveBeenCalledWith({
        type: "connection/disconnectSocket",
      });
    });

    it("should handle connection failure and recovery", () => {
      let currentStatus = "disconnected";
      mockSelector.mockImplementation(() => currentStatus);

      const { result, rerender } = renderHook(() => useSocket());

      // Connection attempt
      currentStatus = "connecting";
      rerender();
      expect(result.current.isConnecting).toBe(true);

      // Connection failure
      currentStatus = "error";
      rerender();
      expect(result.current.hasError).toBe(true);

      // Reconnection attempt
      currentStatus = "reconnecting";
      rerender();
      expect(result.current.isReconnecting).toBe(true);

      // Successful reconnection
      currentStatus = "connected";
      rerender();
      expect(result.current.isConnected).toBe(true);
      expect(result.current.hasError).toBe(false);
    });

    it("should work correctly when initialized in different states", () => {
      // Test initialization in connected state
      mockSelector.mockReturnValue("connected");

      const { result: result1 } = renderHook(() => useSocket());
      expect(result1.current.isConnected).toBe(true);
      expect(mockDispatch).not.toHaveBeenCalledWith({
        type: "connection/initSocket",
      });

      mockDispatch.mockClear();

      // Test initialization in error state
      mockSelector.mockReturnValue("error");

      const { result: result2 } = renderHook(() => useSocket());
      expect(result2.current.hasError).toBe(true);
      expect(mockDispatch).not.toHaveBeenCalledWith({
        type: "connection/initSocket",
      });
    });
  });
});
