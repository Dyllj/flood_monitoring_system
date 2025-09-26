import "./Forms.css";
import { MdOutlineSensors } from "react-icons/md";

const AddDevice = ({ onClose }) => {
  return (
    <div>
      <div className="add-device-title">
        <MdOutlineSensors />
        <h2>Add New Device</h2>
      </div>
        <div className="add-device-form">
          <form>
            <label id="label1">
              Device Name:
              <input type="text" name="deviceName" placeholder="Must not be blank" required/>
            </label>
            <label>
              Device Location:
              <input type="text" name="deviceLocation" placeholder="Must not be blank" required />
            </label>
            <div className="devices-buttons">
              <button type="submit" id="add-device">Add Device</button>
              <button type="button" id="close-button" onClick={onClose}>Cancel</button>
            </div>

          </form>
        </div>
    </div>
  );
};

export default AddDevice;
