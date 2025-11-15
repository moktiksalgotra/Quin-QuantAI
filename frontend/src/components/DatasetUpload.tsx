import { useState, useRef } from 'react';
import { uploadDataset } from '../services/api';
import type { DatasetInfo } from '../types/dataset';

interface DatasetUploadProps {
  onDatasetUploaded: (dataset: DatasetInfo) => void;
  uploadSuccess: boolean;
  setUploadSuccess: (success: boolean) => void;
}

export const DatasetUpload: React.FC<DatasetUploadProps> = ({ 
  onDatasetUploaded,
  uploadSuccess,
  setUploadSuccess
 }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }
    setFile(selectedFile);
    setError(null);
    setUploadSuccess(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadSuccess(false);

    try {
      const dataset = await uploadDataset(file);
      onDatasetUploaded(dataset);
    } catch (error: any) {
      setError(error.response?.data?.detail || error.message || 'Failed to upload dataset');
    } finally {
      setIsUploading(false);
    } 
  };

  return (
    <div className="space-y-6">
      <div
        // Adjusted: Reduced padding from p-8 to p-6 for a smaller mobile footprint
        className={`relative border-2 border-dashed rounded-xl p-6 sm:p-8 transition-colors bg-purple-900/20 backdrop-blur-md border-transparent shadow-xl ${dragActive ? 'ring-2 ring-blue-400' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading}
        />
        <div className="text-center">
          {/* Adjusted: Reduced size from w-12 h-12 to w-10 h-10, and inner SVG from w-6 h-6 to w-5 h-5 */}
          <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          {/* Adjusted: Font size slightly smaller for mobile */}
          <h3 className="text-base sm:text-lg font-medium text-white mb-1">Upload your dataset</h3>
          {/* Adjusted: Font size already small, kept it as text-sm */}
          <p className="text-sm text-gray-200 mb-4">
            Drag and drop your CSV file here, or click to browse
          </p>
          {file && (
            <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/20 text-white">
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {file.name}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              {/* Adjusted: Icon size is fine */}
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {uploadSuccess && (
        <div className="rounded-lg bg-green-500/10 p-4 backdrop-blur-md">
          <div className="flex">
            <div className="flex-shrink-0">
              {/* Adjusted: Icon size is fine */}
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-300">Dataset uploaded successfully!</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-center space-x-3">
        <button
          type="button"
          onClick={() => {
            setFile(null);
            setError(null);
            setUploadSuccess(false);
            if (inputRef.current) {
              inputRef.current.value = '';
            }
          }}
          // Adjusted: Reduced vertical padding from py-2 to py-1.5 for a smaller button
          className="px-4 py-1.5 sm:py-2 text-sm font-medium text-white bg-white/10 backdrop-blur-md rounded-xl shadow hover:bg-white/20 focus:outline-none focus:ring-0 border-none"
        >
          Clear
        </button>
        <button
          type="submit"
          onClick={handleSubmit}
          disabled={!file || isUploading}
          // Adjusted: Reduced vertical padding from py-2 to py-1.5 for a smaller button
          className={`inline-flex items-center px-4 py-1.5 sm:py-2 text-sm font-medium text-white rounded-xl shadow backdrop-blur-md focus:outline-none focus:ring-0 border-none transition-colors ${
            !file || isUploading
              ? 'bg-white/20 cursor-not-allowed'
              : 'bg-white/10'
          }`}
        >
          {isUploading ? (
            <>
              {/* Adjusted: Reduced spinner size from w-4 h-4 to w-3 h-3 */}
              <div className="w-3 h-3 sm:w-4 sm:h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Uploading...
            </>
          ) : (
            'Upload Dataset'
          )}
        </button>
      </div>
    </div>
  );
};