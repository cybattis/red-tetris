import { renderHook } from "@testing-library/react";
import { useBackNavigationDetection } from "@/hooks/useBackNavigationDetection";

const mockDispatch = jest.fn();
let mockPathname = "/";
let mockNavigationType: "POP" | "PUSH" | "REPLACE" = "POP";
let mockRoomId: string | null = null;

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useLocation: () => ({ pathname: mockPathname }),
    useNavigationType: () => mockNavigationType,
  };
});

jest.mock("@/store", () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (
    selector: (state: { gameRoom: { roomId: string | null } }) => unknown,
  ) => selector({ gameRoom: { roomId: mockRoomId } }),
}));

describe("useBackNavigationDetection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = "/";
    mockNavigationType = "POP";
    mockRoomId = null;
  });

  it("does not dispatch on first render", () => {
    mockPathname = "/arena/alice";
    mockRoomId = "arena";

    renderHook(() => useBackNavigationDetection());

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("dispatches leaveRoom when POP navigates back from room route", () => {
    mockPathname = "/arena/alice";
    mockRoomId = "arena";

    const { rerender } = renderHook(() => useBackNavigationDetection());

    mockPathname = "/";
    mockNavigationType = "POP";
    rerender();

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "gameRoom/leaveRoom" }),
    );
  });

  it("does not dispatch when navigation type is PUSH", () => {
    mockPathname = "/arena/alice";
    mockRoomId = "arena";

    const { rerender } = renderHook(() => useBackNavigationDetection());

    mockPathname = "/";
    mockNavigationType = "PUSH";
    rerender();

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("does not dispatch when there is no active room", () => {
    mockPathname = "/arena/alice";
    mockRoomId = null;

    const { rerender } = renderHook(() => useBackNavigationDetection());

    mockPathname = "/";
    mockNavigationType = "POP";
    rerender();

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("does not dispatch when previous route is not a room", () => {
    mockPathname = "/test-socket";
    mockRoomId = "arena";

    const { rerender } = renderHook(() => useBackNavigationDetection());

    mockPathname = "/";
    mockNavigationType = "POP";
    rerender();

    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
