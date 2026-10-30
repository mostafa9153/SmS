"use client";



import { ClassKpiCards } from "@/components/settings/class-management/class-kpi-cards";
import { ClassesGrid } from "@/components/settings/class-management/classes-grid";
import { AddClassDialog } from "@/components/settings/class-management/add-class-dialog";
import { EditClassDialog } from "@/components/settings/class-management/edit-class-dialog";
import { useClassManagement } from "@/components/settings/class-management/use-class-management";

export function ClassManagementTab() {
  const cm = useClassManagement();

  return (
    <div className="space-y-5 animate-in fade-in-50 duration-200">
      {/* Summary KPI Stats */}
      <ClassKpiCards cm={cm} />

      {/* Classes Grid */}
      <ClassesGrid cm={cm} />

      {/* ADD CLASS MODAL */}
      <AddClassDialog cm={cm} />

      {/* EDIT CLASS MODAL */}
      <EditClassDialog cm={cm} />
    </div>
  );
}
