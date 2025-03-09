import axios from 'axios';
import {
  AccessTokenResponse,
  RefreshAccessTokenRequest,
} from '../../../types.js';

export const refreshAccessToken = async ({
  refreshToken,
  clientId,
  clientSecret,
}: RefreshAccessTokenRequest): Promise<AccessTokenResponse> => {
  try {
    const data = new URLSearchParams();
    data.append('grant_type', 'refresh_token');
    data.append('refresh_token', refreshToken);
    data.append('client_id', clientId);

    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      data,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(error.response?.status, error.response?.data);
    } else {
      console.error(error);
    }

    return null;
  }
};
