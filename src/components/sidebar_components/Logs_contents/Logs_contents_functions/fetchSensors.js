import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../auth/firebase_auth";

export const fetchSensors = async (setSensorsList) => {
  const devicesRef = collection(db, "devices");
  const snapshot = await getDocs(devicesRef);
  const sensors = snapshot.docs.map((doc) => doc.data().sensorName || doc.id);
  setSensorsList(sensors);
};
