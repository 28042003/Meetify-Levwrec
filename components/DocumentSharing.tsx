'use client';
import React from 'react';

interface DocumentSharingProps {
  uploadedFiles: File[];
  onShareDocument: (document: { id: string; name: string }) => void;
}

const DocumentSharing: React.FC<DocumentSharingProps> = ({ uploadedFiles, onShareDocument }) => {
  return (
    <ul>
      {uploadedFiles.map((file, index) => (
        <li key={index}>
          {file.name}
          <button onClick={() => onShareDocument({ id: file.name, name: file.name })}>
            Share
          </button>
        </li>
      ))}
    </ul>
  );
};

export default DocumentSharing;


