import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BarChart3,
  CheckCircle2,
  GraduationCap,
  Layers,
  TrendingUp,
  Users,
} from 'lucide-react';

// Grading Scale definition
interface GradeDefinition {
  min: number;
  max: number;
  letter: string;
  badgeBg: string;
  badgeColor: string;
  borderColor: string;
}

const GRADING_SCALE: GradeDefinition[] = [
  { min: 85, max: 100, letter: 'A+', badgeBg: '#dcfce7', badgeColor: '#15803d', borderColor: '#86efac' },
  { min: 75, max: 84.99, letter: 'A', badgeBg: '#ecfdf5', badgeColor: '#047857', borderColor: '#a7f3d0' },
  { min: 70, max: 74.99, letter: 'A-', badgeBg: '#f0fdf4', badgeColor: '#16a34a', borderColor: '#bbf7d0' },
  { min: 65, max: 69.99, letter: 'B+', badgeBg: '#eff6ff', badgeColor: '#1d4ed8', borderColor: '#bfdbfe' },
  { min: 60, max: 64.99, letter: 'B', badgeBg: '#f0f9ff', badgeColor: '#0369a1', borderColor: '#bae6fd' },
  { min: 55, max: 59.99, letter: 'B-', badgeBg: '#e0f2fe', badgeColor: '#0284c7', borderColor: '#7dd3fc' },
  { min: 50, max: 54.99, letter: 'C+', badgeBg: '#fef3c7', badgeColor: '#b45309', borderColor: '#fde68a' },
  { min: 45, max: 49.99, letter: 'C', badgeBg: '#fffbeb', badgeColor: '#d97706', borderColor: '#fef08a' },
  { min: 40, max: 44.99, letter: 'C-', badgeBg: '#ffedd5', badgeColor: '#c2410c', borderColor: '#fed7aa' },
  { min: 35, max: 39.99, letter: 'D', badgeBg: '#f1f5f9', badgeColor: '#475569', borderColor: '#cbd5e1' },
  { min: 0, max: 34.99, letter: 'I', badgeBg: '#fee2e2', badgeColor: '#b91c1c', borderColor: '#fca5a5' },
];

const calculateGrade = (finalScore: number): GradeDefinition => {
  const score = Math.max(0, Math.min(100, Math.round(finalScore * 100) / 100));
  for (const grade of GRADING_SCALE) {
    if (score >= grade.min && score <= grade.max) return grade;
  }
  return GRADING_SCALE[GRADING_SCALE.length - 1];
};

type DegreeType = 'ALL' | 'IT' | 'AI' | 'ITM';

interface EvaluatorMarkItem {
  evaluator_name: string;
  mark: number;
  total_marks?: number;
  feedback?: string;
}

interface StageData {
  stage_id: number | string;
  stage_name: string;
  average_mark: number | null;
  total_marks?: number;
  evaluator_count?: number;
  evaluators?: EvaluatorMarkItem[];
}

interface StudentReportItem {
  student_id: number | string;
  student_name: string;
  university_id: string;
  email?: string;
  group_id: number | string;
  group_name: string;
  degree: 'IT' | 'AI' | 'ITM';
  is_leader: boolean;
  stages: { [stageId: string]: StageData };
  sum_obtained_marks: number;
  sum_total_max_marks: number;
  final_mark: number;
  gradeInfo: GradeDefinition;
}

interface CanonicalStage {
  canonical_id: string;
  stage_name: string;
  raw_stage_ids: Array<string | number>;
}

interface SupervisorReportPanelProps {
  levelNumber?: number;
}

