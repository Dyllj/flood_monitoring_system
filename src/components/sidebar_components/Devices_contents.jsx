import { useState } from "react";
import './sidebar_contents_styles.css';
import { IoIosAdd } from "react-icons/io";
import { ImLocation } from "react-icons/im";
import AddDevice from "../add-forms/Add-device";

const Devices_contents = ({ isAdmin }) => {
  const [showAddDevice, setShowAddDevice] = useState(false);

  return (
    <>
      <div className="devices-contents"></div>

      <div className="devices_contents2">
        <ImLocation />
        <h2>Devices Location</h2>
      </div>

      {/* Only Admin sees Add button */}
      {isAdmin && (
        <button 
          className='add-device-button' 
          onClick={() => setShowAddDevice(true)}
        >
          <IoIosAdd />
        </button>
      )}

      {showAddDevice && (
        <div 
          className="modal-overlay" 
          onClick={() => setShowAddDevice(false)}
        >
          <div 
            className="modal-container" 
            onClick={(e) => e.stopPropagation()}
          >
            <AddDevice onClose={() => setShowAddDevice(false)} />
          </div>
        </div>
      )}
    </>
  );
};

export default Devices_contents;
