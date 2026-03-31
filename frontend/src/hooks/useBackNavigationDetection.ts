import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/store";
import { leaveRoom, selectRoomId } from "@/store/slices/gameRoomSlice";
import { shouldLeaveRoomOnBackNavigation } from "@/utils/routing";

export const useBackNavigationDetection = (): void => {
  const location = useLocation();
  const navigationType = useNavigationType() as "POP" | "PUSH" | "REPLACE";
  const dispatch = useAppDispatch();
  const roomId = useAppSelector(selectRoomId);
  const previousPathnameRef = useRef<string | null>(null);

  useEffect(() => {
    const previousPathname = previousPathnameRef.current;

    if (
      shouldLeaveRoomOnBackNavigation({
        navigationType,
        previousPathname,
        currentPathname: location.pathname,
        activeRoomId: roomId,
      })
    ) {
      dispatch(leaveRoom());
    }

    previousPathnameRef.current = location.pathname;
  }, [dispatch, location.pathname, navigationType, roomId]);
};
