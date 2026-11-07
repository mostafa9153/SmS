import Link from "next/link";
import { ScanLine } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

/** Header shortcut back to the Library Desk. */
export function DeskLink() {
  return (
    <Link href="/library" className={buttonVariants({ variant: "outline", size: "sm" })}>
      <ScanLine /> Desk
    </Link>
  );
}
