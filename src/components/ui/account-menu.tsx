// src/components/ui/account-menu.tsx

"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { authClient, signOut, useSession } from "@/lib/auth-client";

export function AccountMenu() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // close on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirming(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  if (isPending || !session?.user) return null;

  const user = session.user;
  // NOTE: `user.name` is the GitHub display name (better-auth falls back to
  // the GitHub login/username only if the account has no display name set).
  // If you want the exact GitHub *username* every time, map `profile.login`
  // into a custom field in the github socialProviders config in auth.ts.
  const displayName = user.name || "account";

  const handleSignOut = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => router.push("/"),
      },
    });
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    await authClient.deleteUser({
      fetchOptions: {
        onSuccess: () => router.push("/"),
        onError: () => setDeleting(false),
      },
    });
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-[6px] border border-[#dfe2e6] bg-[#f6f7f8] px-2.5 py-1.5 transition-colors hover:border-[#3a4557] hover:bg-[#eceef0]"
      >
        {user.image ? (
          <Image
            src={user.image}
            alt=""
            width={20}
            height={20}
            className="rounded-full"
          />
        ) : (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1a2029] font-jetbrains-mono text-[10px] text-white">
            {displayName[0]?.toUpperCase() ?? "?"}
          </span>
        )}
        <span className="font-jetbrains-mono text-[12.5px] text-[#1a2029]">
          {displayName}
        </span>
        <span className="text-[10px] text-[#6b7280]">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-20 w-56 overflow-hidden rounded-[8px] border border-[#dfe2e6] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
          <div className="border-b border-[#dfe2e6] px-3.5 py-3">
            <div className="font-jetbrains-mono text-[12.5px] font-semibold text-[#1a2029]">
              {displayName}
            </div>
            {user.email && (
              <div className="mt-0.5 truncate font-inter text-[11px] text-[#6b7280]">
                {user.email}
              </div>
            )}
          </div>

          {!confirming ? (
            <div className="flex flex-col p-1">
              <button
                onClick={handleSignOut}
                className="rounded-[5px] px-2.5 py-2 text-left font-jetbrains-mono text-[12px] text-[#1a2029] hover:bg-[#f6f7f8]"
              >
                Sign out
              </button>
              <button
                onClick={() => setConfirming(true)}
                className="rounded-[5px] px-2.5 py-2 text-left font-jetbrains-mono text-[12px] text-[#e5534b] hover:bg-[#e5534b14]"
              >
                Delete account
              </button>
            </div>
          ) : (
            <div className="p-3">
              <p className="font-inter text-[11.5px] leading-[1.4] text-[#1a2029]">
                This permanently deletes your account and indexed repositories.
                This can&apos;t be undone.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setConfirming(false)}
                  disabled={deleting}
                  className="flex-1 rounded-[5px] border border-[#dfe2e6] px-2.5 py-1.5 font-jetbrains-mono text-[11.5px] text-[#1a2029] hover:bg-[#f6f7f8] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="flex-1 rounded-[5px] bg-[#e5534b] px-2.5 py-1.5 font-jetbrains-mono text-[11.5px] text-white hover:bg-[#c73f38] disabled:opacity-50"
                >
                  {deleting ? "Deleting…" : "Confirm delete"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
