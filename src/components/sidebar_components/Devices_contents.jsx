import './sidebar_contents_styles.css'
import { IoIosAdd } from "react-icons/io";
import { ImLocation } from "react-icons/im";

const Devices_contents = () => {
  return (
    <>
      <div className="devices-contents">
      </div>
      <div className="devices_contents2">
        <ImLocation />
        <h2>Devices Location</h2>
      </div>
      <button className='add-device-button'>
        <IoIosAdd />
      </button>
    </>
  );
};

export default Devices_contents;
