// src/components/sidebar_components/Devices_contents/Devices_contents_functions/handleDelete.js

import { doc, deleteDoc } from "firebase/firestore";
import { db } from "../../../../auth/firebase_auth";
import { showDeleteDeviceConfirm } from "./../../../custom-notification/for-delete-device/showConfirmDeleteDevice";

/**
 * handleDelete - Deletes a device from Firestore after user confirmation
 * @param {string} deviceId - The ID of the device to delete
 */
export const handleDelete = async (deviceId) => {
  // Show confirmation modal
  const confirmed = await showDeleteDeviceConfirm({
    message: "Delete this device?",
    subText: "This action cannot be undone. All device data and history will be permanently removed.",
    confirmText: "Delete Device",
    cancelText: "Cancel",
  });

  // If user canceled, exit early
  if (!confirmed) {
    return;
  }

  try {
    // Delete the device document from Firestore
    await deleteDoc(doc(db, "devices", deviceId));
    console.log("✅ Device deleted successfully:", deviceId);
  } catch (error) {
    console.error("❌ Error deleting device:", error);
    throw error; // Re-throw so the calling component can handle the error notification
  }
};