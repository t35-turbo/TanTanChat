import { Hono } from "hono";
import { db } from "./db";
import { files } from "./db/schema";
import { eq, and } from "drizzle-orm";
import * as crypto from "crypto";
import mime from "mime";
import { auth } from "./lib/auth";
import { mkdirSync, readdirSync } from "fs";
import env from "./lib/env";

if (env.USE_S3 === false) {
  try {
    readdirSync(env.LOCAL_FILE_STORE_PATH + "/store");
  } catch {
    /* Create local store directory for attachments */
    mkdirSync(env.LOCAL_FILE_STORE_PATH + "/store", { recursive: true });
  }
}

const filesApp = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

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

filesApp.post("/upload", async (c) => {
  // TODO: S3 support

  const session = c.get("session");
  const user = c.get("user");
  const formData = await c.req.formData();
  const file = formData.get("file");

  if (!session || !user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (!file || !(file instanceof Blob)) {
    return c.json({ error: "Invalid file" }, 400);
  }

  if (process.env.USE_S3 === "true") {
    throw new Error("File uploads are not supported when USE_S3 is true");
  }

  const fileId = crypto.randomUUID();
  const filePath = `${env.LOCAL_FILE_STORE_PATH}/store/${fileId}`;
  const arrayBuffer = await file.arrayBuffer();

  await Bun.write(filePath, arrayBuffer);

  const fileName = file.name || `${fileId}`;
  const fileSize = file.size || arrayBuffer.byteLength;
  const fileHash = crypto.createHash("md5").update(new Uint8Array(arrayBuffer)).digest("hex");

  const fileData = {
    id: fileId,
    filename: fileName,
    size: fileSize,
    hash: fileHash,
    mime: file.type,
    ownedBy: user.id,
    onS3: process.env.USE_S3 === "true",
    filePath: filePath,
    createdAt: new Date(),
  };

  await db.insert(files).values(fileData);
  return c.json({ fileId: fileId, fileName: fileName, fileSize: fileSize, fileHash: fileHash }, 201);
});

filesApp.get("/:id", async (c) => {
  const session = c.get("session");
  const user = c.get("user");
  const fileId = c.req.param("id");

  if (!session || !user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  if (!fileId || typeof fileId !== "string") {
    return c.json({ error: "Invalid file ID" }, 400);
  }

  const fileResult = await getFile(fileId);

  if (!fileResult) {
    return c.json({ error: "File not found" }, 404);
  }

  if (user.id !== fileResult.metadata.ownedBy) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const filetype = mime.getType(fileResult.metadata.filename) || "application/octet-stream";

  c.header("Content-Type", filetype);

  return c.body(await fileResult.data.arrayBuffer(), 200, {
    "Content-Disposition": `attachment; filename="${fileResult.metadata.filename}"`,
  });
});

filesApp.get("/:id/metadata", async (c) => {
  const session = c.get("session");
  const user = c.get("user");
  const fileId = c.req.param("id");

  if (!session || !user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  if (!fileId || typeof fileId !== "string") {
    return c.json({ error: "Invalid file ID" }, 400);
  }

  const file = await db
    .select()
    .from(files)
    .where(and(eq(files.id, fileId), eq(files.ownedBy, user.id)))
    .limit(1);

  if (file.length === 0) {
    return c.json({ error: "File not found" }, 404);
  }

  return c.json({ fileId: file[0].id, fileName: file[0].filename, fileSize: file[0].size, fileHash: file[0].hash }, 201);
});

filesApp.delete("/:id", async (c) => {
  const session = c.get("session");
  const user = c.get("user");
  const fileId = c.req.param("id");

  if (!session || !user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  if (!fileId || typeof fileId !== "string") {
    return c.json({ error: "Invalid file ID" }, 400);
  }

  const file = await db.select().from(files).where(eq(files.id, fileId)).limit(1);

  if (file.length === 0) {
    return c.json({ error: "File not found" }, 404);
  }
  if (user.id !== file[0].ownedBy) {
    return c.json({ error: "Forbidden" }, 403);
  }

  try {
    // Delete the file from the local store
    await Bun.file(`${file[0].filePath}`).delete();

    // Delete the file record from the database
    await db.delete(files).where(eq(files.id, fileId));

    return c.json({ message: "File deleted successfully" }, 200);
  } catch (error) {
    console.error("Error deleting file:", error);
    return c.json({ error: "Failed to delete file" }, 500);
  }
});

export { filesApp };
