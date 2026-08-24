import React, { useEffect, useMemo, useState } from 'react';
import { Award, Lock } from 'lucide-react';
import './StudentMarks.css';

interface EvaluatorFeedback {
  evaluator_name: string;
  evaluator_role?: string | null;
  feedback?: string;
}

interface StageEntry {
  stage_name: string;
  average_mark: number | null;
  total_marks: number;
  evaluator_count: number;
  evaluators: EvaluatorFeedback[];
}

interface CanonicalStage {
  stage_id: number;
  stage_name: string;
}

interface StudentMarksRow {
  student_id: number;
  final_mark: number;
  stages_completed: number;
  total_stages: number;
  stages: Record<string, StageEntry>;
  // True once the Evaluation Panel has marked the "Final" stage complete for
  // this student's group (see marksController.js's computeLevelMarksSummary).
  // Gates only the cumulative grade/marks display below — per-stage feedback
  // is unaffected and always shows regardless of this flag.
  final_marks_released?: boolean;
}

interface GradeDefinition {
  min: number;
  max: number;
  letter: string;
  badgeBg: string;
  badgeColor: string;
  borderColor: string;
}

// Kept identical to the grading scale already used on the coordinator's
// Reports tab (SupervisorReportPanel.tsx) so a student's letter grade always
// matches what the coordinator sees for them. Copied rather than imported so
// this student-facing file has no dependency on a coordinator component.
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

const roleLabel = (role?: string | null) => {
  const normalized = (role || '').toLowerCase();
  if (normalized.includes('supervisor')) return 'Supervisor Feedback';
  if (normalized.includes('mentor')) return 'Industry Mentor Feedback';
  if (normalized.includes('coordinator')) return 'Coordinator Feedback';
  return 'Evaluator Feedback';
};

const RING_RADIUS = 54;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const StudentMarks: React.FC<{ levelNumber: number }> = ({ levelNumber }) => {
  const [canonicalStages, setCanonicalStages] = useState<CanonicalStage[]>([]);
  const [mine, setMine] = useState<StudentMarksRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);

  const currentUser = useMemo(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!currentUser?.id) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError('');
        const response = await fetch(
          `http://localhost:5000/api/marks/summary/level/${levelNumber}?studentId=${currentUser.id}`,
        );
        const data = await response.json();
        if (!data?.success) {
          throw new Error(data?.message || 'Failed to load marks.');
        }
        setCanonicalStages(Array.isArray(data.stages) ? data.stages : []);
        const row = Array.isArray(data.data) ? data.data[0] : null;
        setMine(row || null);
        if (row?.stages) {
          const firstStageId = Object.keys(row.stages)[0];
          setSelectedStageId(firstStageId ?? null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load your marks right now.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [levelNumber, currentUser?.id]);

  if (loading) {
    return <div className="student-tab-empty">Loading your marks...</div>;
  }

  if (error) {
    return <div className="student-submission-alert error">{error}</div>;
  }

  if (!mine || mine.total_stages === 0) {
    return (
      <div className="student-tab-empty">
        Your final marks haven't been added yet. Check back after your supervisor or coordinator evaluates a stage.
      </div>
    );
  }

  const finalMarksReleased = Boolean(mine.final_marks_released);
  const grade = calculateGrade(mine.final_mark);
  const passed = grade.letter !== 'I';
  const progress = mine.total_stages > 0 ? mine.stages_completed / mine.total_stages : 0;
  const dashOffset = RING_CIRCUMFERENCE * (1 - progress);
  const selectedStage = selectedStageId ? mine.stages[selectedStageId] : null;

  return (
    <div className="student-marks-layout">
      <div className="student-marks-left">
        <div className="student-marks-hero">
          {finalMarksReleased ? (
            <>
              <div className="student-marks-ring-wrap">
                <svg width="140" height="140" viewBox="0 0 140 140">
                  <circle cx="70" cy="70" r={RING_RADIUS} fill="none" stroke="#e2e8f0" strokeWidth="10" />
                  <circle
                    cx="70"
                    cy="70"
                    r={RING_RADIUS}
                    fill="none"
                    stroke={grade.badgeColor}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={RING_CIRCUMFERENCE}
                    strokeDashoffset={dashOffset}
                    transform="rotate(-90 70 70)"
                  />
                </svg>
                <div className="student-marks-ring-center">
                  <span className="student-marks-grade-letter" style={{ color: grade.badgeColor }}>
                    {grade.letter}
                  </span>
                </div>
              </div>

              <span
                className="student-marks-pass-badge"
                style={{
                  backgroundColor: grade.badgeBg,
                  color: grade.badgeColor,
                  border: `1px solid ${grade.borderColor}`,
                }}
              >
                {passed ? 'Pass' : 'Incomplete'}
              </span>

              <p className="student-marks-meta">
                {mine.stages_completed}/{mine.total_stages} stage(s) evaluated
              </p>
              <p className="student-marks-percent">({mine.final_mark}%)</p>
            </>
          ) : (
            <>
              <div className="student-marks-ring-wrap">
                <svg width="140" height="140" viewBox="0 0 140 140">
                  <circle cx="70" cy="70" r={RING_RADIUS} fill="none" stroke="#e2e8f0" strokeWidth="10" />
                </svg>
                <div className="student-marks-ring-center">
                  <Lock size={32} color="#94a3b8" />
                </div>
              </div>

              <span className="student-marks-pending-badge">Pending</span>

              <p className="student-marks-meta">
                {mine.stages_completed}/{mine.total_stages} stage(s) evaluated
              </p>
              <p className="student-marks-pending-note">
                Your cumulative grade will appear once the Evaluation Panel releases final marks.
              </p>
            </>
          )}
        </div>
      </div>

      <div className="student-marks-right">
        <div className="student-marks-stage-menu">
          {canonicalStages.map((stage) => {
            const entry = mine.stages[String(stage.stage_id)];
            const marked = Boolean(entry && entry.average_mark !== null);
            return (
              <button
                key={stage.stage_id}
                type="button"
                className={`student-marks-stage-menu-item ${
                  selectedStageId === String(stage.stage_id) ? 'active' : ''
                }`}
                onClick={() => setSelectedStageId(String(stage.stage_id))}
              >
                <span className={`student-marks-stage-dot ${marked ? 'marked' : ''}`} />
                {stage.stage_name}
              </button>
            );
          })}
        </div>

        <div className="student-marks-feedback-panel">
          {!selectedStage || !selectedStage.evaluators || selectedStage.evaluators.length === 0 ? (
            <div className="student-tab-empty">Not yet marked for this stage.</div>
          ) : (
            selectedStage.evaluators.map((evaluatorItem, idx) => (
              <div className="student-marks-feedback-row" key={idx}>
                <div className="student-marks-feedback-header">
                  <Award size={14} />
                  <span className="student-marks-feedback-role">{roleLabel(evaluatorItem.evaluator_role)}</span>
                </div>
                <p className="student-marks-feedback-text">
                  {evaluatorItem.feedback?.trim() || 'No written feedback was provided.'}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentMarks;
