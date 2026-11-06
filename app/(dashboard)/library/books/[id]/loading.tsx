import { TablePageSkeleton } from "@/components/ui/page-skeletons";

export default function LibraryBookLoading() {
  return <TablePageSkeleton title="Book" columns={4} rows={5} />;
}
