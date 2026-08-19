import React, { useState, useEffect } from 'react';

interface Lecturer {
  id: number;
  name: string;
  university_id: string;
  designation?: string | null;
  academic_unit?: string | null;
  level?: number | string | null;
}

interface AssignCoordinatorPageProps {
  levelNumber: number; // e.g., 1, 2, 3, 4
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

  // මුලින්ම සියලුම ලෙක්චරර්ස්ලා ලැයිස්තුව Backend එකෙන් ලබා ගනී
  useEffect(() => {
    fetchAllLecturers();
  }, []);

  // Degree Program එක වෙනස් වන විට Current Coordinator ව සෙවීම සහ Dropdown එක Filter කිරීම සිදුවේ
  useEffect(() => {
    if (selectedDepartment) {
      // 1. දැනටමත් මේ නිශ්චිත Level එකට පත් කර ඉන්න Coordinator කෙනෙක් ඉන්නවාදැයි සෙවීම
      const activeCoord = allLecturers.find(
        (l) => l.designation === 'coordinator' && 
               l.level !== null && 
               l.level !== undefined &&
               Number(l.level) === Number(levelNumber)
      );
      
      // දැනට ඉන්න Coordinator, තෝරපු ඩිග්‍රී එකට අදාළ මව් දෙපාර්තමේන්තුවේ කෙනෙක් නම් පමණක් ඔහුව පෙන්වයි
      if (activeCoord) {
        if (
          (selectedDepartment === 'IT' && activeCoord.academic_unit === 'IT') ||
          (selectedDepartment === 'ITM' && activeCoord.academic_unit === 'IDS') ||
          (selectedDepartment === 'AI' && activeCoord.academic_unit === 'CM')
        ) {
          setCurrentCoordinator(activeCoord);
        } else {
          setCurrentCoordinator(null);
        }
      } else {
        setCurrentCoordinator(null);
      }

      // 2. Dropdown එක සඳහා ලෙක්චරර්ස්ලා Filter කිරීමේ නව ලොජික් එක
      const matched = allLecturers.filter((l) => {
        
        // ⭐ [ප්‍රධාන විසඳුම]: ලෙක්චරර් දැනටමත් ඕනෑම Level එකක 'coordinator' කෙනෙක් නම්, එයාව Dropdown ලැයිස්තුවෙන් සම්පූර්ණයෙන්ම ඉවත් කරයි!
        if (l.designation === 'coordinator') return false;

        // [නීතිය 1] IT Degree එක තෝරද්දී ➡️ IT Department එකේ ලෙක්චරර්ස්ලා පමණි
        if (selectedDepartment === 'IT') {
          return l.academic_unit === 'IT';
        }
        
        // [නීතිය 2] AI Degree එක තෝරද්දී ➡️ CM Department එකේ ලෙක්චරර්ස්ලා පමණි
        if (selectedDepartment === 'AI') {
          return l.academic_unit === 'CM';
        }

        // [නීතිය 3] ITM Degree එක තෝරද්දී ➡️ IDS Department එකේ ලෙක්චරර්ස්ලා පමණි
        if (selectedDepartment === 'ITM') {
          return l.academic_unit === 'IDS';
        }

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
    if (!selectedLecturerId || !selectedDepartment) {
      alert("Please select both a Degree Program and a Lecturer!");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/users/assign-coordinator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: selectedLecturerId, level: levelNumber })
      });

      if (response.ok) {
        alert('Coordinator assigned successfully!');
        await fetchAllLecturers();
        onSuccess();
      } else {
        alert('Failed to assign coordinator');
      }
    } catch (err) {
      alert('Backend connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCoordinator = async () => {
    if (!selectedDepartment) return;
    if (!window.confirm(`Are you sure you want to remove the current Coordinator for Level ${levelNumber}?`)) return;

    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/users/remove-coordinator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: levelNumber })
      });

      if (response.ok) {
        alert('Coordinator removed successfully!');
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
    backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px',
    padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', width: '100%',
    maxWidth: '480px', margin: '0 auto', textAlign: 'left'
  };

  return (
    <div style={{ width: '100%', textAlign: 'left', padding: '20px' }}>
      <button 
        onClick={onBack} 
        style={{
          backgroundColor: 'transparent', border: 'none', color: '#2563eb',
          cursor: 'pointer', fontWeight: '600', fontSize: '14px', marginBottom: '20px', padding: 0
        }}
      >
        ← Back to Level {levelNumber} Management
      </button>

      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: '600', color: '#111827' }}>
          Assign Degree Coordinator - Level {levelNumber}
        </h3>
        
        {/* 1. Degree Program Dropdown */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
            Select Degree Program
          </label>
          <select 
            value={selectedDepartment} 
            onChange={(e) => setSelectedDepartment(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px' }}
          >
            <option value="">-- Choose Degree Program --</option>
            <option value="IT">IT</option>
            <option value="AI">AI</option>
            <option value="ITM">ITM</option>
          </select>
        </div>

        {/* ---- CURRENT COORDINATOR INFO SECTION ---- */}
        {selectedDepartment && (
          <div style={{
            backgroundColor: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: '8px',
            padding: '12px', marginBottom: '20px', fontSize: '14px'
          }}>
            <span style={{ fontWeight: '600', color: '#4b5563' }}>Current Coordinator: </span>
            {currentCoordinator ? (
              <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#111827', fontWeight: '500' }}>
                  {currentCoordinator.name} ({currentCoordinator.university_id})
                </span>
                <button 
                  onClick={handleRemoveCoordinator}
                  disabled={loading}
                  style={{
                    backgroundColor: '#fee2e2', color: '#dc2626', border: 'none',
                    padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600'
                  }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Not Assigned Yet</span>
            )}
          </div>
        )}

        {/* 2. Filtered Lecturer Dropdown */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
            Select Lecturer
          </label>
          <select 
            value={selectedLecturerId} 
            onChange={(e) => setSelectedLecturerId(e.target.value)}
            disabled={!selectedDepartment}
            style={{ 
              width: '100%', padding: '10px', borderRadius: '8px', 
              border: '1px solid #d1d5db', fontSize: '14px',
              backgroundColor: !selectedDepartment ? '#f3f4f6' : '#ffffff'
            }}
          >
            <option value="">
              {!selectedDepartment ? '-- Choose Degree Program First --' : '-- Choose Lecturer --'}
            </option>
            {filteredLecturers.map(lecturer => (
              <option key={lecturer.id} value={lecturer.id}>
                {lecturer.name} ({lecturer.university_id})
              </option>
            ))}
          </select>
          {selectedDepartment && filteredLecturers.length === 0 && (
            <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '6px', margin: 0 }}>
              No available lecturers found for this mapping.
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button 
          onClick={handleAssignCoordinator}
          disabled={loading || !selectedLecturerId}
          style={{ 
            width: '100%', padding: '12px', 
            backgroundColor: !selectedLecturerId ? '#9ca3af' : '#16a34a', 
            color: 'white', border: 'none', borderRadius: '8px', 
            fontWeight: '600', cursor: !selectedLecturerId ? 'not-allowed' : 'pointer', fontSize: '15px'
          }}
        >
          {loading ? 'Processing...' : currentCoordinator ? 'Change Coordinator' : 'Assign as Coordinator'}
        </button>
      </div>
    </div>
  );
};

export default AssignCoordinatorPage;