export type Entries<T> = {
  [K in keyof T]: [K, T[K]];
}[keyof T][];

export type ValueOf<T> = T[keyof T];

export type NullableObject<T extends object> = {
  [K in keyof T]: T[K] | null;
};

export type NonNullableObject<T extends object> = {
  [K in keyof T]: NonNullable<T[K]>;
};

/**
 * Returns whether the input is a plain object.
 */
export function isPlainObject (obj: unknown): obj is Record<string, unknown> {
  return typeof obj === 'object' && obj !== null;
}

/**
 * Simply returns `Object.entries(obj)`, but with better typings for the object keys.
 */
export function entries<T extends object> (obj: T) {
  /*
    NOTE:
    When using Entries<T> directly, the resulting type will list `undefined`
    as a possible key, which creates weird situations. Marking the keys
    as not optional fixes this.
  */
  return Object.entries(obj) as Entries<{
    [K in keyof T]-?: T[K];
  }>;
}

/**
 * Simply returns `Object.fromEntries(entries)`, but with better typings for the object keys.
 */
export function fromEntries<T extends object> (entries: Entries<T>) {
  return Object.fromEntries(entries) as T;
}

/**
 * Simply returns `Object.keys(obj)`, but with better typings for the object keys.
 */
export function keys<T extends object> (obj: T) {
  return Object.keys(obj) as (keyof T)[];
}

export function pick<T extends object, K extends keyof T> (obj: T, objKeys: K[]): Pick<T, K> {
  return objKeys.reduce((acc, key) => {
    acc[key] = obj[key];
    return acc;
  }, {} as Pick<T, K>);
}

export function keyBy<TArr extends object, TKey extends keyof TArr> (
  arr: TArr[],
  key: TKey,
) {
  return arr.reduce((result, curr) => {
    const valueToKeyBy = curr[key] as string;

    if (!(valueToKeyBy in result)) {
      result[valueToKeyBy] = [];
    }

    result[valueToKeyBy]!.push(curr);

    return result;
  }, {} as Record<string, TArr[]>);
}
