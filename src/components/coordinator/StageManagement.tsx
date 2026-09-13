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
  // Coordinator/staff-only rubric — never sent to students. Stored as a
  // single file path rather than in `files` (which the student view also
  // reads) so a marking rubric can't leak into that shared list by mistake.
  marking_criteria_file?: string | null;
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
// Marking Criteria accepts the same document formats plus legacy .xls, per
// the accept string this field is required to use.
const ALLOWED_MARKING_CRITERIA_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt'];
const MAX_STAGE_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const getFileExtension = (fileName: string): string => {
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : '';
};

// marking_criteria_file stores a bare path/URL, not a display name — this
// pulls a readable filename off the end of it for the "current file" label.
// The backend's Cloudinary upload (uploadBufferToCloudinary) names every
// file `${Date.now()}-${originalName}` to keep it collision-free, so the
// raw URL segment reads e.g. "1788860372068-Rubric.pdf" — strip that
// leading timestamp back off since Supporting Documents (which store a
// separate clean file_name column instead of deriving one from the URL)
// never show it, and Marking Criteria shouldn't look worse by comparison.
const getFileNameFromPath = (path: string): string => {
  const cleaned = path.split(/[?#]/)[0];
  const segments = cleaned.split(/[/\\]/);
  const rawName = segments[segments.length - 1] || cleaned;
  return rawName.replace(/^\d{10,}-/, '');
};

// Zero-padded local "YYYY-MM-DDTHH:MM" — this is exactly the format
// <input type="datetime-local"> both expects for its `value`/`min` and
// produces in e.target.value on change, and it sorts/compares correctly as
// a plain string (no need to parse into Date objects just to tell two
// deadlines apart or check one against "now").
const getNowDateTimeLocalString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// Converts a stored deadline (an ISO string with seconds/timezone, e.g.
// "2026-09-22T14:30:00.000Z") into the local "YYYY-MM-DDTHH:MM" a
// datetime-local input's `value` needs. Slicing the raw string instead would
// show the UTC time verbatim, silently shifting the displayed hour for any
// coordinator not in UTC.
const toDateTimeLocalValue = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// The <input type="datetime-local"> value ("YYYY-MM-DDTHH:MM") isn't a
// format every MySQL/TiDB version parses leniently — normalize to the
// space-separated, seconds-included form DATETIME columns always accept
// before it goes in the request body.
const toMySqlDateTime = (value: string): string => `${value.replace('T', ' ')}:00`;

// The Reference Material field renders straight into an <a href> on the
// stage card, so plain text typed in there (e.g. "ghsk") becomes a broken,
// site-relative link instead of a real resource. The input's type="url"
// alone doesn't stop that: these forms submit via a button's onClick, not
// a <form> submit event, so the browser's native URL constraint validation
// never actually runs. This re-checks it in JS, and restricts the scheme
// to http/https so an http(s) link is the only kind that can ever land in
// that href — never e.g. a javascript: URL.
const isValidHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
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
        const response = await fetch(`http://localhost:5000/api/projects/level/${levelNumber}?coordinatorId=${user?.id}&viewerRole=coordinator`);
        
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
  // Marking Criteria is a single staff-only file, kept separate from
  // `uploadedFiles` (the general Supporting Documents list) so it never
  // rides along into the array the student view also reads.
  const [markingCriteriaFile, setMarkingCriteriaFile] = useState<FormFile | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [editFormData, setEditFormData] = useState({
    stage_name: '',
    description: '',
    deadline: '',
    resource_link: '',
  });
  const [editMarkingCriteriaFile, setEditMarkingCriteriaFile] = useState<FormFile | null>(null);
  // New Supporting Documents queued while editing an already-created stage —
  // separate from `uploadedFiles` (the Add-Stage-modal queue) since editing
  // a stage that's already saved needs its own pending list, uploaded in
  // handleSaveEdit rather than handleAddStage.
  const [editUploadedFiles, setEditUploadedFiles] = useState<FormFile[]>([]);
  const [editIsDragActive, setEditIsDragActive] = useState(false);
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

    // Two stages with the same name at the same level are two competing
    // definitions of the same milestone, not two different ones — and the
    // Calendar's Evaluation Type dropdown, marks linking, and final-grade
    // totals all key off stage_name, so a duplicate silently makes those
    // ambiguous about which stage's marks/deadline actually apply.
    const isDuplicateName = stages.some(
      (stage) => stage.stage_name.trim().toLowerCase() === trimmedName.toLowerCase(),
    );
    if (isDuplicateName) {
      alert(`A stage named "${trimmedName}" already exists for this level. Choose a different name or edit the existing one instead.`);
      return;
    }

    // Deadline is optional — not every stage needs one (e.g. an
    // informational stage with no submission to track). When one IS set
    // though, it drives "Late Submission" status everywhere else in the app
    // (Submissions tab, student view), so it still can't be in the past.
    if (formData.deadline && formData.deadline < getNowDateTimeLocalString()) {
      alert('Deadline cannot be in the past. Please choose a future date and time.');
      return;
    }

    const trimmedResourceLink = formData.resource_link.trim();
    if (trimmedResourceLink && !isValidHttpUrl(trimmedResourceLink)) {
      alert('Reference Material / Work Link must be a valid web link, e.g. https://docs.google.com/...');
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
          deadline: formData.deadline ? toMySqlDateTime(formData.deadline) : null,
          resource_link: trimmedResourceLink || null,
          created_by: user?.id || 1,
          user_role: effectiveRole,
        }),
      });

      // Read the body before deciding this failed — the backend's own
      // duplicate-name check (a safety net behind the one above, for a
      // stale local list or a direct API call) replies 409 with a specific
      // message, which a bare statusText check would throw away.
      const createResult = await createResponse.json().catch(() => null);
      if (!createResponse.ok || !createResult?.success) {
        throw new Error(createResult?.message || `Failed to create stage: ${createResponse.statusText}`);
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

      // Step 3: Upload the staff-only Marking Criteria file, if provided.
      // This goes through the same endpoint but flagged with
      // file_category=marking_criteria, which tells the backend to save the
      // path on project_stages.marking_criteria_file instead of inserting a
      // row into the shared stage_files table the student view reads from.
      let markingCriteriaPath: string | null = null;
      if (markingCriteriaFile) {
        try {
          const criteriaFormData = new FormData();
          criteriaFormData.append('file', markingCriteriaFile.file);
          criteriaFormData.append('stage_id', realStageId.toString());
          criteriaFormData.append('uploaded_by', String(user?.id || 1));
          criteriaFormData.append('file_category', 'marking_criteria');

          const criteriaResponse = await fetch('http://localhost:5000/api/projects/upload-file', {
            method: 'POST',
            body: criteriaFormData,
          });
          const criteriaResult = await criteriaResponse.json().catch(() => null);
          if (criteriaResponse.ok && criteriaResult?.success) {
            markingCriteriaPath = criteriaResult.file_url;
          } else {
            uploadWarnings.push(`${markingCriteriaFile.name}: ${criteriaResult?.error || 'Marking Criteria upload failed'}`);
          }
        } catch (criteriaErr) {
          const message = criteriaErr instanceof Error ? criteriaErr.message : String(criteriaErr);
          uploadWarnings.push(`${markingCriteriaFile.name}: ${message}`);
        }
      }

      // Step 4: Add the stage to local state with real data from backend
      const newStage: Stage = {
        stage_id: realStageId.toString(),
        stage_name: trimmedName,
        description: formData.description,
        deadline: formData.deadline,
        resource_links: formData.resource_link.trim() || undefined,
        level: levelNumber.toString(),
        files: filesData,
        marking_criteria_file: markingCriteriaPath,
      };

      setStages([...stages, newStage]);

      // Reset form and close modal
      setFormData({ name: '', description: '', deadline: '', resource_link: '' });
      setUploadedFiles([]);
      setMarkingCriteriaFile(null);
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
    setEditMarkingCriteriaFile(null);
    setEditUploadedFiles([]);
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

    // Same duplicate-name rule as creating a stage, excluding the stage
    // being edited itself so re-saving it under its own unchanged name
    // doesn't flag itself as a duplicate.
    const isDuplicateName = stages.some(
      (stage) =>
        stage.stage_id !== editingStage.stage_id &&
        stage.stage_name.trim().toLowerCase() === trimmedName.toLowerCase(),
    );
    if (isDuplicateName) {
      alert(`A stage named "${trimmedName}" already exists for this level. Choose a different name.`);
      return;
    }

    // Deadline is optional, same as when creating a stage — only validated
    // against "now" when one is actually set.
    if (editFormData.deadline && editFormData.deadline < getNowDateTimeLocalString()) {
      alert('Deadline cannot be in the past. Please choose a future date and time.');
      return;
    }

    // Trim first — a whitespace-only leftover (e.g. from clearing the
    // field) is still truthy and would round-trip as a "link" that renders
    // (and looks impossible to clear) even though it's blank.
    const trimmedResourceLink = editFormData.resource_link.trim();
    if (trimmedResourceLink && !isValidHttpUrl(trimmedResourceLink)) {
      alert('Reference Material / Work Link must be a valid web link, e.g. https://docs.google.com/...');
      return;
    }

    try {
      setUploadingFiles(true);

      const response = await fetch(`http://localhost:5000/api/projects/update/${editingStage.stage_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          stage_name: trimmedName,
          description: editFormData.description,
          deadline: editFormData.deadline ? toMySqlDateTime(editFormData.deadline) : null,
          resource_link: trimmedResourceLink || null,
          user_role: effectiveRole,
        }),
      });

      // Same reasoning as handleAddStage: read the body first so the
      // backend's duplicate-name 409 surfaces its specific message instead
      // of a bare "Conflict" statusText.
      const updateResult = await response.json().catch(() => null);
      if (!response.ok || updateResult?.success === false) {
        throw new Error(updateResult?.message || `Failed to update stage: ${response.statusText}`);
      }

      // If a replacement Marking Criteria file was selected, upload it the
      // same way as on creation — flagged so the backend overwrites
      // project_stages.marking_criteria_file rather than adding a row to
      // the shared stage_files table.
      let updatedMarkingCriteriaPath = editingStage.marking_criteria_file;
      if (editMarkingCriteriaFile) {
        try {
          const criteriaFormData = new FormData();
          criteriaFormData.append('file', editMarkingCriteriaFile.file);
          criteriaFormData.append('stage_id', editingStage.stage_id);
          criteriaFormData.append('uploaded_by', String(user?.id || 1));
          criteriaFormData.append('file_category', 'marking_criteria');

          const criteriaResponse = await fetch('http://localhost:5000/api/projects/upload-file', {
            method: 'POST',
            body: criteriaFormData,
          });
          const criteriaResult = await criteriaResponse.json().catch(() => null);
          if (criteriaResponse.ok && criteriaResult?.success) {
            updatedMarkingCriteriaPath = criteriaResult.file_url;
          } else {
            alert(`Stage updated, but the Marking Criteria file failed to upload: ${criteriaResult?.error || 'Unknown error'}`);
          }
        } catch (criteriaErr) {
          const message = criteriaErr instanceof Error ? criteriaErr.message : String(criteriaErr);
          alert(`Stage updated, but the Marking Criteria file failed to upload: ${message}`);
        }
      }

      // Upload any new Supporting Documents queued while editing. This was
      // previously impossible — the Edit modal had no upload zone at all,
      // only a list of already-saved files. Failures here don't block the
      // stage update above, same as handleAddStage's per-file error handling.
      const newFilesData: Stage['files'] = [];
      const uploadWarnings: string[] = [];
      for (const fileObj of editUploadedFiles) {
        try {
          const fileFormData = new FormData();
          fileFormData.append('file', fileObj.file);
          fileFormData.append('stage_id', editingStage.stage_id);
          fileFormData.append('uploaded_by', String(user?.id || 1));

          const uploadResponse = await fetch('http://localhost:5000/api/projects/upload-file', {
            method: 'POST',
            body: fileFormData,
          });
          const uploadResult = await uploadResponse.json().catch(() => null);
          if (uploadResponse.ok && uploadResult?.success) {
            newFilesData.push({
              file_id: uploadResult.file_id,
              file_name: fileObj.file.name,
              file_url: uploadResult.file_url,
              uploaded_by: user?.id,
            });
          } else {
            uploadWarnings.push(`${fileObj.file.name}: ${uploadResult?.error || 'Upload failed'}`);
          }
        } catch (fileErr) {
          const message = fileErr instanceof Error ? fileErr.message : String(fileErr);
          uploadWarnings.push(`${fileObj.file.name}: ${message}`);
        }
      }

      const updatedStages = stages.map(s =>
        s.stage_id === editingStage.stage_id
          ? {
              ...s,
              ...editFormData,
              stage_name: trimmedName,
              resource_links: trimmedResourceLink || undefined,
              marking_criteria_file: updatedMarkingCriteriaPath,
              files: [...(s.files || []), ...newFilesData],
            }
          : s
      );
      setStages(updatedStages);
      setShowEditModal(false);
      setEditingStage(null);
      setEditMarkingCriteriaFile(null);
      setEditUploadedFiles([]);
      setUploadingFiles(false);

      if (uploadWarnings.length > 0) {
        alert(`Stage updated, but some new documents failed to upload:\n${uploadWarnings.join('\n')}`);
      }
    } catch (err) {
      console.error('Error updating stage:', err);
      setUploadingFiles(false);
      alert(`Error updating stage: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingStage(null);
    setEditMarkingCriteriaFile(null);
    setEditUploadedFiles([]);
  };

  // Removes an already-saved Supporting Document from the stage. Until now
  // there was no way to do this at all once a file was uploaded — the Edit
  // modal never even listed existing files. Matches PUT /update/:id's
  // protection level: a bearer token plus a self-reported user_role the
  // backend's authorizeRole middleware checks against an allowlist.
  const handleDeleteExistingFile = async (fileId: number | undefined) => {
    if (!editingStage || fileId === undefined) return;

    try {
      const response = await fetch(`http://localhost:5000/api/projects/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ user_role: effectiveRole }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.success === false) {
        throw new Error(result?.message || `Failed to delete file: ${response.statusText}`);
      }

      const stripFile = (files?: Stage['files']) => files?.filter((f) => f.file_id !== fileId);
      setEditingStage((prev) => (prev ? { ...prev, files: stripFile(prev.files) } : prev));
      setStages((prev) =>
        prev.map((s) => (s.stage_id === editingStage.stage_id ? { ...s, files: stripFile(s.files) } : s)),
      );
    } catch (err) {
      console.error('Error deleting file:', err);
      alert(`Error deleting file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Clears an already-saved Marking Criteria file from the stage. Same
  // auth shape as handleDeleteExistingFile above.
  const handleDeleteMarkingCriteria = async () => {
    if (!editingStage) return;

    try {
      const response = await fetch(
        `http://localhost:5000/api/projects/marking-criteria/${editingStage.stage_id}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ user_role: effectiveRole }),
        },
      );
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.success === false) {
        throw new Error(result?.message || `Failed to remove Marking Criteria file: ${response.statusText}`);
      }

      setEditingStage((prev) => (prev ? { ...prev, marking_criteria_file: null } : prev));
      setStages((prev) =>
        prev.map((s) => (s.stage_id === editingStage.stage_id ? { ...s, marking_criteria_file: null } : s)),
      );
    } catch (err) {
      console.error('Error removing Marking Criteria file:', err);
      alert(`Error removing Marking Criteria file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Re-validates extension + size in JS (not just the input's `accept` hint)
  // since handleDrop below feeds files here too, and drag-and-drop never
  // goes through `accept` at all. Takes a setter so the Add-Stage modal
  // (uploadedFiles) and the Edit-Stage modal (editUploadedFiles) can share
  // this same validation/append logic against their own separate queues.
  const handleFilesSelected = (
    files: FileList,
    setter: React.Dispatch<React.SetStateAction<FormFile[]>> = setUploadedFiles,
  ) => {
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
      setter((prev) => [...prev, ...accepted]);
    }
  };

  // Single-file selector for the staff-only Marking Criteria field. Kept
  // separate from handleFilesSelected because this field never accepts more
  // than one file and must never be merged into uploadedFiles.
  const handleMarkingCriteriaSelected = (
    files: FileList,
    setter: (file: FormFile | null) => void,
  ) => {
    const file = files[0];
    if (!file) return;

    const extension = getFileExtension(file.name);
    if (!ALLOWED_MARKING_CRITERIA_EXTENSIONS.includes(extension)) {
      alert(`${file.name} — unsupported file type for Marking Criteria.`);
      return;
    }
    if (file.size > MAX_STAGE_FILE_SIZE_BYTES) {
      alert(`${file.name} — exceeds the 10MB limit.`);
      return;
    }

    setter({ name: file.name, size: file.size, file });
  };

  const handleDrag = (
    e: React.DragEvent<HTMLDivElement>,
    isDragging: boolean,
    setter: React.Dispatch<React.SetStateAction<boolean>> = setIsDragActive,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setter(isDragging);
  };

  const handleDrop = (
    e: React.DragEvent<HTMLDivElement>,
    setDragActive: React.Dispatch<React.SetStateAction<boolean>> = setIsDragActive,
    setFiles: React.Dispatch<React.SetStateAction<FormFile[]>> = setUploadedFiles,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files) {
      handleFilesSelected(e.dataTransfer.files, setFiles);
    }
  };

  const handleRemoveFile = (
    index: number,
    files: FormFile[] = uploadedFiles,
    setter: React.Dispatch<React.SetStateAction<FormFile[]>> = setUploadedFiles,
  ) => {
    setter(files.filter((_, i) => i !== index));
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
    setMarkingCriteriaFile(null);
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
                          {/* Formatted as separate date/time parts joined by
                              "·" (the same separator SupervisorLevelPage.tsx
                              uses for date ranges) rather than
                              toLocaleString's combined dateStyle+timeStyle,
                              which reads as a cluttered double-comma —
                              "Aug 20, 2026, 6:30 PM" — in most locales. */}
                          {new Date(stage.deadline).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                          {' · '}
                          {new Date(stage.deadline).toLocaleTimeString(undefined, { timeStyle: 'short' })}
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

                    {/* Coordinator's own view of the rubric they uploaded —
                        same staff-only field the Supervisor's Coordinator
                        Documents list renders, kept in its own row rather
                        than merged into "Documents:" above so it never reads
                        as just another Supporting Document. */}
                    {stage.marking_criteria_file && (
                      <div className="info-item">
                        <span className="info-label">Marking Criteria (Staff Only):</span>
                        <div style={{ marginTop: '8px' }}>
                          <a
                            href={
                              stage.marking_criteria_file.startsWith('http')
                                ? stage.marking_criteria_file
                                : `http://localhost:5000${stage.marking_criteria_file}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: '#b45309',
                              textDecoration: 'none',
                              fontSize: '14px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                            onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
                            onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}
                          >
                            📄 {getFileNameFromPath(stage.marking_criteria_file)}
                          </a>
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
                <label>Deadline (Optional)</label>
                <input
                  type="datetime-local"
                  name="deadline"
                  value={formData.deadline}
                  onChange={handleInputChange}
                  min={getNowDateTimeLocalString()}
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

              <div className="form-group">
                <label>Marking Criteria</label>
                <p className="marking-criteria-hint">
                  Visible to supervisors only. Students never see this file.
                </p>
                <input
                  type="file"
                  onChange={(e) => e.target.files && handleMarkingCriteriaSelected(e.target.files, setMarkingCriteriaFile)}
                  className="marking-criteria-file-input"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                />
                {markingCriteriaFile && (
                  <div className="uploaded-files-list">
                    <div className="file-item">
                      <div className="file-info">
                        <span className="file-name">{markingCriteriaFile.name}</span>
                        <span className="file-size">{formatFileSize(markingCriteriaFile.size)}</span>
                      </div>
                      <button
                        type="button"
                        className="btn-remove-file"
                        onClick={() => setMarkingCriteriaFile(null)}
                        aria-label="Remove Marking Criteria file"
                      >
                        ✕
                      </button>
                    </div>
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
                <label>Deadline (Optional)</label>
                <input
                  type="datetime-local"
                  name="deadline"
                  value={editFormData.deadline ? toDateTimeLocalValue(editFormData.deadline) : ''}
                  onChange={handleEditInputChange}
                  min={getNowDateTimeLocalString()}
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

              {editingStage.files && editingStage.files.length > 0 && (
                <div className="form-group">
                  <label>Existing Documents</label>
                  <div className="uploaded-files-list">
                    {editingStage.files.map((file, index) => (
                      <div key={file.file_id ?? index} className="file-item">
                        <div className="file-info">
                          <a
                            href={file.file_url.startsWith('http') ? file.file_url : `http://localhost:5000${file.file_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="file-name"
                            style={{ textDecoration: 'none' }}
                          >
                            {file.file_name}
                          </a>
                        </div>
                        <button
                          type="button"
                          className="btn-remove-file"
                          onClick={() => handleDeleteExistingFile(file.file_id)}
                          aria-label={`Remove ${file.file_name}`}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Add Supporting Documents</label>
                <div
                  className={`drag-drop-zone ${editIsDragActive ? 'active' : ''}`}
                  onDragEnter={(e) => handleDrag(e, true, setEditIsDragActive)}
                  onDragLeave={(e) => handleDrag(e, false, setEditIsDragActive)}
                  onDragOver={(e) => handleDrag(e, true, setEditIsDragActive)}
                  onDrop={(e) => handleDrop(e, setEditIsDragActive, setEditUploadedFiles)}
                  onClick={(e) => {
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
                    onChange={(e) => e.target.files && handleFilesSelected(e.target.files, setEditUploadedFiles)}
                    className="file-input"
                    accept=".pdf,.doc,.docx,.xlsx,.ppt,.pptx,.txt"
                  />
                </div>

                {editUploadedFiles.length > 0 && (
                  <div className="uploaded-files-list">
                    <p className="files-label">New files to upload ({editUploadedFiles.length}):</p>
                    {editUploadedFiles.map((file, index) => (
                      <div key={index} className="file-item">
                        <div className="file-info">
                          <span className="file-name">{file.name}</span>
                          <span className="file-size">{formatFileSize(file.size)}</span>
                        </div>
                        <button
                          type="button"
                          className="btn-remove-file"
                          onClick={() => handleRemoveFile(index, editUploadedFiles, setEditUploadedFiles)}
                          aria-label="Remove file"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Marking Criteria</label>
                <p className="marking-criteria-hint">
                  Visible to supervisors only. Students never see this file.
                </p>
                {editingStage.marking_criteria_file && !editMarkingCriteriaFile && (
                  <div className="uploaded-files-list">
                    <div className="file-item">
                      <div className="file-info">
                        <span className="file-name">
                          Current file: {getFileNameFromPath(editingStage.marking_criteria_file)}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn-remove-file"
                        onClick={handleDeleteMarkingCriteria}
                        aria-label="Remove Marking Criteria file"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
                <input
                  type="file"
                  onChange={(e) => e.target.files && handleMarkingCriteriaSelected(e.target.files, setEditMarkingCriteriaFile)}
                  className="marking-criteria-file-input"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                />
                {editMarkingCriteriaFile && (
                  <div className="uploaded-files-list">
                    <div className="file-item">
                      <div className="file-info">
                        <span className="file-name">{editMarkingCriteriaFile.name}</span>
                        <span className="file-size">{formatFileSize(editMarkingCriteriaFile.size)}</span>
                      </div>
                      <button
                        type="button"
                        className="btn-remove-file"
                        onClick={() => setEditMarkingCriteriaFile(null)}
                        aria-label="Remove Marking Criteria file"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <PrimaryButton variant="secondary" className="btn-cancel" onClick={handleCloseEditModal} disabled={uploadingFiles}>
                Cancel
              </PrimaryButton>
              <PrimaryButton className="btn-save" onClick={handleSaveEdit} disabled={uploadingFiles}>
                {uploadingFiles ? 'Saving...' : 'Save Changes'}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StageManagement;
