import React, { useState } from 'react';
import Sidebar from '../components/shared/Sidebar';
import Header from '../components/shared/Header';
import { useAuth } from '../context/AuthContext';
import { 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Eye, 
  EyeOff, 
  KeyRound, 
  Save
} from 'lucide-react';

const ProfileSettingsPage: React.FC = () => {
  const { user, updateUser } = useAuth();

  // Active Tab: 'personal' | 'security'
  const [activeTab, setActiveTab] = useState<'personal' | 'security'>('personal');

  // Personal Info Form State
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState((user as any)?.phone || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Security & Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Password Strength Calculation
  const calculatePasswordStrength = (pwd: string) => {
    if (!pwd) return { label: 'Empty', color: '#94a3b8', width: '0%', level: 0 };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 1) return { label: 'Weak', color: '#ef4444', width: '25%', level: 1 };
    if (score === 2 || score === 3) return { label: 'Medium', color: '#f59e0b', width: '60%', level: 2 };
    return { label: 'Strong', color: '#16a34a', width: '100%', level: 3 };
  };

  const pwdStrength = calculatePasswordStrength(newPassword);

  // Save Personal Profile Details
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setProfileFeedback({ type: 'error', message: 'Full name cannot be empty.' });
      return;
    }

    if (!user?.id) {
      setProfileFeedback({ type: 'error', message: 'User session not found.' });
      return;
    }

    setIsSavingProfile(true);
    setProfileFeedback(null);

    try {
      const response = await fetch('http://localhost:5000/api/users/profile/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          name: name.trim(),
          phone: phone.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update profile.');
      }

      // Update AuthContext & localStorage
      updateUser({
        name: data.user.name,
        ...(data.user.phone ? { phone: data.user.phone } : {}),
      });

      setProfileFeedback({ type: 'success', message: '✅ Profile details updated successfully!' });
      setTimeout(() => setProfileFeedback(null), 4000);
    } catch (err: any) {
      setProfileFeedback({ type: 'error', message: `❌ ${err.message || 'Failed to save profile.'}` });
      setTimeout(() => setProfileFeedback(null), 4000);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Update Password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);

    if (!currentPassword) {
      setPasswordFeedback({ type: 'error', message: 'Please enter your current password.' });
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setPasswordFeedback({ type: 'error', message: 'New password must be at least 6 characters long.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: 'error', message: 'New password and confirmation do not match.' });
      return;
    }

    if (!user?.id) {
      setPasswordFeedback({ type: 'error', message: 'User session not found.' });
      return;
    }

    setIsUpdatingPassword(true);

    try {
      const response = await fetch('http://localhost:5000/api/users/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to change password.');
      }

      setPasswordFeedback({ type: 'success', message: '✅ Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordFeedback(null), 4000);
    } catch (err: any) {
      setPasswordFeedback({ type: 'error', message: `❌ ${err.message || 'Failed to change password.'}` });
      setTimeout(() => setPasswordFeedback(null), 4000);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />

      <div className="main-viewport">
        <Header />

        <main className="content-container">
          <div className="dashboard-content" style={{ maxWidth: '960px', margin: '0 auto', paddingBottom: '40px' }}>
            
            {/* Page Title */}
            <div className="dashboard-header-section" style={{ marginBottom: '24px' }}>
              <h2 className="overview-title" style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>
                Profile & Account Settings
              </h2>
              <p className="overview-subtitle" style={{ fontSize: '14px', color: '#64748b' }}>
                Manage your personal details, academic designation, and account security.
              </p>
            </div>

            {/* Hero Profile Banner Card */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                {/* Large Avatar */}
                <div
                  style={{
                    width: '68px',
                    height: '68px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '26px',
                    fontWeight: '800',
                    boxShadow: '0 4px 10px rgba(37, 99, 235, 0.25)',
                    flexShrink: 0,
                  }}
                >
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>

                <div>
                  <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
                    {user?.name || 'User Profile'}
                  </h3>

                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                    {user?.email || 'email@uom.lk'}
                    {user?.designation && ` • ${user.designation}`}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    fontSize: '12px',
                    color: '#64748b',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontWeight: '500',
                  }}
                >
                  🏛️ University of Moratuwa
                </span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div
              style={{
                display: 'flex',
                gap: '24px',
                borderBottom: '1px solid #e2e8f0',
                marginBottom: '24px',
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab('personal')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 20px',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: '14.5px',
                  fontWeight: activeTab === 'personal' ? '700' : '500',
                  color: activeTab === 'personal' ? '#2563eb' : '#64748b',
                  borderBottom: activeTab === 'personal' ? '2.5px solid #2563eb' : '2.5px solid transparent',
                  transition: 'all 0.15s ease',
                  marginBottom: '-1px',
                }}
              >
                <User size={17} />
                Personal Information
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('security')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 20px',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: '14.5px',
                  fontWeight: activeTab === 'security' ? '700' : '500',
                  color: activeTab === 'security' ? '#2563eb' : '#64748b',
                  borderBottom: activeTab === 'security' ? '2.5px solid #2563eb' : '2.5px solid transparent',
                  transition: 'all 0.15s ease',
                  marginBottom: '-1px',
                }}
              >
                <Lock size={17} />
                Security & Password
              </button>
            </div>

            {/* TAB 1: PERSONAL INFORMATION */}
            {activeTab === 'personal' && (
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  padding: '28px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      backgroundColor: '#eff6ff',
                      color: '#2563eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <User size={18} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>
                      Personal & Contact Details
                    </h4>
                    <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#64748b' }}>
                      Update your display name and contact phone number.
                    </p>
                  </div>
                </div>

                {profileFeedback && (
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      marginBottom: '20px',
                      fontSize: '13px',
                      fontWeight: '600',
                      backgroundColor: profileFeedback.type === 'success' ? '#dcfce7' : '#fee2e2',
                      color: profileFeedback.type === 'success' ? '#15803d' : '#b91c1c',
                      border: `1px solid ${profileFeedback.type === 'success' ? '#bbf7d0' : '#fca5a5'}`,
                    }}
                  >
                    {profileFeedback.message}
                  </div>
                )}

                <form onSubmit={handleSaveProfile}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: '20px',
                      marginBottom: '24px',
                    }}
                  >
                    {/* Full Name */}
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                        Full Name <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <div style={{ position: 'relative' }}>
                        <User size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Prabhath Jayasooriya"
                          style={{
                            width: '100%',
                            padding: '10px 12px 10px 36px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontSize: '14px',
                            color: '#0f172a',
                            boxSizing: 'border-box',
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>

                    {/* Email (Read Only) */}
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                        Email Address
                      </label>
                      <div style={{ position: 'relative' }}>
                        <Mail size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                        <input
                          type="email"
                          value={user?.email || ''}
                          disabled
                          style={{
                            width: '100%',
                            padding: '10px 12px 10px 36px',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            backgroundColor: '#f8fafc',
                            fontSize: '14px',
                            color: '#64748b',
                            boxSizing: 'border-box',
                            cursor: 'not-allowed',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                        🔒 Primary institutional email cannot be changed directly.
                      </span>
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                        Contact Phone Number
                      </label>
                      <div style={{ position: 'relative' }}>
                        <Phone size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="e.g. +94 77 123 4567"
                          style={{
                            width: '100%',
                            padding: '10px 12px 10px 36px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontSize: '14px',
                            color: '#0f172a',
                            boxSizing: 'border-box',
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '10px 22px',
                        fontSize: '14px',
                        fontWeight: '700',
                        cursor: isSavingProfile ? 'default' : 'pointer',
                        opacity: isSavingProfile ? 0.7 : 1,
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <Save size={16} />
                      {isSavingProfile ? 'Saving Changes…' : 'Save Profile Changes'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 2: SECURITY & PASSWORD */}
            {activeTab === 'security' && (
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  padding: '28px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      backgroundColor: '#eff6ff',
                      color: '#2563eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <KeyRound size={18} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>
                      Change Account Password
                    </h4>
                    <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#64748b' }}>
                      Ensure your account remains safe with a strong, complex password.
                    </p>
                  </div>
                </div>

                {passwordFeedback && (
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      marginBottom: '20px',
                      fontSize: '13px',
                      fontWeight: '600',
                      backgroundColor: passwordFeedback.type === 'success' ? '#dcfce7' : '#fee2e2',
                      color: passwordFeedback.type === 'success' ? '#15803d' : '#b91c1c',
                      border: `1px solid ${passwordFeedback.type === 'success' ? '#bbf7d0' : '#fca5a5'}`,
                    }}
                  >
                    {passwordFeedback.message}
                  </div>
                )}

                <form onSubmit={handleUpdatePassword} style={{ maxWidth: '480px' }}>
                  {/* Current Password */}
                  <div style={{ marginBottom: '18px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                      Current Password <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        style={{
                          width: '100%',
                          padding: '10px 40px 10px 36px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '14px',
                          color: '#0f172a',
                          boxSizing: 'border-box',
                          outline: 'none',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '10px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#94a3b8',
                          padding: 0,
                        }}
                      >
                        {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div style={{ marginBottom: '18px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                      New Password <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min. 6 characters"
                        style={{
                          width: '100%',
                          padding: '10px 40px 10px 36px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '14px',
                          color: '#0f172a',
                          boxSizing: 'border-box',
                          outline: 'none',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '10px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#94a3b8',
                          padding: 0,
                        }}
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>

                    {/* Password Strength Bar */}
                    {newPassword && (
                      <div style={{ marginTop: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '4px' }}>
                          <span style={{ color: '#64748b' }}>Strength</span>
                          <span style={{ fontWeight: '700', color: pwdStrength.color }}>{pwdStrength.label}</span>
                        </div>
                        <div style={{ height: '5px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: pwdStrength.width,
                              backgroundColor: pwdStrength.color,
                              transition: 'all 0.3s ease',
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm New Password */}
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                      Confirm New Password <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        style={{
                          width: '100%',
                          padding: '10px 40px 10px 36px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '14px',
                          color: '#0f172a',
                          boxSizing: 'border-box',
                          outline: 'none',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '10px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#94a3b8',
                          padding: 0,
                        }}
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <button
                      type="submit"
                      disabled={isUpdatingPassword}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '10px 22px',
                        fontSize: '14px',
                        fontWeight: '700',
                        cursor: isUpdatingPassword ? 'default' : 'pointer',
                        opacity: isUpdatingPassword ? 0.7 : 1,
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <Lock size={16} />
                      {isUpdatingPassword ? 'Updating Password…' : 'Update Password'}
                    </button>
                  </div>
                </form>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
};

export default ProfileSettingsPage;