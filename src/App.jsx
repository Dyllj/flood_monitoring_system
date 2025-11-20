import './App.css'
import Sidebar from './components/sidebar/Sidebar'
import { RxHamburgerMenu } from "react-icons/rx";
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home_contents from './components/sidebar_components/Home_contents';
import Devices_contents from './components/sidebar_components/Devices_contents/Devices_contents';
import ContactSettings_contents from './components/sidebar_components/ContactSettigns_contents/ContactSettings_contents';
import Logs_contents from "./components/sidebar_components/Logs_contents/Logs_contents";
import LoginForm from './components/login/Login-form';
import AdminModifySuccess from './components/custom-notification/for-admin-modification/admin-modifiy-success';
import AdminModifyFailed from './components/custom-notification/for-admin-modification/admin-modify-failed';
import { FiLogIn } from "react-icons/fi";
import { IoClose } from "react-icons/io5";
import { FaCheck } from "react-icons/fa6";
import { TiCancel } from "react-icons/ti";
import { GrPowerReset } from "react-icons/gr";
import { RiAccountCircleLine } from "react-icons/ri";

import {
  onAuthStateChanged,
  signOut,
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { auth } from "./auth/firebase_auth";

function App() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAdminPopup, setShowAdminPopup] = useState(false);
  const [showModifyModal, setShowModifyModal] = useState(false);

  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showFailedToast, setShowFailedToast] = useState(false);
  const [failedMessage, setFailedMessage] = useState("");

  // States for Modify Account modal
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [maskedPassword, setMaskedPassword] = useState("******");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAdmin(true);
        setNewEmail(user.email || "");
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAuthClick = async () => {
    if (isAdmin) {
      await signOut(auth);
      setIsAdmin(false);
      setShowLogin(false);
    } else {
      setShowLogin(true);
    }
  };

  const handleSaveChanges = async () => {
    const user = auth.currentUser;
    if (!user) return;

    if (!currentPassword.trim()) {
      alert("Please enter your current password for confirmation.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (newEmail && !emailRegex.test(newEmail)) {
      alert("Please enter a valid email address");
      return;
    }

    if (newPassword && newPassword.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      if (newEmail !== user.email) {
        try {
          await updateEmail(user, newEmail);
        } catch (emailError) {
          setFailedMessage(emailError.message);
          setShowFailedToast(true);
          setTimeout(() => setShowFailedToast(false), 5000);
          return;
        }
      }

      if (newPassword.trim() !== "") {
        try {
          await updatePassword(user, newPassword);
        } catch (passwordError) {
          setFailedMessage(passwordError.message);
          setShowFailedToast(true);
          setTimeout(() => setShowFailedToast(false), 5000);
          return;
        }
      }

      setShowModifyModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setMaskedPassword("******");

      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);

    } catch (error) {
      setFailedMessage(error.message);
      setShowFailedToast(true);
      setTimeout(() => setShowFailedToast(false), 5000);
    }
  };

  const handleReset = () => {
    setNewEmail(auth.currentUser?.email || "");
    setCurrentPassword("");
    setNewPassword("");
  };

  const handleCancel = () => {
    setShowModifyModal(false);
    setCurrentPassword("");
    setNewPassword("");
    setNewEmail(auth.currentUser?.email || "");
  };

  if (loading) return <p>Loading...</p>;

  return (
    <Router>
      <header className="app-header">
        <RxHamburgerMenu onClick={() => setSidebarOpen(!isSidebarOpen)} />
        <h1>Flood Monitoring System</h1>
        <button className="login" onClick={handleAuthClick}>
          <h2>{isAdmin ? "Logout" : "Login"}</h2>
          <FiLogIn />
        </button>
        {isAdmin && (
          <button
            className="adminAcc"
            onClick={() => setShowAdminPopup(!showAdminPopup)}
          >
            <RiAccountCircleLine />
          </button>
        )}
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

      {/* Login modal */}
      {showLogin && (
        <div className="modal-overlay" id="modal-overlay-login" onClick={() => setShowLogin(false)}>
          <div className="modal-container" id="modal-container-login" onClick={(e) => e.stopPropagation()}>
            <LoginForm onClose={() => setShowLogin(false)} setIsAdmin={setIsAdmin} />
          </div>
        </div>
      )}

      {/* Admin account popup */}
      {showAdminPopup && isAdmin && (
        <div className="admin-popup-overlay" onClick={() => setShowAdminPopup(false)}>
          <div className="admin-popup" onClick={(e) => e.stopPropagation()}>
            <div className="admin-header">
              <h3>Admin Account</h3>
              <button onClick={() => setShowAdminPopup(false)}>
                <IoClose className='close-admin-modal' />
              </button>
            </div>  

            <p>Email: {auth.currentUser?.email}</p>

            <button
              className="popup-btn"
              onClick={() => {
                setNewEmail(auth.currentUser?.email || "");
                setNewPassword("");
                setCurrentPassword("");
                setMaskedPassword("************");
                setShowModifyModal(true);
                setShowAdminPopup(false);
              }}
            >
              Modify Account
            </button>
          </div>
        </div>
      )}

      {/* Modify Admin Account Modal */}
      {showModifyModal && (
        <div className="modal-overlay" id="modify-account-overlay" onClick={handleCancel}>
          <div className="modal-container" id="modify-account-container" onClick={(e) => e.stopPropagation()}>
            <div className="modify-header">
              <h2>Modify Admin Account</h2>
              <button onClick={handleCancel}>
                <IoClose className="close-modify-admin-modal" />
              </button>
            </div>

            <div className="current-acc">
              <h3>Current Account</h3>
              <p>Email: {auth.currentUser?.email}</p>
              <h3>Current Password</h3>
              <p>{maskedPassword}</p>
            </div>

            <div className="updated-acc">
              <h3>New Email</h3>
              <input type="email" placeholder="Enter new email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />

              <h3>Current Password</h3>
              <input type="password" placeholder="Enter current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />

              <h3>New Password</h3>
              <input type="password" placeholder="Enter new password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>

            <div className="modify-acc-btn">
              <button className='modify-save' onClick={handleSaveChanges}>
                <FaCheck />
              </button>
              <button className='modify-reset' onClick={handleReset}>
                <GrPowerReset />
              </button>
              <button className='modify-cancel' onClick={handleCancel}>
                <TiCancel />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Modify Success Toast */}
      {showSuccessToast && (
        <AdminModifySuccess onClose={() => setShowSuccessToast(false)} />
      )}

      {/* Admin Modify Failure Toast */}
      {showFailedToast && (
        <AdminModifyFailed onClose={() => setShowFailedToast(false)} message={failedMessage} />
      )}

    </Router>
  );
}

export default App;
