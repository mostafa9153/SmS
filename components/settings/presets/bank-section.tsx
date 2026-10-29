"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Landmark } from "lucide-react";
import { InfoTooltip } from "@/components/settings/presets/info-tooltip";
import type { PresetAddressesState } from "./use-preset-addresses";

export function BankSection({ presets }: { presets: PresetAddressesState }) {
  const { activeSection, addBankPreset, bankPresets, newBankIfsc, newBankName, newBranchName, removeBankPreset, setNewBankIfsc, setNewBankName, setNewBranchName } = presets;
  return (
    <>
      {activeSection === "bank" && (
        <Card className="rounded-2xl border border-border/80 shadow-xs animate-in fade-in-50 duration-200">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Landmark className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <div className="flex items-center gap-1.5">
                  <CardTitle className="text-sm font-bold">Local Bank Branches &amp; IFSC Codes</CardTitle>
                  <InfoTooltip content="Selecting a bank branch in the student form will automatically fill its 11-digit IFSC code." />
                </div>
              </div>
              <span className="text-xs font-semibold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 px-2.5 py-1 rounded-lg">
                {bankPresets.length} Branches
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {/* Add Bank Form */}
            <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-3">
              <span className="text-xs font-bold text-foreground block">
                ➕ Add New Local Bank Branch
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <Label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                    Bank Name *
                  </Label>
                  <Input
                    value={newBankName}
                    onChange={(e) => setNewBankName(e.target.value)}
                    placeholder="e.g. State Bank of India"
                    className="text-xs h-9 rounded-xl bg-background"
                  />
                </div>

                <div>
                  <Label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                    Branch Name *
                  </Label>
                  <Input
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    placeholder="e.g. Mathurapur"
                    className="text-xs h-9 rounded-xl bg-background"
                  />
                </div>

                <div>
                  <Label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                    IFSC Code (11 Chars) *
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={newBankIfsc}
                      onChange={(e) => setNewBankIfsc(e.target.value.toUpperCase())}
                      maxLength={11}
                      placeholder="e.g. SBIN0001234"
                      className="text-xs h-9 rounded-xl bg-background font-mono uppercase font-semibold"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={addBankPreset}
                      className="h-9 px-4 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shrink-0 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* List of Configured Banks */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {bankPresets.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-border/80 bg-background hover:shadow-xs transition-all"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-foreground truncate">{b.bankName}</p>
                    <p className="text-[11px] text-muted-foreground">Branch: {b.branchName}</p>
                    <span className="inline-block font-mono text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded mt-1">
                      {b.ifsc}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeBankPreset(b.id)}
                    className="text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-destructive/10 transition-colors cursor-pointer shrink-0"
                    title="Delete bank preset"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
