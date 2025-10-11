import { deleteDoc, doc } from "firebase/firestore";
import { db } from "./../../../../auth/firebase_auth";

export const handleDelete = async (id) => {
  try {
    await deleteDoc(doc(db, "devices", id));
    console.log("Device deleted successfully");
  } catch (error) {
    console.error("Error deleting device:", error);
  }
};
