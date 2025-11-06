import { updateDoc, doc } from "firebase/firestore";
import { db } from "./../../../../auth/firebase_auth";

// Updates Firestore record after editing device details
export const handleEditSubmit = async (e, editingDevice, editData, setEditingDevice) => {
  e.preventDefault();
  try {
    await updateDoc(doc(db, "devices", editingDevice), {
      location: editData.location,
      description: editData.description,
      maxHeight: parseInt(editData.maxHeight, 10),
      normalLevel: parseInt(editData.normalLevel, 10),
      alertLevel: parseInt(editData.alertLevel, 10),
      timestamp: new Date(),
    });
    setEditingDevice(null);
    console.log("✅ Device updated successfully");
  } catch (error) {
    console.error("❌ Error updating device:", error);
  }
};
