import * as v8 from "v8";

export function cloneStructured<T>(obj: T): T {
  return v8.deserialize(v8.serialize(obj));
}
