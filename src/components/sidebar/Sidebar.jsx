import Home from "../sidebar_components/Home";
import Devices from "../sidebar_components/Devices";
import Contact_settings from "../sidebar_components/Contact_settings";
import Logs from "../sidebar_components/Logs";
function Sidebar() {
  return (
    <div className="sidebar">
        <Home/>
        <Devices/>
        <Contact_settings/>
        <Logs/>
    </div>
  );
}

export default Sidebar;
