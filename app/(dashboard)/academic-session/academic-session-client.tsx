"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SecondarySessionTab } from "./secondary-session-tab";
import { HigherSecondarySessionTab } from "./higher-secondary-session-tab";
import { School, GraduationCap } from "lucide-react";

export default function AcademicSessionClient() {
  const [activeTab, setActiveTab] = useState<string>("secondary");

  return (
    <div className="w-full space-y-4">
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as string)}
        className="w-full"
      >
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap h-auto p-1.5 gap-2 bg-muted/60 rounded-2xl border border-border/80 custom-scrollbar select-none">
          <TabsTrigger
            value="secondary"
            className="flex items-center gap-2 text-xs sm:text-sm font-bold py-2.5 px-4 rounded-xl shrink-0 cursor-pointer"
          >
            <School className="h-4 w-4 text-primary" />
            <span>Secondary Section (Classes V–X)</span>
          </TabsTrigger>
          <TabsTrigger
            value="higher_secondary"
            className="flex items-center gap-2 text-xs sm:text-sm font-bold py-2.5 px-4 rounded-xl shrink-0 cursor-pointer"
          >
            <GraduationCap className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>Higher Secondary Section (Classes XI–XII)</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="secondary" className="mt-4">
          <SecondarySessionTab />
        </TabsContent>

        <TabsContent value="higher_secondary" className="mt-4">
          <HigherSecondarySessionTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
