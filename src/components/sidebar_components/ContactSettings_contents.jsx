import './sidebar_contents_styles.css'
import { IoIosAdd } from "react-icons/io";
import { RiContactsFill } from "react-icons/ri";
const ContactSettings_contents = () => {
  return (
    <>
      <div className="contactsettings-contents">
      </div>
      <div className="contactsettings_contents2">
        <RiContactsFill />
        <h2>Contact Settings</h2>
      </div>
      <button className='add-contact-button'>
        <IoIosAdd />
      </button>
    </>
  );
};

export default ContactSettings_contents;
