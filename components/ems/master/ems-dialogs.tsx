"use client";

import { RoomEditorDialog } from "@/components/ems/room-editor-dialog";
import { RoomsManagerDialog } from "@/components/ems/rooms-manager-dialog";
import { MismatchModal } from "@/components/ems/mismatch-modal";
import { getSavedRooms, saveRoom } from "@/lib/ems/room-storage";
import { EmsPrintDialog } from "@/components/ems/print/ems-print-dialog";
import { MissingHsRegistrationDialog } from "@/components/ems/auto-allocation-wizard";
import { StudentRosterDialog } from "@/components/ems/student-roster-dialog";

import type { EmsMasterState } from "./use-ems-master";

export function EmsDialogs({ ems }: { ems: EmsMasterState }) {
  const { activeBlueprintRoomId, editingRoom, editorOpen, generatedAllocation, handleDeleteRoom, handleOpenEditRoom, handleOpenNewRoom, handleProceedWithMismatch, handleSaveRosterExclusions, mismatchModalOpen, mismatchReport, missingHsList, missingHsModalOpen, pendingHsProceedAction, printDialogOpen, rooms, roomsManagerOpen, rosterModalState, setEditorOpen, setMismatchModalOpen, setMissingHsModalOpen, setPendingHsProceedAction, setPrintDialogOpen, setRooms, setRoomsManagerOpen, setRosterModalState } = ems;
  return (
    <>
      {/* Rooms Manager Dialog */}
      <RoomsManagerDialog
        isOpen={roomsManagerOpen}
        onClose={() => setRoomsManagerOpen(false)}
        rooms={rooms}
        onAddNewRoom={handleOpenNewRoom}
        onEditRoom={handleOpenEditRoom}
        onDeleteRoom={handleDeleteRoom}
      />

      {/* Room Editor Dialog */}
      <RoomEditorDialog
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSave={(room) => {
          saveRoom(room);
          const updated = getSavedRooms();
          setRooms(updated);
        }}
        initialRoom={editingRoom}
      />

      {/* Student Roster Dialog for Manual Inclusion / Exclusion */}
      <StudentRosterDialog
        isOpen={rosterModalState.open}
        onClose={() => setRosterModalState((prev) => ({ ...prev, open: false }))}
        title={rosterModalState.title}
        students={rosterModalState.students}
        rollFrom={rosterModalState.rollFrom}
        rollTo={rosterModalState.rollTo}
        regNoFrom={rosterModalState.regNoFrom}
        regNoTo={rosterModalState.regNoTo}
        isHs={rosterModalState.isHs}
        initialExcludedIds={rosterModalState.excludedIds}
        onSave={handleSaveRosterExclusions}
      />

      {/* Mismatch Notification Modal */}
      <MismatchModal
        isOpen={mismatchModalOpen}
        onClose={() => setMismatchModalOpen(false)}
        onProceed={handleProceedWithMismatch}
        report={mismatchReport}
        allowProceedOnError={true}
      />

      {/* Missing HS Board Registration Numbers Warning Dialog */}
      <MissingHsRegistrationDialog
        open={missingHsModalOpen}
        onOpenChange={setMissingHsModalOpen}
        missingStudents={missingHsList}
        onProceed={() => {
          setMissingHsModalOpen(false);
          if (pendingHsProceedAction) {
            const action = pendingHsProceedAction;
            setPendingHsProceedAction(null);
            action();
          }
        }}
      />

      {/* EMS Print Suite Modal */}
      {generatedAllocation && (
        <EmsPrintDialog
          open={printDialogOpen}
          onOpenChange={setPrintDialogOpen}
          allocation={generatedAllocation}
          defaultRoomId={activeBlueprintRoomId || "ALL"}
        />
      )}
    </>
  );
}
