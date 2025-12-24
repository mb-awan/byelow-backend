import AWS from 'aws-sdk';
import axios, { AxiosRequestConfig } from 'axios';
import FormData from 'form-data';
import moment from 'moment';

import { env } from '@/common/utils/envConfig';

import { checkIfFileExistsonR2 } from './r2';

// Fetch fresh access token if expired, else return existing one
const getFreshAccessToken = async (accessToken: string, refreshToken: string, expiresAt: string) => {
  // Convert expiresAt to UTC using moment for accurate comparison
  const expiresAtUtc = moment.utc(expiresAt);

  // Check if the token is expired by comparing with current UTC time
  if (expiresAtUtc.isAfter(moment.utc())) {
    return accessToken; // Return the existing token if it's not expired
  }

  try {
    // If token is expired, refresh it
    console.log('⏳ Getting fresh access token for YouTube...');

    const response = await axios.post('https://oauth2.googleapis.com/token', null, {
      params: {
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    // Extract the new access token and expiry time
    const newAccessToken = response.data.access_token;

    console.log('Access token refreshed successfully.');
    return newAccessToken;
  } catch (error) {
    console.error('Failed to refresh access token:', error);
    throw new Error('Failed to refresh access token');
  }
};

type YoutubeUploadParams = {
  fileKey: string;
  refreshToken: string;
  accessToken: string;
  accessToekenExpiresAt: string;
  youtubeMetadata: {
    snippet: {
      title: string;
      defaultLanguage: string;
      defaultAudioLanguage: string;
      description: string;
      tags: string;
      categoryId: string;
      privacyStatus: string;
      publishAt: string | null;
    };
    status: {
      privacyStatus: string;
      publishAt: string | null;
      madeForKids: boolean;
      embeddable: boolean;
      publicStatsViewable: boolean;
    };
  };
  youtubeUploadParams: string;
};

export const uploadVideoToYouTube = async (
  payload: YoutubeUploadParams
): Promise<{ message: string; videoUrl: string; youtubeResponse: any }> => {
  try {
    const {
      fileKey,
      accessToken,
      accessToekenExpiresAt,
      refreshToken,
      youtubeMetadata, // Object containing all metadata for the YouTube video upload (title, description, tags, categoryId, status, etc.)
      youtubeUploadParams, // Optional query parameters for the YouTube API upload endpoint
    } = payload;

    const freshAccessToken = await getFreshAccessToken(accessToken, refreshToken, accessToekenExpiresAt);

    if (!freshAccessToken) {
      throw new Error('Failed to get fresh access token.');
    }

    // Instantiate Cloudflare R2 client using credentials from the request body
    const r2 = new AWS.S3({
      endpoint: env.R2_BUCKET_URL,
      region: 'auto',
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    });

    // Check if file exists in R2
    const fileExists = checkIfFileExistsonR2(fileKey);

    if (!fileExists) {
      throw new Error('File does not exist in R2.');
    }

    // Retrieve file from R2 as a readable stream
    const videoStream = r2.getObject({ Bucket: env.R2_BUCKET_NAME, Key: fileKey }).createReadStream();

    // Prepare the form data for the YouTube upload
    const data = new FormData();
    // Append the provided metadata (everything needed for upload)
    data.append('metadata', JSON.stringify(youtubeMetadata), { contentType: 'application/json' });
    // Append the video file stream with its key as filename
    data.append('video', videoStream, { contentType: 'video/mp4', filename: fileKey });

    // Build the upload URL; default to "part=snippet,status" if none provided
    const uploadYoutubeVideoQueryParams = youtubeUploadParams ? youtubeUploadParams : 'part=snippet,status';
    const uploadYoutubeVideoUrl = `https://www.googleapis.com/upload/youtube/v3/videos?${uploadYoutubeVideoQueryParams}`;

    // Configure the Axios request for the video upload
    const config: AxiosRequestConfig = {
      method: 'post',
      url: uploadYoutubeVideoUrl,
      headers: {
        Authorization: `Bearer ${freshAccessToken}`,
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

    return {
      message: 'Video uploaded successfully!',
      videoUrl: videoUrl,
      youtubeResponse: response.data,
    };
  } catch (error: any) {
    console.error('Error uploading video to YouTube:', error.response?.data || error.message);
    throw new Error('Failed to upload video to YouTube.');
  }
};
