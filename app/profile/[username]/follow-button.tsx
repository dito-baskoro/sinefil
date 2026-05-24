"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toggleFollow } from "./actions";

export function FollowButton({
  followeeId,
  username,
  initialFollowing,
  isLoggedIn,
}: {
  followeeId: string;
  username: string;
  initialFollowing: boolean;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, startTransition] = useTransition();

  if (!isLoggedIn) {
    return (
      <Button variant="outline" size="sm" onClick={() => router.push("/login")}>
        Follow
      </Button>
    );
  }

  return (
    <Button
      variant={following ? "outline" : "default"}
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const optimistic = !following;
          setFollowing(optimistic);
          const result = await toggleFollow(followeeId, username);
          if (result.error) {
            setFollowing(!optimistic);
            return;
          }
          setFollowing(result.following ?? optimistic);
          router.refresh();
        })
      }
    >
      {following ? "Unfollow" : "Follow"}
    </Button>
  );
}
