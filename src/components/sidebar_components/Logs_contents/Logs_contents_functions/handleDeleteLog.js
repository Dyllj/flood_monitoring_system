// ================================
// 🗑️ handleDeleteLog.js
// Purpose: Handles deleting a log entry from Firestore using ConfirmDeleteLog modal
// ================================

import { db } from "../../../../auth/firebase_auth";
import { doc, deleteDoc } from "firebase/firestore";
import React from "react";
import ReactDOM from "react-dom/client"; // ✅ Use createRoot for React 18+
import ConfirmDeleteLog from "../../../custom-notification/for-delete-logs/confirmDeleteLog.jsx";

/**
 * Helper function that shows ConfirmDeleteLog modal
 * Returns a Promise<boolean> that resolves to true if confirmed
 */
const showConfirmDeleteModal = () => {
  return new Promise((resolve) => {
    const modalRoot = document.createElement("div");
    document.body.appendChild(modalRoot);

    // ✅ Use React 18 createRoot
    const root = ReactDOM.createRoot(modalRoot);

    const handleClose = (confirmed) => {
      root.unmount();
      document.body.removeChild(modalRoot);
      resolve(confirmed);
    };

    root.render(
    React.createElement(ConfirmDeleteLog, {
        onClose: handleClose,
        message: "Delete this log?",
        subText: "This action cannot be undone.",
        confirmText: "Delete",
        cancelText: "Cancel",
    })
    );
  });
};

/**
 * Deletes a log from Firestore after confirmation.
 * @param {string} id - Firestore document ID
 * @param {Function} setLogs - React state setter to update UI
 */
export const handleDeleteLog = async (id, setLogs) => {
  // 🚫 Remove window.confirm completely
  const confirmed = await showConfirmDeleteModal();
  if (!confirmed) return; // User clicked cancel or closed modal

  try {
    await deleteDoc(doc(db, "Alert_logs", id));
    setLogs((prevLogs) => prevLogs.filter((log) => log.id !== id));
    console.log("✅ Log deleted successfully from Firestore");
  } catch (error) {
    console.error("❌ Error deleting log:", error);
    alert("Failed to delete log: " + error.message);
  }
};
