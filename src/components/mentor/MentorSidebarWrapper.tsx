import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../shared/Sidebar';
import './MentorStyles.css';

const Level1BlockedModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="mentor-modal-overlay" onClick={onClose}>
    <div className="mentor-modal-box" onClick={(e) => e.stopPropagation()}>
      <div className="mentor-modal-icon">🚫</div>
      <h3>Access Restricted</h3>
      <p>Industry mentors are not assigned to Level 1 stages.</p>
      <button className="mentor-modal-btn" onClick={onClose}>Got it</button>
    </div>
  </div>
);

const MentorSidebarWrapper = () => {
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Called by the sidebar's Level 1 link via a click interceptor on the wrapper
  const handleSidebarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const level1Link = target.closest('a[href*="level-1"]');

    if (level1Link) {
      e.preventDefault();
      e.stopPropagation();
      setShowModal(true);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    // If somehow the user ended up on level-1 (e.g. direct URL), redirect away
    if (location.pathname.includes('level-1')) {
      navigate('/dashboard/level-2', { replace: true });
    }
  };

  return (
    <>
      {/* Capture phase on the wrapper div intercepts clicks before React Router */}
      <div
        className="mentor-sidebar-container"
        onClickCapture={handleSidebarClick}
      >
        <Sidebar />
      </div>
      {showModal && <Level1BlockedModal onClose={handleModalClose} />}
    </>
  );
};

export default MentorSidebarWrapper;