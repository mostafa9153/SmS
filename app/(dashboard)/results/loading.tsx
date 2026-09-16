import { TablePageSkeleton } from "@/components/ui/page-skeletons";

export default function ResultsLoading() {
  return <TablePageSkeleton title="Student Results" columns={8} rows={10} />;
}
