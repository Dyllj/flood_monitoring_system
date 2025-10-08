import { useState, useEffect } from "react";
import "./sidebar_contents_styles.css";
import { IoIosAdd } from "react-icons/io";
import { RiContactsFill } from "react-icons/ri";
import { MdEdit, MdDelete, MdOutlineNotificationsActive } from "react-icons/md";
import AddContact from "../add-forms/Add-contacts";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../../auth/firebase_auth";

const ContactSettings_contents = () => {
  const [showAddContact, setShowAddContact] = useState(false);
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    // ✅ Create Firestore query to listen in real time
    const q = query(
      collection(db, "Authorized_personnel"),
      orderBy("createdAt", "desc")
    );

    // ✅ Real-time listener
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const updatedContacts = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setContacts(updatedContacts);
      },
      (error) => {
        console.error("Error fetching contacts:", error);
        alert("Failed to load contacts. Check console for details.");
      }
    );

    // ✅ Cleanup listener on unmount (prevents memory leaks)
    return () => {
      unsubscribe();
      console.log("Firestore listener for contacts removed.");
    };
  }, []); // Runs once on mount

  return (
    <>
      {/* ✅ Background */}
      <div className="contactsettings-contents"></div>

      <div className="contactsettings_contents2">
        <RiContactsFill />
        <h2>Contact Settings</h2>
      </div>

      {/* ✅ Add contact button */}
      <button
        className="add-contact-button"
        onClick={() => setShowAddContact(true)}
      >
        <IoIosAdd />
      </button>

      {/* ✅ Contacts table */}
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
                <th>Actions</th>
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
                  <td className="action-buttons">
                    <button
                      id={`notify-btn-${contact.id}`}
                      className="notify-btn"
                      title="Send Notification"
                    >
                      <MdOutlineNotificationsActive />
                    </button>
                    <button
                      id={`edit-btn-${contact.id}`}
                      className="edit-btn"
                      title="Edit Contact"
                    >
                      <MdEdit />
                    </button>
                    <button
                      id={`delete-btn-${contact.id}`}
                      className="delete-btn"
                      title="Delete Contact"
                    >
                      <MdDelete />
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

      {/* ✅ Modal for editing contact */}
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
            <div className="modal-content">
              <h3>Edit Contact Information</h3>
              <form className="edit-contact-form">
                <label htmlFor="contact-name">Contact Name</label>
                <input
                  type="text"
                  id="contact-name"
                  name="contact-name"
                  placeholder="Enter contact name"
                />

                <label htmlFor="home-address">Home Address</label>
                <input
                  type="text"
                  id="home-address"
                  name="home-address"
                  placeholder="Enter home address"
                />

                <label htmlFor="telegram-id">Telegram ID</label>
                <input
                  type="text"
                  id="telegram-id"
                  name="telegram-id"
                  placeholder="Enter Telegram ID"
                />

                <label htmlFor="phone-number">Phone Number</label>
                <input
                  type="text"
                  id="phone-number"
                  name="phone-number"
                  placeholder="Enter phone number"
                />

                <div className="modal-actions">
                  <button type="submit" id="save-contact-btn">
                    Save
                  </button>
                  <button
                    type="button"
                    id="cancel-contact-btn"
                    onClick={() => setShowAddContact(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ContactSettings_contents;
