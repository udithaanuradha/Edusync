import React, { useState } from 'react';
import { Upload, Loader } from 'lucide-react';

interface FileUploadProps {
  stageId: string | number;
}

const FileUpload: React.FC<FileUploadProps> = ({ stageId }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadStatus('idle');
      console.log('📄 File selected:', selectedFile.name);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert('❌ Please select a file first!');
      return;
    }

    setUploading(true);
    setUploadStatus('idle');

    try {
      // 1. Create the FormData envelope
      const formData = new FormData();
      formData.append('file', file);
      formData.append('stage_id', stageId.toString());
      formData.append('uploaded_by', '1'); // TODO: Replace with actual user ID

      console.log('📤 Uploading file:', file.name, 'for stage:', stageId);

      // 2. Send to backend
      const response = await fetch('http://localhost:5000/api/projects/upload-file', {
        method: 'POST',
        // Important: Don't set Content-Type header - browser does it automatically for FormData
        body: formData,
      });

      const data = await response.json();
      console.log('📦 Response:', data);

      if (response.ok && data.success) {
        console.log('✅ Upload successful! File ID:', data.file_id);
        setUploadStatus('success');
        setFile(null);
        // Reset file input
        const fileInput = document.getElementById(`file-input-${stageId}`) as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        
        setTimeout(() => {
          alert('✅ Upload Successful! File saved to database.');
          setUploadStatus('idle');
        }, 500);
      } else {
        throw new Error(data.message || 'Upload failed');
      }
    } catch (error) {
      console.error('❌ Upload error:', error);
      setUploadStatus('error');
      alert(`❌ Upload Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      style={{
        marginTop: '16px',
        padding: '16px',
        border: '2px dashed #3b82f6',
        borderRadius: '8px',
        backgroundColor: '#f0f9ff',
      }}
    >
      <div style={{ marginBottom: '12px' }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#1e40af', fontSize: '14px', fontWeight: '600' }}>
          📤 Upload Stage Guidelines/Documents
        </h4>
        <p style={{ margin: '0', color: '#64748b', fontSize: '12px' }}>
          Accepted: PDFs, Images, Word Docs
        </p>
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input
          id={`file-input-${stageId}`}
          type="file"
          onChange={handleFileChange}
          accept=".pdf,.jpg,.png,.docx,.doc"
          disabled={uploading}
          style={{
            padding: '8px',
            fontSize: '14px',
            flex: 1,
            cursor: uploading ? 'not-allowed' : 'pointer',
            opacity: uploading ? 0.6 : 1,
          }}
        />
        <button
          onClick={handleUpload}
          disabled={uploading || !file}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            backgroundColor: uploading || !file ? '#cbd5e1' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: uploading || !file ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'background-color 0.2s',
          }}
          onMouseOver={(e) => {
            if (!uploading && file) {
              e.currentTarget.style.backgroundColor = '#2563eb';
            }
          }}
          onMouseOut={(e) => {
            if (!uploading && file) {
              e.currentTarget.style.backgroundColor = '#3b82f6';
            }
          }}
        >
          {uploading ? (
            <>
              <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
              Uploading...
            </>
          ) : (
            <>
              <Upload size={16} />
              Upload File
            </>
          )}
        </button>
      </div>

      {file && (
        <div style={{ marginTop: '8px', fontSize: '12px', color: '#475569' }}>
          📄 Selected: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(2)} KB)
        </div>
      )}

      {uploadStatus === 'success' && (
        <div style={{
          marginTop: '8px',
          padding: '8px',
          backgroundColor: '#dcfce7',
          color: '#166534',
          borderRadius: '4px',
          fontSize: '12px',
        }}>
          ✅ Upload successful!
        </div>
      )}

      {uploadStatus === 'error' && (
        <div style={{
          marginTop: '8px',
          padding: '8px',
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          borderRadius: '4px',
          fontSize: '12px',
        }}>
          ❌ Upload failed. Check console for details.
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default FileUpload;
