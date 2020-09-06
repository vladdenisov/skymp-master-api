export interface Config {
  PORT: number;
  JWT_SECRET: string;
  DB_URL: string;
  EMAIL_USER: string;
  EMAIL_PASS: string;
}

export const config: Config = {
  PORT: 3000,
  JWT_SECRET: "your-secret-whatever",
  DB_URL: "postgres://<username>:<password>@<host-ip>:<port>/<database-name>",
  EMAIL_USER: "your-email@example.com",
  EMAIL_PASS: "your-password"
};
