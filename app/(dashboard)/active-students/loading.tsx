import { TablePageSkeleton } from "@/components/ui/page-skeletons";

export default function ActiveStudentsLoading() {
  return <TablePageSkeleton title="Active Students" columns={7} rows={9} />;
}
