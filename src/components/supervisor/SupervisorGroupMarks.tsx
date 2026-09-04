import React, { useEffect, useState } from 'react';
import { Users, Award, FileSpreadsheet, CheckCircle2, User } from 'lucide-react';

interface StudentMarkDetail {
  student_id: number | string;
  student_name: string;
  university_id: string;
  email: string;
  is_leader: boolean;
  degree: 'IT' | 'AI' | 'ITM';
  stages: {
    [stageId: string]: {
      stage_name: string;
      mark: number | null;
      total_marks: number;
      evaluators?: Array<{ evaluator_name: string; mark: number; total_marks?: number }>;
    };
  };
  sum_obtained: number;
  sum_max: number;
  final_mark: number | null;
  letter_grade: string;
  gradeBadge: {
    bg: string;
    color: string;
    border: string;
  };
}

interface GroupMarksSection {
  group_id: number | string;
  group_name: string;
  degree: 'IT' | 'AI' | 'ITM';
  leader_name: string;
  member_count: number;
  students: StudentMarkDetail[];
  group_avg: number | null;
}

interface CanonicalStage {
  canonical_id: string | number;
  stage_name: string;
  raw_ids: Array<string | number>;
}

interface SupervisorGroupMarksProps {
  levelNumber?: number;
  supervisorId?: string | number;
  supervisorName?: string;
  assignedGroups?: Array<{
    id: number | string;
    name: string;
    leader?: string;
    members?: string;
    memberCount?: number;
    degree?: string;
    academic_unit?: string;
  }>;
}

