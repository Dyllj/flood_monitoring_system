// src/components/ContactSettings_contents/ContactSettings_contents.jsx
import { useState, useEffect } from "react";
import "../sidebar_contents_styles.css";
import { IoIosAdd } from "react-icons/io";
import { RiContactsFill } from "react-icons/ri";
import { IoMdSearch } from "react-icons/io";
import AddContact from "../../add-forms/Add-contacts";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../../../auth/firebase_auth";

// Icons for Edit/Delete
import { IoSettingsOutline } from "react-icons/io5";
import { MdDeleteOutline } from "react-icons/md";

// ✅ Import separated functions
import { handleDeleteContact } from "./ContactSettings_contents_functions/handleDeleteContact";
import { handleOpenEditModal } from "./ContactSettings_contents_functions/handleOpenEditModal";
import { handleSaveEdit } from "./ContactSettings_contents_functions/handleSaveEdit";

const ContactSettings_contents = () => {
  const [showAddContact, setShowAddContact] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [editingContact, setEditingContact] = useState(null);
  const [editData, setEditData] = useState({
    Contact_name: "",
    Home_address: "",
    Position: "",
    Phone_number: "",
  });
  const [searchInput, setSearchInput] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "Authorized_personnel"),
      orderBy("createdAt", "desc")
    );

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

    return () => unsubscribe();
  }, []);

  const filteredContacts = contacts.filter((contact) => {
    const lowerInput = searchInput.toLowerCase();
    return (
      contact.Contact_name.toLowerCase().includes(lowerInput) ||
      contact.Home_address.toLowerCase().includes(lowerInput) ||
      contact.Position.toLowerCase().includes(lowerInput) ||
      contact.Phone_number.toLowerCase().includes(lowerInput)
    );
  });

  return (
    <>
      <div className="contactsettings-contents"></div>

      {/* Header */}
      <div className="contactsettings_contents2">
        <RiContactsFill />
        <h2>Contact Settings</h2>
      </div>

      {/* Add Contact Button */}
      <button className="add-contact-button" onClick={() => setShowAddContact(true)}>
        <IoIosAdd />
      </button>

      {/* Contacts Table + Search Bar */}
      <div className="contacts-table-container">
        {/* Search Bar */}
        <div className="search-container">
          <IoMdSearch
            className={`search-icon ${isSearchFocused ? "icon-right" : "icon-left"}`}
          />
          <input
            type="text"
            placeholder="Search contact..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
        </div>

        {/* Table */}
        {filteredContacts.length > 0 ? (
          <table className="contacts-table">
            <thead>
              <tr>
                <th>Contact Name</th>
                <th>Home Address</th>
                <th>Position</th>
                <th>Phone Number</th>
                <th>Date Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredContacts.map((contact) => (
                <tr key={contact.id}>
                  <td>{contact.Contact_name}</td>
                  <td>{contact.Home_address}</td>
                  <td>{contact.Position}</td>
                  <td>{contact.Phone_number}</td>
                  <td>
                    {contact.createdAt
                      ? new Date(contact.createdAt.seconds * 1000).toLocaleString()
                      : "—"}
                  </td>
                  <td className="unique-contact-actions-cell">
                    <button
                      className="unique-edit-btn"
                      onClick={() =>
                        handleOpenEditModal(contact, setEditingContact, setEditData)
                      }
                    >
                      <IoSettingsOutline />
                    </button>
                    <button
                      className="unique-delete-btn"
                      onClick={() =>
                        handleDeleteContact(contact.id, contacts, setContacts)
                      }
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

      {/* Add Contact Modal */}
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

      {/* Edit Contact Modal */}
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
              onChange={(e) =>
                setEditData({ ...editData, Contact_name: e.target.value })
              }
            />

            <label>Home Address:</label>
            <input
              type="text"
              value={editData.Home_address}
              onChange={(e) =>
                setEditData({ ...editData, Home_address: e.target.value })
              }
            />

            <label>Position:</label>
            <input
              type="text"
              value={editData.Position}
              onChange={(e) =>
                setEditData({ ...editData, Position: e.target.value })
              }
            />

            <label>Phone Number:</label>
            <input
              type="text"
              value={editData.Phone_number}
              onChange={(e) =>
                setEditData({ ...editData, Phone_number: e.target.value })
              }
            />

            <div className="unique-edit-modal-actions">
              <button
                onClick={() =>
                  handleSaveEdit(editingContact, editData, setEditingContact)
                }
                className="unique-save-btn"
              >
                Save
              </button>
              <button
                onClick={() => setEditingContact(null)}
                className="unique-cancel-btn"
              >
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
