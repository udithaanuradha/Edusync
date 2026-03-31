import React, { useState, useEffect } from 'react';
import { Layers } from 'lucide-react';
import './CoordinatorStageUpdates.css';

interface StageUpdate {
  id: string;
  stage: string;
  note: string;
  coordinator: string;
  date: string;
  status: 'Completed' | 'In Progress' | 'Needs Action' | 'Pending';
}

interface CoordinatorStageUpdatesProps {
  levelNumber: number;
}

const getStatusClass = (status: StageUpdate['status']) => {
  switch (status) {
    case 'Completed':
      return 'stage-badge completed';
    case 'In Progress':
      return 'stage-badge in-progress';
    case 'Needs Action':
      return 'stage-badge needs-action';
    case 'Pending':
      return 'stage-badge pending';
    default:
      return 'stage-badge';
  }
};

const CoordinatorStageUpdates: React.FC<CoordinatorStageUpdatesProps> = ({ levelNumber }) => {
  const [updates, setUpdates] = useState<StageUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStageUpdates = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`http://localhost:5000/api/projects/level/${levelNumber}`);

        if (!response.ok) {
          throw new Error(`Failed to load stage updates: ${response.statusText}`);
        }

        const json = await response.json();

        if (!json.success || !Array.isArray(json.data)) {
          throw new Error('Unexpected response format from backend');
        }

        const mappedUpdates: StageUpdate[] = json.data.map((item: any) => ({
          id: item.stage_id?.toString() || item.id || Math.random().toString(),
          stage: item.stage_name || item.stage || 'Unnamed Stage',
          note: item.description || item.note || 'No details provided',
          coordinator: item.coordinator || item.updated_by || 'Coordinator',
          date: item.deadline || item.updated_at || 'Unknown date',
          status: (item.status as StageUpdate['status']) || 'Pending',
        }));

        setUpdates(mappedUpdates);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : 'Unknown error');
        setUpdates([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStageUpdates();
  }, [levelNumber]);

  return (
    <section className="stage-updates-card">
      <div className="stage-updates-header">
        <div className="stage-updates-icon">
          <Layers size={22} />
        </div>
        <div>
          <h3>Coordinator Stage Updates</h3>
          <p>Track the latest stage changes and feedback from your coordinator.</p>
        </div>
      </div>

      {loading ? (
        <div className="stage-loading">Loading stage updates...</div>
      ) : error ? (
        <div className="stage-error">{error}</div>
      ) : (
        <div className="stage-updates-list">
          {updates.length === 0 ? (
            <div className="stage-empty">No stage updates available yet.</div>
          ) : (
            updates.map((update) => (
              <div key={update.id} className="stage-update-item">
                <div className="stage-item-top">
                  <div className="stage-item-title">{update.stage}</div>
                  <span className={getStatusClass(update.status)}>{update.status}</span>
                </div>
                <p className="stage-item-note">{update.note}</p>
                <div className="stage-item-meta">
                  <span>{update.coordinator}</span>
                  <span>{update.date}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
};

export default CoordinatorStageUpdates;
