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
): Promise<void> => {
  await Passport.authenticate(Strategies.jwt, (err, user) => {
    if (err) {
      ctx.throw(500, err);
    }
    console.log(user);
    if (user === false) {
      ctx.throw(401, "Unauthorized");
    }
    console.log(user.roles);

    if (hasVerifiedEmail && user.hasVerifiedEmail === false) {
      ctx.throw(403, "Your email not verified");
    }

    if (roles.length && !R.intersection(user.roles, roles).length) {
      ctx.throw(403, "You don't have permission to access");
    }

    next();
  })(ctx, next);
};
