import React, { useState, useEffect } from 'react';

interface Lecturer {
  id: number;
  name: string;
  university_id: string;
  designation?: string | null;
  academic_unit?: string | null;
  level?: number | string | null;
  role?: string | null;
}

interface AssignCoordinatorPageProps {
  levelNumber: number;
  onBack: () => void;
  onSuccess: () => void;
}

const AssignCoordinatorPage: React.FC<AssignCoordinatorPageProps> = ({ levelNumber, onBack, onSuccess }) => {
  const [allLecturers, setAllLecturers] = useState<Lecturer[]>([]);
  const [filteredLecturers, setFilteredLecturers] = useState<Lecturer[]>([]);
  const [selectedLecturerId, setSelectedLecturerId] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentCoordinator, setCurrentCoordinator] = useState<Lecturer | null>(null);

  useEffect(() => {
    fetchAllLecturers();
  }, []);

  useEffect(() => {
    if (selectedDepartment) {
      // Find active coordinator for specific Level + Degree
      const activeCoord = allLecturers.find((l) => {
        const isCoord = l.designation === 'coordinator' || l.role === 'coordinator';
        const isSameLevel = l.level !== null && l.level !== undefined && Number(l.level) === Number(levelNumber);
        
        let isSameDepartment = l.academic_unit === selectedDepartment;
        if (selectedDepartment === 'ITM' && (l.academic_unit === 'IDS' || l.academic_unit === 'ITM')) isSameDepartment = true;
        if (selectedDepartment === 'AI' && (l.academic_unit === 'CM' || l.academic_unit === 'AI')) isSameDepartment = true;
        if (selectedDepartment === 'IT' && l.academic_unit === 'IT') isSameDepartment = true;

        return isCoord && isSameLevel && isSameDepartment;
      });
      
      setCurrentCoordinator(activeCoord || null);

      // Filter available lecturers for dropdown
      const matched = allLecturers.filter((l) => {
        if (l.designation === 'coordinator' || l.role === 'coordinator') return false;

        if (selectedDepartment === 'IT') return l.academic_unit === 'IT';
        if (selectedDepartment === 'AI') return l.academic_unit === 'CM' || l.academic_unit === 'AI';
        if (selectedDepartment === 'ITM') return l.academic_unit === 'IDS' || l.academic_unit === 'ITM';

        return false;
      });

      setFilteredLecturers(matched);
    } else {
      setCurrentCoordinator(null);
      setFilteredLecturers([]);
    }
    setSelectedLecturerId(''); 
  }, [selectedDepartment, allLecturers, levelNumber]);

  const fetchAllLecturers = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/users/lecturers');
      if (!res.ok) throw new Error('Failed to fetch');
      const data: Lecturer[] = await res.json();
      setAllLecturers(data);
    } catch (err) {
      console.error('Failed to fetch lecturers:', err);
    }
  };

  const handleAssignCoordinator = async () => {
    if (currentCoordinator) {
      alert("A coordinator is already assigned. Please remove the current coordinator first!");
      return;
    }

    if (!selectedLecturerId || !selectedDepartment) {
      alert("Please select both a Degree Program and a Lecturer!");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/users/assign-coordinator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: selectedLecturerId, 
          level: levelNumber,
          degreeProgram: selectedDepartment 
        })
      });

      if (response.ok) {
        alert('Coordinator assigned successfully!');
        await fetchAllLecturers();
        onSuccess();
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to assign coordinator');
      }
    } catch (err) {
      alert('Backend connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCoordinator = async () => {
    if (!selectedDepartment) return;
    if (!window.confirm(`Are you sure you want to remove the current Coordinator for Level ${levelNumber} (${selectedDepartment})?`)) return;

    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/users/remove-coordinator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          level: levelNumber,
          degreeProgram: selectedDepartment 
        })
      });

      if (response.ok) {
        alert('Coordinator removed successfully!');
        setCurrentCoordinator(null);
        await fetchAllLecturers();
      } else {
        alert('Failed to remove coordinator');
      }
    } catch (err) {
      alert('Backend connection error');
    } finally {
      setLoading(false);
    }
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--eds-color-bg-surface)', border: '1px solid var(--eds-color-border)', borderRadius: '12px',
    padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', width: '100%',
    maxWidth: '480px', margin: '0 auto', textAlign: 'left'
  };

  return (
    <div style={{ width: '100%', textAlign: 'left', padding: '20px' }}>
      <button 
        onClick={onBack} 
        style={{
          backgroundColor: 'transparent', border: 'none', color: 'var(--eds-color-primary)',
          cursor: 'pointer', fontWeight: '600', fontSize: '14px', marginBottom: '20px', padding: 0
        }}
      >
        ← Back to Level {levelNumber} Management
      </button>

      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: '600', color: 'var(--eds-color-text-strong)' }}>
          Assign Degree Coordinator - Level {levelNumber}
        </h3>
        
        {/* Degree Program Selection */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--eds-color-text-body)', marginBottom: '6px' }}>
            Select Degree Program
          </label>
          <select 
            value={selectedDepartment} 
            onChange={(e) => setSelectedDepartment(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--eds-color-border)', fontSize: '14px' }}
          >
            <option value="">-- Choose Degree Program --</option>
            <option value="IT">IT</option>
            <option value="AI">AI</option>
            <option value="ITM">ITM</option>
          </select>
        </div>

        {/* Active Coordinator Status */}
        {selectedDepartment && (
          <div style={{
            backgroundColor: 'var(--eds-color-bg-surface-soft)', border: '1px dashed var(--eds-color-border)', borderRadius: '8px',
            padding: '12px', marginBottom: '20px', fontSize: '14px'
          }}>
            <span style={{ fontWeight: '600', color: 'var(--eds-color-text-muted)' }}>Current Coordinator: </span>
            {currentCoordinator ? (
              <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--eds-color-text-strong)', fontWeight: '500' }}>
                  {currentCoordinator.name}{currentCoordinator.university_id ? ` (${currentCoordinator.university_id})` : ''}
                </span>
                <button 
                  onClick={handleRemoveCoordinator}
                  disabled={loading}
                  style={{
                    backgroundColor: 'var(--eds-color-danger-bg)', color: 'var(--eds-color-danger-solid)', border: 'none',
                    padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600'
                  }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <span style={{ color: 'var(--eds-color-text-faint)', fontStyle: 'italic' }}>Not Assigned Yet</span>
            )}
          </div>
        )}

        {/* Lecturer Select Option */}
        {selectedDepartment && !currentCoordinator && (
          <>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--eds-color-text-body)', marginBottom: '6px' }}>
                Select Lecturer
              </label>
              <select 
                value={selectedLecturerId} 
                onChange={(e) => setSelectedLecturerId(e.target.value)}
                style={{ 
                  width: '100%', padding: '10px', borderRadius: '8px', 
                  border: '1px solid var(--eds-color-border)', fontSize: '14px',
                  backgroundColor: 'var(--eds-color-bg-surface)'
                }}
              >
                <option value="">-- Choose Lecturer --</option>
                {filteredLecturers.map(lecturer => (
                  <option key={lecturer.id} value={lecturer.id}>
                    {lecturer.name}{lecturer.university_id ? ` (${lecturer.university_id})` : ''}
                  </option>
                ))}
              </select>
              {filteredLecturers.length === 0 && (
                <p style={{ color: 'var(--eds-color-danger-solid)', fontSize: '12px', marginTop: '6px', margin: 0 }}>
                  No available lecturers found for this program.
                </p>
              )}
            </div>

            <button 
              onClick={handleAssignCoordinator}
              disabled={loading || !selectedLecturerId}
              style={{ 
                width: '100%', padding: '12px', 
                backgroundColor: !selectedLecturerId ? 'var(--eds-color-text-faint)' : 'var(--eds-color-primary)', 
                color: 'white', border: 'none', borderRadius: '8px', 
                fontWeight: '600', cursor: !selectedLecturerId ? 'not-allowed' : 'pointer', fontSize: '15px'
              }}
            >
              {loading ? 'Processing...' : 'Assign as Coordinator'}
            </button>
          </>
        )}

        {/* Warning Prompt */}
        {selectedDepartment && currentCoordinator && (
          <div style={{
            backgroundColor: 'var(--eds-color-warning-bg)', border: '1px solid var(--eds-color-warning-bg)', borderRadius: '8px',
            padding: '12px', fontSize: '13px', color: 'var(--eds-color-warning-text)', textAlign: 'center'
          }}>
            ⚠️ Please remove the current coordinator before assigning a new one.
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignCoordinatorPage;