import './sidebar.css'
import MDRRMOlogo from '../../assets/MDRRMOlogo.png'
import { Link } from 'react-router-dom'

function Sidebar({show}) {
  return (
    <div className={show ? "sidebar active" : "sidebar"}>
      <ul>
        <li>
          <Link to="/Home_contents">Home</Link>
        </li>
        <li>
          <Link to="/Devices_contents">Devices</Link>
        </li>
        <li>
          <Link to="/ContactSettings_contents">Contact Settings</Link>
        </li>
        <li>
          <Link to="/Logs_contents">Logs</Link>
        </li>
      </ul>
      <img src={MDRRMOlogo} alt="MDRRMO Logo" className='logo' />
    </div>
  );
}

export default Sidebar;
