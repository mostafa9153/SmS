import { TablePageSkeleton } from "@/components/ui/page-skeletons";

export default function InvoicesLoading() {
  return <TablePageSkeleton title="Admission Invoices" columns={6} rows={8} />;
}
