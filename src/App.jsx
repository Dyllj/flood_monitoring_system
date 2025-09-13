import './App.css'
import Sidebar from './components/sidebar/Sidebar'
import { RxHamburgerMenu } from "react-icons/rx";
import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home_contents from './components/sidebar_components/Home_contents';
import Devices_contents from './components/sidebar_components/Devices_contents';
import ContactSettings_contents from "./components/sidebar_components/ContactSettings_contents";
import Logs_contents from './components/sidebar_components/Logs_contents';
import MDRRMOlogo from './assets/MDRRMOlogo.png'

function App() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <Router>
          <header className="app-header">
            <RxHamburgerMenu onClick={() => setSidebarOpen (!isSidebarOpen)}/>
            <h1>Flood Monitoring System</h1>
          </header>
          <Sidebar show={isSidebarOpen}/>
          <div className="main">
            <Routes>
              <Route path="/" element={<Navigate to="/Home_contents" replace />} />
              <Route path='/Home_contents' element={<Home_contents />} />
              <Route path='/Devices_contents' element={<Devices_contents />} />
              <Route path='/ContactSettings_contents' element={<ContactSettings_contents />} /> 
              <Route path='/Logs_contents' element={<Logs_contents />} />
            </Routes>
          </div>
      </Router>
    </>
  )
}

export default App
