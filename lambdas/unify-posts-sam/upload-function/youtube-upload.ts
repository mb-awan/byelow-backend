import { APIGatewayEvent, Callback, Context } from 'aws-lambda';
import AWS from 'aws-sdk';
import axios, { AxiosRequestConfig } from 'axios';
import FormData from 'form-data';

async function checkIfFileExists(r2: AWS.S3, bucketName: string, fileKey: string): Promise<boolean> {
  try {
    await r2.headObject({ Bucket: bucketName, Key: fileKey }).promise();
    return true;
  } catch (error: any) {
    if (error.code === 'NotFound') {
      return false;
    }
    throw error;
  }
}

export const handler = async (event: APIGatewayEvent, context: Context, callback: Callback) => {
  try {
    if (!event.body) throw new Error('Request body is missing.');

    // Parse the request body and extract all needed parameters
    const {
      // R2 and file info
      bucketName,
      fileKey,
      r2Endpoint,
      r2AccessKey,
      r2SecretKey,

      // YouTube access token (provided directly)
      accessToken,

      // YouTube upload parameters
      youtubeMetadata, // Object containing all metadata for the YouTube video upload (title, description, tags, categoryId, status, etc.)
      youtubeUploadParams, // Optional query parameters for the YouTube API upload endpoint
    } = JSON.parse(event.body);

    // Validate required fields
    if (!bucketName || !fileKey || !youtubeMetadata) {
      throw new Error('bucketName, fileKey, and youtubeMetadata are required.');
    }
    if (!r2Endpoint || !r2AccessKey || !r2SecretKey) {
      throw new Error('R2 credentials (r2Endpoint, r2AccessKey, r2SecretKey) are required.');
    }
    if (!accessToken) {
      throw new Error('YouTube accessToken is required.');
    }

    // Instantiate Cloudflare R2 client using credentials from the request body
    const r2 = new AWS.S3({
      endpoint: r2Endpoint,
      region: 'auto',
      credentials: {
        accessKeyId: r2AccessKey,
        secretAccessKey: r2SecretKey,
      },
    });

    // Check if file exists in R2
    const fileExists = await checkIfFileExists(r2, bucketName, fileKey);
    if (!fileExists) {
      return callback(null, {
        statusCode: 404,
        body: JSON.stringify({ error: 'File not found in R2.' }),
      });
    }

    // Retrieve file from R2 as a readable stream
    const videoStream = r2.getObject({ Bucket: bucketName, Key: fileKey }).createReadStream();

    // Prepare the form data for the YouTube upload
    const data = new FormData();
    // Append the provided metadata (everything needed for upload)
    data.append('metadata', JSON.stringify(youtubeMetadata), { contentType: 'application/json' });
    // Append the video file stream with its key as filename
    data.append('video', videoStream, { contentType: 'video/mp4', filename: fileKey });

    // Build the upload URL; default to "part=snippet,status" if none provided
    const queryParams = youtubeUploadParams ? youtubeUploadParams : 'part=snippet,status';
    const url = `https://www.googleapis.com/upload/youtube/v3/videos?${queryParams}`;

    // Configure the Axios request for the video upload
    const config: AxiosRequestConfig = {
      method: 'post',
      url,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...data.getHeaders(),
      },
      data,
    };

    // Upload the video to YouTube
    const response = await axios.request(config);

    // Extract the video ID from the response and build a YouTube URL
    const videoId = response.data.id;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Return the complete YouTube API response along with the video URL
    callback(null, {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Video uploaded successfully!',
        videoUrl: videoUrl,
        youtubeResponse: response.data,
      }),
    });
  } catch (error: any) {
    console.error('Upload failed:', error);
    callback(null, {
      statusCode: 500,
      body: JSON.stringify({ error: 'Upload failed', details: error.message }),
    });
  }
};
