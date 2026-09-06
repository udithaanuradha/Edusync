import React, { useState, useEffect } from 'react';
import { Trash2, Plus, X, Edit2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import PrimaryButton from '../shared/ui/PrimaryButton';
import './StageManagement.css';

interface Stage {
  stage_id: string;
  stage_name: string;
  description: string;
  deadline?: string;
  level?: string;
  resource_links?: string;
  files?: Array<{
    file_id?: number;
    file_name: string;
    file_url: string;
    uploaded_by?: number;
    uploaded_at?: string;
  }>;
}

interface FormFile {
  name: string;
  size: number;
  file: File;
}

interface StageManagementProps {
  levelNumber: number;
}

// Extensions allowed by the file picker's `accept` attribute — re-checked
// here in JS because `accept` is only a picker hint: it does nothing to
// restrict files dropped in via drag-and-drop, so without this a
// same-named-but-wrong-type (or oversized) file could reach the upload
// endpoint untouched.
const ALLOWED_STAGE_FILE_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xlsx', '.ppt', '.pptx', '.txt'];
const MAX_STAGE_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const getFileExtension = (fileName: string): string => {
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : '';
};

const getTodayDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const StageManagement: React.FC<StageManagementProps> = ({ levelNumber }) => {
  const { user } = useAuth();
  const effectiveRole = (user as any)?.effectiveRole || (user as any)?.designation || user?.role || 'coordinator';
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch stages from backend when component mounts
  useEffect(() => {
    const fetchStages = async () => {
      try {
        setLoading(true);
        // Stage records are loaded first so uploads can attach to the real database id.
        const response = await fetch(`http://localhost:5000/api/projects/level/${levelNumber}?coordinatorId=${user?.id}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch stages: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('✅ Stages fetched from backend:', data.data); // Debug log
        
        if (data.success && Array.isArray(data.data)) {
          setStages(data.data);
        } else {
          throw new Error('Invalid response format from backend');
        }
        
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('❌ Error fetching stages:', errorMessage);
        setError(errorMessage);
        setStages([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStages();
  }, [levelNumber]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    deadline: '',
    resource_link: '',
  });

  const [uploadedFiles, setUploadedFiles] = useState<FormFile[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [editFormData, setEditFormData] = useState({
    stage_name: '',
    description: '',
    deadline: '',
    resource_link: '',
  });
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddStage = async () => {
    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      alert('Please enter a stage name.');
      return;
    }

    // A stage's deadline is what drives "Late Submission" status everywhere
    // else in the app (Submissions tab, student view) — leaving it blank
    // meant that logic silently had nothing to compare against, and nothing
    // stopped picking a date that had already passed the moment it was set.
    if (!formData.deadline) {
      alert('Please set a deadline for this stage.');
      return;
    }
    if (formData.deadline < getTodayDateString()) {
      alert('Deadline cannot be in the past. Please choose today or a later date.');
      return;
    }

    try {
      setUploadingFiles(true);

      // Step 1: Create the stage in the backend first.
      const createResponse = await fetch('http://localhost:5000/api/projects/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          level: levelNumber,
          stage_name: trimmedName,
          description: formData.description,
          deadline: formData.deadline,
          resource_link: formData.resource_link.trim() || null,
          created_by: user?.id || 1,
          user_role: effectiveRole,
        }),
      });

      if (!createResponse.ok) {
        throw new Error(`Failed to create stage: ${createResponse.statusText}`);
      }

      const createResult = await createResponse.json();
      if (!createResult.success) {
        throw new Error(createResult.message || 'Failed to create stage');
      }

      const realStageId = createResult.id;
      console.log('✅ Stage created with ID:', realStageId);

      // Step 2: Upload files, but do not fail the whole stage if an upload fails.
      const filesData: any[] = [];
      const uploadWarnings: string[] = [];

      for (const fileObj of uploadedFiles) {
        try {
          console.log(`📤 Starting upload for: ${fileObj.file.name}`);

          const fileFormData = new FormData();
          fileFormData.append('file', fileObj.file);
          fileFormData.append('stage_id', realStageId.toString());
          fileFormData.append('uploaded_by', String(user?.id || 1));

          const uploadResponse = await fetch('http://localhost:5000/api/projects/upload-file', {
            method: 'POST',
            body: fileFormData,
          });

          const responseText = await uploadResponse.text();
          console.log(`📥 Upload status: ${uploadResponse.status}`);
          console.log(`📋 Upload response: ${responseText}`);

          if (!uploadResponse.ok) {
            throw new Error(`Server returned ${uploadResponse.status}: ${responseText}`);
          }

          const uploadResult = JSON.parse(responseText);
          if (uploadResult.success) {
            filesData.push({
              file_name: fileObj.file.name,
              file_url: uploadResult.file_url,
            });
            console.log(`✅ File uploaded: ${fileObj.file.name}`);
          } else {
            throw new Error(uploadResult.error || 'Upload failed');
          }
        } catch (fileErr) {
          const message = fileErr instanceof Error ? fileErr.message : String(fileErr);
          console.error(`❌ Error uploading file ${fileObj.file.name}:`, fileErr);
          uploadWarnings.push(`${fileObj.file.name}: ${message}`);
        }
      }

      // Step 3: Add the stage to local state with real data from backend
      const newStage: Stage = {
        stage_id: realStageId.toString(),
        stage_name: trimmedName,
        description: formData.description,
        deadline: formData.deadline,
        resource_links: formData.resource_link.trim() || undefined,
        level: levelNumber.toString(),
        files: filesData,
      };

      setStages([...stages, newStage]);

      // Reset form and close modal
      setFormData({ name: '', description: '', deadline: '', resource_link: '' });
      setUploadedFiles([]);
      setShowModal(false);
      setUploadingFiles(false);

      if (uploadWarnings.length > 0) {
        alert(`Stage created, but some files failed to upload:\n${uploadWarnings.join('\n')}`);
      }

      console.log('✅ Stage created successfully:', newStage);
    } catch (err) {
      console.error('❌ Error creating stage:', err);
      setUploadingFiles(false);
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleDeleteStage = async (id: string) => {
    try {
      // Step 1: Ask backend to delete the stage and its files
      const response = await fetch(`http://localhost:5000/api/projects/delete/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        // Step 2: Only remove from UI after successful database deletion
        setStages(stages.filter(stage => stage.stage_id !== id));
        console.log('✅ Stage deleted successfully:', id);
      } else {
        throw new Error(result.message || 'Failed to delete stage');
      }
    } catch (err) {
      console.error('❌ Error deleting stage:', err);
      alert(`Error deleting stage: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleStageClick = (stageId: string) => {
    // Removed collapse/expand functionality
  };

  const handleEditStage = (stage: Stage) => {
    setEditingStage(stage);
    setEditFormData({
      stage_name: stage.stage_name,
      description: stage.description,
      deadline: stage.deadline || '',
      resource_link: stage.resource_links || '',
    });
    setShowEditModal(true);
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveEdit = async () => {
    if (!editingStage) return;

    const trimmedName = editFormData.stage_name.trim();
    if (!trimmedName) {
      alert('Please enter a stage name.');
      return;
    }

    if (!editFormData.deadline) {
      alert('Please set a deadline for this stage.');
      return;
    }
    if (editFormData.deadline < getTodayDateString()) {
      alert('Deadline cannot be in the past. Please choose today or a later date.');
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/projects/update/${editingStage.stage_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          stage_name: trimmedName,
          description: editFormData.description,
          deadline: editFormData.deadline,
          // Trim first — a whitespace-only leftover (e.g. from clearing the
          // field) is still truthy and would round-trip as a "link" that
          // renders (and looks impossible to clear) even though it's blank.
          resource_link: editFormData.resource_link.trim() || null,
          user_role: effectiveRole,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update stage: ${response.statusText}`);
      }

      const updatedStages = stages.map(s =>
        s.stage_id === editingStage.stage_id
          ? { ...s, ...editFormData, stage_name: trimmedName, resource_links: editFormData.resource_link.trim() || undefined }
          : s
      );
      setStages(updatedStages);
      setShowEditModal(false);
      setEditingStage(null);
    } catch (err) {
      console.error('Error updating stage:', err);
      alert(`Error updating stage: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingStage(null);
  };

  // Re-validates extension + size in JS (not just the input's `accept` hint)
  // since handleDrop below feeds files here too, and drag-and-drop never
  // goes through `accept` at all.
  const handleFilesSelected = (files: FileList) => {
    const accepted: FormFile[] = [];
    const rejected: string[] = [];

    Array.from(files).forEach((file) => {
      const extension = getFileExtension(file.name);
      if (!ALLOWED_STAGE_FILE_EXTENSIONS.includes(extension)) {
        rejected.push(`${file.name} — unsupported file type`);
        return;
      }
      if (file.size > MAX_STAGE_FILE_SIZE_BYTES) {
        rejected.push(`${file.name} — exceeds the 10MB limit`);
        return;
      }
      accepted.push({ name: file.name, size: file.size, file });
    });

    if (rejected.length > 0) {
      alert(`The following file(s) were not added:\n${rejected.join('\n')}`);
    }

    if (accepted.length > 0) {
      setUploadedFiles((prev) => [...prev, ...accepted]);
    }
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>, isDragging: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(isDragging);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({ name: '', description: '', deadline: '', resource_link: '' });
    setUploadedFiles([]);
  };

  return (
    <div className="stage-management-container">
      <div className="stages-header">
        <PrimaryButton
          className="btn-add-stage"
          icon={<Plus size={18} />}
          onClick={() => setShowModal(true)}
        >
          Add Stage
        </PrimaryButton>
      </div>

      {/* Master List View */}
      <div className="stages-timeline">
        {loading ? (
          <div className="empty-state">
            <div className="empty-state-icon">⏳</div>
            <h4>Loading stages...</h4>
          </div>
        ) : error ? (
          <div className="empty-state">
            <div className="empty-state-icon">⚠️</div>
            <h4>Error loading stages</h4>
            <p>{error}</p>
          </div>
        ) : stages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <h4>No stages created yet</h4>
            <p>Click the "Add Stage" button to create your first project stage</p>
          </div>
        ) : (
          <div className="timeline-list">
            {stages.map((stage, index) => (
              <div 
                key={stage.stage_id} 
                className="timeline-item"
                style={{ transition: 'all 0.3s ease' }}
              >
                <div className="timeline-marker">
                  <span className="stage-number">{index + 1}</span>
                </div>

                <div className="timeline-content">
                  <div className="stage-header-row">
                    <div style={{ flex: 1 }}>
                      <h4 className="stage-name">{stage.stage_name}</h4>
                    </div>
                    <button
                      className="btn-delete-small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteStage(stage.stage_id);
                      }}
                      aria-label="Delete stage"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="stage-info" style={{ marginTop: '12px' }}>
                    {stage.description && (
                      <div className="info-item">
                        <span className="info-label">Description:</span>
                        <span className="info-value">{stage.description}</span>
                      </div>
                    )}
                    {stage.deadline && (
                      <div className="info-item">
                        <span className="info-label">Deadline:</span>
                        <span className="info-value">
                          {new Date(stage.deadline).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {stage.level && (
                      <div className="info-item">
                        <span className="info-label">Level:</span>
                        <span className="info-value">Level {stage.level}</span>
                      </div>
                    )}
                    {stage.resource_links && (
                      <div className="info-item">
                        <span className="info-label">Resource Link:</span>
                        <a
                          className="info-value"
                          href={stage.resource_links}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#2563eb', textDecoration: 'none', wordBreak: 'break-word' }}
                        >
                          🔗 View attached resource
                        </a>
                      </div>
                    )}
                    {stage.files && stage.files.length > 0 && (
                      <div className="info-item">
                        <span className="info-label">Documents:</span>
                        <div style={{ marginTop: '8px' }}>
                          {stage.files.map((file, idx) => (
                            <div key={idx} style={{ marginBottom: '6px' }}>
                              <a
                                href={file.file_url.startsWith('http') ? file.file_url : `http://localhost:5000${file.file_url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  color: '#3b82f6',
                                  textDecoration: 'none',
                                  fontSize: '14px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                }}
                                onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}
                              >
                                📄 {file.file_name}
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '12px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                      <PrimaryButton
                        variant="secondary"
                        icon={<Edit2 size={16} />}
                        className="stage-edit-action"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditStage(stage);
                        }}
                      >
                        Edit Stage
                      </PrimaryButton>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Overlay */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4>Create New Stage</h4>
              <button
                className="btn-close-modal"
                onClick={handleCloseModal}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="level-badge-section">
                <p className="level-badge-label">Creating stage for:</p>
                <div className="level-badge">Level {levelNumber}</div>
              </div>

              <div className="form-group">
                <label>Stage Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Proposal, Interim, Final Evaluation"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Brief description of this stage"
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>Deadline *</label>
                <input
                  type="date"
                  name="deadline"
                  value={formData.deadline}
                  onChange={handleInputChange}
                  min={getTodayDateString()}
                  required
                />
              </div>


              <div className="form-group mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference Material / Work Link (Optional)</label>
                <input
                  type="url"
                  name="resource_link"
                  placeholder="https://docs.google.com/..."
                  className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                  value={formData.resource_link}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label>Supporting Documents</label>
                <div
                  className={`drag-drop-zone ${isDragActive ? 'active' : ''}`}
                  onDragEnter={(e) => handleDrag(e, true)}
                  onDragLeave={(e) => handleDrag(e, false)}
                  onDragOver={(e) => handleDrag(e, true)}
                  onDrop={handleDrop}
                  onClick={(e) => {
                    // Click on the zone triggers the hidden file input
                    const fileInput = e.currentTarget.querySelector('input[type="file"]');
                    if (fileInput) {
                      (fileInput as HTMLInputElement).click();
                    }
                  }}
                >
                  <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  <p className="drag-drop-text">Drag and drop PDFs here or click to browse</p>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => e.target.files && handleFilesSelected(e.target.files)}
                    className="file-input"
                    accept=".pdf,.doc,.docx,.xlsx,.ppt,.pptx,.txt"
                  />
                </div>

                {uploadedFiles.length > 0 && (
                  <div className="uploaded-files-list">
                    <p className="files-label">Uploaded files ({uploadedFiles.length}):</p>
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="file-item">
                        <div className="file-info">
                          <span className="file-name">{file.name}</span>
                          <span className="file-size">{formatFileSize(file.size)}</span>
                        </div>
                        <button
                          type="button"
                          className="btn-remove-file"
                          onClick={() => handleRemoveFile(index)}
                          aria-label="Remove file"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <PrimaryButton variant="secondary" className="btn-cancel" onClick={handleCloseModal} disabled={uploadingFiles}>
                Cancel
              </PrimaryButton>
              <PrimaryButton className="btn-save" onClick={handleAddStage} disabled={uploadingFiles}>
                {uploadingFiles ? 'Uploading files...' : 'Save Stage'}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {/* Edit Stage Modal */}
      {showEditModal && editingStage && (
        <div className="modal-overlay" onClick={handleCloseEditModal}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4>Edit Stage</h4>
              <button
                className="btn-close-modal"
                onClick={handleCloseEditModal}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="level-badge-section">
                <p className="level-badge-label">Editing stage for:</p>
                <div className="level-badge">Level {editingStage.level || levelNumber}</div>
              </div>

              <div className="form-group">
                <label>Stage Name *</label>
                <input
                  type="text"
                  name="stage_name"
                  value={editFormData.stage_name}
                  onChange={handleEditInputChange}
                  placeholder="e.g., Proposal, Interim, Final Evaluation"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={editFormData.description}
                  onChange={handleEditInputChange}
                  placeholder="Brief description of this stage"
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>Deadline *</label>
                <input
                  type="date"
                  name="deadline"
                  value={editFormData.deadline ? editFormData.deadline.split('T')[0] : ''}
                  onChange={handleEditInputChange}
                  min={getTodayDateString()}
                  required
                />
              </div>


              <div className="form-group mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference Material / Work Link (Optional)</label>
                <input
                  type="url"
                  name="resource_link"
                  placeholder="https://docs.google.com/..."
                  className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                  value={editFormData.resource_link}
                  onChange={handleEditInputChange}
                />
              </div>
            </div>

            <div className="modal-footer">
              <PrimaryButton variant="secondary" className="btn-cancel" onClick={handleCloseEditModal}>
                Cancel
              </PrimaryButton>
              <PrimaryButton className="btn-save" onClick={handleSaveEdit}>
                Save Changes
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StageManagement;
