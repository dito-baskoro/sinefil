"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Menu } from "lucide-react";

export function HeaderMenu({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input hover:bg-secondary"
        aria-label="Menu"
        aria-expanded={open}
      >
        <Menu className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-md border border-border bg-background shadow-md">
          <ul className="py-1 text-sm">
            {isLoggedIn && (
              <li>
                <Link
                  href="/feed"
                  className="block px-3 py-2 hover:bg-secondary"
                  onClick={() => setOpen(false)}
                >
                  Aktivitas
                </Link>
              </li>
            )}
            <li>
              <Link
                href="/lists"
                className="block px-3 py-2 hover:bg-secondary"
                onClick={() => setOpen(false)}
              >
                List
              </Link>
            </li>
            {isLoggedIn && (
              <li>
                <form action="/auth/sign-out" method="post">
                  <button
                    type="submit"
                    className="block w-full px-3 py-2 text-left hover:bg-secondary"
                  >
                    Keluar
                  </button>
                </form>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
