import './App.css'
import Sidebar from './components/sidebar/sidebar'
import { RxHamburgerMenu } from "react-icons/rx";
import { useState } from 'react';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';

function App() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
    <header className="app-header">
      <RxHamburgerMenu onClick={() => setSidebarOpen (!isSidebarOpen)}/>
      <h1>Flood Monitoring System</h1>
    </header>
      <Sidebar show={isSidebarOpen}/>
    </>
  )
}

export default App
