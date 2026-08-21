import React, { useEffect, useMemo, useState } from 'react';

type EvaluatorMark = {
  evaluator_name?: string;
  mark?: number | null;
  total_marks?: number | null;
  feedback?: string | null;
};

type StageData = {
  stage_id: number;
  stage_name: string;
  average_mark: number | null;
  total_marks: number;
  evaluators: EvaluatorMark[];
};

type Student = {
  student_id: number | string;
  student_name: string;
  university_id: string;
  email?: string;
  group_id?: string | number;
  group_name?: string;
  degree?: string;
  is_leader?: boolean;
  stages: Record<number, StageData>;
  final_mark: number;
  sum_obtained_marks: number;
  sum_total_max_marks: number;
  gradeInfo: { letter: string; gradePoint: number };
};

const GRADING_SCALE = [
  { letter: 'A', min: 70 },
  { letter: 'B', min: 60 },
  { letter: 'C', min: 50 },
  { letter: 'D', min: 40 },
  { letter: 'I', min: -1 },
];

const calculateGrade = (score: number) => {
  if (Number.isNaN(score)) return { letter: 'I', gradePoint: 0 };
  for (const g of GRADING_SCALE) {
    if (score >= g.min) return { letter: g.letter, gradePoint: 0 };
  }
  return { letter: 'I', gradePoint: 0 };
};

interface Props {
  levelNumber: number;
}

