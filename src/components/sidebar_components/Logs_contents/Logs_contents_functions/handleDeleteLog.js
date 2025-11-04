// ================================
// 🗑️ handleDeleteLog.js
// Purpose: Handles deleting a log entry from Firestore
// ================================

import { db } from "../../../../auth/firebase_auth";
import { doc, deleteDoc } from "firebase/firestore";

/**
 * Deletes a log from the Firestore database and updates local state.
 * @param {string} id - The Firestore document ID to delete
 * @param {Function} setLogs - React state setter to update UI after deletion
 */
export const handleDeleteLog = async (id, setLogs) => {
  if (!window.confirm("Are you sure you want to delete this log?")) return;

  try {
    await deleteDoc(doc(db, "Flood_Logs", id)); // 🗑️ Adjust collection name if needed
    setLogs((prevLogs) => prevLogs.filter((log) => log.id !== id));
    console.log("✅ Log deleted successfully");
  } catch (error) {
    console.error("❌ Error deleting log:", error);
  }
};
