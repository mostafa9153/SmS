import { TablePageSkeleton } from "@/components/ui/page-skeletons";

export default function Loading() {
  return <TablePageSkeleton title="Reports" columns={6} rows={8} />;
}