const CoordinatorReportInner: React.FC<Props> = ({ levelNumber }) => {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [stages, setStages] = useState<Array<{ stage_id: number; stage_name: string }>>([]);
  const [selectedDegree, setSelectedDegree] = useState<'ALL' | 'IT' | 'AI' | 'ITM'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<'ALL' | string>('ALL');

  const normalizeResponse = (payload: any) => {
    const rows: any[] = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
    const stageMap = new Map<number, { stage_id: number; stage_name: string }>();

    const processed: Student[] = rows.map((item: any) => {
      const canonicalStages: Record<number, StageData> = {};
      (item.canonicalStages || item.stages || []).forEach((s: any) => {
        const id = Number(s.stage_id ?? s.canonical_id ?? s.id ?? 0);
        const name = String(s.stage_name ?? s.stageName ?? s.name ?? `Stage ${id}`);
        stageMap.set(id, { stage_id: id, stage_name: name });
      });

      (item.stage_details || item.stages || []).forEach((sd: any) => {
        const id = Number(sd.stage_id ?? sd.canonical_id ?? sd.stageId ?? 0);
        canonicalStages[id] = {
          stage_id: id,
          stage_name: String(sd.stage_name ?? sd.stageName ?? sd.name ?? `Stage ${id}`),
          average_mark: sd.average_mark !== null && sd.average_mark !== undefined ? Number(sd.average_mark) : null,
          total_marks: Number(sd.total_marks ?? sd.max_marks ?? 100),
          evaluators: Array.isArray(sd.evaluators) ? sd.evaluators : [],
        };
      });

      const final = Number(item.final_mark ?? item.finalMark ?? item.final_mark_percentage ?? 0);
      const roundedFinal = Number(Number.isFinite(final) ? final.toFixed(2) : 0);
      const gradeInfo = calculateGrade(roundedFinal);

      return {
        student_id: item.student_id ?? item.id ?? `${item.university_id}`,
        student_name: String(item.student_name ?? item.name ?? 'Unknown'),
        university_id: String(item.university_id ?? item.reg_no ?? ''),
        email: String(item.email ?? ''),
        group_id: item.group_id ?? item.groupId,
        group_name: String(item.group_name ?? item.groupName ?? ''),
        degree: String(item.degree ?? item.program ?? 'ITM'),
        is_leader: Boolean(item.is_leader ?? item.leader),
        stages: canonicalStages,
        final_mark: roundedFinal,
        sum_obtained_marks: Number(item.sum_obtained_marks ?? item.obtained ?? 0),
        sum_total_max_marks: Number(item.sum_total_max_marks ?? item.total_max ?? 0),
        gradeInfo,
      } as Student;
    });

    setStages(Array.from(stageMap.values()));
    setStudents(processed);
  };

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/marks/summary/level/${levelNumber}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) {
        setStudents([]);
        setStages([]);
        return;
      }

      const payload = await res.json();
      normalizeResponse(payload?.data ?? payload);
    } catch (err) {
      console.error('Failed to fetch marks summary', err);
      setStudents([]);
      setStages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchReportData(); }, [levelNumber]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchDegree = selectedDegree === 'ALL' || s.degree === selectedDegree;
      const matchSearch = !searchQuery || s.student_name.toLowerCase().includes(searchQuery.toLowerCase()) || s.university_id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchGrade = selectedGradeFilter === 'ALL' || s.gradeInfo.letter === selectedGradeFilter;
      return matchDegree && matchSearch && matchGrade;
    });
  }, [students, selectedDegree, searchQuery, selectedGradeFilter]);

  const countsByDegree = useMemo(() => ({ ALL: students.length, IT: students.filter((s) => s.degree === 'IT').length, AI: students.filter((s) => s.degree === 'AI').length, ITM: students.filter((s) => s.degree === 'ITM').length }), [students]);

  const degreeStudents = useMemo(() => students.filter((s) => selectedDegree === 'ALL' || s.degree === selectedDegree), [students, selectedDegree]);

  const degreeStats = useMemo(() => {
    const total = degreeStudents.length;
    if (total === 0) return { total: 0, avgMark: 0, passCount: 0, passRate: 0, gradeCounts: {}, gradePercentages: {} };
    const sumMarks = degreeStudents.reduce((a, b) => a + (b.final_mark || 0), 0);
    const passCount = degreeStudents.filter((s) => s.gradeInfo.letter !== 'I').length;
    const gradeCounts: Record<string, number> = {};
    GRADING_SCALE.forEach((g) => (gradeCounts[g.letter] = 0));
    degreeStudents.forEach((s) => { gradeCounts[s.gradeInfo.letter] = (gradeCounts[s.gradeInfo.letter] || 0) + 1; });
    const gradePercentages: Record<string, number> = {};
    Object.keys(gradeCounts).forEach((k) => { gradePercentages[k] = Number(((gradeCounts[k] / total) * 100).toFixed(1)); });
    return { total, avgMark: Number((sumMarks / total).toFixed(2)), passCount, passRate: Number(((passCount / total) * 100).toFixed(1)), gradeCounts, gradePercentages };
  }, [degreeStudents]);

  const handleExportCSV = () => {
    if (filteredStudents.length === 0) return alert('No student marks available to export.');
    const headers = ['Student Name', 'Reg / Index No', 'Degree', 'Group', ...stages.map((s) => s.stage_name), 'Final Mark', 'Letter Grade'];
    const rows = filteredStudents.map((s) => [s.student_name, s.university_id, s.degree, s.group_name, ...stages.map((st) => s.stages[st.stage_id]?.average_mark ?? '—'), s.final_mark, s.gradeInfo.letter]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const uri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    const link = document.createElement('a');
    link.href = uri;
    link.download = `Level_${levelNumber}_marks.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div>Loading report...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>{`Level ${levelNumber} — Coordinator Marks & Grade Reports`}</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleExportCSV} style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 8 }}>Download CSV</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button onClick={() => setSelectedDegree('ALL')} style={{ padding: '8px 12px', borderBottom: selectedDegree === 'ALL' ? '3px solid #2563eb' : '3px solid transparent' }}>All Degrees ({countsByDegree.ALL})</button>
        <button onClick={() => setSelectedDegree('IT')} style={{ padding: '8px 12px' }}>IT ({countsByDegree.IT})</button>
        <button onClick={() => setSelectedDegree('AI')} style={{ padding: '8px 12px' }}>AI ({countsByDegree.AI})</button>
        <button onClick={() => setSelectedDegree('ITM')} style={{ padding: '8px 12px' }}>ITM ({countsByDegree.ITM})</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <div style={{ background: '#fff', padding: 16, borderRadius: 10 }}>Total Enrolled<br /><strong>{degreeStats.total}</strong></div>
        <div style={{ background: '#fff', padding: 16, borderRadius: 10 }}>Average Score<br /><strong>{degreeStats.avgMark}%</strong></div>
        <div style={{ background: '#fff', padding: 16, borderRadius: 10 }}>Pass Rate<br /><strong>{degreeStats.passRate}% ({degreeStats.passCount}/{degreeStats.total})</strong></div>
      </div>

      <div style={{ background: '#fff', padding: 16, borderRadius: 10 }}>
        <h4 style={{ marginTop: 0 }}>Overall Grade Distribution & Percentages</h4>
        <div style={{ height: 14, background: '#f1f5f9', borderRadius: 7, overflow: 'hidden' }}>
          <div style={{ width: `${degreeStats.avgMark}%`, height: '100%', background: '#16a34a' }} />
        </div>
      </div>

      <div style={{ background: '#fff', padding: 16, borderRadius: 10 }}>
        <h4 style={{ marginTop: 0 }}>Marksheet ({filteredStudents.length})</h4>
        <div style={{ marginBottom: 8 }}>
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search name, index, group..." style={{ padding: 8, width: 320, borderRadius: 8 }} />
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: 12 }}>Student</th>
                <th style={{ padding: 12 }}>Reg / Index No</th>
                <th style={{ padding: 12 }}>Degree</th>
                <th style={{ padding: 12 }}>Group</th>
                {stages.map((st) => <th key={st.stage_id} style={{ padding: 12 }}>{st.stage_name}</th>)}
                <th style={{ padding: 12 }}>Final Mark</th>
                <th style={{ padding: 12 }}>Letter Grade</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((s) => (
                <tr key={s.student_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 12 }}>{s.student_name}</td>
                  <td style={{ padding: 12 }}>{s.university_id}</td>
                  <td style={{ padding: 12 }}>{s.degree}</td>
                  <td style={{ padding: 12 }}>{s.group_name}</td>
                  {stages.map((st) => <td key={st.stage_id} style={{ padding: 12, textAlign: 'center' }}>{s.stages[st.stage_id]?.average_mark ?? '—'}</td>)}
                  <td style={{ padding: 12, textAlign: 'center' }}>{s.final_mark}</td>
                  <td style={{ padding: 12, textAlign: 'center' }}>{s.gradeInfo.letter}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CoordinatorReportInner;
