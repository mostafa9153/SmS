"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users, Medal, Printer } from "lucide-react";
import { SportsEvent } from "@/lib/sports/types";
import { buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CATEGORY_BADGE_CLASS, GENDER_LABEL } from "@/lib/sports/use-sports-events";

interface SportsEventHeaderProps {
  event?: SportsEvent;
  events: SportsEvent[];
  active: "enroll" | "score";
  actions?: React.ReactNode;
}

export function SportsEventHeader({ event, events, active, actions }: SportsEventHeaderProps) {
  const router = useRouter();
  const eventId = event?.id || "";
  const subPath = active === "enroll" ? "enroll" : "results";

  const tabs = [
    { key: "enroll", label: "Enroll", icon: Users, href: `/sports/${eventId}/enroll`, count: event?.participantCount },
    { key: "score", label: "Score", icon: Medal, href: `/sports/${eventId}/results` },
    { key: "print", label: "Print", icon: Printer, href: `/sports/print?eventId=${eventId}&tab=call` },
  ] as const;

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href="/sports"
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-9 w-9 rounded-xl shrink-0")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Select
            value={eventId}
            onValueChange={(val) => {
              if (val) router.push(`/sports/${val}/${subPath}`);
            }}
          >
            <SelectTrigger className="h-9 min-w-0 max-w-[240px] sm:max-w-xs font-bold">
              <SelectValue>{event?.name ?? "Loading…"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {events.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {event && (
            <div className="hidden md:flex items-center gap-1.5 shrink-0">
              <span
                className={cn(
                  "text-[10px] uppercase font-bold px-2 py-0.5 rounded-md",
                  CATEGORY_BADGE_CLASS[event.category] || "bg-muted"
                )}
              >
                {event.category}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                {GENDER_LABEL[event.gender] || event.gender}
              </span>
            </div>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 self-end sm:self-auto">{actions}</div>}
      </div>

      <nav className="flex items-center gap-1 border-b">
        {tabs.map((t) => {
          const isActive = t.key === active;
          const Icon = t.icon;
          return (
            <Link
              key={t.key}
              href={t.href}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 -mb-px border-b-2 text-xs font-semibold transition-colors",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
              {"count" in t && t.count !== undefined && (
                <span className="px-1.5 rounded-full bg-muted text-[10px] font-mono">{t.count}</span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
