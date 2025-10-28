// src/components/ContactSettings_contents/ContactSettings_contents_functions/handleDeleteContact.js
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "./../../../../auth/firebase_auth";
// programmatic confirm helper
import { showDeleteConfirm } from "../../../custom-notification/for-add-contact/showDeleteConfirm";

/**
 * Delete a contact from Firestore and update local state
 */
export const handleDeleteContact = async (id, contacts, setContacts) => {
  const confirmed = await showDeleteConfirm({
    message: "Delete this contact?",
    subText: "This action cannot be undone.",
    confirmText: "Delete",
    cancelText: "Cancel",
  });
  if (!confirmed) return;

  try {
    await deleteDoc(doc(db, "Authorized_personnel", id));
    setContacts(contacts.filter((contact) => contact.id !== id));
    console.log("Contact deleted successfully:", id);
  } catch (error) {
    console.error("Error deleting contact:", error);
    alert("Failed to delete contact.");
  }
};
