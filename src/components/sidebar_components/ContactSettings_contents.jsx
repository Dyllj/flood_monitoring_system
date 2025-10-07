import { useState, useEffect } from "react";
import "./sidebar_contents_styles.css";
import { IoIosAdd } from "react-icons/io";
import { RiContactsFill } from "react-icons/ri";
import AddContact from "../add-forms/Add-contacts";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../../auth/firebase_auth";

const ContactSettings_contents = () => {
  const [showAddContact, setShowAddContact] = useState(false);
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    // ✅ Create a Firestore query ordered by creation date
    const q = query(collection(db, "Authorized_personnel"), orderBy("createdAt", "desc"));

    // ✅ Real-time listener for Firestore collection
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

    // ✅ Cleanup function to prevent memory leaks
    return () => unsubscribe();
  }, []);

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
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="no-contacts-msg">No contacts found.</p>
        )}
      </div>

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
    </>
  );
};

export default ContactSettings_contents;
