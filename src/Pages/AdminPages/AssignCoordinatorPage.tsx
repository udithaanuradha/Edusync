import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  UserCheck, 
  UserPlus, 
  GraduationCap, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  BookOpen,
  User,
  ShieldAlert,
  Sparkles,
  Layers
} from 'lucide-react';

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

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchAllLecturers();
  }, []);

  const degrees = [
    { code: 'IT', label: 'Information Technology', sub: 'Department of IT', unit: 'IT' },
    { code: 'AI', label: 'Artificial Intelligence', sub: 'Department of Computational Mathematics', unit: 'CM' },
    { code: 'ITM', label: 'Information Tech & Management', sub: 'Department of Interdisciplinary Studies', unit: 'IDS' },
  ];

  // Helper to find coordinator for any degree in this level
  const getCoordinatorForDegree = (deptCode: string) => {
    return allLecturers.find((l) => {
      const isCoord = l.designation === 'coordinator' || l.role === 'coordinator';
      const isSameLevel = l.level !== null && l.level !== undefined && Number(l.level) === Number(levelNumber);
      
      let isSameDepartment = l.academic_unit === deptCode;
      if (deptCode === 'ITM' && (l.academic_unit === 'IDS' || l.academic_unit === 'ITM')) isSameDepartment = true;
      if (deptCode === 'AI' && (l.academic_unit === 'CM' || l.academic_unit === 'AI')) isSameDepartment = true;
      if (deptCode === 'IT' && l.academic_unit === 'IT') isSameDepartment = true;

      return isCoord && isSameLevel && isSameDepartment;
    });
  };

  useEffect(() => {
    if (selectedDepartment) {
      // Find active coordinator for specific Level + Degree
      const activeCoord = getCoordinatorForDegree(selectedDepartment);
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
      setFeedback({ type: 'error', message: 'A coordinator is already assigned. Please remove the current coordinator first.' });
      setTimeout(() => setFeedback(null), 3500);
      return;
    }

    if (!selectedLecturerId || !selectedDepartment) {
      setFeedback({ type: 'error', message: 'Please select both a Degree Program and a Lecturer!' });
      setTimeout(() => setFeedback(null), 3500);
      return;
    }

    try {
      setLoading(true);
      setFeedback(null);
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
        setFeedback({ type: 'success', message: `Coordinator successfully assigned for ${selectedDepartment} (Level ${levelNumber})!` });
        setTimeout(() => setFeedback(null), 3500);
        await fetchAllLecturers();
        onSuccess();
      } else {
        const errorData = await response.json();
        setFeedback({ type: 'error', message: errorData.error || 'Failed to assign coordinator' });
        setTimeout(() => setFeedback(null), 3500);
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Backend connection error' });
      setTimeout(() => setFeedback(null), 3500);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCoordinator = async () => {
    if (!selectedDepartment) return;

    try {
      setLoading(true);
      setFeedback(null);
      const response = await fetch('http://localhost:5000/api/users/remove-coordinator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          level: levelNumber,
          degreeProgram: selectedDepartment 
        })
      });

      if (response.ok) {
        setFeedback({ type: 'success', message: `Coordinator removed for ${selectedDepartment}.` });
        setTimeout(() => setFeedback(null), 3500);
        setCurrentCoordinator(null);
        await fetchAllLecturers();
      } else {
        setFeedback({ type: 'error', message: 'Failed to remove coordinator' });
        setTimeout(() => setFeedback(null), 3500);
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Backend connection error' });
      setTimeout(() => setFeedback(null), 3500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '100%', boxSizing: 'border-box', paddingBottom: '32px' }}>
      
      {/* Top Header & Breadcrumb Bar */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '28px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <button 
          onClick={onBack} 
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            color: '#334155',
            borderRadius: '10px',
            padding: '10px 18px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '13.5px',
            wordSpacing: '3px',
            letterSpacing: '0.2px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            transition: 'all 0.15s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#eff6ff';
            e.currentTarget.style.borderColor = '#93c5fd';
            e.currentTarget.style.color = '#2563eb';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#ffffff';
            e.currentTarget.style.borderColor = '#cbd5e1';
            e.currentTarget.style.color = '#334155';
          }}
        >
          Back to Level {levelNumber} Management
        </button>

        <span style={{
          backgroundColor: '#eff6ff',
          color: '#1d4ed8',
          border: '1px solid #bfdbfe',
          fontSize: '12.5px',
          fontWeight: '700',
          padding: '6px 14px',
          borderRadius: '20px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          wordSpacing: '3px',
          letterSpacing: '0.2px'
        }}>
          <GraduationCap size={15} /> Level {levelNumber} Academic Administration
        </span>
      </div>

      {/* Main 2-Column Balanced Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)',
        gap: '28px',
        alignItems: 'start',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        
        {/* Left Column: Assignment Form Card */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '32px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          boxSizing: 'border-box',
          textAlign: 'left'
        }}>
          {/* Card Title */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '24px',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '18px'
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <UserPlus size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a', wordSpacing: '3px', letterSpacing: '0.2px' }}>
                Assign Degree Coordinator
              </h3>
              <span style={{ fontSize: '13px', color: '#64748b' }}>
                Select degree program and designate an academic staff coordinator
              </span>
            </div>
          </div>

          {/* Feedback Status Banner */}
          {feedback && (
            <div style={{
              padding: '12px 18px',
              borderRadius: '10px',
              marginBottom: '22px',
              fontSize: '13.5px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: feedback.type === 'success' ? '#f0fdf4' : '#fef2f2',
              color: feedback.type === 'success' ? '#15803d' : '#b91c1c',
              border: `1px solid ${feedback.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            }}>
              {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* 1. Extended Length Degree Program Selector */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13.5px', fontWeight: '700', color: '#334155', marginBottom: '10px' }}>
              1. Choose Degree Program
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {degrees.map((deg) => {
                const isSelected = selectedDepartment === deg.code;
                const assigned = getCoordinatorForDegree(deg.code);

                return (
                  <div
                    key={deg.code}
                    onClick={() => setSelectedDepartment(deg.code)}
                    style={{
                      padding: '14px 18px',
                      borderRadius: '12px',
                      border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      backgroundColor: isSelected ? '#eff6ff' : '#f8fafc',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 2px 6px rgba(37, 99, 235, 0.08)' : 'none'
                    }}
                    onMouseOver={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = '#f1f5f9';
                        e.currentTarget.style.borderColor = '#cbd5e1';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = '#f8fafc';
                        e.currentTarget.style.borderColor = '#e2e8f0';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        backgroundColor: isSelected ? '#2563eb' : '#e2e8f0',
                        color: isSelected ? '#ffffff' : '#475569',
                        fontWeight: '800',
                        fontSize: '13.5px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {deg.code}
                      </div>
                      <div>
                        <div style={{ fontSize: '14.5px', fontWeight: '700', color: isSelected ? '#1e40af' : '#0f172a' }}>
                          {deg.label}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          {deg.sub}
                        </div>
                      </div>
                    </div>

                    <span style={{ 
                      fontSize: '11.5px', 
                      fontWeight: '700',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      backgroundColor: assigned ? '#dcfce7' : '#f1f5f9',
                      color: assigned ? '#15803d' : '#64748b',
                      border: assigned ? '1px solid #bbf7d0' : '1px solid #e2e8f0'
                    }}>
                      {assigned ? '• Active Coordinator' : '• Vacant'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {selectedDepartment ? (
            <>
              {/* 2. Active Coordinator Status Card */}
              <div style={{
                backgroundColor: currentCoordinator ? '#f0fdf4' : '#f8fafc',
                border: currentCoordinator ? '1px solid #bbf7d0' : '1px dashed #cbd5e1',
                borderRadius: '14px',
                padding: '18px 20px',
                marginBottom: '24px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: '700', textTransform: 'uppercase', color: currentCoordinator ? '#166534' : '#64748b', letterSpacing: '0.04em' }}>
                    Current {selectedDepartment} Coordinator
                  </span>

                  {currentCoordinator && (
                    <span style={{
                      backgroundColor: '#dcfce7',
                      color: '#15803d',
                      fontSize: '11px',
                      fontWeight: '700',
                      padding: '2px 8px',
                      borderRadius: '4px'
                    }}>
                      Active
                    </span>
                  )}
                </div>

                {currentCoordinator ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: '#16a34a',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        fontSize: '15px',
                        flexShrink: 0
                      }}>
                        {currentCoordinator.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '14.5px', color: '#0f172a' }}>
                          {currentCoordinator.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          {currentCoordinator.university_id ? `University ID: ${currentCoordinator.university_id}` : 'Designated Academic Staff'}
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={handleRemoveCoordinator}
                      disabled={loading}
                      style={{
                        backgroundColor: '#fee2e2',
                        color: '#dc2626',
                        border: '1px solid #fca5a5',
                        padding: '7px 14px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '12.5px',
                        fontWeight: '600',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#fecaca')}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#fee2e2')}
                    >
                      <Trash2 size={14} />
                      Remove
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '13px', padding: '4px 0' }}>
                    <AlertCircle size={16} />
                    <span>No coordinator currently appointed for <strong>{selectedDepartment}</strong>.</span>
                  </div>
                )}
              </div>

              {/* 3. Lecturer Selection & Assign Button */}
              {!currentCoordinator ? (
                <div>
                  <label style={{ display: 'block', fontSize: '13.5px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
                    2. Select Department Lecturer
                  </label>
                  
                  <select 
                    value={selectedLecturerId} 
                    onChange={(e) => setSelectedLecturerId(e.target.value)}
                    style={{ 
                      width: '100%', 
                      padding: '13px 16px', 
                      borderRadius: '10px', 
                      border: '1px solid #cbd5e1', 
                      fontSize: '14px',
                      backgroundColor: '#f8fafc',
                      color: '#0f172a',
                      outline: 'none',
                      cursor: 'pointer',
                      marginBottom: '18px',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="">-- Choose Eligible Lecturer --</option>
                    {filteredLecturers.map(lecturer => (
                      <option key={lecturer.id} value={lecturer.id}>
                        {lecturer.name}{lecturer.university_id ? ` (${lecturer.university_id})` : ''}
                      </option>
                    ))}
                  </select>

                  {filteredLecturers.length === 0 && (
                    <div style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#991b1b',
                      fontSize: '13px',
                      marginBottom: '18px'
                    }}>
                      No available eligible lecturers found for academic unit <strong>{selectedDepartment}</strong>.
                    </div>
                  )}

                  <button 
                    onClick={handleAssignCoordinator}
                    disabled={loading || !selectedLecturerId}
                    style={{ 
                      width: '100%', 
                      padding: '13px 20px', 
                      backgroundColor: !selectedLecturerId ? '#cbd5e1' : '#2563eb', 
                      color: !selectedLecturerId ? '#94a3b8' : '#ffffff', 
                      border: 'none', 
                      borderRadius: '10px', 
                      fontWeight: '700', 
                      cursor: !selectedLecturerId ? 'not-allowed' : 'pointer', 
                      fontSize: '14.5px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: selectedLecturerId ? '0 4px 12px rgba(37, 99, 235, 0.25)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseOver={(e) => {
                      if (selectedLecturerId && !loading) e.currentTarget.style.backgroundColor = '#1d4ed8';
                    }}
                    onMouseOut={(e) => {
                      if (selectedLecturerId && !loading) e.currentTarget.style.backgroundColor = '#2563eb';
                    }}
                  >
                    <UserCheck size={18} />
                    {loading ? 'Assigning...' : `Assign ${selectedDepartment} Coordinator`}
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <div style={{
              padding: '24px',
              backgroundColor: '#f8fafc',
              borderRadius: '12px',
              border: '1px dashed #cbd5e1',
              textAlign: 'center',
              color: '#64748b',
              fontSize: '13.5px'
            }}>
              <BookOpen size={24} style={{ marginBottom: '8px', color: '#94a3b8' }} />
              <p style={{ margin: 0, fontWeight: '500' }}>
                Please select a degree program above to view or assign a coordinator.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Level Coordinator Overview Roster */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '32px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          boxSizing: 'border-box',
          textAlign: 'left'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '24px',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '18px'
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: '#f5f3ff',
              color: '#7c3aed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <GraduationCap size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a', wordSpacing: '3px', letterSpacing: '0.2px' }}>
                Level {levelNumber} Coordinator Roster
              </h3>
              <span style={{ fontSize: '13px', color: '#64748b' }}>
                All Degree Program Coordinators for Level {levelNumber}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {degrees.map((deg) => {
              const coord = getCoordinatorForDegree(deg.code);

              return (
                <div
                  key={deg.code}
                  style={{
                    padding: '18px 20px',
                    borderRadius: '14px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: coord ? '#ffffff' : '#f8fafc',
                    boxShadow: coord ? '0 1px 3px rgba(0,0,0,0.03)' : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      backgroundColor: deg.code === 'IT' ? '#eff6ff' : deg.code === 'AI' ? '#f5f3ff' : '#f0fdf4',
                      color: deg.code === 'IT' ? '#2563eb' : deg.code === 'AI' ? '#7c3aed' : '#16a34a',
                      fontWeight: '800',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {deg.code}
                    </div>

                    <div>
                      <div style={{ fontWeight: '700', fontSize: '14.5px', color: '#0f172a' }}>
                        {deg.label}
                      </div>
                      <div style={{ 
                        fontSize: '12.5px', 
                        color: coord ? (deg.code === 'IT' ? '#2563eb' : deg.code === 'AI' ? '#7c3aed' : '#16a34a') : '#94a3b8', 
                        fontWeight: coord ? '600' : '400', 
                        marginTop: '2px' 
                      }}>
                        {coord ? `Coordinator: ${coord.name}` : 'No coordinator appointed'}
                      </div>
                    </div>
                  </div>

                  <span style={{
                    fontSize: '11.5px',
                    fontWeight: '700',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    backgroundColor: coord 
                      ? (deg.code === 'IT' ? '#eff6ff' : deg.code === 'AI' ? '#f5f3ff' : '#dcfce7')
                      : '#f1f5f9',
                    color: coord 
                      ? (deg.code === 'IT' ? '#1d4ed8' : deg.code === 'AI' ? '#6d28d9' : '#15803d')
                      : '#64748b',
                    border: coord 
                      ? (deg.code === 'IT' ? '1px solid #bfdbfe' : deg.code === 'AI' ? '1px solid #ddd6fe' : '1px solid #bbf7d0')
                      : '1px solid #e2e8f0'
                  }}>
                    {coord ? 'Assigned' : 'Vacant'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AssignCoordinatorPage;