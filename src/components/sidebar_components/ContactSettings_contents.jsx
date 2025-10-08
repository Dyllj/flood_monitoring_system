import { useState, useEffect } from "react";
import "./sidebar_contents_styles.css";
import { IoIosAdd } from "react-icons/io";
import { RiContactsFill } from "react-icons/ri";
import AddContact from "../add-forms/Add-contacts";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../auth/firebase_auth";

// ✅ Icons for Edit/Delete
import { IoSettingsOutline } from "react-icons/io5";
import { MdDeleteOutline } from "react-icons/md";

const ContactSettings_contents = () => {
  const [showAddContact, setShowAddContact] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [editingContact, setEditingContact] = useState(null); // contact being edited
  const [editData, setEditData] = useState({
    Contact_name: "",
    Home_address: "",
    Telegram_ID: "",
    Phone_number: "",
  });

  // ✅ Real-time listener for Firestore collection
  useEffect(() => {
    const q = query(collection(db, "Authorized_personnel"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const contactList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setContacts(contactList);
      },
      (error) => {
        console.error("Error fetching contacts:", error);
        alert("Failed to load contacts. Check console for details.");
      }
    );

    // ✅ Cleanup Firestore listener
    return () => unsubscribe();
  }, []);

  // ✅ Delete Contact
  const handleDeleteContact = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this contact?");
    if (!confirmDelete) return;
    try {
      await deleteDoc(doc(db, "Authorized_personnel", id));
      setContacts((prev) => prev.filter((contact) => contact.id !== id));
      console.log("Contact deleted successfully:", id);
    } catch (error) {
      console.error("Error deleting contact:", error);
      alert("Failed to delete contact.");
    }
  };

  // ✅ Open Edit Modal
  const handleOpenEditModal = (contact) => {
    setEditingContact(contact);
    setEditData({
      Contact_name: contact.Contact_name,
      Home_address: contact.Home_address,
      Telegram_ID: contact.Telegram_ID,
      Phone_number: contact.Phone_number,
    });
  };

  // ✅ Save Edited Contact
  const handleSaveEdit = async () => {
    if (!editingContact) return;

    try {
      const contactRef = doc(db, "Authorized_personnel", editingContact.id);
      await updateDoc(contactRef, {
        Contact_name: editData.Contact_name,
        Home_address: editData.Home_address,
        Telegram_ID: editData.Telegram_ID,
        Phone_number: editData.Phone_number,
      });
      setEditingContact(null); // close modal
      console.log("Contact updated successfully");
    } catch (error) {
      console.error("Error updating contact:", error);
      alert("Failed to update contact.");
    }
  };

  return (
    <>
      {/* ✅ Background div */}
      <div className="contactsettings-contents"></div>

      <div className="contactsettings_contents2">
        <RiContactsFill />
        <h2>Contact Settings</h2>
      </div>

      <button
        className="add-contact-button"
        onClick={() => setShowAddContact(true)}
      >
        <IoIosAdd />
      </button>

      <div className="contacts-table-container">
        {contacts.length > 0 ? (
          <table className="contacts-table">
            <thead>
              <tr>
                <th>Contact Name</th>
                <th>Home Address</th>
                <th>Telegram ID</th>
                <th>Phone Number</th>
                <th>Date Created</th>
                <th>Actions</th> {/* ✅ Added actions column */}
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id}>
                  <td>{contact.Contact_name}</td>
                  <td>{contact.Home_address}</td>
                  <td>{contact.Telegram_ID}</td>
                  <td>{contact.Phone_number}</td>
                  <td>
                    {contact.createdAt
                      ? new Date(contact.createdAt.seconds * 1000).toLocaleString()
                      : "—"}
                  </td>
                  <td className="unique-contact-actions-cell">
                    <button
                      className="unique-edit-btn"
                      onClick={() => handleOpenEditModal(contact)}
                    >
                      <IoSettingsOutline />
                    </button>
                    <button
                      className="unique-delete-btn"
                      onClick={() => handleDeleteContact(contact.id)}
                    >
                      <MdDeleteOutline />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="no-contacts-msg">No contacts found.</p>
        )}
      </div>

      {/* ✅ Modal for Adding Contact */}
      {showAddContact && (
        <div
          className="modal-overlay"
          id="modal-overlay-contacts"
          onClick={() => setShowAddContact(false)}
        >
          <div
            className="modal-container"
            id="modal-container-contacts"
            onClick={(e) => e.stopPropagation()}
          >
            <AddContact onClose={() => setShowAddContact(false)} />
          </div>
        </div>
      )}

      {/* ✅ Modal for Editing Contact */}
      {editingContact && (
        <div
          className="modal-overlay unique-edit-modal-overlay"
          onClick={() => setEditingContact(null)}
        >
          <div
            className="modal-container unique-edit-modal-container"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Edit Contact</h3>

            <label>Contact Name:</label>
            <input
              type="text"
              value={editData.Contact_name}
              onChange={(e) => setEditData({ ...editData, Contact_name: e.target.value })}
            />

            <label>Home Address:</label>
            <input
              type="text"
              value={editData.Home_address}
              onChange={(e) => setEditData({ ...editData, Home_address: e.target.value })}
            />

            <label>Telegram ID:</label>
            <input
              type="text"
              value={editData.Telegram_ID}
              onChange={(e) => setEditData({ ...editData, Telegram_ID: e.target.value })}
            />

            <label>Phone Number:</label>
            <input
              type="text"
              value={editData.Phone_number}
              onChange={(e) => setEditData({ ...editData, Phone_number: e.target.value })}
            />

            <div className="unique-edit-modal-actions">
              <button onClick={handleSaveEdit} className="unique-save-btn">
                Save
              </button>
              <button onClick={() => setEditingContact(null)} className="unique-cancel-btn">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ContactSettings_contents;
