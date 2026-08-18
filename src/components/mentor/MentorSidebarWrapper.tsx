import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../shared/Sidebar';
import './MentorStyles.css';

/**
 * UnassignedLevelModal Component
 *
 * Displays an Access Restricted pop-up modal whenever a mentor clicks on
 * an academic level (Level 1, Level 3, Level 4) they are not assigned to.
 */
interface BlockedModalProps {
  level: number;
  message: string;
  onClose: () => void;
}

const UnassignedLevelModal: React.FC<BlockedModalProps> = ({ level, message, onClose }) => (
  <div className="mentor-modal-overlay" onClick={onClose}>
    <div className="mentor-modal-box" onClick={(e) => e.stopPropagation()}>
      <div className="mentor-modal-icon">🚫</div>
      <h3>Access Restricted</h3>
      <p>{message}</p>
      <button className="mentor-modal-btn" onClick={onClose}>Got it</button>
    </div>
  </div>
);

/**
 * MentorSidebarWrapper Component
 *
 * PURPOSE:
 *   Wraps the shared Sidebar for all Mentor pages to:
 *   1. Dynamically track which academic levels the mentor is actively assigned to (e.g. Level 2).
 *   2. Intercept clicks on unassigned academic levels (e.g. Level 1, Level 3, Level 4) before navigation.
 *   3. Pop up a clear notification modal informing the mentor they are not assigned to that level.
 */
const MentorSidebarWrapper: React.FC = () => {
  const [assignedLevels, setAssignedLevels] = useState<number[]>([2]); // Default fallback Level 2
  const [modalState, setModalState] = useState<{ isOpen: boolean; level: number; message: string }>({
    isOpen: false,
    level: 0,
    message: '',
  });

  const navigate = useNavigate();
  const location = useLocation();

  // Dynamically load mentor's assigned levels
  useEffect(() => {
    const fetchAssignedLevels = async () => {
      try {
        const savedUser = localStorage.getItem('user');
        const user = savedUser ? JSON.parse(savedUser) : null;
        const mentorId = user?.id;
        if (!mentorId) return;

        const res = await fetch(`http://localhost:5000/api/mentor/groups?mentorId=${mentorId}`);
        const json = await res.json();
        const groups = json.success && Array.isArray(json.data) ? json.data : [];

        const levels: number[] = Array.from(
          new Set(groups.map((g: any) => Number(g.level)).filter((lvl: number) => !isNaN(lvl) && lvl > 0))
        );

        if (levels.length > 0) {
          setAssignedLevels(levels);
        }
      } catch (err) {
        console.error('Failed to load mentor assigned levels for sidebar wrapper:', err);
      }
    };

    fetchAssignedLevels();
  }, []);

  // Intercept click on any level link in the sidebar
  const handleSidebarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const levelLink = target.closest('a[href*="level-"]');

    if (!levelLink) return;

    const href = levelLink.getAttribute('href') || '';
    const match = href.match(/level-(\d+)/);
    if (!match) return;

    const targetLevel = Number(match[1]);

    // Check if targetLevel is Level 1 (always blocked for industry mentors)
    if (targetLevel === 1) {
      e.preventDefault();
      e.stopPropagation();
      setModalState({
        isOpen: true,
        level: 1,
        message: 'Industry mentors are not assigned to Level 1 stages.',
      });
      return;
    }

    // Check if mentor has active group assignments at this level
    if (!assignedLevels.includes(targetLevel)) {
      e.preventDefault();
      e.stopPropagation();
      setModalState({
        isOpen: true,
        level: targetLevel,
        message: `You are not assigned to Level ${targetLevel}. You can only access academic levels where you have active project group assignments.`,
      });
    }
  };

  const handleModalClose = () => {
    setModalState({ isOpen: false, level: 0, message: '' });

    // If current location is an unassigned level page, redirect back to assigned level
    const match = location.pathname.match(/level-(\d+)/);
    if (match) {
      const currentLvl = Number(match[1]);
      if (!assignedLevels.includes(currentLvl) || currentLvl === 1) {
        const fallbackLevel = assignedLevels[0] || 2;
        navigate(`/dashboard/level-${fallbackLevel}`, { replace: true });
      }
    }
  };

  return (
    <>
      {/* Capture phase intercepts sidebar clicks before React Router NavLink navigation */}
      <div
        className="mentor-sidebar-container"
        onClickCapture={handleSidebarClick}
      >
        <Sidebar />
      </div>

      {modalState.isOpen && (
        <UnassignedLevelModal
          level={modalState.level}
          message={modalState.message}
          onClose={handleModalClose}
        />
      )}
    </>
  );
};

export default MentorSidebarWrapper;