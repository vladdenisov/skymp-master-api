import * as path from "path";
import * as nodemailer from "nodemailer";
import * as EmailTemplates from "email-templates";

import { getConfig } from "cfg";

const config = getConfig();

const transport = nodemailer.createTransport({
  auth: {
    user: config.EMAIL_USER,
    pass: config.EMAIL_PASS
  },
  host: "mail.privateemail.com",
  port: 465
});

const emailObject = new EmailTemplates({
  views: {
    root: path.join(__dirname, "templates")
  },
  message: {
    from: config.EMAIL_USER
  },
  transport,
  send: process.env.NODE_ENV === "production"
});

export const sendSignupVerifyCode = async (
  email: string,
  username: string,
  code: string
): Promise<void> => {
  await emailObject.send({
    template: "signup",
    message: {
      to: email
    },
    locals: {
      username: username,
      code: code
    }
  });
};