// DHU / UoM Grade Scale
const calculateGrade = (finalScore: number | null) => {
  if (finalScore === null || finalScore === undefined) {
    return {
      letter: 'Pending',
      bg: '#f1f5f9',
      color: '#64748b',
      border: '#cbd5e1',
    };
  }
  if (finalScore >= 85) return { letter: 'A+', bg: '#dcfce7', color: '#15803d', border: '#86efac' };
  if (finalScore >= 75) return { letter: 'A', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' };
  if (finalScore >= 70) return { letter: 'A-', bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };
  if (finalScore >= 65) return { letter: 'B+', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
  if (finalScore >= 60) return { letter: 'B', bg: '#f0f9ff', color: '#0369a1', border: '#bae6fd' };
  if (finalScore >= 55) return { letter: 'B-', bg: '#e0f2fe', color: '#0284c7', border: '#7dd3fc' };
  if (finalScore >= 50) return { letter: 'C+', bg: '#fefce8', color: '#a16207', border: '#fef08a' };
  if (finalScore >= 45) return { letter: 'C', bg: '#fef9c3', color: '#854d0e', border: '#fde047' };
  if (finalScore >= 40) return { letter: 'C-', bg: '#fef08a', color: '#713f12', border: '#facc15' };
  if (finalScore > 0) return { letter: 'D', bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' };
  return { letter: 'I', bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1' };
};

const inferDegree = (item: any): 'IT' | 'AI' | 'ITM' => {
  const unit = String(item.academic_unit || item.degree || '').trim().toUpperCase();
  if (unit === 'ITM' || unit.includes('ITM') || unit.includes('MANAGEMENT')) return 'ITM';
  if (unit === 'AI' || unit.includes('AI') || unit.includes('ARTIFICIAL')) return 'AI';
  if (unit === 'IT' || unit.includes('INFORMATION')) return 'IT';

  const grp = (
    String(item.group_department || '') + ' ' +
    String(item.department || '') + ' ' +
    String(item.group_name || '') + ' ' +
    String(item.name || '')
  ).toUpperCase();
  if (grp.includes('ITM') || grp.includes('MANAGEMENT') || grp.includes('CYGEN')) return 'ITM';
  if (grp.includes('AI') || grp.includes('ARTIFICIAL')) return 'AI';
  if (grp.includes('IT')) return 'IT';

  return 'ITM';
};

const degreeBadgeStyle = (deg: 'IT' | 'AI' | 'ITM') => {
  if (deg === 'IT') {
    return {
      bg: '#e0f2fe',
      color: '#0369a1',
      border: '#bae6fd',
      label: 'IT — Information Technology',
    };
  }
  if (deg === 'AI') {
    return {
      bg: '#f3e8ff',
      color: '#6b21a8',
      border: '#e9d5ff',
      label: 'AI — Artificial Intelligence',
    };
  }
  return {
    bg: '#fef3c7',
    color: '#92400e',
    border: '#fde68a',
    label: 'ITM — Info Tech & Management',
  };
};

const SupervisorGroupMarks: React.FC<SupervisorGroupMarksProps> = ({
  levelNumber = 2,
  supervisorId,
  supervisorName,
  assignedGroups = [],
}) => {
  const [stages, setStages] = useState<CanonicalStage[]>([]);
  const [groupSections, setGroupSections] = useState<GroupMarksSection[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchGroupMarks = async () => {
    setLoading(true);
    try {
      // 1. Collect supervised group IDs and names
      const myGroupNames = new Set(
        assignedGroups.map((g) => g.name.trim().toLowerCase()).filter(Boolean)
      );
      const myGroupIds = new Set(
        assignedGroups.map((g) => String(g.id).trim()).filter(Boolean)
      );

      // Pre-fetch supervisor group list if needed
      if (myGroupNames.size === 0 && myGroupIds.size === 0 && supervisorId) {
        try {
          const grpRes = await fetch(
            `http://localhost:5000/api/groupdetailstosupervisordashboard/level/${levelNumber}/supervisor/${encodeURIComponent(
              String(supervisorId)
            )}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
              },
            }
          );
          if (grpRes.ok) {
            const grpPayload = await grpRes.json();
            const grpList: any[] = Array.isArray(grpPayload)
              ? grpPayload
              : Array.isArray(grpPayload?.data)
              ? grpPayload.data
              : Array.isArray(grpPayload?.groups)
              ? grpPayload.groups
              : [];
            grpList.forEach((g: any) => {
              const name = String(g.group_name ?? g.groupName ?? g.name ?? '').trim().toLowerCase();
              const id = String(g.group_id ?? g.groupId ?? g.id ?? '').trim();
              if (name) myGroupNames.add(name);
              if (id) myGroupIds.add(id);
            });
          }
        } catch (e) {
          console.warn('Could not fetch supervisor groups:', e);
        }
      }

      // 2. Fetch marks summary
      const response = await fetch(`http://localhost:5000/api/marks/summary/level/${levelNumber}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });

      if (response.ok) {
        const payload = await response.json();
        const rawStages: any[] = Array.isArray(payload.stages) ? payload.stages : [];
        const rawStudents: any[] = Array.isArray(payload.data) ? payload.data : [];

        // 3. Deduplicate and group stages
        const stageGroupMap = new Map<string, CanonicalStage>();
        rawStages.forEach((stg: any) => {
          const rawName = String(stg.stage_name || '').trim();
          const normalizedKey = rawName.toLowerCase();
          const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();

          if (!stageGroupMap.has(normalizedKey)) {
            stageGroupMap.set(normalizedKey, {
              canonical_id: stg.stage_id,
              stage_name: displayName,
              raw_ids: [stg.stage_id],
            });
          } else {
            stageGroupMap.get(normalizedKey)!.raw_ids.push(stg.stage_id);
          }
        });

        const canonicalList = Array.from(stageGroupMap.values()).sort((a, b) => {
          const order = ['proposal', 'interim', 'final'];
          const idxA = order.indexOf(a.stage_name.toLowerCase());
          const idxB = order.indexOf(b.stage_name.toLowerCase());
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          return a.stage_name.localeCompare(b.stage_name);
        });

        setStages(canonicalList);

        // 4. Collect evaluation panels for this level
        let rawPanels: any[] = Array.isArray(payload.panels) ? payload.panels : [];
        if (rawPanels.length === 0) {
          try {
            const calRes = await fetch(`http://localhost:5000/api/calendar/all`, {
              headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
            });
            if (calRes.ok) {
              const calData = await calRes.json();
              rawPanels = Array.isArray(calData) ? calData : [];
            }
          } catch (e) {
            console.warn("Fallback calendar panels fetch:", e);
          }
        }

        // Map of group name (lowercase) to its completed evaluation panels
        const completedPanelsByGroup = new Map<string, any[]>();
        rawPanels.forEach((p: any) => {
          const status = String(p.status || '').trim().toLowerCase();
          const pLevel = String(p.academic_level ?? p.level ?? '').trim();
          if (pLevel && String(levelNumber) !== pLevel) {
            return;
          }
          if (status === 'completed' || status === 'complete') {
            const tGroup = String(p.target_group || '').trim().toLowerCase();
            if (!completedPanelsByGroup.has(tGroup)) {
              completedPanelsByGroup.set(tGroup, []);
            }
            completedPanelsByGroup.get(tGroup)!.push(p);
          }
        });

        // 5. Filter students to supervised groups only
        const isMyStudent = (item: any): boolean => {
          const gId = String(item.group_id ?? item.groupId ?? '').trim();
          if (gId && myGroupIds.has(gId)) return true;

          const gName = String(item.group_name ?? item.groupName ?? '').trim().toLowerCase();
          if (gName && myGroupNames.has(gName)) return true;

          const supId = String(item.supervisor_id ?? item.supervisorId ?? item.assigned_supervisor_id ?? '').trim();
          const supId2 = String(item.supervisor_id_2 ?? item.supervisorId2 ?? '').trim();
          if (supervisorId && ((supId && String(supervisorId).trim() === supId) || (supId2 && String(supervisorId).trim() === supId2))) {
            return true;
          }

          const supName = String(item.supervisor_name ?? item.supervisorName ?? item.assigned_supervisor_name ?? '').trim().toLowerCase();
          const supName2 = String(item.supervisor_name_2 ?? item.supervisorName2 ?? '').trim().toLowerCase();
          if (supervisorName) {
            const sNameLower = supervisorName.trim().toLowerCase();
            if (supName && supName.includes(sNameLower)) return true;
            if (supName2 && supName2.includes(sNameLower)) return true;
          }

          // Check if panel lists this supervisor
          if (gName && rawPanels.length > 0) {
            const hasPanelSup = rawPanels.some((p) => {
              if (String(p.target_group || '').trim().toLowerCase() !== gName) return false;
              if (p.supervisors) {
                const sStr = typeof p.supervisors === 'string' ? p.supervisors.toLowerCase() : JSON.stringify(p.supervisors).toLowerCase();
                if (supervisorName && sStr.includes(supervisorName.trim().toLowerCase())) return true;
                if (supervisorId && sStr.includes(String(supervisorId))) return true;
              }
              return false;
            });
            if (hasPanelSup) return true;
          }

          if (!supervisorId && !supervisorName && myGroupNames.size === 0 && myGroupIds.size === 0) {
            return true;
          }

          return false;
        };

        // Only show groups that have an evaluation panel set AND status = 'completed'
        const supervisedStudents = rawStudents
          .filter(isMyStudent)
          .filter((item: any) => {
            const gName = String(item.group_name || item.groupName || '').trim().toLowerCase();
            return completedPanelsByGroup.has(gName) && completedPanelsByGroup.get(gName)!.length > 0;
          });

        // 6. Group students by Group Name
        const groupsMap = new Map<string, GroupMarksSection>();

        supervisedStudents.forEach((item: any) => {
          const groupName = String(item.group_name || item.groupName || 'Unassigned Group').trim();
          const groupId = item.group_id ?? item.groupId ?? groupName;
          const degree = inferDegree(item);
          const groupCompletedPanels = completedPanelsByGroup.get(groupName.toLowerCase()) || [];

          // Process student's stage marks
          const studentStages: { [key: string]: any } = {};
          let sumObtained = 0;
          let sumMax = 0;
          let hasAnyMark = false;

          canonicalList.forEach((cStg) => {
            // Check if this specific stage has a completed evaluation panel
            const isStageCompleted = groupCompletedPanels.some((p: any) => {
              const pType = String(p.evaluation_type || '').trim().toLowerCase();
              const sName = cStg.stage_name.toLowerCase();
              return pType === sName || sName.includes(pType) || pType.includes(sName);
            });

            const evaluators: any[] = [];
            let stageTotal = 100;

            if (isStageCompleted && item.stages) {
              cStg.raw_ids.forEach((rId) => {
                const sData = item.stages[rId] || item.stages[String(rId)];
                if (sData) {
                  if (sData.total_marks) stageTotal = Number(sData.total_marks);
                  if (Array.isArray(sData.evaluators) && sData.evaluators.length > 0) {
                    sData.evaluators.forEach((ev: any) => {
                      if (!evaluators.some((e) => e.evaluator_name === ev.evaluator_name && e.mark === ev.mark)) {
                        evaluators.push({
                          evaluator_name: ev.evaluator_name || 'Evaluator',
                          mark: Number(ev.mark),
                          total_marks: Number(ev.total_marks) || stageTotal,
                        });
                      }
                    });
                  } else if (sData.average_mark !== null && sData.average_mark !== undefined) {
                    evaluators.push({
                      evaluator_name: 'Evaluator',
                      mark: Number(sData.average_mark),
                      total_marks: stageTotal,
                    });
                  }
                }
              });
            }

            if (evaluators.length > 0) {
              const avg = evaluators.reduce((sum, e) => sum + e.mark, 0) / evaluators.length;
              const roundedAvg = Number(avg.toFixed(2));
              studentStages[cStg.canonical_id] = {
                stage_name: cStg.stage_name,
                mark: roundedAvg,
                total_marks: stageTotal,
                evaluators: evaluators,
              };
              sumObtained += roundedAvg;
              sumMax += stageTotal;
              hasAnyMark = true;
            } else {
              studentStages[cStg.canonical_id] = {
                stage_name: cStg.stage_name,
                mark: null,
                total_marks: stageTotal,
                evaluators: [],
              };
            }
          });

          let finalScore: number | null = null;
          if (sumMax > 0) {
            finalScore = Number(((sumObtained / sumMax) * 100).toFixed(2));
          } else if (item.final_mark !== undefined && item.final_mark !== null && Number(item.final_mark) > 0) {
            finalScore = Number(item.final_mark);
          } else if (hasAnyMark) {
            finalScore = 0;
          }

          const gradeObj = calculateGrade(finalScore);

          const studentObj: StudentMarkDetail = {
            student_id: item.student_id || Math.random(),
            student_name: item.student_name || 'Student',
            university_id: item.university_id || 'N/A',
            email: item.email || '',
            is_leader: Boolean(item.is_leader),
            degree: degree,
            stages: studentStages,
            sum_obtained: Number(sumObtained.toFixed(2)),
            sum_max: Number(sumMax.toFixed(2)),
            final_mark: finalScore,
            letter_grade: gradeObj.letter,
            gradeBadge: {
              bg: gradeObj.bg,
              color: gradeObj.color,
              border: gradeObj.border,
            },
          };

          if (!groupsMap.has(groupName)) {
            groupsMap.set(groupName, {
              group_id: groupId,
              group_name: groupName,
              degree: degree,
              leader_name: studentObj.is_leader ? studentObj.student_name : '',
              member_count: 1,
              students: [studentObj],
              group_avg: null,
            });
          } else {
            const grp = groupsMap.get(groupName)!;
            grp.member_count += 1;
            grp.students.push(studentObj);
            if (studentObj.is_leader) {
              grp.leader_name = studentObj.student_name;
            }
          }
        });

        // Calculate group averages
        const groupList = Array.from(groupsMap.values()).map((grp) => {
          const validFinals = grp.students.filter((s) => s.final_mark !== null).map((s) => s.final_mark as number);
          const grpAvg = validFinals.length > 0
            ? Number((validFinals.reduce((a, b) => a + b, 0) / validFinals.length).toFixed(2))
            : null;
          return {
            ...grp,
            group_avg: grpAvg,
          };
        });

        setGroupSections(groupList);
      } else {
        setGroupSections([]);
      }
    } catch (err) {
      console.error('Error fetching group marks:', err);
      setGroupSections([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupMarks();
  }, [levelNumber, supervisorId, supervisorName, JSON.stringify(assignedGroups)]);

  if (loading) {
    return (
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          padding: '48px 24px',
          textAlign: 'center',
          border: '1px solid #e2e8f0',
          color: '#64748b',
        }}
      >
        <FileSpreadsheet size={36} color="#94a3b8" style={{ margin: '0 auto 12px auto' }} />
        <div style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b' }}>
          Loading supervised groups marks...
        </div>
      </div>
    );
  }

  if (groupSections.length === 0) {
    return (
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          padding: '54px 24px',
          textAlign: 'center',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <Users size={40} color="#94a3b8" style={{ margin: '0 auto 14px auto' }} />
        <h3 style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: '700', color: '#0f172a' }}>
          No Completed Evaluations Found
        </h3>
        <p style={{ margin: 0, fontSize: '13.5px', color: '#64748b', maxWidth: '440px', marginLeft: 'auto', marginRight: 'auto' }}>
          Only supervised groups with an evaluation panel set and marked as completed are displayed here.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {groupSections.map((group) => {
        const dStyle = degreeBadgeStyle(group.degree);

        return (
          <div
            key={group.group_name}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
              overflow: 'hidden',
            }}
          >
            {/* Group Header Card Banner */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                padding: '16px 22px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              {/* Left Info: Group Name + Degree Badge + Members */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
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
                    fontWeight: '800',
                    fontSize: '15px',
                    boxShadow: '0 1px 3px rgba(37, 99, 235, 0.1)',
                  }}
                >
                  {group.group_name.charAt(0).toUpperCase()}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>
                      {group.group_name}
                    </h3>

                    {/* Degree Badge */}
                    <span
                      style={{
                        backgroundColor: dStyle.bg,
                        color: dStyle.color,
                        border: `1px solid ${dStyle.border}`,
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '3px 9px',
                        borderRadius: '6px',
                        letterSpacing: '0.03em',
                      }}
                      title={dStyle.label}
                    >
                      {group.degree}
                    </span>

                    {/* Member count */}
                    <span
                      style={{
                        backgroundColor: '#f1f5f9',
                        color: '#475569',
                        fontSize: '11px',
                        fontWeight: '600',
                        padding: '3px 8px',
                        borderRadius: '6px',
                      }}
                    >
                      {group.member_count} Members
                    </span>
                  </div>

                  {group.leader_name && (
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', fontWeight: '500' }}>
                      Leader: <strong style={{ color: '#334155' }}>{group.leader_name}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Group Average Score */}
              {group.group_avg !== null && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: '#ffffff',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                  }}
                >
                  <Award size={16} color="#2563eb" />
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                    Group Average:
                  </span>
                  <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>
                    {group.group_avg}%
                  </strong>
                </div>
              )}
            </div>

            {/* Students Marksheet Table for this Group */}
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#fdfdfd', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '12px 18px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: '180px' }}>
                      Student Name
                    </th>
                    <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: '110px' }}>
                      Index No
                    </th>
                    {stages.map((st) => (
                      <th
                        key={st.canonical_id}
                        style={{
                          padding: '12px 14px',
                          textAlign: 'center',
                          fontSize: '11px',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          minWidth: '130px',
                        }}
                      >
                        {st.stage_name}
                      </th>
                    ))}
                    <th
                      style={{
                        padding: '12px 16px',
                        textAlign: 'center',
                        backgroundColor: '#f8fafc',
                        minWidth: '110px',
                        fontSize: '11px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Final Mark
                    </th>
                    <th
                      style={{
                        padding: '12px 16px',
                        textAlign: 'center',
                        minWidth: '95px',
                        fontSize: '11px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Final Grade
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {group.students.map((student, sIdx) => (
                    <tr
                      key={student.student_id || sIdx}
                      style={{
                        borderBottom: sIdx === group.students.length - 1 ? 'none' : '1px solid #f1f5f9',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* Student Name */}
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              backgroundColor: student.is_leader ? '#eff6ff' : '#f1f5f9',
                              color: student.is_leader ? '#2563eb' : '#64748b',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: '700',
                              fontSize: '12px',
                              flexShrink: 0,
                            }}
                          >
                            {student.student_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '13.5px' }}>
                              {student.student_name}
                            </div>
                            {student.is_leader && (
                              <span
                                style={{
                                  backgroundColor: '#dbeafe',
                                  color: '#1e40af',
                                  fontSize: '10.5px',
                                  fontWeight: '700',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  display: 'inline-block',
                                  marginTop: '2px',
                                }}
                              >
                                Leader
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Index No */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', color: '#475569', fontWeight: '600' }}>
                        {student.university_id}
                      </td>

                      {/* Stage Marks */}
                      {stages.map((st) => {
                        const sData = student.stages[st.canonical_id];
                        const markVal = sData?.mark;

                        return (
                          <td
                            key={st.canonical_id}
                            style={{
                              padding: '14px 14px',
                              textAlign: 'center',
                              verticalAlign: 'middle',
                            }}
                          >
                            {markVal !== null && markVal !== undefined ? (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                                <span
                                  style={{
                                    fontWeight: '800',
                                    color: '#0f172a',
                                    fontSize: '13px',
                                    backgroundColor: '#f1f5f9',
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                  }}
                                >
                                  {markVal}
                                  {sData.total_marks && (
                                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'normal' }}>
                                      /{sData.total_marks}
                                    </span>
                                  )}
                                </span>

                                {/* Evaluator marks breakdown if available */}
                                {sData.evaluators && sData.evaluators.length > 1 && (
                                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                    {sData.evaluators.map((ev: any, eIdx: number) => (
                                      <span
                                        key={eIdx}
                                        style={{
                                          fontSize: '10px',
                                          color: '#64748b',
                                          backgroundColor: '#ffffff',
                                          border: '1px solid #e2e8f0',
                                          borderRadius: '4px',
                                          padding: '1px 4px',
                                        }}
                                        title={`${ev.evaluator_name}: ${ev.mark}`}
                                      >
                                        E{eIdx + 1}:{ev.mark}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: '#cbd5e1', fontWeight: '600' }}>—</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Final Mark */}
                      <td
                        style={{
                          padding: '14px 16px',
                          textAlign: 'center',
                          verticalAlign: 'middle',
                          backgroundColor: '#f8fafc',
                        }}
                      >
                        {student.final_mark !== null ? (
                          <span
                            style={{
                              fontWeight: '800',
                              fontSize: '13.5px',
                              color: '#0f172a',
                              backgroundColor: '#ffffff',
                              border: '1px solid #e2e8f0',
                              padding: '3px 10px',
                              borderRadius: '6px',
                              display: 'inline-block',
                            }}
                          >
                            {student.final_mark}%
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '12px' }}>—</span>
                        )}
                      </td>

                      {/* Final Grade */}
                      <td style={{ padding: '14px 16px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: '6px',
                            fontSize: '12.5px',
                            fontWeight: '800',
                            backgroundColor: student.gradeBadge.bg,
                            color: student.gradeBadge.color,
                            border: `1px solid ${student.gradeBadge.border}`,
                          }}
                        >
                          {student.letter_grade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SupervisorGroupMarks;
