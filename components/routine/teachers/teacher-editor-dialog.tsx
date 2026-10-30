"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TeacherEditorForm } from "./teacher-editor-form";

import type { RoutineTeachersState } from "./use-routine-teachers";

export function TeacherEditorDialog({ rt }: { rt: RoutineTeachersState }) {
  const { activeSectionTab, availSlots, availableClassOptions, availableSubjectOptions, calculateSectionTotalPeriods, classPeriodsMap, classSectionsMap, classSubjectsDictionary, classSubjectsMap, classTeacherFirstPeriods, classTeacherOf, conflictTeacher, currentClassTeacherMap, customPrimarySubject, editingTeacherId, getClassGroupLoad, getClassSections, getGroupPickRows, getSectionGroupLoad, getSectionSubjects, getSubjectAllocationStats, getSubjectPeriod, handleCancel, handleCustomNameChange, handleSave, handleSelectSection, handleStaffDropdownChange, handleSubjectPeriodChange, isEditorOpen, isSubmitting, maxPeriods, presetClasses, primarySubject, sectionSubjectsMap, selectableStaffList, selectedClasses, selectedStaffId, selectedStaffLabel, setActiveSectionTab, setClassTeacherFirstPeriods, setClassTeacherOf, setCustomPrimarySubject, setMaxPeriods, setPreset, setPrimarySubject, setShortName, settings, shortName, staffList, teacherName, toggleAllSubjectsForSection, toggleClass, toggleGroupOption, togglePeriod, toggleSubjectForSection, unaddedStaff } = rt;
  return (
    <Dialog
      open={isEditorOpen}
      onOpenChange={(open) => {
        if (!open) handleCancel();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="max-w-4xl w-[96vw] max-h-[90vh] overflow-y-auto p-4 sm:p-5 rounded-xl bg-card border shadow-xl"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>
            {editingTeacherId && !unaddedStaff.some((s) => s.id === editingTeacherId)
              ? `Edit Faculty: ${teacherName}`
              : "Configure Faculty Member"}
          </DialogTitle>
        </DialogHeader>
        <TeacherEditorForm
          isSubmitting={isSubmitting}
          editingTeacherId={editingTeacherId}
          teacherName={teacherName}
          shortName={shortName}
          primarySubject={primarySubject}
          customPrimarySubject={customPrimarySubject}
          classTeacherOf={classTeacherOf}
          classTeacherFirstPeriods={classTeacherFirstPeriods}
          maxPeriods={maxPeriods}
          selectedClasses={selectedClasses}
          classSubjectsMap={classSubjectsMap}
          sectionSubjectsMap={sectionSubjectsMap}
          classSectionsMap={classSectionsMap}
          classPeriodsMap={classPeriodsMap}
          activeSectionTab={activeSectionTab}
          availSlots={availSlots}
          presetClasses={presetClasses}
          staffList={staffList}
          selectableStaffList={selectableStaffList}
          unaddedStaff={unaddedStaff}
          selectedStaffId={selectedStaffId}
          selectedStaffLabel={selectedStaffLabel}
          availableSubjectOptions={availableSubjectOptions}
          availableClassOptions={availableClassOptions}
          currentClassTeacherMap={currentClassTeacherMap}
          conflictTeacher={conflictTeacher}
          classSubjectsDictionary={classSubjectsDictionary}
          settings={settings}
          onSave={handleSave}
          onCancel={handleCancel}
          onStaffDropdownChange={handleStaffDropdownChange}
          onCustomNameChange={handleCustomNameChange}
          setShortName={setShortName}
          setPrimarySubject={setPrimarySubject}
          setCustomPrimarySubject={setCustomPrimarySubject}
          setClassTeacherOf={setClassTeacherOf}
          setClassTeacherFirstPeriods={setClassTeacherFirstPeriods}
          setMaxPeriods={setMaxPeriods}
          onToggleClass={toggleClass}
          onToggleSubjectForSection={toggleSubjectForSection}
          onToggleAllSubjectsForSection={toggleAllSubjectsForSection}
          onSubjectPeriodChange={handleSubjectPeriodChange}
          onSetActiveSectionTab={(cls, sec) => setActiveSectionTab((prev) => ({ ...prev, [cls]: sec }))}
          onSelectSection={handleSelectSection}
          onTogglePeriod={togglePeriod}
          onSetPreset={setPreset}
          getClassSections={getClassSections}
          getSectionSubjects={getSectionSubjects}
          getSubjectPeriod={getSubjectPeriod}
          getSubjectAllocationStats={getSubjectAllocationStats}
          calculateSectionTotalPeriods={calculateSectionTotalPeriods}
          getSectionGroupLoad={getSectionGroupLoad}
          getGroupPickRows={getGroupPickRows}
          onToggleGroupOption={toggleGroupOption}
          getClassGroupLoad={getClassGroupLoad}
        />
      </DialogContent>
    </Dialog>
  );
}
