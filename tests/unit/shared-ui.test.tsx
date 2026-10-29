import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Trophy } from "lucide-react";
import { FormField, FormSection } from "@/components/forms/form-layout";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Spinner } from "@/components/ui/spinner";
import { ChartTooltip } from "@/components/dashboard/chart-tooltip";
import { FilterSelect } from "@/components/ui/filter-select";
import { SearchInput } from "@/components/ui/search-input";
import { Pagination } from "@/components/ui/pagination";

const html = (node: React.ReactElement) => renderToStaticMarkup(node);

describe("shared UI primitives", () => {
  it("FormField shows the label, error text and error border", () => {
    const out = html(<FormField label="Name" error="Required"><input /></FormField>);
    expect(out).toContain("Name");
    expect(out).toContain("Required");
    expect(out).toContain("border-destructive");
    expect(html(<FormField label="Name"><input /></FormField>)).not.toContain("Required");
  });

  it("FormSection renders a titled section with mobile-safe inputs", () => {
    const out = html(<FormSection title="Guardian"><FormField label="x"><input /></FormField></FormSection>);
    expect(out).toMatch(/<section[\s\S]*<h3[^>]*>Guardian<\/h3>/);
    expect(out).toContain("[&amp;&gt;input]:text-base"); // no iOS zoom
  });

  it("PageHeader renders one h1 and optional actions", () => {
    const out = html(<PageHeader icon={Trophy} title="Sports" actions={<button>New</button>} />);
    expect(out.match(/<h1/g)).toHaveLength(1);
    expect(out).toContain("New");
  });

  it("EmptyState, StatCard, Spinner render accessible content", () => {
    expect(html(<EmptyState title="No events" />)).toContain('role="status"');
    expect(html(<StatCard label="Events" value={12} />)).toContain("12");
    expect(html(<Spinner />)).toContain("aria-hidden");
    expect(html(<Spinner label="Saving" />)).toContain("Saving");
  });

  it("StatCard is a plain tile by default and a pressed toggle button as a filter", () => {
    const plain = html(<StatCard label="Events" value={12} hint="3 today" />);
    expect(plain).not.toContain("<button");
    expect(plain).toContain("3 today");
    const filter = html(<StatCard label="Events" value={12} onClick={() => {}} active />);
    expect(filter).toMatch(/<button[^>]*type="button"/);
    expect(filter).toContain('aria-pressed="true"');
  });

  it("Pagination hides on one page and shows the record range", () => {
    expect(html(<Pagination page={1} totalPages={1} onPageChange={() => {}} />)).toBe("");
    expect(html(<Pagination page={1} totalPages={1} onPageChange={() => {}} total={5} pageSize={10} alwaysShow />)).toContain("1–5 of 5");
    const out = html(<Pagination page={2} totalPages={3} onPageChange={() => {}} total={25} pageSize={10} />);
    expect(out).toContain("11–20 of 25");
    expect(out).toContain('aria-label="Previous page"');
  });

  it("ChartTooltip is empty when inactive and shows percent with total", () => {
    expect(html(<ChartTooltip active={false} payload={[]} />)).toBe("");
    const out = html(<ChartTooltip active payload={[{ name: "OBC", value: 25, payload: {} }]} total={100} />);
    expect(out).toContain("OBC");
    expect(out).toContain("(25.0%)");
  });

  it("FilterSelect shows the selected label, else the placeholder", () => {
    const options = [{ label: "Class IX", value: "IX" }];
    expect(html(<FilterSelect value="IX" onChange={() => {}} placeholder="Class" options={options} />)).toContain("Class IX");
    expect(html(<FilterSelect value="" onChange={() => {}} placeholder="Class" options={options} />)).toContain("Class");
  });

  it("SearchInput shows a clear button only with text", () => {
    expect(html(<SearchInput value="abc" onChange={() => {}} />)).toContain("Clear search");
    expect(html(<SearchInput value="" onChange={() => {}} />)).not.toContain("Clear search");
  });
});

describe("PageHeader actions", () => {
  it("renders a single action element without a wrapper, several inside a wrapping row", () => {
    const single = renderToStaticMarkup(<PageHeader title="T" actions={<div className="grid grid-cols-2">a</div>} />);
    expect(single).not.toContain("flex flex-wrap items-center gap-2\"><div class=\"grid");
    const many = renderToStaticMarkup(<PageHeader title="T" actions={<><button>a</button><button>b</button></>} />);
    expect(many).toContain("flex flex-wrap items-center gap-2");
  });
});
