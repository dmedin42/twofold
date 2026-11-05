import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useChefProgress } from "./useChefProgress";
import type { MilestoneData } from "./useChefData";

const newUser: MilestoneData = {
  itemsAddedCount: 0,
  firstScanAt: null,
  firstRecipeSavedAt: null,
  firstCookingModeAt: null,
  firstHouseholdInviteAt: null,
  householdMemberCount: 1,
};

describe("useChefProgress", () => {
  it("starts a new account at phase 1 with only the priorities widget", () => {
    const { result } = renderHook(() => useChefProgress(newUser, false, "user-1"));
    expect(result.current.currentPhase).toBe(1);
    expect(result.current.visibleWidgets).toEqual(["priorities"]);
  });

  it("unlocks phase 2 after three items are added", () => {
    const { result } = renderHook(() =>
      useChefProgress({ ...newUser, itemsAddedCount: 3 }, false, "user-2"),
    );
    expect(result.current.currentPhase).toBe(2);
    expect(result.current.visibleWidgets).toContain("quickRecipe");
  });

  it("shows guests every widget from the start", () => {
    const { result } = renderHook(() => useChefProgress(newUser, false, "guest-1", true));
    expect(result.current.currentPhase).toBe(4);
    expect(result.current.visibleWidgets).toEqual(
      expect.arrayContaining(["priorities", "dailyBriefing", "quickRecipe", "financial", "dinnerMatch", "dinnerPoll", "potlucks"]),
    );
  });
});
