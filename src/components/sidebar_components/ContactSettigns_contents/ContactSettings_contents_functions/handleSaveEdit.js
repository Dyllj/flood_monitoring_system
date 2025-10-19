// src/components/ContactSettings_contents/ContactSettings_contents_functions/handleSaveEdit.js
import { doc, updateDoc } from "firebase/firestore";
import { db } from "./../../../../auth/firebase_auth";

/**
 * Save edited contact to Firestore
 */
export const handleSaveEdit = async (editingContact, editData, setEditingContact) => {
  if (!editingContact) return;

  try {
    const contactRef = doc(db, "Authorized_personnel", editingContact.id);
    await updateDoc(contactRef, {
      Contact_name: editData.Contact_name,
      Home_address: editData.Home_address,
      Position: editData.Position,
      Phone_number: editData.Phone_number,
    });
    setEditingContact(null);
    console.log("Contact updated successfully");
  } catch (error) {
    console.error("Error updating contact:", error);
    alert("Failed to update contact.");
  }
};
