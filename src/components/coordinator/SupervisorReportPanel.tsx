import React, { useEffect, useMemo, useState } from 'react';
import { 
  Award, 
  BarChart3, 
  CheckCircle2, 
  FileSpreadsheet, 
  GraduationCap, 
  Layers, 
  Search, 
  TrendingUp, 
  Users 
} from 'lucide-react';

interface SupervisorReportPanelProps {
  levelNumber?: number;
}

// Grading Scale definition strictly based on Dhofar / UoM University Grading System
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
    if (score >= grade.min && score <= grade.max) {
      return grade;
    }
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
  final_mark: number; // percentage out of 100
  gradeInfo: GradeDefinition;
}

interface CanonicalStage {
  canonical_id: string | number;
  stage_name: string;
  raw_stage_ids: Array<string | number>;
}

const SupervisorReportPanel: React.FC<SupervisorReportPanelProps> = ({ levelNumber = 2 }) => {
  const [students, setStudents] = useState<StudentReportItem[]>([]);
  const [stages, setStages] = useState<Array<{ stage_id: number | string; stage_name: string }>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedDegree, setSelectedDegree] = useState<DegreeType>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('ALL');
  // Keyed by `${group_name}::${stage_name}` — tracks which single (group,
  // stage) cell is mid-request, so only that button shows a loading state.
  const [completingKey, setCompletingKey] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Degree helper directly from users table's academic_unit column
  const inferDegree = (item: any): 'IT' | 'AI' | 'ITM' => {
    // 1. Primary: users.academic_unit
    const unit = String(item.academic_unit || item.degree || '').trim().toUpperCase();
    if (unit === 'ITM' || unit.includes('ITM') || unit.includes('MANAGEMENT')) {
      return 'ITM';
    }
    if (unit === 'AI' || unit.includes('AI') || unit.includes('ARTIFICIAL')) {
      return 'AI';
    }
    if (unit === 'IT' || unit.includes('INFORMATION')) {
      return 'IT';
    }

    // 2. Secondary fallback: group department / group name / student details
    const groupDept = (
      String(item.group_department || '') + ' ' +
      String(item.department || '') + ' ' +
      String(item.group_name || '') + ' ' +
      String(item.university_id || '')
    ).toUpperCase();

    if (groupDept.includes('ITM') || groupDept.includes('MANAGEMENT') || groupDept.includes('CYGEN')) {
      return 'ITM';
    }
    if (groupDept.includes('AI') || groupDept.includes('ARTIFICIAL')) {
      return 'AI';
    }
    if (groupDept.includes('IT')) {
      return 'IT';
    }

    return 'ITM';
  };

  // Fetch Level Marks Summary from Backend with Stage Deduplication
  const fetchReportData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/marks/summary/level/${levelNumber}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });

      if (response.ok) {
        const payload = await response.json();
        const rawStages = payload.stages || [];
        const rawData = payload.data || [];

        // 1. Deduplicate/group stages by normalized name (case-insensitive: Proposal=proposal, Interim=interim, Final=final)
        const stageGroupMap = new Map<string, CanonicalStage>();

        rawStages.forEach((stg: any) => {
          const rawName = String(stg.stage_name || '').trim();
          const normalizedKey = rawName.toLowerCase();
          const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();

          if (!stageGroupMap.has(normalizedKey)) {
            stageGroupMap.set(normalizedKey, {
              canonical_id: stg.stage_id,
              stage_name: displayName,
              raw_stage_ids: [stg.stage_id],
            });
          } else {
            stageGroupMap.get(normalizedKey)!.raw_stage_ids.push(stg.stage_id);
          }
        });

        // Natural sort order: Proposal -> Interim -> Final -> other stages
        const canonicalList = Array.from(stageGroupMap.values()).sort((a, b) => {
          const order = ['proposal', 'interim', 'final'];
          const idxA = order.indexOf(a.stage_name.toLowerCase());
          const idxB = order.indexOf(b.stage_name.toLowerCase());
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          return a.stage_name.localeCompare(b.stage_name);
        });

        setStages(canonicalList.map((s) => ({ stage_id: s.canonical_id, stage_name: s.stage_name })));

        // 2. Process student marks aggregated across canonical stages
        const processed: StudentReportItem[] = rawData.map((item: any) => {
          const degree = inferDegree(item);
          const canonicalStagesMap: { [canonicalId: string]: StageData } = {};
          let sumObtained = 0;
          let sumMax = 0;

          canonicalList.forEach((cStg) => {
            const combinedEvaluators: EvaluatorMarkItem[] = [];
            let stageTotalMax = 100;

            if (item.stages) {
              cStg.raw_stage_ids.forEach((rId) => {
                const stgData = item.stages[rId] || item.stages[String(rId)];
                if (stgData) {
                  if (stgData.total_marks) stageTotalMax = Number(stgData.total_marks);
                  if (Array.isArray(stgData.evaluators) && stgData.evaluators.length > 0) {
                    stgData.evaluators.forEach((ev: any) => {
                      if (!combinedEvaluators.some((e) => e.evaluator_name === ev.evaluator_name && e.mark === ev.mark)) {
                        combinedEvaluators.push({
                          evaluator_name: ev.evaluator_name || 'Evaluator',
                          mark: Number(ev.mark),
                          total_marks: Number(ev.total_marks) || stageTotalMax,
                          feedback: ev.feedback || '',
                        });
                      }
                    });
                  } else if (stgData.average_mark !== null && stgData.average_mark !== undefined) {
                    combinedEvaluators.push({
                      evaluator_name: 'Evaluator',
                      mark: Number(stgData.average_mark),
                      total_marks: stageTotalMax,
                      feedback: '',
                    });
                  }
                }
              });
            }

            if (combinedEvaluators.length > 0) {
              const avg = combinedEvaluators.reduce((sum, e) => sum + e.mark, 0) / combinedEvaluators.length;
              const roundedAvg = Number(avg.toFixed(2));
              canonicalStagesMap[cStg.canonical_id] = {
                stage_id: cStg.canonical_id,
                stage_name: cStg.stage_name,
                average_mark: roundedAvg,
                total_marks: stageTotalMax,
                evaluator_count: combinedEvaluators.length,
                evaluators: combinedEvaluators,
              };
              sumObtained += roundedAvg;
              sumMax += stageTotalMax;
            } else {
              canonicalStagesMap[cStg.canonical_id] = {
                stage_id: cStg.canonical_id,
                stage_name: cStg.stage_name,
                average_mark: null,
                total_marks: stageTotalMax,
                evaluator_count: 0,
                evaluators: [],
              };
            }
          });

          // Final Mark Formula: {(Sum of Stage Averages) / (Sum of Max Stage Marks)} * 100
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
            student_name: item.student_name,
            university_id: item.university_id || 'N/A',
            email: item.email || '',
            group_id: item.group_id,
            group_name: item.group_name || 'Group',
            degree: degree,
            is_leader: Boolean(item.is_leader),
            stages: canonicalStagesMap,
            sum_obtained_marks: Number(sumObtained.toFixed(2)),
            sum_total_max_marks: Number(sumMax.toFixed(2)),
            final_mark: roundedFinal,
            gradeInfo: gradeInfo,
          };
        });

        setStudents(processed);
      } else {
        console.warn('Could not fetch marks summary from API. Using empty dataset.');
        setStudents([]);
      }
    } catch (err) {
      console.error('Error fetching marks reports:', err);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [levelNumber]);

  // Filter students based on selected degree, search query, and grade filter
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchDegree = selectedDegree === 'ALL' || s.degree === selectedDegree;
      const matchSearch =
        searchQuery === '' ||
        s.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.university_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.group_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchGrade =
        selectedGradeFilter === 'ALL' || s.gradeInfo.letter === selectedGradeFilter;
      return matchDegree && matchSearch && matchGrade;
    });
  }, [students, selectedDegree, searchQuery, selectedGradeFilter]);

  // Degree-specific students subset for calculating statistics
  const degreeStudents = useMemo(() => {
    return students.filter((s) => selectedDegree === 'ALL' || s.degree === selectedDegree);
  }, [students, selectedDegree]);

  // Calculate Grade Distribution Percentages & Statistics for Degree
  const degreeStats = useMemo(() => {
    const total = degreeStudents.length;
    if (total === 0) {
      return {
        total: 0,
        avgMark: 0,
        passCount: 0,
        passRate: 0,
        gradeCounts: {} as Record<string, number>,
        gradePercentages: {} as Record<string, number>,
      };
    }

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

    return {
      total,
      avgMark: Number((sumMarks / total).toFixed(2)),
      passCount,
      passRate: Number(((passCount / total) * 100).toFixed(1)),
      gradeCounts,
      gradePercentages,
    };
  }, [degreeStudents]);

  // Degree Counts
  const countsByDegree = useMemo(() => {
    return {
      ALL: students.length,
      IT: students.filter((s) => s.degree === 'IT').length,
      AI: students.filter((s) => s.degree === 'AI').length,
      ITM: students.filter((s) => s.degree === 'ITM').length,
    };
  }, [students]);

  // Proposal/Interim/Code Review/Final each happen at genuinely different
  // points in the year for a given group, so completion is per (group,
  // stage) — NOT deferred until Final — otherwise an already-finished
  // Proposal panel from months ago would keep sitting on the Calendar as
  // "upcoming" until Final finally happens. Only affects the one group
  // whose row this was clicked from, never the whole level.
  const handleCompleteGroupStage = async (groupName: string, stageName: string) => {
    const key = `${groupName}::${stageName}`;

    const confirmed = window.confirm(
      `Mark ${stageName} complete for "${groupName}"?\n\nThis removes just this stage's panel from the Calendar for this group.`,
    );
    if (!confirmed) return;

    setCompletingKey(key);
    try {
      const response = await fetch('http://localhost:5000/api/calendar/panels/complete-for-groups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: levelNumber, groupNames: [groupName], stageName }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to complete panel.');
      }
      alert(`Done — ${result.panelsUpdated} panel(s) removed from the Calendar for "${groupName}".`);
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setCompletingKey(null);
    }
  };

  // Download the server-generated "Marks Distribution Report" PDF (summary
  // stats + a histogram/bell-curve chart, rendered entirely server-side —
  // no chart is ever drawn in this UI). The response is a raw PDF stream,
  // not JSON, so this fetches it as a Blob and triggers a normal browser
  // file download via a throwaway <a download> element.
  const handleDownloadPdfReport = async () => {
    setDownloadingPdf(true);
    try {
      const response = await fetch(`http://localhost:5000/api/marks/report/level/${levelNumber}/pdf`);
      if (!response.ok) {
        // Errors come back as JSON, not a PDF — surface the real message if present.
        const contentType = response.headers.get('content-type') || '';
        const message = contentType.includes('application/json')
          ? (await response.json())?.message
          : null;
        throw new Error(message || `Server returned ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Level_${levelNumber}_Marks_Distribution_Report.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Error downloading report: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Export to CSV with Evaluator Marks Breakdown
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
          const evalStr = data.evaluators && data.evaluators.length > 0
            ? data.evaluators.map((e, i) => `E${i + 1}(${e.evaluator_name}): ${e.mark}`).join('; ') + ` | Avg: ${data.average_mark}`
            : `${data.average_mark}`;
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
          <h2 style={{ margin: 0, color: '#0f172a', fontSize: '22px', fontWeight: '700' }}>
            Level {levelNumber} — Coordinator Marks & Grade Reports
          </h2>
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
          <h2 style={{ margin: 0, color: '#0f172a', fontSize: '22px', fontWeight: '700' }}>
            Level {levelNumber} — Coordinator Marks & Grade Reports
          </h2>
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
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
            No evaluation records yet
          </h3>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748b', maxWidth: '420px' }}>
            No evaluation marks or student records have been submitted for Level {levelNumber} yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner & Download Action */}
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
          <h2 style={{ margin: 0, color: '#0f172a', fontSize: '22px', fontWeight: '700' }}>
            Level {levelNumber} — Coordinator Marks & Grade Reports
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleDownloadPdfReport}
            disabled={downloadingPdf}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '9px 18px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: downloadingPdf ? '#93c5fd' : '#2563eb',
              color: '#ffffff',
              fontWeight: '600',
              fontSize: '13px',
              cursor: downloadingPdf ? 'default' : 'pointer',
              boxShadow: '0 2px 5px rgba(37, 99, 235, 0.25)',
            }}
          >
            {downloadingPdf ? 'Generating…' : 'Download PDF Report'}
          </button>
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

      {/* Degree Program Tabs (IT, AI, ITM, ALL) */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          borderBottom: '2px solid #e2e8f0',
          paddingBottom: '2px',
          overflowX: 'auto',
        }}
      >
        <button
          type="button"
          onClick={() => setSelectedDegree('ALL')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            border: 'none',
            borderBottom: selectedDegree === 'ALL' ? '3px solid #2563eb' : '3px solid transparent',
            backgroundColor: 'transparent',
            color: selectedDegree === 'ALL' ? '#2563eb' : '#64748b',
            fontWeight: selectedDegree === 'ALL' ? '700' : '600',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Layers size={18} />
          All Degrees ({countsByDegree.ALL})
        </button>

        <button
          type="button"
          onClick={() => setSelectedDegree('IT')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            border: 'none',
            borderBottom: selectedDegree === 'IT' ? '3px solid #0284c7' : '3px solid transparent',
            backgroundColor: 'transparent',
            color: selectedDegree === 'IT' ? '#0284c7' : '#64748b',
            fontWeight: selectedDegree === 'IT' ? '700' : '600',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <GraduationCap size={18} />
          IT — Information Technology ({countsByDegree.IT})
        </button>

        <button
          type="button"
          onClick={() => setSelectedDegree('AI')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            border: 'none',
            borderBottom: selectedDegree === 'AI' ? '3px solid #7c3aed' : '3px solid transparent',
            backgroundColor: 'transparent',
            color: selectedDegree === 'AI' ? '#7c3aed' : '#64748b',
            fontWeight: selectedDegree === 'AI' ? '700' : '600',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Award size={18} />
          AI — Artificial Intelligence ({countsByDegree.AI})
        </button>

        <button
          type="button"
          onClick={() => setSelectedDegree('ITM')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            border: 'none',
            borderBottom: selectedDegree === 'ITM' ? '3px solid #d97706' : '3px solid transparent',
            backgroundColor: 'transparent',
            color: selectedDegree === 'ITM' ? '#d97706' : '#64748b',
            fontWeight: selectedDegree === 'ITM' ? '700' : '600',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <BarChart3 size={18} />
          ITM — Info Tech & Management ({countsByDegree.ITM})
        </button>
      </div>

      {/* Summary KPI Cards Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              backgroundColor: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563eb',
            }}
          >
            <Users size={24} />
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '500' }}>
              {selectedDegree === 'ALL' ? 'Total Enrolled' : `${selectedDegree} Students`}
            </div>
            <div style={{ color: '#0f172a', fontSize: '22px', fontWeight: '700', marginTop: '2px' }}>
              {degreeStats.total} <span style={{ fontSize: '13px', fontWeight: 'normal', color: '#94a3b8' }}>students</span>
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              backgroundColor: '#ecfdf5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669',
            }}
          >
            <TrendingUp size={24} />
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '500' }}>Average Score</div>
            <div style={{ color: '#0f172a', fontSize: '22px', fontWeight: '700', marginTop: '2px' }}>
              {degreeStats.avgMark}%
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              backgroundColor: '#dcfce7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#16a34a',
            }}
          >
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '500' }}>Pass Rate</div>
            <div style={{ color: '#0f172a', fontSize: '22px', fontWeight: '700', marginTop: '2px' }}>
              {degreeStats.passRate}%{' '}
              <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: '600' }}>
                ({degreeStats.passCount}/{degreeStats.total})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grade Distribution & Percentage Breakdown Card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: 0, color: '#0f172a', fontSize: '16px', fontWeight: '700' }}>
              📊 {selectedDegree === 'ALL' ? 'Overall' : selectedDegree} Grade Distribution & Percentages
            </h3>
            <p style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: '13px' }}>
              Proportion and count of students falling into each letter grade bracket for {selectedDegree === 'ALL' ? 'all degree programs' : selectedDegree}.
            </p>
          </div>

          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
            Total Cohort: <strong>{degreeStats.total} students</strong>
          </div>
        </div>

        {/* Visual Stacked Progress Bar */}
        {degreeStats.total > 0 && (
          <div
            style={{
              height: '14px',
              borderRadius: '7px',
              backgroundColor: '#f1f5f9',
              overflow: 'hidden',
              display: 'flex',
              marginBottom: '20px',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            {GRADING_SCALE.map((g) => {
              const pct = degreeStats.gradePercentages[g.letter] || 0;
              if (pct === 0) return null;
              return (
                <div
                  key={g.letter}
                  title={`${g.letter}: ${pct}% (${degreeStats.gradeCounts[g.letter]} students)`}
                  style={{
                    width: `${pct}%`,
                    backgroundColor: g.badgeColor,
                    transition: 'width 0.3s ease',
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Grade Percentage Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
            gap: '10px',
          }}
        >
          {GRADING_SCALE.map((g) => {
            const count = degreeStats.gradeCounts[g.letter] || 0;
            const pct = degreeStats.gradePercentages[g.letter] || 0;
            const isSelected = selectedGradeFilter === g.letter;

            return (
              <button
                key={g.letter}
                type="button"
                onClick={() => setSelectedGradeFilter(isSelected ? 'ALL' : g.letter)}
                style={{
                  backgroundColor: isSelected ? g.badgeBg : '#f8fafc',
                  border: isSelected ? `2px solid ${g.badgeColor}` : '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '12px 10px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    fontSize: '16px',
                    fontWeight: '800',
                    color: g.badgeColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  {g.letter}
                </div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginTop: '4px' }}>
                  {pct}%
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                  {count} {count === 1 ? 'student' : 'students'}
                </div>
              </button>
            );
          })}
        </div>

        {selectedGradeFilter !== 'ALL' && (
          <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => setSelectedGradeFilter('ALL')}
              style={{
                fontSize: '12px',
                color: '#2563eb',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                textDecoration: 'underline',
              }}
            >
              Clear Grade Filter (Show All)
            </button>
          </div>
        )}
      </div>

      {/* Main Student Marksheet Table */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}
      >
        {/* Table Toolbar */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '16px' }}>
              Student Marksheet ({filteredStudents.length})
            </span>
            {selectedDegree !== 'ALL' && (
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                }}
              >
                Degree: {selectedDegree}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Search Box */}
            <div style={{ position: 'relative' }}>
              <Search
                size={16}
                color="#94a3b8"
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                placeholder="Search name, index, group..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '8px 12px 8px 32px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  width: '230px',
                  outline: 'none',
                }}
              />
            </div>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '15px', fontWeight: '600' }}>Loading student marks and grade records...</div>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
            <FileSpreadsheet size={40} style={{ margin: '0 auto 12px auto', color: '#cbd5e1' }} />
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#334155' }}>No Student Marks Found</div>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>
              {searchQuery || selectedGradeFilter !== 'ALL'
                ? 'Try adjusting your search or filters.'
                : `No evaluations recorded yet for Level ${levelNumber}. Marks submitted by panel evaluators will appear here.`}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px', minWidth: '170px' }}>Student Details</th>
                  <th style={{ padding: '12px 14px', minWidth: '110px' }}>Reg / Index No</th>
                  <th style={{ padding: '12px 14px', minWidth: '80px' }}>Degree</th>
                  <th style={{ padding: '12px 14px', minWidth: '110px' }}>Project Group</th>
                  {stages.map((st) => (
                    <th key={st.stage_id} style={{ padding: '12px 14px', textAlign: 'center', minWidth: '140px' }}>
                      <div style={{ fontWeight: '700', color: '#1e293b' }}>{st.stage_name}</div>
                      <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '500' }}>Evaluator Marks & Avg</div>
                    </th>
                  ))}
                  <th style={{ padding: '12px 14px', textAlign: 'center', backgroundColor: '#f1f5f9', minWidth: '110px' }}>
                    Final Mark (%)
                  </th>
                  <th style={{ padding: '12px 14px', textAlign: 'center', minWidth: '100px' }}>Letter Grade</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student, rowIndex) => {
                  const gInfo = student.gradeInfo;
                  // Show the per-stage "Complete" action only once per group
                  // (its first visible row) — every row for that group shares
                  // the same panel, so repeating the button on every member
                  // would just be clutter, not extra functionality.
                  const isFirstRowOfGroup =
                    rowIndex === 0 || filteredStudents[rowIndex - 1].group_name !== student.group_name;

                  return (
                    <tr key={student.student_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      {/* Student Details */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '14px' }}>
                            {student.student_name}
                          </span>
                          {student.is_leader && (
                            <span
                              style={{
                                fontSize: '10px',
                                backgroundColor: '#2563eb',
                                color: '#ffffff',
                                padding: '1px 6px',
                                borderRadius: '10px',
                                fontWeight: '700',
                              }}
                            >
                              Leader
                            </span>
                          )}
                        </div>
                        {student.email && (
                          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                            {student.email}
                          </div>
                        )}
                      </td>

                      {/* Reg No */}
                      <td style={{ padding: '14px', color: '#475569', fontWeight: '500', verticalAlign: 'middle' }}>
                        {student.university_id}
                      </td>

                      {/* Degree Badge */}
                      <td style={{ padding: '14px', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '700',
                            backgroundColor:
                              student.degree === 'IT'
                                ? '#e0f2fe'
                                : student.degree === 'AI'
                                ? '#f3e8ff'
                                : '#fef3c7',
                            color:
                              student.degree === 'IT'
                                ? '#0369a1'
                                : student.degree === 'AI'
                                ? '#6b21a8'
                                : '#92400e',
                            border: `1px solid ${
                              student.degree === 'IT'
                                ? '#bae6fd'
                                : student.degree === 'AI'
                                ? '#e9d5ff'
                                : '#fde68a'
                            }`,
                          }}
                        >
                          {student.degree}
                        </span>
                      </td>

                      {/* Project Group */}
                      <td style={{ padding: '14px', color: '#334155', fontWeight: '600', verticalAlign: 'middle' }}>
                        {student.group_name}
                      </td>

                      {/* Stage Marks with Evaluator-wise breakdown */}
                      {stages.map((st) => {
                        const stgData = student.stages[st.stage_id];
                        return (
                          <td key={st.stage_id} style={{ padding: '14px 12px', textAlign: 'center', verticalAlign: 'middle' }}>
                            {stgData && stgData.average_mark !== null && stgData.average_mark !== undefined ? (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                {/* Evaluator-wise individual marks */}
                                {stgData.evaluators && stgData.evaluators.length > 0 && (
                                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                    {stgData.evaluators.map((ev, eIdx) => (
                                      <span
                                        key={eIdx}
                                        title={`${ev.evaluator_name}: ${ev.mark}/${ev.total_marks || 100}${ev.feedback ? ' (Feedback: ' + ev.feedback + ')' : ''}`}
                                        style={{
                                          fontSize: '11px',
                                          backgroundColor: '#f8fafc',
                                          color: '#334155',
                                          padding: '2px 6px',
                                          borderRadius: '4px',
                                          border: '1px solid #e2e8f0',
                                          fontWeight: '600',
                                          cursor: 'default',
                                        }}
                                      >
                                        E{eIdx + 1}: <strong style={{ color: '#0f172a' }}>{ev.mark}</strong>
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {/* Stage Average Mark */}
                                <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>
                                  Avg: {stgData.average_mark}
                                  {stgData.total_marks && (
                                    <span style={{ fontSize: '11px', fontWeight: 'normal', color: '#94a3b8' }}>
                                      /{stgData.total_marks}
                                    </span>
                                  )}
                                </div>

                                {/* One "Complete" action per group per stage — shown once,
                                    on the group's first visible row, not repeated per member. */}
                                {isFirstRowOfGroup && (() => {
                                  const key = `${student.group_name}::${st.stage_name}`;
                                  const isCompleting = completingKey === key;
                                  return (
                                    <button
                                      type="button"
                                      onClick={() => handleCompleteGroupStage(student.group_name, st.stage_name)}
                                      disabled={isCompleting}
                                      title={`Mark ${st.stage_name} complete for "${student.group_name}" — removes just this stage's panel from the Calendar for this group`}
                                      style={{
                                        marginTop: '2px',
                                        padding: '2px 7px',
                                        borderRadius: '5px',
                                        border: 'none',
                                        backgroundColor: isCompleting ? '#a7f3d0' : '#16a34a',
                                        color: '#ffffff',
                                        fontWeight: '600',
                                        fontSize: '9px',
                                        cursor: isCompleting ? 'default' : 'pointer',
                                      }}
                                    >
                                      {isCompleting ? 'Completing…' : 'Complete'}
                                    </button>
                                  );
                                })()}
                              </div>
                            ) : (
                              <span style={{ color: '#cbd5e1' }}>—</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Final Mark */}
                      <td style={{ padding: '14px', textAlign: 'center', backgroundColor: '#f8fafc', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: '800', fontSize: '15px', color: '#0f172a' }}>
                          {student.final_mark}%
                        </div>
                        {student.sum_total_max_marks > 0 && student.sum_total_max_marks !== 100 && (
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            ({student.sum_obtained_marks}/{student.sum_total_max_marks})
                          </div>
                        )}
                      </td>

                      {/* Letter Grade */}
                      <td style={{ padding: '14px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: '800',
                            backgroundColor: gInfo.badgeBg,
                            color: gInfo.badgeColor,
                            border: `1px solid ${gInfo.borderColor}`,
                          }}
                        >
                          {gInfo.letter}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupervisorReportPanel;
