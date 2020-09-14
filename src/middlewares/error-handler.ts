import { Context } from "koa";
import { RouterContext } from "koa-router";

export const errorHandler = async (
  ctx: Context | RouterContext,
  next: () => Promise<unknown>
): Promise<void> => {
  try {
    await next();
  } catch (err) {
    ctx.status = err.status || 500;
    ctx.body = err.message;
    ctx.app.emit("error", err, ctx);
  }
};
