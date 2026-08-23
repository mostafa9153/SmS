import { BarChart3, Clock } from "lucide-react";

export default function ReportsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
      <div className="rounded-full bg-muted p-5 mb-4">
        <BarChart3 className="h-10 w-10 text-muted-foreground" />
      </div>
      <h1 className="text-xl font-bold">Reports</h1>
      <p className="text-sm text-muted-foreground mt-2 max-w-xs">
        Detailed analytics and custom reports are coming in Phase 2.
      </p>
      <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
        <Clock className="h-3.5 w-3.5" />
        Coming in Phase 2
      </div>
    </div>
  );
}
