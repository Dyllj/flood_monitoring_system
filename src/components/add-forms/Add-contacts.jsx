import "./Forms.css";
import { IoPersonAddSharp } from "react-icons/io5";
import { useState } from "react";
import { db } from "../../auth/firebase_auth"; // ✅ Firestore import
import { collection, addDoc } from "firebase/firestore";

const AddContact = ({ onClose }) => {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const contactName = e.target.contactName.value.trim();
    const homeAddress = e.target.homeAddress.value.trim();
    const position = e.target.position.value.trim();
    const phoneNumber = e.target.phoneNumber.value.trim();

    if (!contactName || !homeAddress || !position || !phoneNumber) {
      alert("Please fill in all fields.");
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

      alert("Contact added successfully!");
      e.target.reset();
      onClose();

    } catch (error) {
      console.error("Error adding contact:", error);
      alert("Failed to add contact. Please try again.");
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
    </div>
  );
};

export default AddContact;
