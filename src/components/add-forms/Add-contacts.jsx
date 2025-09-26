import "./Forms.css";
import { IoPersonAddSharp } from "react-icons/io5";

const AddContact = ({ onClose }) => {
  return (
    <div>
      <div className="add-contact-title">
        <IoPersonAddSharp />
        <h2>Add New Contact</h2>
      </div>
        <div className="add-contact-form">
          <form>
            <label id="label1">
              Contact Name:
              <input type="text" name="contactName" placeholder="Must not be blank" required/>
            </label>
            <label>
              Home Address:
              <input type="text" name="homeAddress" placeholder="Must not be blank" required />
            </label>
            <label>
              Telegram ID:
              <input type="text" name="telegramId" placeholder="Must not be blank" required />
            </label>
            <label>
              Phone Number:
              <input type="text" name="phoneNumber" placeholder="Must not be blank" required />
            </label>
            <div className="contacts-buttons" id="contacts-buttons">
              <button type="submit" id="add-contact">Add Contact</button>
              <button type="button" id="close-button" onClick={onClose}>Cancel</button>
            </div>
          </form>
        </div>
    </div>
  );
};

export default AddContact;
