import './App.css'
import Sidebar from './components/sidebar/Sidebar'
import { RxHamburgerMenu } from "react-icons/rx";
import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home_contents from './components/sidebar_components/Home_contents';
import Devices_contents from './components/sidebar_components/Devices_contents';
import ContactSettings_contents from "./components/sidebar_components/ContactSettings_contents";
import Logs_contents from './components/sidebar_components/Logs_contents';
import LoginForm from './components/login/Login-form';
import { FiLogIn } from "react-icons/fi";

function App() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const handleAuthClick = () => {
    if (isAdmin) {
      setIsAdmin(false);
      setShowLogin(false);
    } else {
      setShowLogin(true);
    }
  };

  return (
    <Router>
      <header className="app-header">
        <RxHamburgerMenu onClick={() => setSidebarOpen(!isSidebarOpen)} />
        <h1>Flood Monitoring System</h1>
        <button className="login" onClick={handleAuthClick}>
          <h2>{isAdmin ? "Logout" : "Login"}</h2>
          <FiLogIn />
        </button>
      </header>

      <Sidebar show={isSidebarOpen} onClose={() => setSidebarOpen(false)} isAdmin={isAdmin} />

      <div className="main">
        <Routes>
          <Route path="/" element={<Navigate to="/Home_contents" replace />} />
          <Route path="/Home_contents" element={<Home_contents />} />
          <Route path="/Devices_contents" element={<Devices_contents isAdmin={isAdmin} />} />

          {isAdmin && (
            <>
              <Route path="/ContactSettings_contents" element={<ContactSettings_contents />} />
              <Route path="/Logs_contents" element={<Logs_contents />} />
            </>
          )}
        </Routes>
      </div>

      {showLogin && (
        <div className="modal-overlay" id="modal-overlay-login" onClick={() => setShowLogin(false)}>
          <div
            className="modal-container"
            id="modal-container-login"
            onClick={(e) => e.stopPropagation()}
          >
            <LoginForm onClose={() => setShowLogin(false)} setIsAdmin={setIsAdmin} />
          </div>
        </div>
      )}
    </Router>
  );
}

export default App;
