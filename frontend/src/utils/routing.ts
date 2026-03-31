import { matchPath } from "react-router-dom";

const GAME_ROOM_PATH_PATTERN = "/:room/:playerName";

type NavigationAction = "POP" | "PUSH" | "REPLACE";

export interface BackNavigationDetectionInput {
  navigationType: NavigationAction;
  previousPathname: string | null;
  currentPathname: string;
  activeRoomId: string | null;
}

export const isGameRoomPath = (pathname: string): boolean =>
  Boolean(
    matchPath(
      {
        path: GAME_ROOM_PATH_PATTERN,
        end: true,
      },
      pathname,
    ),
  );

export const shouldLeaveRoomOnBackNavigation = ({
  navigationType,
  previousPathname,
  currentPathname,
  activeRoomId,
}: BackNavigationDetectionInput): boolean => {
  if (navigationType !== "POP" || !activeRoomId || !previousPathname) {
    return false;
  }

  if (previousPathname === currentPathname) {
    return false;
  }

  return isGameRoomPath(previousPathname);
};
