import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Read .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");

const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

if (!urlMatch || !keyMatch) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabaseUrl = urlMatch[1].trim();
const supabaseKey = keyMatch[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function restoreClass10Students() {
  console.log("=== Restoring Class 10 Students to Active Continuing Status ===");

  // 1. Fetch all Class 10 students
  const { data: students, error: fetchErr } = await supabase
    .from("students")
    .select("id, name, school_id, present_class, present_roll, previous_roll_no, current_status, detention_count")
    .eq("present_class", "X");

  if (fetchErr) {
    console.error("Error fetching students:", fetchErr);
    process.exit(1);
  }

  console.log(`Found ${students.length} students in Class X.`);

  if (students.length !== 318) {
    console.warn(`Warning: Expected 318 students, found ${students.length}`);
  }

  // 2. Delete the duplicate academic_history records created on 2026-09-26
  const { data: duplicateHist, error: histFetchErr } = await supabase
    .from("academic_history")
    .select("id")
    .eq("class", "X")
    .gte("created_at", "2026-09-26T17:50:00")
    .lte("created_at", "2026-09-26T18:00:00");

  if (histFetchErr) {
    console.error("Error finding duplicate history records:", histFetchErr);
    process.exit(1);
  }

  console.log(`Found ${duplicateHist.length} duplicate history entries created on 2026-09-26.`);

  if (duplicateHist.length > 0) {
    const idsToDelete = duplicateHist.map((h) => h.id);
    // Delete in batches of 100
    for (let i = 0; i < idsToDelete.length; i += 100) {
      const chunk = idsToDelete.slice(i, i + 100);
      const { error: delErr } = await supabase
        .from("academic_history")
        .delete()
        .in("id", chunk);

      if (delErr) {
        console.error("Error deleting history chunk:", delErr);
      } else {
        console.log(`Deleted history records ${i + 1} - ${i + chunk.length}`);
      }
    }
  }

  // 3. Update each student:
  // - current_status = 'Continuing'
  // - detention_count = 0
  // - present_roll = previous_roll_no
  // - re_admission_status = 'pending'
  let updatedCount = 0;
  const BATCH_SIZE = 25;

  for (let i = 0; i < students.length; i += BATCH_SIZE) {
    const chunk = students.slice(i, i + BATCH_SIZE);
    await Promise.all(
      chunk.map(async (s) => {
        const originalRoll = s.previous_roll_no || s.present_roll;
        const { error: updateErr } = await supabase
          .from("students")
          .update({
            current_status: "Continuing",
            detention_count: 0,
            present_roll: originalRoll,
            re_admission_status: "pending",
          })
          .eq("id", s.id);

        if (updateErr) {
          console.error(`Error updating student ${s.name} (${s.id}):`, updateErr.message);
        } else {
          updatedCount++;
        }
      })
    );
    console.log(`Updated students batch: ${Math.min(i + BATCH_SIZE, students.length)} / ${students.length}`);
  }

  console.log(`\nSuccessfully updated ${updatedCount} out of ${students.length} Class 10 students.`);

  // 4. Verification check
  const { data: verifyStudents, error: verifyErr } = await supabase
    .from("students")
    .select("present_class, current_status, detention_count")
    .eq("present_class", "X");

  if (verifyErr) {
    console.error("Verification query error:", verifyErr);
  } else {
    const statusMap = {};
    for (const s of verifyStudents) {
      const k = `${s.present_class} | ${s.current_status} | det=${s.detention_count}`;
      statusMap[k] = (statusMap[k] || 0) + 1;
    }
    console.log("\nClass X status verification:", statusMap);
  }
}

restoreClass10Students()
  .then(() => {
    console.log("=== Restoration Complete ===");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
