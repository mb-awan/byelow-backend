import axios from 'axios';

export const invokeLambda = async (functionName: string, payload: any) => {
  // Adjust if you’re using AWS SDK instead of API Gateway
  // const endpoint = `${env.LAMBDA_BASE_URL}/${functionName}`;
  const endpoint = `https://${functionName}.execute-api.us-east-1.amazonaws.com/dev`; // dummy

  const res = await axios.post(endpoint, payload);
  return res.data;
};
