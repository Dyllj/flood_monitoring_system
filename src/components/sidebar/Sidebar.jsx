import './sidebar.css'
import MDRRMOlogo from '../../assets/MDRRMOlogo.png'

function Sidebar({show}) {
  return (
    <div className={show ? "sidebar active" : "sidebar"}>
      <ul>
        <li>
          <a href="#home">Home</a>
        </li>
        <li>
          <a href="#devices">Devices</a>
        </li>
        <li>
          <a href="#contact-settings">Contact Settings</a>
        </li>
        <li>
          <a href="#logs">Logs</a>
        </li>
      </ul>
      <img src={MDRRMOlogo} alt="MDRRMO Logo" className='logo' />
    </div>
  );
}

export default Sidebar;
