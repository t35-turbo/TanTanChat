import { useFiles, type FileItem } from "@/hooks/use-files";
import { useMutation } from "@tanstack/react-query";
import ky from "ky";
import { LoaderCircle, Paperclip, X } from "lucide-react";
import { useEffect } from "react";

export default function FileDisplay() {
  const files = useFiles((state) => state.files);

  return (
    <div className="flex flex-wrap p-1">
      {files.map((file) => (
        <File file={file} />
      ))}
    </div>
  );
}

function File({ file }: { file: FileItem }) {
  const removeFile = useFiles((state) => state.removeFile);
  const setUploaded = useFiles((state) => state.setUploaded);

  const uploader = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("file", file.file);
      let results: any = await ky.post("/api/files/upload", { body: formData }).json();

      if ("fileId" in results) {
        setUploaded(file.file, results.fileId)
      }
    },
  });

  useEffect(() => {
    if (!file.uploaded && !uploader.isPending && !uploader.isSuccess) {
      uploader.mutate();
    }
  }, [file, uploader]);

  return (
    <div className="border p-2 rounded-xl flex items-center group relative cursor-default">
      {uploader.isPending ? <LoaderCircle className="animate-spin size-4" /> : <Paperclip className="size-4 mr-1" />} {file.name}
      <button onClick={() => removeFile(file.id)} className="absolute -right-1 -top-1 hidden group-hover:block">
        <X className="size-3" />
      </button>
    </div>
  );
}
