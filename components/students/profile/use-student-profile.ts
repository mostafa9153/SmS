"use client";

import { useState } from "react";
import { currentYearIST } from "@/lib/utils/academic-year";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getStudentById, getStudentResultHistory, saveStudentResult, deleteStudent } from "@/lib/data/students";
import { showToast } from "@/components/ui/toast-banner";
import { StudentResult } from "@/lib/types";
import { toastWithUndo } from "@/lib/undo/client";
import { VALID_STUDENT_TABS } from "@/components/students/profile/constants";

export function useStudentProfile() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const currentYear = currentYearIST();

  const tabParam = searchParams.get("tab");
  const initialTab = tabParam && VALID_STUDENT_TABS.includes(tabParam) ? tabParam : "personal";
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (val === "personal") {
        url.searchParams.delete("tab");
      } else {
        url.searchParams.set("tab", val);
      }
      window.history.replaceState(null, "", url.toString());
    }
  };

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
    enabled: !!id,
  });

  const addResultMutation = useMutation({
    mutationFn: (payload: any) => saveStudentResult(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["student-results-history", id] });
      setIsAddResultOpen(false);
      setResMarks("");
      setResRemarks("");
      setResError("");
      toastWithUndo(`Recorded ${resExam} marks for ${student?.name}.`, data.undoId, () => {
        queryClient.invalidateQueries({ queryKey: ["student-results-history", id] });
      });
    },
    onError: (err: any) => {
      setResError(err.message || "Failed to save exam result.");
    },
  });

  // State for Delete Student Confirmation Modal
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDeleteStudent() {
    if (!student?.id) return;
    setIsDeleting(true);
    try {
      const { undoId } = await deleteStudent(student.id);
      toastWithUndo(`${student.name} deleted`, undoId, () => {
        queryClient.invalidateQueries({ queryKey: ["students-infinite"] });
        queryClient.invalidateQueries({ queryKey: ["students"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      });
      queryClient.invalidateQueries({ queryKey: ["students-infinite"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["student-filter-metadata"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setDeleteDialogOpen(false);
      router.push("/students");
    } catch (err: any) {
      showToast({
        title: "Deletion Failed",
        description: err.message || "Failed to delete student. Please try again.",
        type: "error",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  return {
    activeTab,
    addResultMutation,
    currentYear,
    deleteDialogOpen,
    handleDeleteStudent,
    handleTabChange,
    id,
    isAddResultOpen,
    isDeleting,
    isLoading,
    queryClient,
    resError,
    resExam,
    resMarks,
    resRemarks,
    resYear,
    resultHistory,
    router,
    setDeleteDialogOpen,
    setIsAddResultOpen,
    setResError,
    setResExam,
    setResMarks,
    setResRemarks,
    setResYear,
    student,
  };
}

export type StudentProfileState = ReturnType<typeof useStudentProfile>;
