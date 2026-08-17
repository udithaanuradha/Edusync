import React from 'react';

type SupervisorGroup = {
  groupId: string;
  title: string;
  stage: string;
  averageMark: number;
  evaluationStatus: 'Approved' | 'Pending Review' | 'Needs Revision';
};

type Supervisor = {
  id: number;
  name: string;
  academicLevel: string;
  groups: SupervisorGroup[];
};

const supervisors: Supervisor[] = [
  {
    id: 1,
    name: 'Dr. Perera',
    academicLevel: 'Level 2',
    groups: [
      {
        groupId: 'G-102',
        title: 'Smart Attendance System',
        stage: 'Prototype Review',
        averageMark: 88,
        evaluationStatus: 'Approved',
      },
      {
        groupId: 'G-118',
        title: 'AI Study Planner',
        stage: 'Final Presentation',
        averageMark: 81,
        evaluationStatus: 'Pending Review',
      },
    ],
  },
  {
    id: 2,
    name: 'Prof. Silva',
    academicLevel: 'Level 2',
    groups: [
      {
        groupId: 'G-127',
        title: 'Smart Agriculture Monitor',
        stage: 'Implementation',
        averageMark: 76,
        evaluationStatus: 'Needs Revision',
      },
      {
        groupId: 'G-139',
        title: 'Campus Mobility Tracker',
        stage: 'Testing',
        averageMark: 84,
        evaluationStatus: 'Approved',
      },
      {
        groupId: 'G-142',
        title: 'Digital Library Assistant',
        stage: 'Viva Preparation',
        averageMark: 90,
        evaluationStatus: 'Approved',
      },
    ],
  },
  {
    id: 3,
    name: 'Dr. Fernando',
    academicLevel: 'Level 2',
    groups: [
      {
        groupId: 'G-153',
        title: 'Green Energy Dashboard',
        stage: 'Final Report',
        averageMark: 79,
        evaluationStatus: 'Pending Review',
      },
    ],
  },
];

const getStatusColor = (status: SupervisorGroup['evaluationStatus']) => {
  switch (status) {
    case 'Approved':
      return '#dcfce7';
    case 'Pending Review':
      return '#fef3c7';
    case 'Needs Revision':
      return '#fee2e2';
    default:
      return '#e2e8f0';
  }
};

const getStatusTextColor = (status: SupervisorGroup['evaluationStatus']) => {
  switch (status) {
    case 'Approved':
      return '#166534';
    case 'Pending Review':
      return '#92400e';
    case 'Needs Revision':
      return '#991b1b';
    default:
      return '#334155';
  }
};

const SupervisorReportPanel: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '18px 22px',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
        }}
      >
        <div>
          <div style={{ fontSize: '12px', letterSpacing: '0.12em', color: '#64748b', textTransform: 'uppercase' }}>
            Supervisor Mark Sheets
          </div>
          <h3 style={{ margin: '8px 0 0', fontSize: '26px', color: '#0f172a' }}>
            Final reports grouped by supervisor
          </h3>
        </div>

        <button
          style={{
            border: 'none',
            background: '#2563eb',
            color: '#fff',
            borderRadius: '10px',
            padding: '12px 18px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
          onClick={() => alert('This is a frontend preview. Backend PDF generation will be added next.')}
        >
          Download all reports
        </button>
      </div>

      {supervisors.map((supervisor) => (
        <div
          key={supervisor.id}
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '18px 20px',
              background: 'linear-gradient(135deg, #f8fafc 0%, #eef4ff 100%)',
              borderBottom: '1px solid #e2e8f0',
            }}
          >
            <div>
              <div style={{ fontSize: '13px', color: '#475569', marginBottom: '4px' }}>
                Academic Supervisor
              </div>
              <h4 style={{ margin: 0, fontSize: '22px', color: '#0f172a' }}>{supervisor.name}</h4>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  backgroundColor: '#dbeafe',
                  color: '#1d4ed8',
                  borderRadius: '999px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                {supervisor.academicLevel}
              </div>

              <button
                style={{
                  border: 'none',
                  background: '#0f172a',
                  color: '#fff',
                  borderRadius: '10px',
                  padding: '10px 16px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                onClick={() => alert(`Download ${supervisor.name}'s report`)}
              >
                Download {supervisor.name}'s Report
              </button>
            </div>
          </div>

          <div style={{ padding: '18px 20px 24px' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                backgroundColor: '#fff',
              }}
            >
              <thead>
                <tr style={{ backgroundColor: '#f8fafc' }}>
                  <th style={tableHeadStyle}>Group ID</th>
                  <th style={tableHeadStyle}>Project Title</th>
                  <th style={tableHeadStyle}>Stage</th>
                  <th style={tableHeadStyle}>Average Mark</th>
                  <th style={tableHeadStyle}>Evaluation Status</th>
                </tr>
              </thead>

              <tbody>
                {supervisor.groups.map((group, index) => (
                  <tr
                    key={`${supervisor.id}-${group.groupId}`}
                    style={{
                      borderBottom: index === supervisor.groups.length - 1 ? 'none' : '1px solid #e2e8f0',
                    }}
                  >
                    <td style={tableCellStyle}>{group.groupId}</td>
                    <td style={tableCellStyle}>{group.title}</td>
                    <td style={tableCellStyle}>{group.stage}</td>
                    <td style={tableCellStyle}>{group.averageMark}/100</td>
                    <td style={tableCellStyle}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '130px',
                          padding: '6px 10px',
                          borderRadius: '999px',
                          backgroundColor: getStatusColor(group.evaluationStatus),
                          color: getStatusTextColor(group.evaluationStatus),
                          fontSize: '12px',
                          fontWeight: 700,
                        }}
                      >
                        {group.evaluationStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};

const tableHeadStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '12px 14px',
  fontSize: '12px',
  letterSpacing: '0.08em',
  fontWeight: 700,
  color: '#475569',
  textTransform: 'uppercase',
  borderBottom: '1px solid #e2e8f0',
};

const tableCellStyle: React.CSSProperties = {
  padding: '14px',
  fontSize: '14px',
  color: '#0f172a',
  verticalAlign: 'middle',
};

export default SupervisorReportPanel;
