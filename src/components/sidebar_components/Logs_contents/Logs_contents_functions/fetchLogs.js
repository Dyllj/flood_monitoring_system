import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../../../auth/firebase_auth";

export const fetchLogs = async (setLogs) => {
  try {
    const logsRef = collection(db, "Alert_logs");
    const q = query(logsRef, orderBy("timestamp", "desc"));
    const snapshot = await getDocs(q);
    const logsData = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setLogs(logsData);
  } catch (error) {
    console.error("Error fetching logs:", error);
  }
};
