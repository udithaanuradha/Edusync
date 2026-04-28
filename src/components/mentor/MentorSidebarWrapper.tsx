import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const level1Link = target.closest('a[href*="level-1"]');

      if (level1Link) {
        e.preventDefault();
        e.stopImmediatePropagation(); // Stops ALL other listeners, including React Router
        setShowModal(true);
      }
    };

    // useCapture: true — fires before React Router's own listener
    document.addEventListener('click', handleGlobalClick, true);
    return () => document.removeEventListener('click', handleGlobalClick, true);
  }, []);

  return (
    <>
      <div className="mentor-sidebar-container">
        <Sidebar />
      </div>
      {showModal && <Level1BlockedModal onClose={() => setShowModal(false)} />}
    </>
  );
};

export default MentorSidebarWrapper;