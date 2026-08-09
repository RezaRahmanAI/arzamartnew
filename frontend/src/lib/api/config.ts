export const apiConfig = {
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5273/api/v1",
  useMockData: false, // Connected 100% to ASP.NET Core Web API & SQL Server LocalDB
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
};
