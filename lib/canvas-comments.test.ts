import { describe, expect, it } from "vitest"
import { extractMentions, resolveMentionTargets } from "@/lib/canvas-comments"

describe("extractMentions", () => {
  it("supports canonical auth-style handles", () => {
    const mentions = extractMentions("Review with @user-123 and @team.lead:ops")
    expect(mentions).toEqual(["user-123", "team.lead:ops"])
  })
})

describe("resolveMentionTargets", () => {
  it("maps mention tokens to canonical user identities", () => {
    const targets = resolveMentionTargets(
      ["user-1", "unknown"],
      [
        { userId: "user-1", displayName: "Ari One", mentionHandle: "user-1" },
        { userId: "user-2", displayName: "Ari Two", mentionHandle: "user-2" },
      ]
    )
    expect(targets).toEqual([
      {
        userId: "user-1",
        displayName: "Ari One",
        mentionHandle: "user-1",
        token: "user-1",
      },
    ])
  })
})
