import { useState } from "react";
import './sidebar_contents_styles.css'
import { IoIosAdd } from "react-icons/io";
import { RiContactsFill } from "react-icons/ri";
import AddContact from "../add-forms/Add-contacts";

const ContactSettings_contents = () => {
  const [showAddContact, setShowAddContact] = useState(false);
  return (
    <>
      <div className="contactsettings-contents">
      </div>
      <div className="contactsettings_contents2">
        <RiContactsFill />
        <h2>Contact Settings</h2>
      </div>
      <button className='add-contact-button'
      onClick={() => setShowAddContact(true)}
      >
        <IoIosAdd />
      </button>

      {showAddContact && (
        <div
          className="modal-overlay" id="modal-overlay-contacts"
          onClick={() => setShowAddContact(false)}
        >
          <div
            className="modal-container" id="modal-container-contacts"
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
