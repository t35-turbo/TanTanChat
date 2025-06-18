import { create } from "zustand";

export interface FileItem {
  id: string;
  name: string;
  file: File;
  uploaded: boolean;
}

export interface FilesState {
  files: FileItem[];
  addFiles: (newFiles: FileItem[]) => void;
  clearFiles: () => void;
  setUploaded: (file: File, id: string) => void;
  removeFile: (id: string) => void;
}

export const useFiles = create<FilesState>((set, get) => ({
  files: [],
  addFiles: (newFiles: FileItem[]) => set({ files: [...get().files, ...newFiles].slice(0, 10) }),
  clearFiles: () => set({ files: [] }),
  setUploaded: (idFile: File, id: string) =>
    set({ files: get().files.map((file) => (file.file === idFile ? { ...file, uploaded: true, id } : file)) }),
  removeFile: (id: string) => set({ files: get().files.filter((file) => file.id !== id) }),
}));
