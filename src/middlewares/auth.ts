import { Context } from "koa";
import { RouterContext } from "koa-router";
import * as Passport from "koa-passport";
import * as R from "ramda";

import { Strategies } from "../utils/passport-init";
import { Roles } from "../models/user";

export const withAuth = (
  roles: Roles[] = [],
  hasVerifiedEmail = true
) => async (
  ctx: Context | RouterContext,
  next: () => Promise<unknown>
): Promise<void> =>
  await Passport.authenticate(Strategies.jwt, (err, user) => {
    if (err) {
      ctx.throw(500, err);
    }

    if (!user) {
      ctx.throw(401, new Error("Unauthorized"));
    }

    if (hasVerifiedEmail && !user.hasVerifiedEmail) {
      ctx.throw(403, new Error("Your email not verified"));
    }

    if (roles.length && !R.intersection(user.roles, roles).length) {
      ctx.throw(403, new Error("You don't have permission to access"));
    }

    next();
  })(ctx, next);
