import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";

const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
  },
});

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("image") || formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const extension = file.name.split('.').pop() || "jpg";
    const uniqueFilename = `${crypto.randomUUID()}.${extension}`;
    const contentType = file.type || "image/jpeg";

    const params = {
      Bucket: process.env.AWS_STORAGE_BUCKET_NAME,
      Key: uniqueFilename,
      Body: buffer,
      ContentType: contentType,
      ACL: "public-read",
    };

    const command = new PutObjectCommand(params);
    await s3Client.send(command);

    // Construct the public URL
    // Endpoint URL from user: https://chayatol-resort.s3.ap-southeast-1.amazonaws.com/
    const baseUrl = process.env.AWS_S3_ENDPOINT_URL.endsWith('/') 
      ? process.env.AWS_S3_ENDPOINT_URL 
      : `${process.env.AWS_S3_ENDPOINT_URL}/`;
      
    const publicUrl = `${baseUrl}${uniqueFilename}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      path: uniqueFilename
    }, { status: 200 });

  } catch (error) {
    console.error("S3 Upload Error:", error);
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
  }
}
