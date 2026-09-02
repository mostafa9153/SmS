"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { getStudentById, getStudentResultHistory, saveStudentResult } from "@/lib/data/students";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/students/status-badge";
import { HistoryTimeline } from "@/components/students/history-timeline";
import { MaskedAadhaar } from "@/components/students/masked-aadhaar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { showToast } from "@/components/ui/toast-banner";
import { CopyButton } from "@/components/ui/copy-button";
import { formatDate, cn } from "@/lib/utils";
import { CustomSelect } from "@/components/ui/custom-select";
import {
  ArrowLeft,
  Pencil,
  User,
  BookOpen,
  Clock,
  ShieldCheck,
  Award,
  CreditCard,
  Check,
  X,
  Trophy,
  Sparkles,
  Plus,
  Loader2,
  FileText,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import Link from "next/link";
import type { StudentResult } from "@/lib/types";
import { evaluateStudentScholarships } from "@/lib/utils/welfare-logic";

export default function StudentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();

  // State for Add Result Modal
  const [isAddResultOpen, setIsAddResultOpen] = useState(false);
  const [resYear, setResYear] = useState<number>(currentYear);
  const [resExam, setResExam] = useState("1st Summative Evaluation");
  const [resMarks, setResMarks] = useState("");
  const [resRemarks, setResRemarks] = useState("");
  const [resError, setResError] = useState("");

  const { data: student, isLoading } = useQuery({
    queryKey: ["student", id],
    queryFn: () => getStudentById(id),
  });

  const { data: resultHistory = [] } = useQuery<StudentResult[]>({
    queryKey: ["student-results-history", id],
    queryFn: () => getStudentResultHistory(id),
    enabled: !!student,
  });

  const addResultMutation = useMutation({
    mutationFn: (payload: any) => saveStudentResult(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-results-history", id] });
      setIsAddResultOpen(false);
      setResMarks("");
      setResRemarks("");
      setResError("");
      showToast({
        type: "success",
        title: "Result Saved",
        description: `Successfully recorded ${resExam} marks for ${student?.name}.`,
      });
    },
    onError: (err: any) => {
      setResError(err.message || "Failed to save exam result.");
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-6 max-w-5xl mx-auto text-center py-24">
        <p className="text-lg font-semibold">Student not found</p>
        <button
          onClick={() => router.back()}
          className="mt-3 text-sm text-muted-foreground hover:text-foreground underline"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="p-3.5 sm:p-6 max-w-5xl mx-auto space-y-4 sm:space-y-5">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors active:scale-95"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Students
      </button>

      {/* Header Card */}
      <div className="rounded-2xl border bg-card shadow-xs p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold">{student.name}</h1>
              <CopyButton text={student.name} label="Student Name" iconClassName="h-3.5 w-3.5" />
            </div>
            <div className="flex flex-wrap gap-2 mt-2 items-center">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted/80 border px-2.5 py-1 text-xs font-mono text-foreground shadow-2xs">
                <span className="text-muted-foreground font-sans text-[11px] font-medium">School ID:</span>
                <span className="font-semibold">{student.schoolId}</span>
                <CopyButton text={student.schoolId} label="School ID" />
              </span>
              {student.studentUniqueCode && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted/80 border px-2.5 py-1 text-xs font-mono text-foreground shadow-2xs">
                  <span className="text-muted-foreground font-sans text-[11px] font-medium">BSP ID:</span>
                  <span className="font-semibold">{student.studentUniqueCode}</span>
                  <CopyButton text={student.studentUniqueCode} label="BSP ID" />
                </span>
              )}
              {student.pen ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted/80 border px-2.5 py-1 text-xs font-mono text-foreground shadow-2xs">
                  <span className="text-muted-foreground font-sans text-[11px] font-medium">PEN:</span>
                  <span className="font-semibold">{student.pen}</span>
                  <CopyButton text={student.pen} label="PEN" />
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted/40 border border-dashed px-2 py-0.5 text-xs font-mono text-muted-foreground">
                  <span className="font-sans text-[11px]">PEN:</span>
                  <span>Not Assigned</span>
                </span>
              )}
            </div>
            <div className="mt-2.5">
              <StatusBadge status={student.currentStatus} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/generate/invoice?studentId=${student.id}`}
              className="flex items-center gap-1.5 rounded-md bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 px-3 py-1.5 text-sm font-medium hover:bg-teal-500/20 transition-colors shadow-2xs"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Fee Invoice</span>
            </Link>
            <Link
              href={`/students/${student.id}/edit`}
              className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit Profile
            </Link>
          </div>
        </div>

        {/* Quick summary row */}
        <div className="mt-4 flex flex-wrap gap-6 border-t pt-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Class / Sec / Roll</p>
            <p className="font-medium">
              {student.presentClass} - {student.presentSection} - Roll {student.presentRoll}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Gender</p>
            <p className="font-medium">{student.gender}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">DOB</p>
            <div className="font-medium flex items-center gap-1">
              <span>{formatDate(student.dob)}</span>
              {student.dob && (
                <CopyButton text={student.dob} label="Date of Birth" iconClassName="h-3 w-3" />
              )}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Contact</p>
            <div className="font-medium flex items-center gap-1">
              <span>{student.studentContact || student.altMobile || "N/A"}</span>
              {(student.studentContact || student.altMobile) && (
                <CopyButton
                  text={student.studentContact || student.altMobile || ""}
                  label="Contact Phone"
                  iconClassName="h-3 w-3"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="personal">
        <TabsList className="w-full justify-start overflow-x-auto h-auto flex-wrap gap-1 bg-muted/50">
          <TabsTrigger value="personal" className="flex items-center gap-1.5 text-xs">
            <User className="h-3.5 w-3.5" />
            Personal
          </TabsTrigger>
          <TabsTrigger value="academic" className="flex items-center gap-1.5 text-xs">
            <BookOpen className="h-3.5 w-3.5" />
            Enrolment & Academic
          </TabsTrigger>
          <TabsTrigger value="facilities" className="flex items-center gap-1.5 text-xs">
            <Award className="h-3.5 w-3.5" />
            Facilities & Profile
          </TabsTrigger>
          <TabsTrigger value="bank" className="flex items-center gap-1.5 text-xs">
            <CreditCard className="h-3.5 w-3.5" />
            Bank Details
          </TabsTrigger>
          <TabsTrigger value="identification" className="flex items-center gap-1.5 text-xs">
            <ShieldCheck className="h-3.5 w-3.5" />
            Identification
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1.5 text-xs">
            <Clock className="h-3.5 w-3.5" />
            History
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
            <Trophy className="h-3.5 w-3.5" />
            Result History
          </TabsTrigger>
        </TabsList>

        {/* Personal Info */}
        <TabsContent value="personal" className="mt-4">
          <div className="rounded-xl border bg-card p-5 space-y-6">
            <div>
              <SectionTitle>Student Demographics</SectionTitle>
              <InfoGrid>
                <InfoField label="Full Name" value={student.name} copyable />
                <InfoField label="Date of Birth" value={formatDate(student.dob)} copyable />
                <InfoField label="Gender" value={student.gender} />
                <InfoField label="Mother Tongue" value={student.motherTongue} />
                <InfoField label="Religion" value={student.religion} />
                <InfoField label="Indian Nationality" value={student.indianNationality !== false ? "Yes" : "No"} />
                <InfoField label="Blood Group" value={student.bloodGroup} />
                <InfoField label="Height" value={student.heightCm ? `${student.heightCm} cm` : undefined} />
                <InfoField label="Weight" value={student.weightKg ? `${student.weightKg} kg` : undefined} />
                <InfoField label="Birth Registration Number" value={student.birthRegistrationNo} />
                <InfoField label="Identification Mark" value={student.identificationMark} />
              </InfoGrid>
            </div>

            <div>
              <SectionTitle>Social & Eligibility Categories</SectionTitle>
              <InfoGrid>
                <InfoField label="Social Category" value={student.socialCategory} />
                <InfoField label="Minority Group" value={student.minorityGroup} />
                <InfoField label="BPL Beneficiary" value={student.isBpl ? "Yes" : "No"} />
                <InfoField label="AAY Beneficiary" value={student.isAay ? "Yes" : "No"} />
                <InfoField label="EWS / Disadvantaged Group" value={student.isEws ? "Yes" : "No"} />
                <InfoField label="Out-of-School Child" value={student.isOutOfSchool ? "Yes" : "No"} />
                {student.isOutOfSchool && (
                  <InfoField label="Mainstreamed Date" value={student.mainstreamedDate ? formatDate(student.mainstreamedDate) : "Not Mainstreamed"} />
                )}
              </InfoGrid>
            </div>

            <div>
              <SectionTitle>CWSN (Children With Special Needs)</SectionTitle>
              <InfoGrid>
                <InfoField label="CWSN Status" value={student.isCwsn ? "Yes" : "No"} />
                {student.isCwsn && (
                  <>
                    <InfoField label="Type of Impairment" value={student.impairmentType} />
                    <InfoField label="Disability Certificate" value={student.hasDisabilityCertificate ? "Yes" : "No"} />
                    {student.hasDisabilityCertificate && (
                      <InfoField label="Disability Percentage" value={student.disabilityPercentage ? `${student.disabilityPercentage}%` : undefined} />
                    )}
                  </>
                )}
                {student.sldType && <InfoField label="Specific Learning Disability (SLD)" value={student.sldType} />}
              </InfoGrid>
            </div>

            <div>
              <SectionTitle>Family & Contact Information</SectionTitle>
              <InfoGrid>
                <InfoField label="Father's Name" value={student.fatherName} />
                <InfoField label="Mother's Name" value={student.motherName} />
                <InfoField label="Guardian's Name" value={student.guardianName} />
                <InfoField label="Relationship with Guardian" value={student.relationshipWithGuardian} />
                <InfoField label="Guardian's Qualification" value={student.guardianQualification} />
                <InfoField label="Annual Family Income" value={student.annualFamilyIncome ? `₹${student.annualFamilyIncome.toLocaleString("en-IN")}` : undefined} />
                <InfoField label="Primary Mobile" value={student.studentContact} copyable />
                <InfoField label="Guardian Contact No" value={student.altMobile} copyable />
                <InfoField label="Email ID" value={student.email} />
                <InfoField label="Address" value={student.address} full />
                <InfoField label="Pincode" value={student.pincode} />
              </InfoGrid>
            </div>
          </div>
        </TabsContent>

        {/* Academic / Enrolment Info */}
        <TabsContent value="academic" className="mt-4">
          <div className="rounded-xl border bg-card p-5 space-y-6">
            <div>
              <SectionTitle>Present Enrolment Details</SectionTitle>
              <InfoGrid>
                <InfoField label="Class" value={student.presentClass} />
                <InfoField label="Section" value={student.presentSection} />
                <InfoField label="Roll Number" value={String(student.presentRoll)} />
                <InfoField label="Admission Number" value={student.admissionNo} />
                <InfoField label="Admission Date" value={student.admissionDate ? formatDate(student.admissionDate) : undefined} />
                <InfoField label="Admission Type" value={student.admissionType} />
                <InfoField label="Academic Year" value={student.academicYear} />
                <InfoField label="Medium of Instruction" value={student.mediumOfInstruction} />
                <InfoField label="Present Class Admission Date" value={student.presentClassAdmissionDate ? formatDate(student.presentClassAdmissionDate) : undefined} />
                {student.academicStream && <InfoField label="Academic Stream (HS)" value={student.academicStream} />}
              </InfoGrid>
            </div>

            <div>
              <SectionTitle>Subjects & Languages Enrolled</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Languages Studied</p>
                  <div className="flex flex-wrap gap-1">
                    {student.languageGroup && student.languageGroup.length > 0 ? (
                      student.languageGroup.map((lang) => (
                        <span key={lang} className="bg-muted px-2 py-0.5 rounded text-xs font-medium">
                          {lang}
                        </span>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-xs italic">No languages added</span>
                    )}
                  </div>
                </div>
                {student.foreignLanguage && (
                  <InfoField label="Foreign Language" value={student.foreignLanguage} />
                )}
                <div className="md:col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">Mandatory / General Subjects</p>
                  <div className="flex flex-wrap gap-1">
                    {student.mandatorySubjects && student.mandatorySubjects.length > 0 ? (
                      student.mandatorySubjects.map((sub) => (
                        <span key={sub} className="bg-muted px-2 py-0.5 rounded text-xs font-medium">
                          {sub}
                        </span>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-xs italic">No mandatory subjects listed</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Additional Subjects</p>
                  <div className="flex flex-wrap gap-1">
                    {student.additionalSubjects && student.additionalSubjects.length > 0 ? (
                      student.additionalSubjects.map((sub) => (
                        <span key={sub} className="bg-muted px-2 py-0.5 rounded text-xs font-medium">
                          {sub}
                        </span>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-xs italic">None</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Co-Curricular Subjects</p>
                  <div className="flex flex-wrap gap-1">
                    {student.coCurricularSubjects && student.coCurricularSubjects.length > 0 ? (
                      student.coCurricularSubjects.map((sub) => (
                        <span key={sub} className="bg-muted px-2 py-0.5 rounded text-xs font-medium">
                          {sub}
                        </span>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-xs italic">None</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <SectionTitle>Previous Academic Year Records</SectionTitle>
              <InfoGrid>
                <InfoField label="Schooling Status" value={student.previousStatus} />
                <InfoField label="Previous Grade/Class" value={student.previousClass} />
                <InfoField label="Previous Section" value={student.previousSection} />
                <InfoField label="Previous Stream" value={student.previousStream} />
                <InfoField label="Previous Roll No" value={student.previousRollNo ? String(student.previousRollNo) : undefined} />
                <InfoField label="Appeared for Examinations" value={student.previousAppearedForExams ? "Yes" : "No"} />
                <InfoField label="Result of Exam" value={student.previousResult} />
                <InfoField label="Marks Obtained (%)" value={student.previousMarksPercent ? `${student.previousMarksPercent}%` : undefined} />
                <InfoField label="Days Attended" value={student.previousDaysAttended ? `${student.previousDaysAttended} days` : undefined} />
              </InfoGrid>
            </div>

            <div>
              <SectionTitle>RTE Entitlement Information</SectionTitle>
              <InfoGrid>
                <InfoField label="Admitted under Section 12C of RTE" value={student.rteSection12C ? "Yes" : "No"} />
                {student.rteSection12C && (
                  <InfoField label="Amount Claimed from Government" value={student.rteAmountClaimed ? `₹${student.rteAmountClaimed.toLocaleString("en-IN")}` : undefined} />
                )}
              </InfoGrid>
            </div>
          </div>
        </TabsContent>

        {/* Facilities Tab */}
        <TabsContent value="facilities" className="mt-4">
          <div className="rounded-xl border bg-card p-5 space-y-6">
            <div>
              <SectionTitle>Provided Student Entitlements & Facilities</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">General Facilities Provided</p>
                  <div className="flex flex-wrap gap-1">
                    {student.facilitiesProvided && student.facilitiesProvided.length > 0 ? (
                      student.facilitiesProvided.map((fac) => (
                        <span key={fac} className="bg-emerald-50 text-emerald-800 border border-emerald-100 px-2.5 py-1 rounded-full text-xs font-medium">
                          {fac}
                        </span>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-xs italic">No general facilities provided</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">CWSN Specific Facilities Provided</p>
                  <div className="flex flex-wrap gap-1">
                    {student.cwsnFacilities && student.cwsnFacilities.length > 0 ? (
                      student.cwsnFacilities.map((fac) => (
                        <span key={fac} className="bg-indigo-50 text-indigo-800 border border-indigo-100 px-2.5 py-1 rounded-full text-xs font-medium">
                          {fac}
                        </span>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-xs italic">No CWSN facilities provided</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <SectionTitle>Co-curricular & External Engagements</SectionTitle>
              <InfoGrid>
                <InfoField label="NCC Member" value={student.ncc ? "Yes" : "No"} />
                <InfoField label="NSS Member" value={student.nss ? "Yes" : "No"} />
                <InfoField label="Scouts and Guides" value={student.scoutsGuides ? "Yes" : "No"} />
                <InfoField label="Approx. Distance to School" value={student.distanceToSchool ? `${student.distanceToSchool} KM` : undefined} />
                <InfoField label="Highest Parent Education Level" value={student.highestEducationParents} />
              </InfoGrid>

              <div className="mt-4 text-sm">
                <p className="text-xs text-muted-foreground mb-1">Competitions / Olympiads Participation</p>
                <div className="flex flex-wrap gap-1">
                  {student.competitionsOlympiads && student.competitionsOlympiads.length > 0 ? (
                    student.competitionsOlympiads.map((comp) => (
                      <span key={comp} className="bg-amber-50 text-amber-800 border border-amber-100 px-2.5 py-1 rounded text-xs font-medium">
                        {comp}
                      </span>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-xs italic">No participation records entered</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Bank & Welfare Details Tab */}
        <TabsContent value="bank" className="mt-4 space-y-4">
          {/* Active Welfare & Scholarship Eligibility Card */}
          {(() => {
            const welfareResult = evaluateStudentScholarships(student);
            const hasBankAccount = !!(student.bankAccountNo && student.bankAccountNo.trim() !== "");
            const hasIfsc = !!(student.bankIfsc && student.bankIfsc.trim() !== "");
            const isDbtReady = hasBankAccount && hasIfsc;

            return (
              <div className="rounded-xl border bg-card p-5 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                  <div>
                    <SectionTitle>Government Welfare & Scholarship Eligibility</SectionTitle>
                    <p className="text-xs text-muted-foreground">
                      Dynamic evaluation based on West Bengal Govt rules (Gender, Age, Class, Caste, Religion, Academic Marks).
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isDbtReady ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs px-2.5 py-1 font-semibold gap-1">
                        <Check className="h-3.5 w-3.5" />
                        <span>DBT Bank Ready</span>
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 text-xs px-2.5 py-1 font-semibold gap-1">
                        <span>⚠️ Incomplete Bank Info for DBT</span>
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Eligible Schemes Grid */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-foreground">
                    Qualified Schemes ({welfareResult.eligibleSchemes.length}):
                  </span>
                  {welfareResult.eligibleSchemes.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {welfareResult.eligibleSchemes.map((scheme) => (
                        <div
                          key={scheme.id}
                          className="rounded-xl border p-3 bg-muted/20 hover:bg-muted/40 transition-colors space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border ${scheme.colorBadge}`}>
                              {scheme.shortCode}
                            </span>
                            <span className="text-xs font-mono font-bold text-primary">
                              {scheme.amount}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-foreground line-clamp-1">{scheme.name}</p>
                          <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                            {scheme.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic p-3 rounded-lg border bg-muted/10">
                      No matching state welfare schemes based on current profile.
                    </p>
                  )}
                </div>

                {/* Conflict / Notes if any */}
                {welfareResult.conflicts.length > 0 && (
                  <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20 text-xs text-amber-800 dark:text-amber-300">
                    <p className="font-semibold mb-0.5">ℹ️ State Multi-Scholarship Rule:</p>
                    <p>{welfareResult.conflicts[0]}</p>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Bank Account Details Card */}
          <div className="rounded-xl border bg-card p-5">
            <SectionTitle>Scholarship & General Bank Account Details</SectionTitle>
            <p className="text-xs text-muted-foreground mb-5">
              These details are used for BPL entitlements, minority scholarships, and other direct benefit transfers (DBT).
            </p>
            <InfoGrid>
              <InfoField label="Bank A/C Number" value={student.bankAccountNo} copyable />
              <InfoField label="Bank IFS Code" value={student.bankIfsc} copyable />
            </InfoGrid>
          </div>
        </TabsContent>

        {/* Identification Tab */}
        <TabsContent value="identification" className="mt-4">
          <div className="rounded-xl border bg-card p-5">
            <SectionTitle>Government Identifiers</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
              <InfoField label="PEN (Permanent Education Number)" value={student.pen} copyable />
              <InfoField label="DISE Code" value={student.diseCode} copyable />
              <InfoField label="Health ID" value={student.healthId} copyable />
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">
                  Aadhaar Available? (Yes/No)
                </p>
                {student.aadhaar && student.aadhaar.trim() !== "" ? (
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs px-2 py-0.5 font-medium">
                    ✓ Yes (Aadhaar Recorded)
                  </Badge>
                ) : (
                  <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-xs px-2 py-0.5 font-medium">
                    ✕ No (Not Available)
                  </Badge>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">
                  Aadhaar Number
                </p>
                <MaskedAadhaar aadhaar={student.aadhaar} />
                {student.aadhaar && (
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    Click the eye icon to reveal. Access is logged in production.
                  </p>
                )}
              </div>
              {student.nameAsPerAadhaar && (
                <InfoField label="Name (as per Aadhaar)" value={student.nameAsPerAadhaar} />
              )}
            </div>
          </div>
        </TabsContent>

        {/* Academic History Timeline Tab */}
        <TabsContent value="history" className="mt-4">
          <div className="rounded-xl border bg-card p-5">
            <SectionTitle>Academic History Timeline</SectionTitle>
            <p className="text-xs text-muted-foreground mb-5">
              Year-by-year academic record from admission to present.
            </p>
            <HistoryTimeline history={student.academicHistory} studentId={student.id} />
          </div>
        </TabsContent>

        {/* Result History Tab */}
        <TabsContent value="results" className="mt-4">
          <div className="rounded-xl border bg-card p-5 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
              <div>
                <SectionTitle>Academic Examination Results</SectionTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Multi-year evaluation records, percentage breakdown, and dual rank rankings.
                </p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  onClick={() => {
                    setResYear(new Date().getFullYear());
                    setResExam("1st Summative Evaluation");
                    setResMarks("");
                    setResRemarks("");
                    setResError("");
                    setIsAddResultOpen(true);
                  }}
                  className="flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" /> Record Exam Marks
                </button>
                <Link
                  href="/results"
                  className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline px-2 py-1"
                >
                  <Trophy className="h-3.5 w-3.5" /> Class Results Module →
                </Link>
              </div>
            </div>

            {/* Section 1: Current Active Academic Session (2026) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Current Academic Session ({currentYear}) — Class {student.presentClass}-{student.presentSection}
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  Full Marks: {student.presentClass === "VI" ? 1050 : student.presentClass === "VII" || student.presentClass === "VIII" ? 1200 : student.presentClass === "IX" || student.presentClass === "X" ? 700 : 500}
                </span>
              </div>

              {/* 3 Evaluations Cards for Current Year */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {["1st Summative Evaluation", "2nd Summative Evaluation", "Annual Examination"].map((examName) => {
                  const examRes = resultHistory.find(
                    (r) => r.academicYear === currentYear && r.examName === examName
                  );
                  const isEntered = !!examRes && examRes.marksObtained > 0;
                  const currentClassFullMarks = student.presentClass === "VI" ? 1050 : student.presentClass === "VII" || student.presentClass === "VIII" ? 1200 : student.presentClass === "IX" || student.presentClass === "X" ? 700 : 500;

                  return (
                    <div
                      key={examName}
                      className={cn(
                        "rounded-xl border p-4 space-y-3 transition-all",
                        isEntered ? "bg-card shadow-xs" : "bg-muted/20 border-dashed"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">{examName}</span>
                        {isEntered ? (
                          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                            Recorded
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground border-muted">
                            Pending
                          </Badge>
                        )}
                      </div>

                      {isEntered ? (
                        <div className="space-y-2">
                          <div className="flex items-baseline justify-between">
                            <span className="text-2xl font-bold font-mono text-foreground">
                              {examRes.marksObtained}
                              <span className="text-xs font-normal text-muted-foreground ml-1">/ {examRes.fullMarks}</span>
                            </span>
                            <span className={cn("text-xs font-bold font-mono px-2 py-0.5 rounded", examRes.percentage >= 60 ? "bg-emerald-100 text-emerald-800" : examRes.percentage >= 35 ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800")}>
                              {examRes.percentage}%
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
                            <span>Grade: <strong className="text-foreground">{examRes.grade?.split(" ")[0]}</strong></span>
                            <div className="flex items-center gap-2">
                              {examRes.rankInSection && (
                                <span className="font-bold text-amber-700">Sec: #{examRes.rankInSection}</span>
                              )}
                              {examRes.rankInClass && (
                                <span className="font-bold text-primary">Class: #{examRes.rankInClass}</span>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              setResYear(currentYear);
                              setResExam(examName);
                              setResMarks(String(examRes.marksObtained));
                              setResRemarks(examRes.remarks || "");
                              setResError("");
                              setIsAddResultOpen(true);
                            }}
                            className="w-full flex items-center justify-center gap-1.5 rounded-lg border bg-muted/40 py-1.5 text-xs font-medium hover:bg-muted transition-colors mt-2"
                          >
                            <Pencil className="h-3 w-3 text-muted-foreground" /> Update 2026 Marks
                          </button>
                        </div>
                      ) : (
                        <div className="py-2 text-center space-y-3">
                          <p className="text-xs text-muted-foreground">Marks not yet entered for this exam.</p>
                          <button
                            onClick={() => {
                              setResYear(currentYear);
                              setResExam(examName);
                              setResMarks("");
                              setResRemarks("");
                              setResError("");
                              setIsAddResultOpen(true);
                            }}
                            className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-primary/10 text-primary py-1.5 text-xs font-semibold hover:bg-primary hover:text-primary-foreground transition-colors"
                          >
                            <Plus className="h-3 w-3" /> Enter {examName.split(" ")[0]} Marks
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Performance Trend Chart */}
            {resultHistory.length > 0 && (
              <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Multi-Year Performance Trend (Percentage)
                </p>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={resultHistory.map((r) => ({
                        yearClass: `${r.academicYear} (Cl ${r.class})`,
                        percentage: r.percentage,
                        marks: `${r.marksObtained}/${r.fullMarks}`,
                        grade: r.grade,
                      }))}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                      <XAxis dataKey="yearClass" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(val: any) => [`${val}%`, "Percentage"]}
                        contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      />
                      <Bar dataKey="percentage" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                        {resultHistory.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.percentage >= 60 ? "#059669" : entry.percentage >= 35 ? "#d97706" : "#e11d48"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Section 2: Complete Examination History (Past & All Sessions) */}
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" /> Examination History Log (অতীত শিক্ষাবর্ষের ফলাফল)
                </p>
                <span className="text-xs text-muted-foreground">Total: {resultHistory.length} Exam Records</span>
              </div>

              {resultHistory.length === 0 ? (
                <div className="py-8 text-center rounded-lg border bg-muted/20">
                  <Trophy className="h-7 w-7 text-muted-foreground/40 mx-auto mb-1.5" />
                  <p className="text-xs font-semibold text-foreground">No Historical Exam Records</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Results entered across current and past years will be logged here chronologically.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/70 border-b">
                      <tr>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Year</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Class / Sec / Roll</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Exam Name</th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">Marks Obtained</th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">Percentage</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Grade</th>
                        <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground">Section Rank</th>
                        <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground">Class Rank</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {resultHistory.map((res) => (
                        <tr key={res.id} className={cn("transition-colors", res.academicYear === currentYear ? "bg-emerald-50/20" : "hover:bg-muted/30")}>
                          <td className="px-3 py-2.5 text-xs font-bold font-mono text-foreground">
                            {res.academicYear}
                            {res.academicYear === currentYear && (
                              <span className="ml-1.5 inline-block text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1 rounded">Current</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground">
                            Class {res.class} - {res.section} (Roll: {res.roll})
                          </td>
                          <td className="px-3 py-2.5 text-xs font-medium text-foreground">{res.examName}</td>
                          <td className="px-3 py-2.5 text-right text-xs font-mono font-bold">
                            {res.marksObtained} <span className="text-[10px] text-muted-foreground font-normal">/ {res.fullMarks}</span>
                          </td>
                          <td className="px-3 py-2.5 text-right text-xs font-mono">
                            <span className={cn("font-bold", res.percentage >= 60 ? "text-emerald-700" : res.percentage >= 35 ? "text-amber-700" : "text-rose-600")}>
                              {res.percentage}%
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-xs">
                            {res.grade ? (
                              <Badge variant="outline" className="text-[10px]">
                                {res.grade.split(" ")[0]}
                              </Badge>
                            ) : "—"}
                          </td>
                          <td className="px-3 py-2.5 text-center text-xs font-bold text-amber-700">
                            {res.rankInSection ? (
                              res.rankInSection === 1 ? "🥇 1st" : res.rankInSection === 2 ? "🥈 2nd" : res.rankInSection === 3 ? "🥉 3rd" : `${res.rankInSection}th`
                            ) : "—"}
                          </td>
                          <td className="px-3 py-2.5 text-center text-xs font-bold text-primary">
                            {res.rankInClass ? (
                              res.rankInClass === 1 ? "🥇 1st" : res.rankInClass === 2 ? "🥈 2nd" : res.rankInClass === 3 ? "🥉 3rd" : `${res.rankInClass}th`
                            ) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Enter / Record Exam Marks Modal */}
      <Dialog open={isAddResultOpen} onOpenChange={setIsAddResultOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Academic Exam Marks</DialogTitle>
            <DialogDescription>
              Enter evaluation results for {student.name} ({student.schoolId}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {resError && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 font-medium">
                {resError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Academic Year</label>
                <CustomSelect
                  value={resYear}
                  onChange={(val) => setResYear(Number(val))}
                  options={[currentYear + 1, currentYear, currentYear - 1, currentYear - 2].map((yr) => ({
                    label: String(yr),
                    value: yr,
                  }))}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Evaluation Exam</label>
                <CustomSelect
                  value={resExam}
                  onChange={(val) => setResExam(String(val))}
                  options={[
                    { label: "1st Summative Evaluation", value: "1st Summative Evaluation" },
                    { label: "2nd Summative Evaluation", value: "2nd Summative Evaluation" },
                    { label: "Annual Examination", value: "Annual Examination" },
                  ]}
                />
              </div>
            </div>

            <div className="rounded-lg border bg-muted/40 p-3 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Class & Section:</span>
                <span className="font-bold">Class {student.presentClass} - {student.presentSection} (Roll: {student.presentRoll})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Class Full Marks:</span>
                <span className="font-mono font-bold text-amber-700">
                  {student.presentClass === "VI" ? 1050 : student.presentClass === "VII" || student.presentClass === "VIII" ? 1200 : student.presentClass === "IX" || student.presentClass === "X" ? 700 : 500} Marks
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Marks Obtained (প্রাপ্ত নম্বর)</label>
              <input
                type="number"
                min="0"
                value={resMarks}
                onChange={(e) => setResMarks(e.target.value)}
                placeholder="e.g. 420"
                className="w-full rounded-md border px-3 py-2 text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Remarks (ঐচ্ছিক মন্তব্য)</label>
              <input
                type="text"
                value={resRemarks}
                onChange={(e) => setResRemarks(e.target.value)}
                placeholder="e.g. Good progress in Mathematics"
                className="w-full rounded-md border px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => setIsAddResultOpen(false)}
              className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                const num = parseFloat(resMarks);
                const fullMarks = student.presentClass === "VI" ? 1050 : student.presentClass === "VII" || student.presentClass === "VIII" ? 1200 : student.presentClass === "IX" || student.presentClass === "X" ? 700 : 500;
                if (isNaN(num) || num < 0 || num > fullMarks) {
                  setResError(`Please enter a valid marks between 0 and ${fullMarks}.`);
                  return;
                }
                addResultMutation.mutate({
                  studentId: student.id,
                  academicYear: resYear,
                  class: student.presentClass,
                  section: student.presentSection,
                  roll: student.presentRoll,
                  examName: resExam,
                  fullMarks,
                  marksObtained: num,
                  remarks: resRemarks,
                });
              }}
              disabled={addResultMutation.isPending}
              className="flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-4 py-1.5 text-xs font-semibold hover:bg-primary/90"
            >
              {addResultMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Save Result
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-semibold text-foreground border-b pb-2 mb-3">{children}</p>
  );
}

function InfoGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4 my-3">{children}</div>;
}

function InfoField({
  label,
  value,
  full,
  copyable,
}: {
  label: string;
  value?: string | number | null;
  full?: boolean;
  copyable?: boolean;
}) {
  const displayVal = value !== undefined && value !== null && String(value).trim() !== "" ? String(value) : "—";
  return (
    <div className={full ? "sm:col-span-2 md:col-span-3" : ""}>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <div className="flex items-center gap-1.5">
        <p className="text-sm font-medium break-all">{displayVal}</p>
        {copyable && displayVal !== "—" && (
          <CopyButton text={displayVal} label={label} iconClassName="h-3 w-3" />
        )}
      </div>
    </div>
  );
}
