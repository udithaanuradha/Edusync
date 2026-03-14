 import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
 import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';

/**
 * App Component
 * Handles the main routing for the University Project Management System (EduSync).
 * Global styles are managed in index.css.
 */
function App() {
  return (
    <Router>
      <Routes>
        {/* The Landing Page: The first interface users see */}
        <Route path="/" element={<LandingPage />} />

        {/* Auth Routes: Created from your HTML/Tailwind templates */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />

        {/* Future Route Example: 
            Once you build the dashboard for the EduSync project, 
            you can add it here.
        */}
      </Routes>
    </Router>
  );
}

export default App;