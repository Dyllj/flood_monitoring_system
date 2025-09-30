import './sidebar.css'
import MDRRMOlogo from '../../assets/MDRRMOlogo.png'
import { Link } from 'react-router-dom'

function Sidebar({ show, onClose, isAdmin }) {
  const handleLinkClick = () => {
    if (onClose) onClose();
  };

  return (
    <div className={show ? "sidebar active" : "sidebar"}>
      <ul>
        <li><Link to="/Home_contents" onClick={handleLinkClick}>Home</Link></li>
        <li><Link to="/Devices_contents" onClick={handleLinkClick}>Devices</Link></li>

        {/* Only visible for Admin */}
        {isAdmin && (
          <>
            <li><Link to="/ContactSettings_contents" onClick={handleLinkClick}>Contact Settings</Link></li>
            <li><Link to="/Logs_contents" onClick={handleLinkClick}>Logs</Link></li>
          </>
        )}
      </ul>
      <img src={MDRRMOlogo} alt="MDRRMO Logo" className='logo' />
    </div>
  );
}

export default Sidebar;
