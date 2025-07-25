import { type FileItem, useFiles } from "@/hooks/use-files";
import { __client } from "@/lib/trpc";
import { useMutation } from "@tanstack/react-query";
import { LoaderCircle, Paperclip, X } from "lucide-react";
import { useEffect } from "react";

export default function FileDisplay() {
  const files = useFiles((state) => state.files);

  return (
    <div className="flex flex-wrap p-1">
      {files.map((file) => (
        <File file={file} key={file.id} />
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
      const results = await __client.files.upload.mutate(formData);

      setUploaded(file.file, results.fileId);
    },
  });

  useEffect(() => {
    if (!file.uploaded && !uploader.isPending && !uploader.isSuccess) {
      uploader.mutate();
    }
  }, [file, uploader]);

  return (
    <div className="group relative flex cursor-default items-center rounded-xl border p-2">
      {uploader.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Paperclip className="mr-1 size-4" />}{" "}
      {file.name}
      <button onClick={() => removeFile(file.id)} className="absolute -right-1 -top-1 hidden group-hover:block">
        <X className="size-3" />
      </button>
    </div>
  );
}