const SupervisorReportPanel: React.FC<SupervisorReportPanelProps> = ({ levelNumber = 2 }) => {
  const [students, setStudents] = useState<StudentReportItem[]>([]);
  const [stages, setStages] = useState<Array<{ stage_id: string; stage_name: string }>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedDegree, setSelectedDegree] = useState<DegreeType>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('ALL');

  const inferDegree = (item: any): 'IT' | 'AI' | 'ITM' => {
    const unit = String(item.academic_unit || item.degree || '').trim().toUpperCase();
    if (unit === 'ITM' || unit.includes('ITM') || unit.includes('MANAGEMENT')) return 'ITM';
    if (unit === 'AI' || unit.includes('AI') || unit.includes('ARTIFICIAL')) return 'AI';
    if (unit === 'IT' || unit.includes('INFORMATION')) return 'IT';

    const groupDept = (
      String(item.group_department || '') + ' ' + String(item.department || '') + ' ' + String(item.group_name || '') + ' ' + String(item.university_id || '')
    ).toUpperCase();

    if (groupDept.includes('ITM') || groupDept.includes('MANAGEMENT') || groupDept.includes('CYGEN')) return 'ITM';
    if (groupDept.includes('AI') || groupDept.includes('ARTIFICIAL')) return 'AI';
    if (groupDept.includes('IT')) return 'IT';
    return 'ITM';
  };

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/marks/summary/level/${levelNumber}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      });

      if (!response.ok) {
        setStudents([]);
        setStages([]);
        return;
      }

      const payload = await response.json();
      const rawStages: any[] = Array.isArray(payload.stages) ? payload.stages : [];
      const rawData: any[] = Array.isArray(payload.data) ? payload.data : [];

      // Build canonical stage groups by normalized stage name
      const canonicalByKey = new Map<string, CanonicalStage>();
      rawStages.forEach((stg, idx) => {
        const rawName = String(stg.stage_name || '').trim();
        const key = rawName.toLowerCase();
        if (!canonicalByKey.has(key)) {
          canonicalByKey.set(key, { canonical_id: `c_${key}`, stage_name: rawName || `Stage ${idx + 1}`, raw_stage_ids: [stg.stage_id] });
        } else {
          const c = canonicalByKey.get(key)!;
          if (!c.raw_stage_ids.includes(stg.stage_id)) c.raw_stage_ids.push(stg.stage_id);
        }
      });

      const canonicalStages = Array.from(canonicalByKey.values());
      setStages(canonicalStages.map((c) => ({ stage_id: c.canonical_id, stage_name: c.stage_name })));

      // Helper to safely read student stage evaluator marks
      const normalizeStudent = (item: any): StudentReportItem => {
        const degree = inferDegree(item) as any;
        const canonicalStagesMap: Record<string, StageData> = {};
        let sumObtained = 0;
        let sumMax = 0;

        canonicalStages.forEach((cStg) => {
          // Collect evaluators across raw stage ids
          const combinedEvaluators: EvaluatorMarkItem[] = [];
          let stageTotalMax = 0;

          cStg.raw_stage_ids.forEach((rawId) => {
            // item.stages may be an object keyed by rawId or an array — handle both
            const rawStageData = (item.stages && item.stages[rawId]) || (Array.isArray(item.stages) && item.stages.find((s: any) => String(s.stage_id) === String(rawId))) || null;
            if (rawStageData) {
              // Accept 'evaluators' array or 'marks' array
              const evals: any[] = rawStageData.evaluators || rawStageData.marks || rawStageData.evaluator_marks || [];
              if (Array.isArray(evals)) {
                evals.forEach((e) => {
                  if (e && typeof e.mark === 'number') combinedEvaluators.push({ evaluator_name: e.evaluator_name || e.name || 'Evaluator', mark: Number(e.mark), total_marks: e.total_marks });
                });
              }
              if (typeof rawStageData.total_marks === 'number') {
                stageTotalMax += Number(rawStageData.total_marks);
              } else if (typeof rawStageData.max_marks === 'number') {
                stageTotalMax += Number(rawStageData.max_marks);
              }
            }
          });

          let avg = null as number | null;
          if (combinedEvaluators.length > 0) {
            const s = combinedEvaluators.reduce((acc, x) => acc + (Number(x.mark) || 0), 0) / combinedEvaluators.length;
            avg = Number(s.toFixed(2));
            sumObtained += avg;
          }

          // If no explicit stageTotalMax, try to find in rawStages first matching any raw id
          if (stageTotalMax === 0) {
            const found = rawStages.find((rs) => cStg.raw_stage_ids.includes(rs.stage_id));
            if (found && typeof found.max_marks === 'number') stageTotalMax = Number(found.max_marks);
          }
          if (stageTotalMax === 0) stageTotalMax = 100; // safe fallback
          sumMax += stageTotalMax;

          canonicalStagesMap[cStg.canonical_id] = {
            stage_id: cStg.canonical_id,
            stage_name: cStg.stage_name,
            average_mark: avg,
            total_marks: stageTotalMax,
            evaluator_count: combinedEvaluators.length,
            evaluators: combinedEvaluators,
          };
        });

        // Final mark calculation
        let finalScore = 0;
        if (sumMax > 0) {
          finalScore = (sumObtained / sumMax) * 100;
        } else if (item.final_mark !== undefined && item.final_mark !== null) {
          finalScore = Number(item.final_mark);
        }

        const roundedFinal = Number(finalScore.toFixed(2));
        const gradeInfo = calculateGrade(roundedFinal);

        return {
          student_id: item.student_id,
          student_name: item.student_name || `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'Unknown',
          university_id: item.university_id || 'N/A',
          email: item.email || '',
          group_id: item.group_id || item.group || 'N/A',
          group_name: item.group_name || item.group_name || item.group || 'Group',
          degree: degree,
          is_leader: Boolean(item.is_leader),
          stages: canonicalStagesMap,
          sum_obtained_marks: Number(sumObtained.toFixed(2)),
          sum_total_max_marks: Number(sumMax.toFixed(2)),
          final_mark: roundedFinal,
          gradeInfo,
        };
      };

      const processed: StudentReportItem[] = rawData.map((it) => normalizeStudent(it));
      setStudents(processed);
    } catch (err) {
      console.error('Error fetching marks reports:', err);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelNumber]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchDegree = selectedDegree === 'ALL' || s.degree === selectedDegree;
      const matchSearch =
        searchQuery === '' ||
        s.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.university_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.group_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchGrade = selectedGradeFilter === 'ALL' || s.gradeInfo.letter === selectedGradeFilter;
      return matchDegree && matchSearch && matchGrade;
    });
  }, [students, selectedDegree, searchQuery, selectedGradeFilter]);

  const degreeStudents = useMemo(() => students.filter((s) => selectedDegree === 'ALL' || s.degree === selectedDegree), [students, selectedDegree]);

  const degreeStats = useMemo(() => {
    const total = degreeStudents.length;
    if (total === 0) return { total: 0, avgMark: 0, passCount: 0, passRate: 0, gradeCounts: {} as Record<string, number>, gradePercentages: {} as Record<string, number> };
    const sumMarks = degreeStudents.reduce((acc, s) => acc + s.final_mark, 0);
    const passCount = degreeStudents.filter((s) => s.gradeInfo.letter !== 'I').length;
    const gradeCounts: Record<string, number> = {};
    GRADING_SCALE.forEach((g) => {
      gradeCounts[g.letter] = 0;
    });
    degreeStudents.forEach((s) => {
      const letter = s.gradeInfo.letter;
      gradeCounts[letter] = (gradeCounts[letter] || 0) + 1;
    });
    const gradePercentages: Record<string, number> = {};
    Object.keys(gradeCounts).forEach((letter) => {
      gradePercentages[letter] = Number(((gradeCounts[letter] / total) * 100).toFixed(1));
    });
    return { total, avgMark: Number((sumMarks / total).toFixed(2)), passCount, passRate: Number(((passCount / total) * 100).toFixed(1)), gradeCounts, gradePercentages };
  }, [degreeStudents]);

  const countsByDegree = useMemo(() => ({ ALL: students.length, IT: students.filter((s) => s.degree === 'IT').length, AI: students.filter((s) => s.degree === 'AI').length, ITM: students.filter((s) => s.degree === 'ITM').length }), [students]);

  const handleExportCSV = () => {
    if (filteredStudents.length === 0) {
      alert('No student marks available to export.');
      return;
    }

    const headers = [
      'Student Name',
      'Reg / Index No',
      'Degree Program',
      'Project Group',
      ...stages.map((st) => `${st.stage_name} (Evaluator Marks & Avg)`),
      'Obtained Marks',
      'Total Max Marks',
      'Final Mark (%)',
      'Letter Grade',
      'Status',
    ];

    const rows = filteredStudents.map((s) => {
      const stageCols = stages.map((st) => {
        const data = s.stages[st.stage_id];
        if (data && data.average_mark !== null) {
          const evalStr = data.evaluators && data.evaluators.length > 0 ? data.evaluators.map((e, i) => `E${i + 1}(${e.evaluator_name}): ${e.mark}`).join('; ') + ` | Avg: ${data.average_mark}` : `${data.average_mark}`;
          return `"${evalStr}"`;
        }
        return '"—"';
      });

      return [
        `"${s.student_name}"`,
        `"${s.university_id}"`,
        `"${s.degree}"`,
        `"${s.group_name}"`,
        ...stageCols,
        s.sum_obtained_marks,
        s.sum_total_max_marks,
        s.final_mark,
        `"${s.gradeInfo.letter}"`,
        s.gradeInfo.letter !== 'I' ? 'Pass' : 'I (Incomplete)',
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Level_${levelNumber}_${selectedDegree}_Marks_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <h2 style={{ margin: 0, color: '#0f172a', fontSize: '22px', fontWeight: '700' }}>Level {levelNumber} — Coordinator Marks & Grade Reports</h2>
        </div>
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '60px 24px',
            border: '1px solid #e2e8f0',
            textAlign: 'center',
            color: '#64748b',
            fontSize: '14px',
          }}
        >
          Loading evaluation reports...
        </div>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <h2 style={{ margin: 0, color: '#0f172a', fontSize: '22px', fontWeight: '700' }}>Level {levelNumber} — Coordinator Marks & Grade Reports</h2>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '64px 24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              marginBottom: '4px',
            }}
          >
            <BarChart3 size={28} />
          </div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>No evaluation records yet</h3>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748b', maxWidth: '420px' }}>No evaluation marks or student records have been submitted for Level {levelNumber} yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h2 style={{ margin: 0, color: '#0f172a', fontSize: '22px', fontWeight: '700' }}>Level {levelNumber} — Coordinator Marks & Grade Reports</h2>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleExportCSV}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '9px 18px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#16a34a',
              color: '#ffffff',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '0 2px 5px rgba(22, 163, 74, 0.25)',
            }}
          >
            Download CSV
          </button>
        </div>
      </div>

      {/* Degree Tabs */}
      <div style={{ display: 'flex', gap: 12, borderBottom: '2px solid #e2e8f0', paddingBottom: 8 }}>
        {(['ALL', 'IT', 'AI', 'ITM'] as DegreeType[]).map((deg) => (
          <button
            key={deg}
            type="button"
            onClick={() => setSelectedDegree(deg)}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: 'transparent',
              borderBottom: selectedDegree === deg ? '3px solid #2563eb' : '3px solid transparent',
              color: selectedDegree === deg ? '#2563eb' : '#64748b',
              fontWeight: selectedDegree === deg ? 700 : 600,
              cursor: 'pointer',
            }}
          >
            {deg === 'ALL' ? `All Degrees (${countsByDegree.ALL})` : `${deg} — (${(countsByDegree as any)[deg] || 0})`}
          </button>
        ))}
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 18, border: '1px solid #e2e8f0' }}>
          <div style={{ color: '#64748b', fontSize: 13 }}>Total Enrolled</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{degreeStats.total} <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>students</span></div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: 18, border: '1px solid #e2e8f0' }}>
          <div style={{ color: '#64748b', fontSize: 13 }}>Average Score</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{degreeStats.avgMark}%</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: 18, border: '1px solid #e2e8f0' }}>
          <div style={{ color: '#64748b', fontSize: 13 }}>Pass Rate</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{degreeStats.passRate}% <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>({degreeStats.passCount}/{degreeStats.total})</span></div>
        </div>
      </div>

      {/* Grade distribution bar and tiles */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 18, border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16 }}>📊 {selectedDegree === 'ALL' ? 'Overall' : selectedDegree} Grade Distribution & Percentages</h3>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: 13 }}>Proportion and count of students falling into each letter grade bracket.</p>
          </div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Total Cohort: <strong>{degreeStats.total} students</strong></div>
        </div>

        <div style={{ marginTop: 12, height: 14, background: '#e6f4ea', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#16a34a', width: `${degreeStats.total > 0 ? 100 : 0}%` }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 12, marginTop: 12 }}>
          {GRADING_SCALE.map((g) => (
            <div key={g.letter} style={{ background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #eef2f7', textAlign: 'center' }}>
              <div style={{ fontWeight: 700, color: g.badgeColor }}>{g.letter}</div>
              <div style={{ color: '#64748b', fontSize: 13 }}>{(degreeStats.gradePercentages[g.letter] || 0)}%</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>{(degreeStats.gradeCounts[g.letter] || 0)} students</div>
            </div>
          ))}
        </div>
      </div>

      {/* Search + table */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 18, border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Student Marksheet ({filteredStudents.length})</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input placeholder="Search name, index, group..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #e6edf3' }} />
            <button onClick={handleExportCSV} style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 8 }}>Download CSV</button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #eef2f7' }}>
                <th style={{ padding: '12px' }}>Student Details</th>
                <th style={{ padding: '12px' }}>Reg / Index No</th>
                <th style={{ padding: '12px' }}>Degree</th>
                <th style={{ padding: '12px' }}>Project Group</th>
                {stages.map((st) => (
                  <th key={st.stage_id} style={{ padding: '12px' }}>{st.stage_name}<div style={{ fontSize: 12, color: '#94a3b8' }}>Evaluator Marks & Avg</div></th>
                ))}
                <th style={{ padding: '12px' }}>Final Mark (%)</th>
                <th style={{ padding: '12px' }}>Letter Grade</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((s) => (
                <tr key={String(s.student_id)} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 12 }}>
                    <div style={{ fontWeight: 700 }}>{s.student_name} {s.is_leader && <span style={{ background: '#e6f4ea', color: '#16a34a', padding: '2px 6px', borderRadius: 6, marginLeft: 8, fontSize: 12 }}>Leader</span>}</div>
                  </td>
                  <td style={{ padding: 12 }}>{s.university_id}</td>
                  <td style={{ padding: 12 }}>{s.degree}</td>
                  <td style={{ padding: 12 }}>{s.group_name}</td>
                  {stages.map((st) => {
                    const data = s.stages[st.stage_id];
                    return (
                      <td key={st.stage_id} style={{ padding: 12, verticalAlign: 'top' }}>
                        {data && data.evaluators && data.evaluators.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {data.evaluators!.map((e, i) => (
                                <span key={i} style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: 6, fontSize: 12 }}>{`E${i + 1}: ${e.mark}`}</span>
                              ))}
                            </div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>Avg: {data.average_mark !== null ? `${data.average_mark}/${data.total_marks ?? ''}` : '—'}</div>
                          </div>
                        ) : (
                          <div style={{ color: '#94a3b8' }}>—</div>
                        )}
                      </td>
                    );
                  })}
                  <td style={{ padding: 12 }}>{s.final_mark}%</td>
                  <td style={{ padding: 12 }}><span style={{ background: '#ecfdf5', color: '#047857', padding: '6px 8px', borderRadius: 8 }}>{s.gradeInfo.letter}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SupervisorReportPanel;
