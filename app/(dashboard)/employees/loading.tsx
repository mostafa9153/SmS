import { CardGridSkeleton } from "@/components/ui/page-skeletons";

export default function EmployeesLoading() {
  return <CardGridSkeleton title="Staff Directory" count={8} />;
}
