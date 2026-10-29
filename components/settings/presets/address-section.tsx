"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Building, Mail, ShieldCheck, Compass, Landmark } from "lucide-react";
import { InfoTooltip } from "@/components/settings/presets/info-tooltip";
import type { PresetAddressesState } from "./use-preset-addresses";

export function AddressSection({ presets }: { presets: PresetAddressesState }) {
  const { activeSection, addBlock, addDistrict, addGramPanchayat, addPoliceStation, addPostOffice, addVillage, addressConfig, newBlock, newDist, newGp, newPoName, newPoPin, newPs, newVillage, removeBlock, removeDistrict, removeGramPanchayat, removePoliceStation, removePostOffice, removeVillage, setNewBlock, setNewDist, setNewGp, setNewPoName, setNewPoPin, setNewPs, setNewVillage } = presets;
  return (
    <>
      {activeSection === "address" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-in fade-in-50 duration-200">
          {/* 1. Villages (Vill) */}
          <Card className="rounded-2xl border border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <CardTitle className="text-sm font-bold">Villages (Vill)</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex gap-2">
                <Input
                  value={newVillage}
                  onChange={(e) => setNewVillage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addVillage()}
                  placeholder="Enter village name..."
                  className="text-xs h-9 rounded-xl bg-background"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={addVillage}
                  className="h-9 px-3 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pt-1">
                {addressConfig.villages.map((v) => (
                  <span
                    key={v}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40"
                  >
                    {v}
                    <button
                      type="button"
                      onClick={() => removeVillage(v)}
                      className="text-emerald-600 hover:text-destructive transition-colors ml-0.5 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 2. Gram Panchayats (G.P) */}
          <Card className="rounded-2xl border border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <div className="flex items-center gap-2">
                <Landmark className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                <CardTitle className="text-sm font-bold">Gram Panchayats (G.P)</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex gap-2">
                <Input
                  value={newGp}
                  onChange={(e) => setNewGp(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addGramPanchayat()}
                  placeholder="Enter G.P name..."
                  className="text-xs h-9 rounded-xl bg-background"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={addGramPanchayat}
                  className="h-9 px-3 text-xs font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white shrink-0 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pt-1">
                {(addressConfig.gramPanchayats || []).map((gp) => (
                  <span
                    key={gp}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800/40"
                  >
                    {gp}
                    <button
                      type="button"
                      onClick={() => removeGramPanchayat(gp)}
                      className="text-teal-600 hover:text-destructive transition-colors ml-0.5 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 3. Post Offices (P.O) + Pincode */}
          <Card className="rounded-2xl border border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <div className="flex items-center gap-1.5">
                  <CardTitle className="text-sm font-bold">Post Offices (P.O) &amp; Pincodes</CardTitle>
                  <InfoTooltip content="Selecting a P.O in the form auto-fills its PIN code." />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex gap-2">
                <Input
                  value={newPoName}
                  onChange={(e) => setNewPoName(e.target.value)}
                  placeholder="Post Office name..."
                  className="text-xs h-9 rounded-xl bg-background flex-1"
                />
                <Input
                  value={newPoPin}
                  onChange={(e) => setNewPoPin(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addPostOffice()}
                  placeholder="PIN (e.g. 743349)"
                  maxLength={6}
                  className="text-xs h-9 w-28 rounded-xl bg-background text-center font-mono"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={addPostOffice}
                  className="h-9 px-3 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shrink-0 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pt-1">
                {addressConfig.postOffices.map((po) => (
                  <span
                    key={po.name}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40"
                  >
                    {po.name}
                    {po.pincode && (
                      <span className="font-mono text-[10px] bg-blue-100 dark:bg-blue-900/60 px-1.5 py-0.5 rounded text-blue-900 dark:text-blue-200">
                        {po.pincode}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removePostOffice(po.name)}
                      className="text-blue-600 hover:text-destructive transition-colors ml-0.5 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 4. Blocks / Municipalities */}
          <Card className="rounded-2xl border border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <CardTitle className="text-sm font-bold">Blocks / Municipalities</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex gap-2">
                <Input
                  value={newBlock}
                  onChange={(e) => setNewBlock(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addBlock()}
                  placeholder="e.g. Mathurapur-I, Mandirbazar..."
                  className="text-xs h-9 rounded-xl bg-background"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={addBlock}
                  className="h-9 px-3 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pt-1">
                {(addressConfig.blocks || []).map((b) => (
                  <span
                    key={b}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40"
                  >
                    {b}
                    <button
                      type="button"
                      onClick={() => removeBlock(b)}
                      className="text-indigo-600 hover:text-destructive transition-colors ml-0.5 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 5. Police Stations (P.S) */}
          <Card className="rounded-2xl border border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <CardTitle className="text-sm font-bold">Police Stations (P.S)</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex gap-2">
                <Input
                  value={newPs}
                  onChange={(e) => setNewPs(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addPoliceStation()}
                  placeholder="e.g. Mathurapur, Mandirbazar..."
                  className="text-xs h-9 rounded-xl bg-background"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={addPoliceStation}
                  className="h-9 px-3 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-700 text-white shrink-0 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pt-1">
                {addressConfig.policeStations.map((ps) => (
                  <span
                    key={ps}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40"
                  >
                    {ps}
                    <button
                      type="button"
                      onClick={() => removePoliceStation(ps)}
                      className="text-purple-600 hover:text-destructive transition-colors ml-0.5 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 6. Districts (Dist) */}
          <Card className="rounded-2xl border border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <div className="flex items-center gap-2">
                <Compass className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <CardTitle className="text-sm font-bold">Districts (Dist)</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex gap-2">
                <Input
                  value={newDist}
                  onChange={(e) => setNewDist(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addDistrict()}
                  placeholder="e.g. South 24 Parganas..."
                  className="text-xs h-9 rounded-xl bg-background"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={addDistrict}
                  className="h-9 px-3 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shrink-0 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pt-1">
                {addressConfig.districts.map((d) => (
                  <span
                    key={d}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40"
                  >
                    {d}
                    <button
                      type="button"
                      onClick={() => removeDistrict(d)}
                      className="text-amber-600 hover:text-destructive transition-colors ml-0.5 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
