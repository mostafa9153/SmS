"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Key } from "lucide-react";
import { CustomSelect } from "@/components/ui/custom-select";
import { InfoTooltip } from "@/components/settings/presets/info-tooltip";
import type { PresetAddressesState } from "./use-preset-addresses";

export function AiSection({ presets }: { presets: PresetAddressesState }) {
  const { activeSection, aiApiKey, aiModel, aiProvider, setAiApiKey, setAiModel, setAiProvider } = presets;
  return (
    <>
      {activeSection === "ai" && (
        <Card className="rounded-2xl border border-border/80 shadow-xs animate-in fade-in-50 duration-200">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-500/10 text-pink-600 dark:text-pink-400 shrink-0">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-1.5">
                <CardTitle className="text-sm font-bold">AI Model &amp; Vision OCR Configuration</CardTitle>
                <InfoTooltip content="The AI OCR scanner runs automatically on your camera captures and physical admission form images using Google Gemini or OpenAI." />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-[11px] font-bold text-muted-foreground uppercase mb-1.5 block">
                  AI Service Provider
                </Label>
                <CustomSelect
                  value={aiProvider}
                  onChange={(val) => {
                    setAiProvider(val as "gemini" | "openai");
                    if (val === "gemini") setAiModel("gemini-1.5-flash");
                    if (val === "openai") setAiModel("gpt-4o-mini");
                  }}
                  options={[
                    { value: "gemini", label: "Google Gemini (Recommended - Fast & Free)" },
                    { value: "openai", label: "OpenAI (GPT-4o Vision)" },
                  ]}
                />
              </div>

              <div>
                <Label className="text-[11px] font-bold text-muted-foreground uppercase mb-1.5 block">
                  OCR Model
                </Label>
                <Input
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  placeholder="gemini-1.5-flash or gpt-4o-mini"
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="sm:col-span-2">
                <Label className="text-[11px] font-bold text-muted-foreground uppercase mb-1.5 block">
                  API Key *
                </Label>
                <div className="relative">
                  <Key className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="password"
                    value={aiApiKey}
                    onChange={(e) => setAiApiKey(e.target.value)}
                    placeholder="Paste your Gemini API Key (starts with AIzaSy...)"
                    className="pl-9 h-9 text-xs rounded-xl font-mono"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  Your API Key is stored securely in your database and is only invoked for OCR extractions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
