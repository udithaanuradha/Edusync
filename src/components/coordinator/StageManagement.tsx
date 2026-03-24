import React, { useState } from 'react';
import { Trash2, Plus, X } from 'lucide-react';
import './StageManagement.css';

interface Stage {
  id: string;
  name: string;
  description: string;
  files?: { name: string; size: number }[];
}

interface FormFile {
  name: string;
  size: number;
  file: File;
}

interface StageManagementProps {
  levelNumber: number;
}

const StageManagement: React.FC<StageManagementProps> = ({ levelNumber }) => {
  const [stages, setStages] = useState<Stage[]>([
    {
      id: '1',
      name: 'Proposal',
      description: 'Submit project proposal',
    },
    {
      id: '2',
      name: 'Interim',
      description: 'Interim project submission',
    },
  ]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const [uploadedFiles, setUploadedFiles] = useState<FormFile[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);

  const [showModal, setShowModal] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddStage = () => {
    if (formData.name) {
      const newStage: Stage = {
        id: Date.now().toString(),
        ...formData,
        files: uploadedFiles.map(({ name, size }) => ({ name, size })),
      };
      setStages([...stages, newStage]);
      setFormData({ name: '', description: '' });
      setUploadedFiles([]);
      setShowModal(false);
    }
  };

  const handleDeleteStage = (id: string) => {
    setStages(stages.filter(stage => stage.id !== id));
  };

  const handleFilesSelected = (files: FileList) => {
    const newFiles = Array.from(files).map(file => ({
      name: file.name,
      size: file.size,
      file: file,
    }));
    setUploadedFiles([...uploadedFiles, ...newFiles]);
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
    setFormData({ name: '', description: '' });
    setUploadedFiles([]);
  };

  return (
    <div className="stage-management-container">
      <div className="stages-header">
        <button
          className="btn-add-stage"
          onClick={() => setShowModal(true)}
        >
          <Plus size={18} />
          Add Stage
        </button>
      </div>

      {/* Master List View */}
      <div className="stages-timeline">
        {stages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <h4>No stages created yet</h4>
            <p>Click the "Add Stage" button to create your first project stage</p>
          </div>
        ) : (
          <div className="timeline-list">
            {stages.map((stage, index) => (
              <div key={stage.id} className="timeline-item">
                <div className="timeline-marker">
                  <span className="stage-number">{index + 1}</span>
                </div>

                <div className="timeline-content">
                  <div className="stage-header-row">
                    <h4 className="stage-name">{stage.name}</h4>
                    <button
                      className="btn-delete-small"
                      onClick={() => handleDeleteStage(stage.id)}
                      aria-label="Delete stage"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="stage-info">
                    {stage.description && (
                      <div className="info-item">
                        <span className="info-label">Description:</span>
                        <span className="info-value">{stage.description}</span>
                      </div>
                    )}
                    {stage.files && stage.files.length > 0 && (
                      <div className="info-item">
                        <span className="info-label">Documents:</span>
                        <span className="info-value">{stage.files.length} file(s) attached</span>
                      </div>
                    )}
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
                <label>Supporting Documents</label>
                <div
                  className={`drag-drop-zone ${isDragActive ? 'active' : ''}`}
                  onDragEnter={(e) => handleDrag(e, true)}
                  onDragLeave={(e) => handleDrag(e, false)}
                  onDragOver={(e) => handleDrag(e, true)}
                  onDrop={handleDrop}
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
              <button className="btn-cancel" onClick={handleCloseModal}>
                Cancel
              </button>
              <button className="btn-save" onClick={handleAddStage}>
                Save Stage
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StageManagement;
