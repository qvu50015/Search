// src/components/ui/signin-button.tsx

"use client";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth-client";

export function ConnectGitHubButton() {
  return (
    <Button
      variant="outline"
      onClick={() =>
        signIn.social({ provider: "github", callbackURL: "/repos" })
      }
      className="h-auto gap-[10.5px] rounded-none border-[#21262d] bg-[#0d0d0d] px-5.5 py-[11.5px] hover:bg-[#161616]"
    >
      <Image src="/icons/github.svg" alt="" width={16} height={16} priority />
      <span className="font-inter text-[12.25px] text-[#c9d1d9]">
        Connect GitHub Account
      </span>
      <Image src="/icons/chevron-right.svg" alt="" width={14} height={14} />
    </Button>
  );
}
