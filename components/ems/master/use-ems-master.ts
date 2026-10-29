"use client";

import { useEmsCore } from "./use-ems-core";
import { useEmsClassGroups } from "./use-ems-class-groups";
import { useEmsRoomSetup } from "./use-ems-room-setup";
import { useEmsRoutine } from "./use-ems-routine";
import { useEmsAllocation } from "./use-ems-allocation";

export function useEmsMaster() {
  const core = useEmsCore();
  const groups = useEmsClassGroups(core);
  const rooms = useEmsRoomSetup(core);
  const routine = useEmsRoutine(core);
  const alloc = useEmsAllocation({ ...core, ...rooms });

  return { ...core, ...groups, ...rooms, ...routine, ...alloc };
}

export type EmsMasterState = ReturnType<typeof useEmsMaster>;
