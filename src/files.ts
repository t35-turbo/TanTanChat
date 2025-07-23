import { db } from "./db";
import { files } from "./db/schema";
import { eq, and } from "drizzle-orm";
import * as crypto from "crypto";
import mime from "mime";
import { mkdirSync, readdirSync } from "fs";
import env from "./lib/env";
import { authProcedure, router } from "./trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";
import { isBinaryFile } from "isbinaryfile";

if (env.USE_S3 === false) {
  try {
    readdirSync(env.LOCAL_FILE_STORE_PATH + "/store");
  } catch {
    /* Create local store directory for attachments */
    mkdirSync(env.LOCAL_FILE_STORE_PATH + "/store", { recursive: true });
  }
}

export async function getFile(id: string) {
  const file = await db.select().from(files).where(eq(files.id, id)).limit(1);

  if (file.length === 0) {
    return null;
  }

  if (process.env.USE_S3 === "true") {
    throw new Error("File downloads are not supported when USE_S3 is true currently");
  }

  let fileData;
  try {
    fileData = Bun.file(`${file[0].filePath}`);
  } catch (error) {
    console.error("Error retrieving file:", error);
    console.log("Trying to read file from ENV local store path");
    fileData = Bun.file(`${process.env.LOCAL_FILE_STORE_PATH}/${id}`);
  }

  return {
    metadata: file[0],
    data: fileData,
  };
}

export const filesRouter = router({
  upload: authProcedure.input(z.instanceof(FormData)).mutation(async (opts) => {
    // TODO: S3 support
    if (process.env.USE_S3 === "true") {
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: "File uploads are not supported when USE_S3 is true",
      });
    }

    const file = z.instanceof(File).parse(opts.input.get("file"));
    const fileId = crypto.randomUUID();
    const filePath = `${env.LOCAL_FILE_STORE_PATH}/store/${fileId}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    let fileType = file.type;

    if (fileType === "") {
      // TODO: better mime type identification
      if (await isBinaryFile(buffer)) {
        fileType = "application/octet-stream";
      } else {
        fileType = "text/plain";
      }
    }

    await Bun.write(filePath, buffer);

    const fileName = file.name;
    const fileSize = file.size;
    const fileHash = crypto.createHash("md5").update(buffer).digest("hex");

    const fileData = {
      id: fileId,
      filename: fileName,
      size: fileSize,
      hash: fileHash,
      mime: fileType,
      ownedBy: opts.ctx.user.id,
      onS3: process.env.USE_S3 === "true",
      filePath: filePath,
      createdAt: new Date(),
    };

    await db.insert(files).values(fileData);
    return { fileId: fileId, fileName: fileName, fileSize: fileSize, fileHash: fileHash };
  }),

  get: authProcedure.input(z.object({ id: z.string() })).query(async (opts) => {
    const fileResult = await getFile(opts.input.id);

    if (!fileResult) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "File not found",
      });
    }

    if (opts.ctx.user.id !== fileResult.metadata.ownedBy) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Forbidden",
      });
    }

    const filetype = mime.getType(fileResult.metadata.filename) || "application/octet-stream";
    const arrayBuffer = await fileResult.data.arrayBuffer();

    return {
      data: Buffer.from(arrayBuffer).toString("base64"),
      contentType: filetype,
      filename: fileResult.metadata.filename,
    };
  }),

  getMetadata: authProcedure.input(z.object({ id: z.string() })).query(async (opts) => {
    const file = await db
      .select()
      .from(files)
      .where(and(eq(files.id, opts.input.id), eq(files.ownedBy, opts.ctx.user.id)))
      .limit(1);

    if (file.length === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "File not found",
      });
    }

    return {
      fileId: file[0].id,
      fileName: file[0].filename,
      fileSize: file[0].size,
      fileHash: file[0].hash,
    };
  }),

  delete: authProcedure.input(z.object({ id: z.string() })).mutation(async (opts) => {
    const file = await db.select().from(files).where(eq(files.id, opts.input.id)).limit(1);

    if (file.length === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "File not found",
      });
    }

    if (opts.ctx.user.id !== file[0].ownedBy) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Forbidden",
      });
    }

    try {
      // Delete the file from the local store
      await Bun.file(`${file[0].filePath}`).delete();

      // Delete the file record from the database
      await db.delete(files).where(eq(files.id, opts.input.id));

      return { message: "File deleted successfully" };
    } catch (error) {
      console.error("Error deleting file:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to delete file",
      });
    }
  }),
});
