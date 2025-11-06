import { db } from "../../../../auth/firebase_auth";
import { doc, deleteDoc, collection, getDocs } from "firebase/firestore";
import React from "react";
import ReactDOM from "react-dom/client";
import ConfirmDeleteLog from "../../../custom-notification/for-delete-logs/confirmDeleteLog.jsx";

const showConfirmDeleteModal = (message = "Delete this log?") => {
  return new Promise((resolve) => {
    const modalRoot = document.createElement("div");
    document.body.appendChild(modalRoot);

    const root = ReactDOM.createRoot(modalRoot);

    const handleClose = (confirmed) => {
      root.unmount();
      document.body.removeChild(modalRoot);
      resolve(confirmed);
    };

    root.render(
      React.createElement(ConfirmDeleteLog, {
        onClose: handleClose,
        message,
        subText: "This action cannot be undone.",
        confirmText: "Delete",
        cancelText: "Cancel",
      })
    );
  });
};

export const handleDeleteLog = async (id, setLogs) => {
  const confirmed = await showConfirmDeleteModal();
  if (!confirmed) return;

  try {
    await deleteDoc(doc(db, "Alert_logs", id));
    setLogs((prevLogs) => prevLogs.filter((log) => log.id !== id));
    console.log("✅ Log deleted successfully from Firestore");
  } catch (error) {
    console.error("❌ Error deleting log:", error);
    alert("Failed to delete log: " + error.message);
  }
};

// 🚨 New: Delete All Logs
export const handleDeleteAllLogs = async (setLogs) => {
  const confirmed = await showConfirmDeleteModal("Delete ALL logs?");
  if (!confirmed) return;

  try {
    const snapshot = await getDocs(collection(db, "Alert_logs"));
    const batchDeletes = snapshot.docs.map((docSnap) => deleteDoc(doc(db, "Alert_logs", docSnap.id)));
    await Promise.all(batchDeletes);
    setLogs([]);
    console.log("✅ All logs deleted successfully from Firestore");
  } catch (error) {
    console.error("❌ Error deleting all logs:", error);
    alert("Failed to delete all logs: " + error.message);
  }
};
