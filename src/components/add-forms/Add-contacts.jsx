import "./Forms.css";
import { IoPersonAddSharp } from "react-icons/io5";
import { useState } from "react";
import { db } from "../../auth/firebase_auth"; // ✅ Firestore import
import { collection, addDoc } from "firebase/firestore";
import AddContactSuccess from "../custom-notification/for-add-contact/add-contact-success";
import AddContactFailed from "../custom-notification/for-add-contact/add-contact-failed";

const AddContact = ({ onClose }) => {
  const [loading, setLoading] = useState(false);

  // notification states
  const [showSuccess, setShowSuccess] = useState(false);
  const [showFailed, setShowFailed] = useState(false);
  const [failedMsg, setFailedMsg] = useState({ message: "", subText: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const contactName = e.target.contactName.value.trim();
    const homeAddress = e.target.homeAddress.value.trim();
    const position = e.target.position.value.trim();
    const phoneNumber = e.target.phoneNumber.value.trim();

    if (!contactName || !homeAddress || !position || !phoneNumber) {
      setFailedMsg({
        message: "Missing required fields",
        subText: "Please fill in all fields.",
      });
      setShowFailed(true);
      return;
    }

    try {
      setLoading(true);

      // ✅ Add new document to Firestore
      await addDoc(collection(db, "Authorized_personnel"), {
        Contact_name: contactName,
        Home_address: homeAddress,
        Position: position,
        Phone_number: phoneNumber,
        createdAt: new Date(),
      });

      // success notification
      setShowSuccess(true);
      e.target.reset();

      // close modal after short delay so user sees the notification
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error("Error adding contact:", error);
      setFailedMsg({
        message: "Failed to add contact",
        subText: error?.message || "Please try again.",
      });
      setShowFailed(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="add-contact-title">
        <IoPersonAddSharp />
        <h2>Add New Contact</h2>
      </div>

      <div className="add-contact-form">
        <form onSubmit={handleSubmit}>
          <label id="label1">
            Contact Name:
            <input type="text" name="contactName" placeholder="Must not be blank" required />
          </label>

          <label>
            Home Address:
            <input type="text" name="homeAddress" placeholder="Must not be blank" required />
          </label>

          <label>
            Position:
            <input type="text" name="position" placeholder="Must not be blank" required />
          </label>

          <label>
            Phone Number:
            <input type="text" name="phoneNumber" placeholder="Must not be blank" required />
          </label>

          <div className="contacts-buttons" id="contacts-buttons">
            <button type="submit" id="add-contact" disabled={loading}>
              {loading ? "Adding..." : "Add Contact"}
            </button>
            <button type="button" id="close-button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>

      {/* notification root (fixed) */}
      <div
        style={{
          position: "fixed",
          top: 18,
          right: 18,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
        aria-live="polite"
      >
        {showSuccess && (
          <AddContactSuccess
            message="Contact added successfully"
            subText="Contact stored in Firestore"
            duration={4000}
            onClose={() => setShowSuccess(false)}
          />
        )}

        {showFailed && (
          <AddContactFailed
            message={failedMsg.message}
            subText={failedMsg.subText}
            duration={4500}
            onClose={() => setShowFailed(false)}
          />
        )}
      </div>
    </div>
  );
};

export default AddContact;
