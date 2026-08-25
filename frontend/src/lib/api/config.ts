export const apiConfig = {
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "/api",
  useMockData: false,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
};
