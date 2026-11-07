import { TablePageSkeleton } from "@/components/ui/page-skeletons";

export default function MyBooksLoading() {
  return <TablePageSkeleton title="My books" columns={3} />;
}
