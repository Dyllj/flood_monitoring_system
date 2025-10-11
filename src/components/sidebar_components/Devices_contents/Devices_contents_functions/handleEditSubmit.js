import { updateDoc, doc } from "firebase/firestore";
import { db } from "./../../../../auth/firebase_auth";

export const handleEditSubmit = async (
  e,
  editingDevice,
  editData,
  setEditingDevice
) => {
  e.preventDefault();
  try {
    await updateDoc(doc(db, "devices", editingDevice), {
      name: editData.name,
      location: editData.location,
      description: editData.description,
    });
    setEditingDevice(null);
    console.log("Device updated successfully");
  } catch (error) {
    console.error("Error updating device:", error);
  }
};
