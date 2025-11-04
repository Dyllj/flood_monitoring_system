import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../../../auth/firebase_auth";

export const fetchLogs = async (setLogs) => {
  try {
    const logsRef = collection(db, "Alert_logs");
    const q = query(logsRef, orderBy("timestamp", "desc"));
    const snapshot = await getDocs(q);

    const logsData = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // ✅ convert Firestore timestamp to JS milliseconds
        timestamp: data.timestamp?.toDate ? data.timestamp.toDate().getTime() : data.timestamp
      };
    });

    setLogs(logsData);
  } catch (error) {
    console.error("Error fetching logs:", error);
  }
};
