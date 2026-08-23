import Link from "next/link";
import { UserPlus, Upload, Search, ShieldCheck } from "lucide-react";
import { StatCards } from "@/components/dashboard/stat-cards";
import { StatusChart } from "@/components/dashboard/status-chart";
import { ClassStrengthChart } from "@/components/dashboard/class-strength-chart";

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Overview of student data for MHS School
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/settings"
            className="flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Add Admin / Staff
          </Link>
          <Link
            href="/students/add"
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Add Student
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <StatCards />

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StatusChart />
        <ClassStrengthChart />
      </div>

      {/* Quick Actions */}
      <div>
        <p className="text-sm font-semibold mb-3">Quick Actions</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/students/add"
            className="flex items-center gap-3 rounded-lg border bg-card p-4 hover:bg-muted/50 transition-colors group"
          >
            <div className="rounded-md bg-primary/10 p-2 group-hover:bg-primary/20 transition-colors">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Add Student</p>
              <p className="text-xs text-muted-foreground">
                Register a new student
              </p>
            </div>
          </Link>

          <Link
            href="/students/bulk-upload"
            className="flex items-center gap-3 rounded-lg border bg-card p-4 hover:bg-muted/50 transition-colors group"
          >
            <div className="rounded-md bg-amber-50 p-2 group-hover:bg-amber-100 transition-colors">
              <Upload className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Bulk Upload</p>
              <p className="text-xs text-muted-foreground">
                Import from Excel / CSV
              </p>
            </div>
          </Link>

          <Link
            href="/students"
            className="flex items-center gap-3 rounded-lg border bg-card p-4 hover:bg-muted/50 transition-colors group"
          >
            <div className="rounded-md bg-sky-50 p-2 group-hover:bg-sky-100 transition-colors">
              <Search className="h-5 w-5 text-sky-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Search Students</p>
              <p className="text-xs text-muted-foreground">
                Find and view student records
              </p>
            </div>
          </Link>

          <Link
            href="/settings"
            className="flex items-center gap-3 rounded-lg border bg-card p-4 hover:bg-muted/50 transition-colors group"
          >
            <div className="rounded-md bg-purple-50 p-2 group-hover:bg-purple-100 transition-colors">
              <ShieldCheck className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Add Admin & Staff</p>
              <p className="text-xs text-muted-foreground">
                Manage user access & roles
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
